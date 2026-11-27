const mongoose = require("mongoose");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const Sport = require("../Model/SportModel");
const Instructor = require("../Model/instructorModel");
const SportsComplex = require("../Model/SportsComplexModel");
const { canAccessComplex } = require("../Utils/scope");
const { notifyPreferredAthletes } = require("../Services/sportPreferenceNotificationService");

const fail = (res, status, msg) =>
  res.status(status).json({ data: "", msg, rcode: status === 403 ? -10 : -9 });

async function managerFacility(req) {
  return req.user && req.user.SportComplexId ? String(req.user.SportComplexId) : null;
}

function validateSlots(slots, bookingMode, unitCount, capacityPerUnit) {
  if (!Array.isArray(slots) || !slots.length) return "Add at least one time slot";
  for (const slot of slots) {
    if (!slot.label || !slot.startTime || !slot.endTime) {
      return "Every slot needs a label, start time and end time";
    }
    if (slot.startTime >= slot.endTime) return "Slot end time must be after start time";
    const capacity = Number(slot.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) return "Slot capacity must be at least 1";
    if (bookingMode === "court" && capacity > Number(unitCount) * Number(capacityPerUnit)) {
      return "Court slot capacity cannot exceed configured court capacity";
    }
  }
  for (let firstIndex = 0; firstIndex < slots.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < slots.length; secondIndex += 1) {
      const first = slots[firstIndex];
      const second = slots[secondIndex];
      const firstDays = Array.isArray(first.days) ? first.days : [];
      const secondDays = Array.isArray(second.days) ? second.days : [];
      const sharedDays = firstDays.length && secondDays.length
        ? firstDays.filter((day) => secondDays.includes(day))
        : firstDays.length ? firstDays : secondDays.length ? secondDays : ["every day"];
      const overlaps = first.startTime < second.endTime && second.startTime < first.endTime;
      if (sharedDays.length && overlaps) {
        return `Slots “${first.label}” and “${second.label}” overlap on ${sharedDays.join(", ")}`;
      }
    }
  }
  return null;
}

function normalizePlans(plans) {
  if (!Array.isArray(plans)) return [];
  return plans
    .filter((plan) => plan && String(plan.name || "").trim())
    .slice(0, 12)
    .map((plan) => {
      const durationType = plan.durationType === "yearly" ? "yearly" : "monthly";
      const durationDays = Number(plan.durationDays) > 0
        ? Math.floor(Number(plan.durationDays))
        : durationType === "yearly" ? 365 : 30;
      return {
        ...(plan._id && mongoose.Types.ObjectId.isValid(plan._id) ? { _id: plan._id } : {}),
        name: String(plan.name || "").trim().slice(0, 100),
        durationType,
        durationDays,
        price: Math.max(0, Number(plan.price) || 0),
        slotId: plan.slotId && mongoose.Types.ObjectId.isValid(plan.slotId) ? plan.slotId : null,
        description: String(plan.description || "").trim().slice(0, 400),
        active: plan.active !== false,
      };
    });
}

function payload(body, facility, userId) {
  const bookingMode = body.bookingMode;
  const unitCount = Number(body.unitCount);
  const capacityPerUnit = Number(body.capacityPerUnit);
  const images = Array.isArray(body.images)
    ? body.images.map((item) => String(item || "").trim().slice(0, 1500)).filter(Boolean).slice(0, 8)
    : [];
  return {
    facility,
    sport: body.sportId,
    images,
    bookingMode,
    unitLabel: String(body.unitLabel || "participants").trim().slice(0, 80),
    unitCount,
    capacityPerUnit,
    price: {
      amount: Number(body.price && body.price.amount),
      unit: (body.price && body.price.unit) || "slot",
      calculation: (body.price && body.price.calculation) || "flat",
      perMemberAmount: Number(body.price && body.price.perMemberAmount) || 0,
    },
    bookingPolicy: {
      reservationType:
        (body.bookingPolicy && body.bookingPolicy.reservationType) || "individual",
      inventoryMode:
        (body.bookingPolicy && body.bookingPolicy.inventoryMode) || "shared-capacity",
      minMembers:
        Number(body.bookingPolicy && body.bookingPolicy.minMembers) || 1,
      maxMembers:
        Number(body.bookingPolicy && body.bookingPolicy.maxMembers) || 1,
    },
    slots: (body.slots || []).map((slot) => ({
      ...(slot._id && mongoose.Types.ObjectId.isValid(slot._id) ? { _id: slot._id } : {}),
      label: String(slot.label || "").trim().slice(0, 100),
      startTime: slot.startTime,
      endTime: slot.endTime,
      days: Array.isArray(slot.days) ? slot.days : [],
      capacity: Number(slot.capacity),
      audience: slot.audience || "mixed",
      purpose: slot.purpose || "open-play",
      coach: slot.coachId || slot.coach || null,
      bookable: slot.bookable !== false,
    })),
    subscriptionPlans: normalizePlans(body.subscriptionPlans),
    status: body.status || "Active",
    notes: String(body.notes || "").trim().slice(0, 2000),
    configuredBy: userId,
  };
}

