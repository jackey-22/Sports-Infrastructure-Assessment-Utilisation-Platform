const mongoose = require("mongoose");
const Athlete = require("../Model/athleteModel");
const Sport = require("../Model/SportModel");
const Instructor = require("../Model/instructorModel");
const Guest = require("../Model/GuestModel");
const Reminder = require("../Model/Reminder");
const Updates = require("../Model/UpdatesModel");
const { ROLE } = require("../Utils/roles");
const { canAccessAthlete } = require("../Utils/scope");
const { syncAthleteGoalsAndBadges } = require("../Services/goalBadgeService");
const { notifyPreferredAthletes } = require("../Services/sportPreferenceNotificationService");

const fail = (res, status, msg) => res.status(status).json({ data: "", msg, rcode: -9 });
const validId = (value) => mongoose.isValidObjectId(value);

async function ensureCoachScope(req, athlete, sportId) {
  const coach = await Instructor.findOne({ userId: req.user._id }).select("sports SportComplexId").lean();
  if (!coach || !coach.SportComplexId) return false;
  const sports = (coach.sports || []).map((s) => String(s.sport?._id || s.sport));
  if (sportId && !sports.includes(String(sportId))) return false;
  if (await canAccessAthlete(req.user, athlete)) return true;
  if (athlete.SportComplexId) return false;
  return Boolean(
    await Guest.exists({
      coach: coach._id,
      SportComplexId: coach.SportComplexId,
      citizenUser: athlete.userId?._id || athlete.userId,
      sport: sportId || { $in: sports },
      bookingStatus: "Confirmed",
      paymentStatus: "Paid",
    })
  );
}

/** GET /api/athlete/goals */
async function athleteList(req, res) {
  try {
    const athlete = await Athlete.findOne({ userId: req.user._id }).select("_id").lean();
    if (!athlete) return res.json({ data: { goals: [], badges: [], badgeCatalog: [], xpPoints: 0, rank: null }, rcode: 200 });
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.json({ data: synced, rcode: 200 });
  } catch (error) {
    console.error("athleteList goals error:", error);
    return fail(res, 500, "Could not load goals & badges");
  }
}

/** POST /api/athlete/goals */
async function athleteCreate(req, res) {
  try {
    let athlete = await Athlete.findOne({ userId: req.user._id });
    if (!athlete) {
      athlete = await Athlete.create({ userId: req.user._id, isActive: 1 });
    }
    const { title, description, sportId, goalType, targetValue, unit, targetdate } = req.body || {};
    if (!title || !String(title).trim()) return fail(res, 400, "Goal title is required");
    if (sportId && (!validId(sportId) || !(await Sport.exists({ _id: sportId })))) {
      return fail(res, 400, "Invalid sport selected");
    }
    const type = ["attendance", "skill_score", "custom"].includes(goalType) ? goalType : "custom";
    const target = Math.max(1, Number(targetValue) || (type === "skill_score" ? 80 : type === "attendance" ? 10 : 1));

    athlete.goals.push({
      title: String(title).trim().slice(0, 140),
      description: String(description || "").trim().slice(0, 500),
      sport: sportId || null,
      goalType: type,
      targetValue: target,
      currentValue: 0,
      unit: String(unit || (type === "attendance" ? "sessions" : type === "skill_score" ? "score" : "milestone")).trim(),
      assignedBy: req.user._id,
      assignedByRole: "athlete",
      status: "Active",
      startdate: new Date(),
      targetdate: targetdate ? new Date(targetdate) : undefined,
      achieved: "0",
    });

    await athlete.save();
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.status(201).json({ data: synced, rcode: 200, msg: "Goal created" });
  } catch (error) {
    console.error("athleteCreate goal error:", error);
    return fail(res, 500, "Could not create goal");
  }
}

