const crypto = require("crypto");
const mongoose = require("mongoose");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const SportsComplex = require("../Model/SportsComplexModel");
const Guest = require("../Model/GuestModel");

const fail = (res, status, message) =>
  res.status(status).json({ data: "", msg: message, rcode: -9 });

function effectivePolicy(config, slot) {
  if (slot && slot.purpose === "coaching") {
    return {
      reservationType: "individual",
      inventoryMode: "shared-capacity",
      minMembers: 1,
      maxMembers: 1,
    };
  }
  return config.bookingPolicy || {
    reservationType: "individual",
    inventoryMode: "shared-capacity",
    minMembers: 1,
    maxMembers: 1,
  };
}

function publicConfig(config) {
  const value = config.toObject ? config.toObject() : config;
  return {
    id: String(value._id),
    facility: value.facility,
    sport: value.sport,
    bookingMode: value.bookingMode,
    unitLabel: value.unitLabel,
    unitCount: value.unitCount,
    capacityPerUnit: value.capacityPerUnit,
    price: value.price,
    bookingPolicy: value.bookingPolicy,
    slots: (value.slots || [])
      .filter((slot) => slot.bookable)
      .map((slot) => ({
        ...(slot.toObject ? slot.toObject() : slot),
        bookingPolicy: effectivePolicy(value, slot),
      })),
    notes: value.notes,
  };
}

async function listConfigs(req, res) {
  try {
    const facilityName = String(req.query.facilityName || "").trim();
    const facilityId = String(req.query.facilityId || "").trim();
    const facility = mongoose.Types.ObjectId.isValid(facilityId)
      ? await SportsComplex.findById(facilityId)
      : await SportsComplex.findOne({ name: facilityName });
    if (!facility) return fail(res, 404, "Facility booking configuration not found");

    const configs = await FacilitySportConfig.find({
      facility: facility._id,
      status: "Active",
    })
      .populate("sport", "SportName Category baseUrl")
      .populate({
        path: "slots.coach",
        select: "userId qualification",
        populate: { path: "userId", select: "Name" },
      })
      .sort({ createdAt: 1 });

    return res.json({
      data: {
        facility: { id: facility._id, name: facility.name },
        configs: configs.map(publicConfig),
      },
      rcode: 200,
    });
  } catch (error) {
    return fail(res, 500, "Could not load booking configuration");
  }
}

function totalFor(config, memberCount) {
  const calculation = config.price.calculation || "flat";
  const base = Number(config.price.amount) || 0;
  const perMember = Number(config.price.perMemberAmount) || 0;
  if (calculation === "per-member") {
    const rate = perMember || base;
    return { total: rate * memberCount, base: 0, perMember: rate };
  }
  if (calculation === "base-plus-member") {
    return { total: base + perMember * memberCount, base, perMember };
  }
  return { total: base, base, perMember: 0 };
}

async function createBooking(req, res) {
  try {
    const body = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(body.configId)) {
      return fail(res, 400, "Select a valid sport");
    }
    if (!mongoose.Types.ObjectId.isValid(body.slotId)) {
      return fail(res, 400, "Select a valid time slot");
    }
    const config = await FacilitySportConfig.findOne({
      _id: body.configId,
      status: "Active",
    }).populate("sport", "SportName");
    if (!config) return fail(res, 404, "Sport configuration not found");
    const slot = config.slots.id(body.slotId);
    if (!slot || !slot.bookable) return fail(res, 400, "Selected slot is not bookable");

    const memberCount = Math.floor(Number(body.memberCount) || 1);
    const policy = effectivePolicy(config, slot);
    const minMembers = Number(policy.minMembers) || 1;
    const maxMembers = Number(policy.maxMembers) || 1;
    if (memberCount < minMembers || memberCount > maxMembers) {
      return fail(res, 400, `Member count must be between ${minMembers} and ${maxMembers}`);
    }
    const date = String(body.date || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 400, "Select a valid date");
    if (!String(body.name || "").trim() || !String(body.phone || "").trim()) {
      return fail(res, 400, "Booker name and mobile number are required");
    }

    const activeBookings = await Guest.find({
      facilitySportConfig: config._id,
      slotId: slot._id,
      Startdate: date,
      bookingStatus: { $ne: "Cancelled" },
    }).select("memberCount reservedUnits");
    if (policy.inventoryMode === "exclusive-unit") {
      const reserved = activeBookings.reduce(
        (sum, booking) => sum + (Number(booking.reservedUnits) || 1),
        0
      );
      if (reserved >= config.unitCount) return fail(res, 409, "All units are booked for this slot");
    } else {
      const occupied = activeBookings.reduce(
        (sum, booking) => sum + (Number(booking.memberCount) || 1),
        0
      );
      if (occupied + memberCount > slot.capacity) {
        return fail(res, 409, "The selected slot does not have enough remaining capacity");
      }
    }

    const price = totalFor(config, memberCount);
    const reference = `BK-${new Date().getFullYear()}-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;
    const booking = await Guest.create({
      Name: String(body.name).trim(),
      Email: String(body.email || "").trim(),
      ContactNum: String(body.phone).trim(),
      Role: 0,
      IsActive: 1,
      timeslot: { from: slot.startTime, to: slot.endTime },
      duration: 1,
      sport: config.sport._id,
      SportComplexId: config.facility,
      Startdate: date,
      Enddate: date,
      facilitySportConfig: config._id,
      slotId: slot._id,
      memberCount,
      reservedUnits: 1,
      totalAmount: price.total,
      bookingReference: reference,
      bookingStatus: "Pending Payment",
      priceBreakdown: {
        calculation: config.price.calculation || "flat",
        baseAmount: price.base,
        perMemberAmount: price.perMember,
        memberCount,
      },
    });

    return res.status(201).json({
      data: {
        id: booking._id,
        reference,
        sport: config.sport.SportName,
        slot: { label: slot.label, startTime: slot.startTime, endTime: slot.endTime },
        memberCount,
        totalAmount: price.total,
        reservationType: policy.reservationType,
        inventoryMode: policy.inventoryMode,
        status: booking.bookingStatus,
      },
      rcode: 200,
    });
  } catch (error) {
    console.error("Public booking failed:", error.message);
    return fail(res, 500, "Could not create booking");
  }
}

module.exports = { listConfigs, createBooking };