async function catalog(req, res) {
  const facility = await managerFacility(req);
  if (!facility) return fail(res, 403, "No facility is assigned to this manager");
  const [sports, coaches, configured] = await Promise.all([
    Sport.find({ status: "Active" })
      .select("SportName Category baseUrl description status")
      .sort({ SportName: 1 })
      .lean(),
    Instructor.find({ SportComplexId: facility, status: "Active" })
      .populate("userId", "Name Email")
      .populate("sports.sport", "SportName")
      .lean(),
    FacilitySportConfig.find({ facility }).select("sport").lean(),
  ]);
  return res.json({
    data: {
      sports,
      coaches,
      configuredSportIds: configured.map((row) => String(row.sport)),
    },
    rcode: 200,
  });
}

async function list(req, res) {
  const facility = await managerFacility(req);
  if (!facility) return fail(res, 403, "No facility is assigned to this manager");
  const data = await FacilitySportConfig.find({ facility })
    .populate("sport", "SportName Category baseUrl")
    .populate("slots.coach", "userId qualification")
    .populate({ path: "slots.coach", populate: { path: "userId", select: "Name Email" } })
    .sort({ createdAt: -1 })
    .lean();
  return res.json({ data, rcode: 200 });
}

async function create(req, res) {
  try {
    const facility = await managerFacility(req);
    if (!facility) return fail(res, 403, "No facility is assigned to this manager");
    const body = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(body.sportId)) return fail(res, 400, "Select a valid sport");
    if (!(await Sport.exists({ _id: body.sportId, status: "Active" }))) {
      return fail(res, 400, "Sport is not active in the global directory");
    }
    const data = payload(body, facility, req.user._id);
    if (!["capacity", "court", "hybrid"].includes(data.bookingMode)) {
      return fail(res, 400, "Select a valid booking mode");
    }
    if (!Number.isInteger(data.unitCount) || data.unitCount < 1) {
      return fail(res, 400, "Unit count must be at least 1");
    }
    if (!Number.isInteger(data.capacityPerUnit) || data.capacityPerUnit < 1) {
      return fail(res, 400, "Capacity per unit must be at least 1");
    }
    if (!Number.isFinite(data.price.amount) || data.price.amount < 0) {
      return fail(res, 400, "Enter a valid price");
    }
    if (!Number.isFinite(data.price.perMemberAmount) || data.price.perMemberAmount < 0) {
      return fail(res, 400, "Enter a valid per-member price");
    }
    if (
      data.bookingPolicy.maxMembers < data.bookingPolicy.minMembers ||
      data.bookingPolicy.maxMembers > data.unitCount * data.capacityPerUnit
    ) {
      return fail(res, 400, "Enter a valid member range within the configured capacity");
    }
    const slotError = validateSlots(
      data.slots,
      data.bookingMode,
      data.unitCount,
      data.capacityPerUnit
    );
    if (slotError) return fail(res, 400, slotError);
    const coachIds = data.slots.map((slot) => slot.coach).filter(Boolean);
    if (coachIds.length) {
      const count = await Instructor.countDocuments({
        _id: { $in: coachIds },
        SportComplexId: facility,
      });
      if (count !== new Set(coachIds.map(String)).size) {
        return fail(res, 400, "A selected coach is not assigned to this facility");
      }
    }
    const config = await FacilitySportConfig.create(data);
    await SportsComplex.updateOne(
      { _id: facility, "sports.sport": { $ne: data.sport } },
      {
        $push: {
          sports: {
            sport: data.sport,
            images: data.images,
            fees: String(data.price.amount),
            capacity: String(data.unitCount * data.capacityPerUnit),
          },
        },
      }
    );
    await config.populate("sport", "SportName Category baseUrl");
    if (config.status === "Active" && (config.slots || []).some((s) => s.bookable !== false)) {
      try {
        const fac = await SportsComplex.findById(facility).select("name").lean();
        await notifyPreferredAthletes({
          sportId: config.sport?._id || config.sport,
          facilityId: facility,
          category: "slot",
          title: `New ${config.sport?.SportName || "Sport"} Slots Open`,
          message: `${fac?.name || "A facility"} just opened online booking slots for ${config.sport?.SportName || "your preferred sport"}.`,
        });
      } catch (notifyErr) {
        console.error("Slot announcement error:", notifyErr.message);
      }
    }
    return res.status(201).json({ data: config, rcode: 200 });
  } catch (error) {
    if (error && error.code === 11000) {
      return fail(res, 409, "This sport is already configured for the facility");
    }
    return fail(res, 500, error.message || "Could not configure sport");
  }
}