/** PATCH /api/athlete/goals/:goalId */
async function athleteUpdate(req, res) {
  try {
    const athlete = await Athlete.findOne({ userId: req.user._id });
    if (!athlete) return fail(res, 404, "Athlete profile not found");
    const goal = athlete.goals.id(req.params.goalId);
    if (!goal) return fail(res, 404, "Goal not found");

    const { achieved, currentValue, title, description, targetdate } = req.body || {};
    if (title !== undefined) goal.title = String(title).trim().slice(0, 140);
    if (description !== undefined) goal.description = String(description).trim().slice(0, 500);
    if (targetdate !== undefined) goal.targetdate = targetdate ? new Date(targetdate) : undefined;
    if (currentValue !== undefined && Number.isFinite(Number(currentValue))) {
      goal.currentValue = Math.max(0, Number(currentValue));
    }
    if (achieved === "1" || achieved === true) {
      goal.achieved = "1";
      goal.status = "Completed";
      goal.actualdate = new Date();
      goal.currentValue = Math.max(goal.currentValue || 0, goal.targetValue || 1);
    }

    await athlete.save();
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.json({ data: synced, rcode: 200, msg: "Goal updated" });
  } catch (error) {
    console.error("athleteUpdate goal error:", error);
    return fail(res, 500, "Could not update goal");
  }
}

/** DELETE /api/athlete/goals/:goalId */
async function athleteDelete(req, res) {
  try {
    const athlete = await Athlete.findOne({ userId: req.user._id });
    if (!athlete) return fail(res, 404, "Athlete profile not found");
    const goal = athlete.goals.id(req.params.goalId);
    if (!goal) return fail(res, 404, "Goal not found");
    goal.deleteOne();
    await athlete.save();
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.json({ data: synced, rcode: 200, msg: "Goal removed" });
  } catch (error) {
    console.error("athleteDelete goal error:", error);
    return fail(res, 500, "Could not remove goal");
  }
}

/** GET /api/coach/goals — all goals for athletes in this coach's scope */
async function coachAllGoals(req, res) {
  try {
    const coach = await Instructor.findOne({ userId: req.user._id })
      .populate("sports.sport", "SportName")
      .lean();
    if (!coach || !coach.SportComplexId) {
      return res.json({ data: { athletes: [], goals: [], summary: { total: 0, active: 0, completed: 0, overdue: 0 } }, rcode: 200 });
    }
    const coachSports = (coach.sports || [])
      .map((s) => ({ id: String(s.sport?._id || s.sport), name: s.sport?.SportName || "Sport" }))
      .filter((s) => s.id);
    const coachSportIds = coachSports.map((s) => s.id);

    const [complexAthletes, guestUsers] = await Promise.all([
      Athlete.find({ SportComplexId: coach.SportComplexId }).populate("userId", "Name Email").lean(),
      Guest.find({
        coach: coach._id,
        SportComplexId: coach.SportComplexId,
        bookingStatus: "Confirmed",
        paymentStatus: "Paid",
      }).distinct("citizenUser"),
    ]);

    const unlinkedAthletes = guestUsers.length
      ? await Athlete.find({ userId: { $in: guestUsers }, SportComplexId: null }).populate("userId", "Name Email").lean()
      : [];

    const byId = new Map();
    [...complexAthletes, ...unlinkedAthletes].forEach((a) => byId.set(String(a._id), a));
    const scopedAthletes = [...byId.values()];

    const goals = [];
    const athletesList = [];

    for (const ath of scopedAthletes) {
      const synced = await syncAthleteGoalsAndBadges(ath._id);
      const athName = ath.userId?.Name || "Athlete";
      athletesList.push({
        id: String(ath._id),
        name: athName,
        email: ath.userId?.Email || "",
        xpPoints: synced?.xpPoints || 0,
        rank: synced?.rank?.current?.name || "Bronze Athlete",
        sports: coachSports,
      });
      (synced?.goals || []).forEach((g) => {
        const gSportId = g.sport ? String(g.sport?._id || g.sport) : "";
        if (gSportId && coachSportIds.length && !coachSportIds.includes(gSportId)) return;
        goals.push({
          _id: String(g._id),
          athleteId: String(ath._id),
          athleteName: athName,
          sportId: gSportId,
          sportName: g.sport?.SportName || "All sports",
          title: g.title,
          description: g.description || "",
          goalType: g.goalType || "custom",
          targetValue: g.targetValue || 1,
          currentValue: g.currentValue || 0,
          unit: g.unit || "",
          status: g.status || "Active",
          assignedByRole: g.assignedByRole || "athlete",
          targetdate: g.targetdate || null,
          startdate: g.startdate || null,
        });
      });
    }

    const summary = {
      total: goals.length,
      active: goals.filter((g) => g.status === "Active").length,
      completed: goals.filter((g) => g.status === "Completed").length,
      overdue: goals.filter((g) => g.status === "Overdue").length,
    };

    return res.json({ data: { athletes: athletesList, goals, summary }, rcode: 200 });
  } catch (error) {
    console.error("coachAllGoals error:", error);
    return fail(res, 500, "Could not load coach goals");
  }
}

