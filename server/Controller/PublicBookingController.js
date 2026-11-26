const crypto = require("crypto");
const { exploreFacilities } = require("../Utils/facilityExplore");
const mongoose = require("mongoose");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const SportsComplex = require("../Model/SportsComplexModel");
const Guest = require("../Model/GuestModel");
const BookingPayment = require("../Model/BookingPaymentModel");
const Review = require("../Model/ReviewModel");
const FacilityAssessment = require("../Model/FacilityAssessmentModel");
const InstitutionBooking = require("../Model/InstitutionEventBookingModel");
const { ROLE } = require("../Utils/roles");
const {
  checkoutKeyId,
  createOrder,
  fetchPayment,
  verifyPaymentSignature,
} = require("../Services/razorpayService");

const fail = (res, status, message) =>
  res.status(status).json({ data: "", msg: message, rcode: -9 });

function conditionGrade(score) {
  if (score === null || score === undefined || score === "" || !Number.isFinite(Number(score))) return "Not assessed";
  const value = Number(score);
  if (value >= 85) return "Excellent";
  if (value >= 70) return "Good";
  if (value >= 50) return "Fair";
  return "Needs attention";
}

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

async function listFacilities(req, res) {
  try {
    const resolveFacilityType = (facility) => {
      const valid = ["Sports Complex", "Stadium", "Indoor Hall", "Training Centre", "Playground"];
      if (valid.includes(facility.facilityType)) return facility.facilityType;
      const category = String(facility.category || "").toLowerCase();
      const name = String(facility.name || "").toLowerCase();
      if (category.includes("stadium")) return "Stadium";
      if (name.includes("indoor")) return "Indoor Hall";
      if (category.includes("university") || category.includes("institutional")) return "Training Centre";
      if (category.includes("taluka") || (name.includes("ground") && !name.includes("complex"))) return "Playground";
      return "Sports Complex";
    };
    const facilities = await SportsComplex.find({ status: { $ne: "Inactive" } })
      .populate("district", "District")
      .populate("manager", "Name Email ContactNum")
      .populate("sports.sport", "SportName Category baseUrl description status")
      .sort({ name: 1 })
      .lean();
    const facilityIds = facilities.map((facility) => facility._id);
    const configs = await FacilitySportConfig.find({
      facility: { $in: facilityIds },
      status: "Active",
    })
      .populate("sport", "SportName Category baseUrl description status")
      .lean();
    const configsByFacility = new Map();
    configs.forEach((config) => {
      const key = String(config.facility);
      if (!configsByFacility.has(key)) configsByFacility.set(key, []);
      configsByFacility.get(key).push(config);
    });
    const reviews = await Review.find({
      facility: { $in: facilityIds },
      targetType: { $in: ["facility", "sport"] },
    }).select("facility sport targetType rating").lean();
    const assessments = await FacilityAssessment.find({
      facilityId: { $in: facilityIds },
      status: "Submitted",
    }).sort({ assessmentDate: -1, createdAt: -1 }).lean();
    const latestSportAssessment = new Map();
    assessments.forEach((assessment) => {
      if (!assessment.sportId || assessment.ai?.status !== "completed") return;
      const key = `${assessment.facilityId}:${assessment.sportId}`;
      if (!latestSportAssessment.has(key)) latestSportAssessment.set(key, assessment);
    });
    const sportCondition = (facilityId, sportId) => {
      const assessment = latestSportAssessment.get(`${facilityId}:${sportId}`);
      const score = Number(assessment?.ai?.visualConditionIndex);
      if (!assessment || !Number.isFinite(score)) return null;
      return {
        score,
        grade: conditionGrade(score),
        assessedAt: assessment.assessmentDate || assessment.ai?.analysedAt || assessment.createdAt,
        summary: assessment.ai?.overallSummary || "",
        priority: assessment.ai?.priority || "unknown",
      };
    };
    const ratingStats = new Map();
    reviews.forEach((review) => {
      const key = review.targetType === "facility"
        ? `facility:${review.facility}`
        : `sport:${review.facility}:${review.sport}`;
      const stat = ratingStats.get(key) || { sum: 0, count: 0 };
      stat.sum += Number(review.rating) || 0;
      stat.count += 1;
      ratingStats.set(key, stat);
    });
    const ratingFor = (key) => {
      const stat = ratingStats.get(key);
      return stat ? { average: Math.round((stat.sum / stat.count) * 10) / 10, count: stat.count } : null;
    };

    const data = facilities.map((facility) => {
      const configured = configsByFacility.get(String(facility._id)) || [];
      const sports = configured.length
        ? configured
            .filter((config) => config.sport && config.sport.status !== "Inactive")
            .map((config) => ({
            id: config.sport?._id,
            bookable: config.slots?.some((slot) => slot.bookable) || false,
            name: config.sport?.SportName || "Sport",
            category: config.sport?.Category || "Sport",
            image: config.sport?.baseUrl || "",
            description: config.sport?.description || "",
            type: config.bookingMode,
            unitLabel: config.unitLabel,
            units: config.unitCount,
            capacity: config.unitCount * config.capacityPerUnit,
            availability: config.status,
            feePerHour: `₹${config.price?.amount || 0}/${config.price?.unit || "slot"}`,
            price: config.price,
            surface: config.notes || "Details available at facility",
            rating: ratingFor(`sport:${facility._id}:${config.sport?._id}`)?.average,
            condition: sportCondition(facility._id, config.sport?._id),
            }))
        : (facility.sports || [])
            .filter((entry) => entry.sport && entry.sport.status !== "Inactive")
            .map((entry) => ({
              id: entry.sport._id,
              name: entry.sport.SportName,
              category: entry.sport.Category,
              image: entry.sport.baseUrl || entry.images?.[0] || "",
              description: entry.sport.description || "",
              type: "unconfigured",
              unitLabel: "",
              units: Number(entry.capacity) || 0,
              capacity: Number(entry.capacity) || 0,
              availability: "Active",
              feePerHour: entry.fees ? `₹${entry.fees}` : "Contact facility",
              surface: "Details available at facility",
              rating: ratingFor(`sport:${facility._id}:${entry.sport._id}`)?.average,
              condition: sportCondition(facility._id, entry.sport._id),
            }));
      const assessedSports = sports.map((sport) => sport.condition).filter(Boolean);
      const latestCondition = [...assessedSports].sort((a, b) => String(b.assessedAt).localeCompare(String(a.assessedAt)))[0];
      const overallConditionScore = assessedSports.length
        ? Math.round(assessedSports.reduce((sum, item) => sum + item.score, 0) / assessedSports.length)
        : null;
      return {
        id: facility._id,
        bookingAvailable: configured.length > 0,
        ratingSummary: ratingFor(`facility:${facility._id}`),
        name: facility.name,
        district: facility.district?.District || "Not specified",
        taluka: facility.taluka || "",
        location: facility.location,
        latitude: facility.latitude == null || facility.latitude === "" ? null : Number(facility.latitude),
        longitude: facility.longitude == null || facility.longitude === "" ? null : Number(facility.longitude),
        category: facility.category,
        facilityType: resolveFacilityType(facility),
        ownership: facility.ownership,
        operationalSince: facility.operationalSince,
        contactPerson: facility.manager?.Name || "Facility administration",
        contactPhone: facility.contactPhone || facility.manager?.ContactNum || "Not specified",
        contactEmail: facility.contactEmail || facility.manager?.Email || "Not specified",
        picture: facility.picture,
        gallery: facility.images || [],
        timings: facility.timings,
        amenities: facility.amenities,
        status: facility.status || "Active",
        condition: {
          grade: conditionGrade(overallConditionScore),
          score: overallConditionScore,
          lastInspectionDate: latestCondition?.assessedAt || null,
          maintenanceUrgency: assessedSports.some((item) => item.priority === "urgent") ? "Urgent" : latestCondition?.priority || "unknown",
          notes: latestCondition?.summary || "No submitted sport condition assessment yet.",
          assessedSports: assessedSports.length,
          totalSports: sports.length,
        },
        utilisation: {
          capacityDaily: facility.capacityDaily,
          currentDailyFootfall: facility.currentDailyFootfall,
          utilizationRate: facility.utilisationRate,
        },
        details: {
          status: facility.status,
          area: facility.area,
          taluka: facility.taluka,
        },
        sports,
      };
    });
    let result;
    try {
      result = exploreFacilities(data, req.query);
    } catch (error) {
      return fail(res, 400, error.message);
    }
    const visibleData = req.query.bookableOnly === "true"
      ? result.data.filter((facility) => facility.bookingAvailable)
      : result.data;
    return res.json({ ...result, data: visibleData, rcode: 200 });
  } catch (error) {
    console.error("Public facility listing failed:", error);
    return fail(res, 500, "Could not load facilities");
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

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function bookingWindow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const start = `${value.year}-${value.month}-${value.day}`;
  const end = new Date(Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)));
  end.setUTCMonth(end.getUTCMonth() + 2);
  return { start, end: dateOnly(end) };
}