async function update(req, res) {
  try {
    const facility = await managerFacility(req);
    if (!facility) return fail(res, 403, "No facility is assigned to this manager");
    const existing = await FacilitySportConfig.findOne({
      _id: req.params.id,
      facility,
    });
    if (!existing) return fail(res, 404, "Sport configuration not found");
    const data = payload(
      { ...existing.toObject(), ...(req.body || {}), sportId: existing.sport },
      facility,
      req.user._id
    );
    if (!Number.isInteger(data.unitCount) || data.unitCount < 1) {
      return fail(res, 400, "Unit count must be at least 1");
    }
    if (!Number.isInteger(data.capacityPerUnit) || data.capacityPerUnit < 1) {
      return fail(res, 400, "Capacity per unit must be at least 1");
    }
    if (
      !Number.isFinite(data.price.amount) ||
      data.price.amount < 0 ||
      !Number.isFinite(data.price.perMemberAmount) ||
      data.price.perMemberAmount < 0
    ) {
      return fail(res, 400, "Enter a valid price");
    }
    if (
      data.bookingPolicy.maxMembers < data.bookingPolicy.minMembers ||
      data.bookingPolicy.maxMembers > data.unitCount * data.capacityPerUnit
    ) {
      return fail(res, 400, "Enter a valid member range within the configured capacity");
    }
    const slotError = validateSlots(
      data.slots,
      data.bookingMode,
      data.unitCount,
      data.capacityPerUnit
    );
    if (slotError) return fail(res, 400, slotError);
    Object.assign(existing, data, { sport: existing.sport });
    await existing.save();
    await SportsComplex.updateOne(
      { _id: facility, "sports.sport": existing.sport },
      {
        $set: {
          "sports.$.images": existing.images || [],
          "sports.$.fees": String(existing.price.amount),
          "sports.$.capacity": String(existing.unitCount * existing.capacityPerUnit),
        },
      }
    );
    await existing.populate("sport", "SportName Category baseUrl");
    if (existing.status === "Active" && (existing.slots || []).some((s) => s.bookable !== false)) {
      try {
        const fac = await SportsComplex.findById(facility).select("name").lean();
        await notifyPreferredAthletes({
          sportId: existing.sport?._id || existing.sport,
          facilityId: facility,
          category: "slot",
          title: `${existing.sport?.SportName || "Sport"} Schedule Updated`,
          message: `${fac?.name || "A facility"} updated bookable slots for ${existing.sport?.SportName || "your preferred sport"}.`,
        });
      } catch (notifyErr) {
        console.error("Slot update announcement error:", notifyErr.message);
      }
    }
    return res.json({ data: existing, rcode: 200 });
  } catch (error) {
    return fail(res, 500, error.message || "Could not update sport configuration");
  }
}

async function remove(req, res) {
  const facility = await managerFacility(req);
  if (!facility) return fail(res, 403, "No facility is assigned to this manager");
  const result = await FacilitySportConfig.findOneAndDelete({
    _id: req.params.id,
    facility,
  });
  if (!result) return fail(res, 404, "Sport configuration not found");
  await SportsComplex.updateOne(
    { _id: facility },
    { $pull: { sports: { sport: result.sport } } }
  );
  return res.json({ data: { id: req.params.id }, rcode: 200 });
}

module.exports = { catalog, list, create, update, remove, validateSlots };