/** GET /api/coach/athletes/:athleteId/goals */
async function coachListGoals(req, res) {
  try {
    if (!validId(req.params.athleteId)) return fail(res, 400, "Invalid athlete ID");
    const athlete = await Athlete.findById(req.params.athleteId).lean();
    if (!athlete || !(await ensureCoachScope(req, athlete))) {
      return fail(res, 403, "Athlete is outside your coaching scope");
    }
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.json({ data: synced, rcode: 200 });
  } catch (error) {
    console.error("coachListGoals error:", error);
    return fail(res, 500, "Could not load athlete goals");
  }
}

/** POST /api/coach/athletes/:athleteId/goals */
async function coachAssignGoal(req, res) {
  try {
    if (!validId(req.params.athleteId)) return fail(res, 400, "Invalid athlete ID");
    const athlete = await Athlete.findById(req.params.athleteId);
    const { title, description, sportId, goalType, targetValue, unit, targetdate } = req.body || {};
    if (!athlete || !(await ensureCoachScope(req, athlete, sportId))) {
      return fail(res, 403, "Athlete or sport is outside your coaching scope");
    }
    if (!title || !String(title).trim()) return fail(res, 400, "Goal title is required");
    const type = ["attendance", "skill_score", "custom"].includes(goalType) ? goalType : "skill_score";
    const target = Math.max(1, Number(targetValue) || (type === "skill_score" ? 80 : type === "attendance" ? 8 : 1));

    athlete.goals.push({
      title: String(title).trim().slice(0, 140),
      description: String(description || "").trim().slice(0, 500),
      sport: sportId || null,
      goalType: type,
      targetValue: target,
      currentValue: 0,
      unit: String(unit || (type === "attendance" ? "sessions" : type === "skill_score" ? "score" : "milestone")).trim(),
      assignedBy: req.user._id,
      assignedByRole: "coach",
      status: "Active",
      startdate: new Date(),
      targetdate: targetdate ? new Date(targetdate) : undefined,
      achieved: "0",
    });

    await athlete.save();
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.status(201).json({ data: synced, rcode: 200, msg: "Goal assigned to athlete" });
  } catch (error) {
    console.error("coachAssignGoal error:", error);
    return fail(res, 500, "Could not assign goal");
  }
}

/** GET /api/athlete/preferences */
async function getPreferences(req, res) {
  try {
    const athlete = await Athlete.findOne({ userId: req.user._id })
      .populate("preferredSports", "SportName Category")
      .lean();
    const preferredSports = (athlete?.preferredSports || []).map((s) => ({
      _id: String(s._id),
      SportName: s.SportName,
      Category: s.Category || "",
    }));
    const notifications = await Reminder.find({ userIds: req.user._id })
      .sort({ date: -1 })
      .limit(10)
      .lean();
    return res.json({ data: { preferredSports, notifications }, rcode: 200 });
  } catch (error) {
    console.error("getPreferences error:", error);
    return fail(res, 500, "Could not load sport preferences");
  }
}

