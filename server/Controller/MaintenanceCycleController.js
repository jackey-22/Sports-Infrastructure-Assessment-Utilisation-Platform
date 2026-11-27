const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const FacilityAssessment = require("../Model/FacilityAssessmentModel");
const SportsComplex = require("../Model/SportsComplexModel");
const User = require("../Model/UsersModel");
const Updates = require("../Model/UpdatesModel");
const { sendPushNotification } = require("../PushNotification");
const { ROLE } = require("../Utils/roles");

const fail = (res, status, msg) => res.status(status).json({ rcode: -9, msg });
const ok = (res, data, msg = "OK") => res.json({ rcode: 200, data, msg });

function indiaDate() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(fromDateStr, toDateStr) {
  return Math.round(
    (new Date(`${toDateStr}T00:00:00.000Z`) - new Date(`${fromDateStr}T00:00:00.000Z`)) /
      (1000 * 60 * 60 * 24)
  );
}

/**
 * Computes periodic maintenance / condition-assessment schedules for all
 * active FacilitySportConfig records whose Sport has `maintenanceCycle.enabled`.
 */
async function computeSchedules({ facilityId = null } = {}) {
  const today = indiaDate();
  const configFilter = { status: "Active" };
  if (facilityId) configFilter.facility = facilityId;

  const configs = await FacilitySportConfig.find(configFilter)
    .populate("facility", "name manager district")
    .populate("sport", "SportName Category maintenanceCycle status")
    .lean();

  const activeCycleConfigs = configs.filter(
    (c) =>
      c.facility &&
      c.sport &&
      c.sport.status !== "Inactive" &&
      c.sport.maintenanceCycle?.enabled
  );

  if (!activeCycleConfigs.length) return [];

  const facilityIds = [...new Set(activeCycleConfigs.map((c) => String(c.facility._id)))];
  const sportIds = [...new Set(activeCycleConfigs.map((c) => String(c.sport._id)))];

  // Fetch latest submitted assessments for these facility + sport pairs
  const assessments = await FacilityAssessment.find({
    facilityId: { $in: facilityIds },
    sportId: { $in: sportIds },
    status: "Submitted",
  })
    .select("facilityId sportId assessmentDate createdAt ai.visualConditionIndex")
    .sort({ assessmentDate: -1, createdAt: -1 })
    .lean();

  const latestByPair = new Map();
  for (const a of assessments) {
    const key = `${String(a.facilityId)}:${String(a.sportId)}`;
    if (!latestByPair.has(key)) latestByPair.set(key, a);
  }

  return activeCycleConfigs
    .map((config) => {
      const mc = config.sport.maintenanceCycle;
      const key = `${String(config.facility._id)}:${String(config.sport._id)}`;
      const latest = latestByPair.get(key);

      const anchorDate =
        (latest?.assessmentDate && /^\d{4}-\d{2}-\d{2}$/.test(latest.assessmentDate)
          ? latest.assessmentDate
          : latest?.createdAt
          ? new Date(latest.createdAt).toISOString().slice(0, 10)
          : null) ||
        (config.createdAt ? new Date(config.createdAt).toISOString().slice(0, 10) : today);

      const frequencyDays = Math.max(1, Number(mc.frequencyDays) || 30);
      const notifyDaysBefore = Math.max(0, Number(mc.notifyDaysBefore ?? 3));
      const nextDueDate = addDays(anchorDate, frequencyDays);
      const daysUntilDue = diffDays(today, nextDueDate);
      const isOverdue = daysUntilDue < 0;
      const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= notifyDaysBefore;

      return {
        configId: String(config._id),
        facilityId: String(config.facility._id),
        facilityName: config.facility.name || "Facility",
        sportId: String(config.sport._id),
        sportName: config.sport.SportName || "Sport",
        title: mc.checklistTitle || `${config.sport.SportName} Condition Assessment`,
        notes: mc.checklistNotes || "",
        priority: mc.priority || "Medium",
        frequencyDays,
        notifyDaysBefore,
        lastAssessmentDate: latest ? anchorDate : null,
        lastAssessmentId: latest ? String(latest._id) : null,
        lastVci: latest?.ai?.visualConditionIndex ?? null,
        nextDueDate,
        daysUntilDue,
        isOverdue,
        isDueSoon,
        needsAction: isOverdue || isDueSoon,
        lastNotifiedAt: config.lastMaintenanceNotifiedAt || null,
      };
    })
    .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

/** GET /api/manager/maintenance-due */
async function managerDueList(req, res) {
  try {
    let facilityId = req.user.SportComplexId;
    if (!facilityId) {
      const facility = await SportsComplex.findOne({ manager: req.user._id }).select("_id").lean();
      facilityId = facility?._id;
    }
    if (!facilityId) return ok(res, []);
    const schedules = await computeSchedules({ facilityId });
    return ok(res, schedules);
  } catch (error) {
    console.error("managerDueList error:", error);
    return fail(res, 500, "Could not load maintenance schedule");
  }
}

/** GET /api/admin/maintenance-due */
async function adminDueList(req, res) {
  try {
    const schedules = await computeSchedules({
      facilityId: req.query.facilityId || null,
    });
    return ok(res, schedules);
  } catch (error) {
    console.error("adminDueList error:", error);
    return fail(res, 500, "Could not load maintenance schedule");
  }
}

/** Daily sweep: notifies facility managers for sports whose condition assessment is due/overdue. */
async function runNotificationSweep() {
  const schedules = await computeSchedules();
  const dueItems = schedules.filter((item) => item.needsAction);
  if (!dueItems.length) {
    console.log(`[MaintenanceCycle] Sweep complete — 0 due items (${new Date().toISOString()})`);
    return 0;
  }

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  let sent = 0;

  for (const item of dueItems) {
    // Avoid duplicate notifications within 24 hours for the same (facility, sport)
    if (item.lastNotifiedAt && new Date(item.lastNotifiedAt) > oneDayAgo) {
      continue;
    }

    const title = item.isOverdue
      ? `Overdue Assessment: ${item.sportName} (${item.title})`
      : item.daysUntilDue === 0
      ? `Assessment Due Today: ${item.sportName}`
      : `Assessment Due in ${item.daysUntilDue} day${item.daysUntilDue === 1 ? "" : "s"}: ${item.sportName}`;

    const message = item.isOverdue
      ? `Periodic condition assessment for ${item.sportName} at ${item.facilityName} was due on ${item.nextDueDate} (${Math.abs(item.daysUntilDue)} day(s) overdue). Please submit a condition assessment review.`
      : `Periodic condition assessment for ${item.sportName} at ${item.facilityName} is scheduled for ${item.nextDueDate} (every ${item.frequencyDays} days). Please submit a condition assessment review.`;

    // 1. Send push notification to facility manager(s)
    const managers = await User.find({
      Role: ROLE.MANAGER,
      SportComplexId: item.facilityId,
      IsActive: { $ne: 0 },
    })
      .select("notificationtoken")
      .lean();

    const tokens = managers.map((m) => m.notificationtoken).filter(Boolean);
    if (tokens.length) {
      try {
        await sendPushNotification(tokens, title, message);
      } catch (err) {
        console.error(`[MaintenanceCycle] Push failed for ${item.facilityName} - ${item.sportName}:`, err.message);
      }
    }

    // 2. Record in-app notification in Updates collection for this facility manager
    try {
      await Updates.create({
        title,
        description: item.notes ? `${message} Checklist: ${item.notes}` : message,
        level: 2,
        sportComplexId: item.facilityId,
        active: "1",
      });
    } catch (err) {
      console.error(`[MaintenanceCycle] In-app update failed:`, err.message);
    }

    // 3. Mark lastMaintenanceNotifiedAt on FacilitySportConfig
    await FacilitySportConfig.findByIdAndUpdate(item.configId, {
      $set: { lastMaintenanceNotifiedAt: now },
    });

    sent += 1;
  }

  console.log(`[MaintenanceCycle] Sweep complete — ${sent} notification(s) sent (${new Date().toISOString()})`);
  return sent;
}

module.exports = { computeSchedules, managerDueList, adminDueList, runNotificationSweep };