function slotRunsOn(slot, date) {
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date(`${date}T00:00:00Z`).getUTCDay()
  ];
  return !slot.days?.length || slot.days.includes(day);
}

function currentIndiaTime() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.hour}:${value.minute}`;
}

function slotCanStillBeBooked(slot, date, window) {
  return slotRunsOn(slot, date) && (date !== window.start || slot.startTime > currentIndiaTime());
}

async function availability(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return fail(res, 400, "Invalid sport configuration");
    const config = await FacilitySportConfig.findOne({ _id: req.params.id, status: "Active" })
      .populate("sport", "SportName")
      .populate({ path: "slots.coach", select: "userId", populate: { path: "userId", select: "Name" } });
    if (!config) return fail(res, 404, "Sport configuration not found");
    const window = bookingWindow();
    const pendingCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const [bookings, institutionEvents] = await Promise.all([
      Guest.find({
        facilitySportConfig: config._id,
        Startdate: { $gte: window.start, $lte: window.end },
        $or: [
          { bookingStatus: "Confirmed" },
          { bookingStatus: "Pending Payment", createdAt: { $gte: pendingCutoff } },
        ],
      }).select("Startdate slotId memberCount reservedUnits").lean(),
      InstitutionBooking.find({
        status: "Confirmed",
        selections: { $elemMatch: { facilitySportConfig: config._id, date: { $gte: window.start, $lte: window.end } } },
      }).select("selections").lean(),
    ]);
    const used = new Map();
    bookings.forEach((booking) => {
      const key = `${booking.Startdate}:${booking.slotId}`;
      const current = used.get(key) || { members: 0, units: 0 };
      current.members += Number(booking.memberCount) || 1;
      current.units += Number(booking.reservedUnits) || 1;
      used.set(key, current);
    });
    institutionEvents.forEach((event) => {
      (event.selections || []).forEach((selection) => {
        if (String(selection.facilitySportConfig) !== String(config._id) || selection.date < window.start || selection.date > window.end) return;
        const key = `${selection.date}:${selection.slotId}`;
        const current = used.get(key) || { members: 0, units: 0 };
        current.members += Number(selection.reservedUnits) || 1;
        current.units += Number(selection.reservedUnits) || 1;
        used.set(key, current);
      });
    });
    const dates = [];
    for (let cursor = new Date(`${window.start}T00:00:00Z`); dateOnly(cursor) <= window.end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const date = dateOnly(cursor);
      const slots = config.slots.filter((slot) => slot.bookable && slotCanStillBeBooked(slot, date, window)).map((slot) => {
        const policy = effectivePolicy(config, slot);
        const consumed = used.get(`${date}:${slot._id}`) || { members: 0, units: 0 };
        const remaining = policy.inventoryMode === "exclusive-unit"
          ? Math.max(0, config.unitCount - consumed.units)
          : Math.max(0, slot.capacity - consumed.members);
        return {
          id: slot._id,
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          audience: slot.audience,
          purpose: slot.purpose,
          coach: slot.coach?.userId?.Name || "",
          remaining,
          inventoryLabel: policy.inventoryMode === "exclusive-unit" ? config.unitLabel : "places",
          bookingPolicy: policy,
        };
      });
      dates.push({ date, available: slots.reduce((sum, slot) => sum + slot.remaining, 0), slots });
    }
    return res.json({ data: { window, sport: config.sport?.SportName, unitLabel: config.unitLabel, dates }, rcode: 200 });
  } catch (error) {
    return fail(res, 500, "Could not load availability");
  }
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
    const facility = await SportsComplex.findById(config.facility).select("status");
    if (!facility || (facility.status && facility.status !== "Active")) {
      return fail(res, 409, "This facility is not accepting bookings");
    }
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
    const parsedDate = new Date(`${date}T12:00:00+05:30`);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    if (
      !Number.isFinite(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date ||
      date < today
    ) {
      return fail(res, 400, "Choose a valid date today or later");
    }
    const day = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    }).format(parsedDate).toLowerCase();
    if (
      slot.days?.length &&
      !slot.days.some((value) => value.toLowerCase().slice(0, 3) === day)
    ) {
      return fail(res, 400, "This slot does not run on the selected day");
    }
    const window = bookingWindow();
    if (date < window.start || date > window.end) {
      return fail(res, 400, `Bookings are available only from ${window.start} to ${window.end}`);
    }
    if (!slotCanStillBeBooked(slot, date, window)) return fail(res, 400, "This slot is not available at the selected date and time");
    const citizen = req.user?.Role === ROLE.ATHLETE ? req.user : null;
    const bookerName = citizen?.Name || String(body.name || "").trim();
    const bookerEmail = citizen?.Email || String(body.email || "").trim();
    const bookerPhone = citizen?.ContactNum || String(body.phone || "").trim();
    if (!bookerName || !bookerPhone) {
      return fail(res, 400, "Booker name and mobile number are required");
    }

    const pendingCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const [activeBookings, activeInstitutionEvents] = await Promise.all([
      Guest.find({
        facilitySportConfig: config._id,
        slotId: slot._id,
        Startdate: date,
        $or: [
          { bookingStatus: "Confirmed" },
          { bookingStatus: "Pending Payment", createdAt: { $gte: pendingCutoff } },
        ],
      }).select("memberCount reservedUnits"),
      InstitutionBooking.find({
        status: "Confirmed",
        selections: { $elemMatch: { facilitySportConfig: config._id, slotId: slot._id, date } },
      }).select("selections").lean(),
    ]);
    const institutionalSelections = activeInstitutionEvents
      .flatMap((event) => event.selections || [])
      .filter((item) => String(item.facilitySportConfig) === String(config._id) && String(item.slotId) === String(slot._id) && item.date === date);
    if (policy.inventoryMode === "exclusive-unit") {
      const reserved = activeBookings.reduce(
        (sum, booking) => sum + (Number(booking.reservedUnits) || 1),
        0
      ) + institutionalSelections.reduce((sum, booking) => sum + (Number(booking.reservedUnits) || 1), 0);
      if (reserved >= config.unitCount) return fail(res, 409, "All units are booked for this slot");
    } else {
      const occupied = activeBookings.reduce(
        (sum, booking) => sum + (Number(booking.memberCount) || 1),
        0
      ) + institutionalSelections.reduce((sum, booking) => sum + (Number(booking.reservedUnits) || 1), 0);
      if (occupied + memberCount > slot.capacity) {
        return fail(res, 409, "The selected slot does not have enough remaining capacity");
      }
    }

    const price = totalFor(config, memberCount);
    if (price.total < 1) return fail(res, 400, "This booking does not have a payable price");
    const reference = `BK-${new Date().getFullYear()}-${crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase()}`;
    const order = await createOrder({
      amount: price.total,
      receipt: reference,
      notes: {
        booking_reference: reference,
        facility_id: String(config.facility),
        sport: config.sport.SportName,
      },
    });
    const booking = await Guest.create({
      Name: bookerName,
      Email: bookerEmail,
      ContactNum: bookerPhone,
      citizenUser: citizen?._id || null,
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
      coach: slot.coach || null,
      memberCount,
      reservedUnits: 1,
      totalAmount: price.total,
      bookingReference: reference,
      bookingStatus: "Pending Payment",
      paymentStatus: "Pending",
      razorpayOrderId: order.id,
      priceBreakdown: {
        calculation: config.price.calculation || "flat",
        baseAmount: price.base,
        perMemberAmount: price.perMember,
        memberCount,
      },
    });
    await BookingPayment.create({
      booking: booking._id,
      bookingReference: reference,
      facility: config.facility,
      sport: config.sport._id,
      coach: slot.coach || null,
      amount: price.total,
      currency: "INR",
      status: "Created",
      razorpayOrderId: order.id,
      payer: {
        name: bookerName,
        email: bookerEmail,
        phone: bookerPhone,
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
        payment: {
          keyId: checkoutKeyId(),
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          description: `${config.sport.SportName} booking at the selected facility`,
          prefill: {
            name: booking.Name,
            email: booking.Email,
            contact: booking.ContactNum,
          },
        },
      },
      rcode: 200,
    });
  } catch (error) {
    console.error("Public booking failed:", error.message);
    return fail(res, 500, "Could not create booking");
  }
}

async function myBookings(req, res) {
  try {
    const Attendance = require("../Model/BookingAttendanceModel");
    const query = {
      $or: [
        { citizenUser: req.user._id },
        ...(req.user.Email ? [{ citizenUser: null, Email: req.user.Email }] : []),
      ],
    };
    const bookings = await Guest.find(query)
      .populate("sport", "SportName baseUrl")
      .populate("SportComplexId", "name location district")
      .populate({ path: "coach", select: "userId", populate: { path: "userId", select: "Name" } })
      .sort({ Startdate: -1, createdAt: -1 })
      .lean();
    const attendanceRows = bookings.length
      ? await Attendance.find({ booking: { $in: bookings.map((booking) => booking._id) } })
        .select("booking entryAt exitAt")
        .lean()
      : [];
    const attendanceByBooking = new Map(attendanceRows.map((item) => [String(item.booking), item]));
    return res.json({
      data: bookings.map((booking) => {
        const attendance = attendanceByBooking.get(String(booking._id));
        return ({
        id: booking._id,
        reference: booking.bookingReference,
        facility: booking.SportComplexId?.name || "Facility",
        facilityId: booking.SportComplexId?._id || booking.SportComplexId,
        location: booking.SportComplexId?.location || "",
        sport: booking.sport?.SportName || "Sport",
        sportId: booking.sport?._id || booking.sport,
        coach: booking.coach?.userId?.Name || "—",
        coachId: booking.coach?._id || booking.coach || null,
        date: booking.Startdate,
        time: booking.timeslot,
        members: booking.memberCount || 1,
        amount: booking.totalAmount || 0,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        paymentId: booking.razorpayPaymentId || "",
        paidAt: booking.paidAt,
        name: booking.Name,
        email: booking.Email,
        phone: booking.ContactNum,
        attendanceStatus: attendance?.exitAt ? "Completed" : attendance?.entryAt ? "Checked In" : "Not Checked In",
        checkedInAt: attendance?.entryAt || null,
        checkedOutAt: attendance?.exitAt || null,
        qrAvailable: booking.bookingStatus === "Confirmed" && booking.paymentStatus === "Paid" && !attendance?.exitAt,
        createdAt: booking.createdAt,
      }); }),
      rcode: 200,
    });
  } catch (error) {
    return fail(res, 500, "Could not load your bookings");
  }
}

async function verifyBookingPayment(req, res) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return fail(res, 400, "Invalid booking");
    }
    const body = req.body || {};
    const paymentRecord = await BookingPayment.findOne({
      booking: req.params.id,
      razorpayOrderId: body.razorpay_order_id,
    });
    if (!paymentRecord) return fail(res, 404, "Payment order not found");
    if (!verifyPaymentSignature({
      orderId: paymentRecord.razorpayOrderId,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    })) {
      return fail(res, 400, "Payment signature verification failed");
    }

    if (paymentRecord.status !== "Paid") {
      const gatewayPayment = await fetchPayment(body.razorpay_payment_id);
      if (
        gatewayPayment.order_id !== paymentRecord.razorpayOrderId ||
        Number(gatewayPayment.amount) !== Math.round(paymentRecord.amount * 100) ||
        gatewayPayment.currency !== "INR" ||
        gatewayPayment.status !== "captured"
      ) {
        return fail(res, 409, "Payment is not captured yet");
      }
      const paidAt = new Date();
      await Promise.all([
        BookingPayment.updateOne(
          { _id: paymentRecord._id },
          {
            $set: {
              status: "Paid",
              razorpayPaymentId: gatewayPayment.id,
              paidAt,
              gatewayDetails: {
                method: gatewayPayment.method,
                captured: gatewayPayment.captured,
                fee: gatewayPayment.fee,
                tax: gatewayPayment.tax,
              },
            },
          }
        ),
        Guest.updateOne(
          { _id: req.params.id },
          {
            $set: {
              bookingStatus: "Confirmed",
              paymentStatus: "Paid",
              razorpayPaymentId: gatewayPayment.id,
              paidAt,
            },
          }
        ),
      ]);
    }

    const booking = await Guest.findById(req.params.id).select(
      "bookingReference bookingStatus paymentStatus totalAmount paidAt razorpayPaymentId"
    );
    const pass = await require("../Utils/bookingPass").loadBookingPass(req.params.id);
    return res.json({ data: { ...booking.toObject(), pass }, rcode: 200 });
  } catch (error) {
    console.error("Payment verification failed:", error.message);
    return fail(res, 500, "Could not verify payment");
  }
}

module.exports = { listFacilities, listConfigs, availability, createBooking, verifyBookingPayment, myBookings };