/** PUT /api/athlete/preferences */
async function updatePreferences(req, res) {
  try {
    const rawIds = Array.isArray(req.body?.sportIds) ? req.body.sportIds : [];
    const validIds = [...new Set(rawIds.filter(validId).map(String))];
    const existingSports = validIds.length
      ? await Sport.find({ _id: { $in: validIds } }).select("_id SportName Category").lean()
      : [];

    let athlete = await Athlete.findOne({ userId: req.user._id });
    if (!athlete) {
      athlete = await Athlete.create({ userId: req.user._id, isActive: 1 });
    }
    athlete.preferredSports = existingSports.map((s) => s._id);
    await athlete.save();

    return res.json({
      data: {
        preferredSports: existingSports.map((s) => ({
          _id: String(s._id),
          SportName: s.SportName,
          Category: s.Category || "",
        })),
      },
      rcode: 200,
      msg: "Sport preferences saved",
    });
  } catch (error) {
    console.error("updatePreferences error:", error);
    return fail(res, 500, "Could not save sport preferences");
  }
}

/** GET /api/athlete/announcements */
async function athleteAnnouncements(req, res) {
  try {
    const athlete = await Athlete.findOne({ userId: req.user._id })
      .select("preferredSports SportComplexId")
      .lean();
    const prefSet = new Set((athlete?.preferredSports || []).map(String));
    const facilityId = athlete?.SportComplexId ? String(athlete.SportComplexId) : null;

    const rows = await Updates.find({ active: { $in: ["1", 1] }, level: 0 })
      .populate("sportComplexId", "name")
      .populate("sportId", "SportName")
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const filtered = rows
      .map((u) => {
        const sId = u.sportId ? String(u.sportId?._id || u.sportId) : "";
        return {
          _id: String(u._id),
          title: u.title,
          description: u.description,
          category: u.category || "general",
          facilityName: u.sportComplexId?.name || "",
          facilityId: u.sportComplexId?._id ? String(u.sportComplexId._id) : null,
          sportName: u.sportId?.SportName || "",
          sportId: sId || null,
          isPreferred: Boolean(sId && prefSet.has(sId)),
          createdAt: u.createdAt,
        };
      })
      .sort((a, b) => Number(b.isPreferred) - Number(a.isPreferred) || new Date(b.createdAt) - new Date(a.createdAt));

    return res.json({ data: filtered, rcode: 200 });
  } catch (error) {
    console.error("athleteAnnouncements error:", error);
    return fail(res, 500, "Could not load announcements");
  }
}

const VALID_ANNOUNCEMENT_CATEGORIES = new Set(["general", "slot", "camp", "maintenance"]);

function formatAnnouncement(u, user) {
  const facilityId = u.sportComplexId?._id ? String(u.sportComplexId._id) : u.sportComplexId ? String(u.sportComplexId) : null;
  const canManage =
    user.role === ROLE.ADMIN ||
    (user.role === ROLE.MANAGER && Boolean(facilityId) && String(facilityId) === String(user.SportComplexId || ""));
  return {
    _id: String(u._id),
    title: u.title,
    description: u.description,
    category: u.category || "general",
    active: String(u.active) === "1" ? "1" : "0",
    facilityName: u.sportComplexId?.name || "",
    facilityId,
    sportName: u.sportId?.SportName || "",
    sportId: u.sportId?._id ? String(u.sportId._id) : u.sportId ? String(u.sportId) : null,
    canManage,
    createdAt: u.createdAt,
  };
}

/** GET /api/announcements */
async function listAnnouncements(req, res) {
  try {
    const query = { level: 0 };
    if (req.user.role === ROLE.MANAGER) {
      if (req.user.SportComplexId) {
        query.$or = [
          { sportComplexId: req.user.SportComplexId },
          { sportComplexId: null },
          { sportComplexId: { $exists: false } },
        ];
      } else {
        query.$or = [{ sportComplexId: null }, { sportComplexId: { $exists: false } }];
      }
    }

    const rows = await Updates.find(query)
      .populate("sportComplexId", "name")
      .populate("sportId", "SportName")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({ data: rows.map((u) => formatAnnouncement(u, req.user)), rcode: 200 });
  } catch (error) {
    console.error("listAnnouncements error:", error);
    return fail(res, 500, "Could not load announcements");
  }
}

/** POST /api/announcements */
async function createAnnouncement(req, res) {
  try {
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    if (!title || !description) {
      return fail(res, 400, "Title and description are required");
    }

    const rawCategory = String(req.body?.category || "general").trim().toLowerCase();
    const category = VALID_ANNOUNCEMENT_CATEGORIES.has(rawCategory) ? rawCategory : "general";
    const sportId = req.body?.sportId && validId(req.body.sportId) ? req.body.sportId : null;
    const facilityId =
      req.user.role === ROLE.MANAGER
        ? req.user.SportComplexId || null
        : req.body?.facilityId && validId(req.body.facilityId)
          ? req.body.facilityId
          : null;

    const doc = await Updates.create({
      title,
      description,
      level: 0,
      category,
      active: "1",
      ...(facilityId ? { sportComplexId: facilityId } : {}),
      ...(sportId ? { sportId } : {}),
    });

    let notifiedCount = 0;
    if (sportId) {
      try {
        const result = await notifyPreferredAthletes({
          sportId,
          facilityId,
          title,
          message: description,
          category,
          createAnnouncement: false,
        });
        notifiedCount = Number(result?.notified || 0);
      } catch (notifyErr) {
        console.warn("announcement notifyPreferredAthletes failed:", notifyErr.message);
      }
    }

    const populated = await Updates.findById(doc._id)
      .populate("sportComplexId", "name")
      .populate("sportId", "SportName")
      .lean();

    return res.status(201).json({
      data: formatAnnouncement(populated || doc, req.user),
      notifiedCount,
      rcode: 200,
    });
  } catch (error) {
    console.error("createAnnouncement error:", error);
    return fail(res, 500, "Could not publish announcement");
  }
}

/** PATCH /api/announcements/:id */
async function toggleAnnouncement(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid announcement id");
    const doc = await Updates.findById(req.params.id);
    if (!doc) return fail(res, 404, "Announcement not found");

    if (req.user.role === ROLE.MANAGER) {
      const ownComplex = String(req.user.SportComplexId || "");
      if (!doc.sportComplexId || String(doc.sportComplexId) !== ownComplex) {
        return fail(res, 403, "You can only manage announcements for your assigned facility");
      }
    }

    const nextActive =
      req.body?.active !== undefined
        ? String(req.body.active) === "1"
          ? "1"
          : "0"
        : String(doc.active) === "1"
          ? "0"
          : "1";
    doc.active = nextActive;
    await doc.save();

    const populated = await Updates.findById(doc._id)
      .populate("sportComplexId", "name")
      .populate("sportId", "SportName")
      .lean();

    return res.json({ data: formatAnnouncement(populated || doc, req.user), rcode: 200 });
  } catch (error) {
    console.error("toggleAnnouncement error:", error);
    return fail(res, 500, "Could not update announcement");
  }
}

module.exports = {
  athleteList,
  athleteCreate,
  athleteUpdate,
  athleteDelete,
  getPreferences,
  updatePreferences,
  athleteAnnouncements,
  listAnnouncements,
  createAnnouncement,
  toggleAnnouncement,
  coachAllGoals,
  coachListGoals,
  coachAssignGoal,
};
