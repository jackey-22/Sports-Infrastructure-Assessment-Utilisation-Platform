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
const Instructor = require("../Model/instructorModel");
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
    images: value.images || [],
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
    subscriptionPlans: (value.subscriptionPlans || [])
      .filter((plan) => plan.active !== false)
      .map((plan) => (plan.toObject ? plan.toObject() : plan)),
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
        photos: (assessment.photos || []).map((p) => p?.url).filter(Boolean),
      };
    };
    const conditionPhotosByFacility = new Map();
    assessments.forEach((assessment) => {
      const key = String(assessment.facilityId);
      const list = conditionPhotosByFacility.get(key) || [];
      (assessment.photos || []).forEach((photo) => {
        if (photo?.url && list.length < 12) {
          list.push({
            url: photo.url,
            sportName: assessment.sportName || "Facility",
            date: assessment.assessmentDate || "",
            score: assessment.ai?.visualConditionIndex ?? null,
          });
        }
      });
      conditionPhotosByFacility.set(key, list);
    });
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
      const facilitySportImages = new Map(
        (facility.sports || []).map((entry) => [
          String(entry.sport?._id || entry.sport),
          Array.isArray(entry.images) ? entry.images.filter(Boolean) : [],
        ])
      );
      const sports = configured.length
        ? configured
            .filter((config) => config.sport && config.sport.status !== "Inactive")
            .map((config) => {
              const sportGallery = (config.images && config.images.length)
                ? config.images
                : (facilitySportImages.get(String(config.sport?._id)) || []);
              const bookableSlots = (config.slots || []).filter((slot) => slot.bookable !== false);
              const activePlans = (config.subscriptionPlans || []).filter((p) => p.active !== false);
              return {
                id: config.sport?._id,
                bookable: bookableSlots.length > 0 || activePlans.length > 0,
                name: config.sport?.SportName || "Sport",
                category: config.sport?.Category || "Sport",
                image: sportGallery[0] || config.sport?.baseUrl || "",
                images: sportGallery,
                description: config.sport?.description || "",
                type: config.bookingMode,
                unitLabel: config.unitLabel,
                units: config.unitCount,
                capacity: config.unitCount * config.capacityPerUnit,
                availability: config.status,
                feePerHour: `₹${config.price?.amount || 0}/${config.price?.unit || "slot"}`,
                price: config.price,
                purposes: [...new Set(bookableSlots.map((s) => s.purpose).filter(Boolean))],
                audiences: [...new Set(bookableSlots.map((s) => s.audience).filter(Boolean))],
                subscriptionPlans: activePlans,
                surface: config.notes || "Details available at facility",
                rating: ratingFor(`sport:${facility._id}:${config.sport?._id}`)?.average,
                condition: sportCondition(facility._id, config.sport?._id),
              };
            })
        : (facility.sports || [])
            .filter((entry) => entry.sport && entry.sport.status !== "Inactive")
            .map((entry) => ({
              id: entry.sport._id,
              name: entry.sport.SportName,
              category: entry.sport.Category,
              image: entry.images?.[0] || entry.sport.baseUrl || "",
              images: entry.images || [],
              description: entry.sport.description || "",
              type: "unconfigured",
              unitLabel: "",
              units: Number(entry.capacity) || 0,
              capacity: Number(entry.capacity) || 0,
              availability: "Active",
              feePerHour: entry.fees ? `₹${entry.fees}` : "Contact facility",
              purposes: [],
              audiences: [],
              subscriptionPlans: [],
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
        hasSubscriptions: sports.some((s) => (s.subscriptionPlans || []).length > 0),
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
        conditionPhotos: conditionPhotosByFacility.get(String(facility._id)) || [],
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
    const sourceData = req.query.bookableOnly === "true"
      ? data.filter((facility) => facility.bookingAvailable)
      : data;
    let result;
    try {
      result = exploreFacilities(sourceData, req.query);
    } catch (error) {
      return fail(res, 400, error.message);
    }
    return res.json({ ...result, rcode: 200 });
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

function addDaysToDateStr(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

async function resolveAssignedCoach(config, slot) {
  let assignedCoach = slot?.coach || null;
  if (!assignedCoach) {
    const availableCoach = await Instructor.findOne({
      SportComplexId: config.facility,
      "sports.sport": config.sport._id,
      status: "Active",
    }).select("_id");
    if (availableCoach) return availableCoach._id;
    const fallbackCoach = await Instructor.findOne({
      SportComplexId: config.facility,
      status: "Active",
    }).select("_id");
    if (fallbackCoach) return fallbackCoach._id;
  }
  return assignedCoach;
}

async function createBooking(req, res) {
  try {
    const body = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(body.configId)) {
      return fail(res, 400, "Select a valid sport");
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

    const citizen = req.user?.Role === ROLE.ATHLETE ? req.user : null;
    const bookerName = citizen?.Name || String(body.name || "").trim();
    const bookerEmail = citizen?.Email || String(body.email || "").trim();
    const bookerPhone = citizen?.ContactNum || String(body.phone || "").trim();
    if (!bookerName || !bookerPhone) {
      return fail(res, 400, "Athlete name and mobile number are required");
    }

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const window = bookingWindow();
    const pendingCutoff = new Date(Date.now() - 15 * 60 * 1000);

    // 1. Dynamic Subscription Plan booking (Monthly / Yearly)
    if (body.bookingType === "subscription" && mongoose.Types.ObjectId.isValid(body.planId)) {
      const plan = (config.subscriptionPlans || []).find(
        (p) => String(p._id) === String(body.planId) && p.active !== false
      );
      if (!plan) return fail(res, 404, "Subscription plan not found or inactive");
      const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.date || "")) ? String(body.date) : today;
      if (startDate < today) return fail(res, 400, "Start date must be today or later");
      const durationDays = Number(plan.durationDays) || (plan.durationType === "yearly" ? 365 : 30);
      const endDate = addDaysToDateStr(startDate, Math.max(1, durationDays) - 1);
      const slot = (plan.slotId && config.slots.id(plan.slotId)) ||
        (body.slotId && mongoose.Types.ObjectId.isValid(body.slotId) && config.slots.id(body.slotId)) ||
        config.slots.find((s) => s.bookable) ||
        config.slots[0] ||
        null;
      const planPrice = Number(plan.price) || 0;
      if (planPrice < 1) return fail(res, 400, "This subscription plan does not have a valid price");
      const reference = `SUB-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
      const order = await createOrder({
        amount: planPrice,
        receipt: reference,
        notes: {
          booking_reference: reference,
          facility_id: String(config.facility),
          sport: config.sport.SportName,
          plan: plan.name,
        },
      });
      const assignedCoach = await resolveAssignedCoach(config, slot);
      const booking = await Guest.create({
        Name: bookerName,
        Email: bookerEmail,
        ContactNum: bookerPhone,
        citizenUser: citizen?._id || null,
        Role: 0,
        IsActive: 1,
        timeslot: slot ? { from: slot.startTime, to: slot.endTime } : { from: "06:00", to: "21:00" },
        duration: durationDays,
        sport: config.sport._id,
        SportComplexId: config.facility,
        Startdate: startDate,
        Enddate: endDate,
        facilitySportConfig: config._id,
        slotId: slot?._id || null,
        coach: assignedCoach,
        memberCount: 1,
        reservedUnits: 1,
        totalAmount: planPrice,
        bookingReference: reference,
        bookingType: "subscription",
        subscriptionPlan: {
          planId: plan._id,
          name: plan.name,
          durationType: plan.durationType,
          durationDays,
        },
        bookingStatus: "Pending Payment",
        paymentStatus: "Pending",
        razorpayOrderId: order.id,
        priceBreakdown: {
          calculation: plan.durationType,
          planName: plan.name,
          durationDays,
          baseAmount: planPrice,
        },
      });
      await BookingPayment.create({
        booking: booking._id,
        bookingIds: [booking._id],
        bookingReference: reference,
        facility: config.facility,
        sport: config.sport._id,
        coach: assignedCoach,
        amount: planPrice,
        currency: "INR",
        status: "Created",
        razorpayOrderId: order.id,
        payer: { name: bookerName, email: bookerEmail, phone: bookerPhone },
      });
      return res.status(201).json({
        data: {
          id: booking._id,
          reference,
          bookingType: "subscription",
          sport: config.sport.SportName,
          plan: { name: plan.name, durationType: plan.durationType, durationDays, startDate, endDate },
          slot: slot ? { label: slot.label, startTime: slot.startTime, endTime: slot.endTime } : { label: plan.name, startTime: "06:00", endTime: "21:00" },
          memberCount: 1,
          totalAmount: planPrice,
          status: booking.bookingStatus,
          payment: {
            keyId: checkoutKeyId(),
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            description: `${plan.name} (${plan.durationType}) · ${config.sport.SportName}`,
            prefill: { name: booking.Name, email: booking.Email, contact: booking.ContactNum },
          },
        },
        rcode: 200,
      });
    }

    // 2. Build selections list (supports single booking OR multi-slot/multi-day bulk booking)
    const rawSelections = Array.isArray(body.selections) && body.selections.length
      ? body.selections
      : [{ slotId: body.slotId, date: body.date, memberCount: body.memberCount }];

    if (rawSelections.length > 30) {
      return fail(res, 400, "Select up to 30 slot sessions per bulk booking");
    }

    const prepared = [];
    const seenKeys = new Set();
    for (const item of rawSelections) {
      if (!mongoose.Types.ObjectId.isValid(item?.slotId)) {
        return fail(res, 400, "Select a valid time slot");
      }
      const slot = config.slots.id(item.slotId);
      if (!slot || !slot.bookable) return fail(res, 400, "Selected slot is not bookable");

      const itemDate = String(item.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(itemDate)) return fail(res, 400, "Select a valid date");
      const parsedDate = new Date(`${itemDate}T12:00:00+05:30`);
      if (
        !Number.isFinite(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== itemDate ||
        itemDate < today
      ) {
        return fail(res, 400, "Choose valid dates today or later");
      }
      const day = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
      }).format(parsedDate).toLowerCase();
      if (slot.days?.length && !slot.days.some((v) => v.toLowerCase().slice(0, 3) === day)) {
        return fail(res, 400, `Slot "${slot.label}" does not run on ${itemDate}`);
      }
      if (itemDate < window.start || itemDate > window.end) {
        return fail(res, 400, `Bookings are available only from ${window.start} to ${window.end}`);
      }
      if (!slotCanStillBeBooked(slot, itemDate, window)) {
        return fail(res, 400, `Slot "${slot.label}" on ${itemDate} is no longer bookable`);
      }

      const uniqueKey = `${itemDate}:${slot._id}`;
      if (seenKeys.has(uniqueKey)) {
        return fail(res, 400, `Duplicate slot "${slot.label}" selected on ${itemDate}`);
      }
      seenKeys.add(uniqueKey);

      const memberCount = Math.floor(Number(item.memberCount ?? body.memberCount) || 1);
      const policy = effectivePolicy(config, slot);
      const minMembers = Number(policy.minMembers) || 1;
      const maxMembers = Number(policy.maxMembers) || 1;
      if (memberCount < minMembers || memberCount > maxMembers) {
        return fail(res, 400, `Member count must be between ${minMembers} and ${maxMembers}`);
      }

      const [activeBookings, activeInstitutionEvents] = await Promise.all([
        Guest.find({
          facilitySportConfig: config._id,
          slotId: slot._id,
          Startdate: itemDate,
          $or: [
            { bookingStatus: "Confirmed" },
            { bookingStatus: "Pending Payment", createdAt: { $gte: pendingCutoff } },
          ],
        }).select("memberCount reservedUnits"),
        InstitutionBooking.find({
          status: "Confirmed",
          selections: { $elemMatch: { facilitySportConfig: config._id, slotId: slot._id, date: itemDate } },
        }).select("selections").lean(),
      ]);
      const institutionalSelections = activeInstitutionEvents
        .flatMap((event) => event.selections || [])
        .filter((sel) => String(sel.facilitySportConfig) === String(config._id) && String(sel.slotId) === String(slot._id) && sel.date === itemDate);
      if (policy.inventoryMode === "exclusive-unit") {
        const reserved = activeBookings.reduce((s, b) => s + (Number(b.reservedUnits) || 1), 0) +
          institutionalSelections.reduce((s, b) => s + (Number(b.reservedUnits) || 1), 0);
        if (reserved >= config.unitCount) {
          return fail(res, 409, `All units are booked for ${slot.label} on ${itemDate}`);
        }
      } else {
        const occupied = activeBookings.reduce((s, b) => s + (Number(b.memberCount) || 1), 0) +
          institutionalSelections.reduce((s, b) => s + (Number(b.reservedUnits) || 1), 0);
        if (occupied + memberCount > slot.capacity) {
          return fail(res, 409, `${slot.label} on ${itemDate} does not have enough capacity left`);
        }
      }

      const price = totalFor(config, memberCount);
      if (price.total < 1) return fail(res, 400, "This booking does not have a payable price");
      prepared.push({ slot, date: itemDate, memberCount, policy, price });
    }

    const totalAmount = prepared.reduce((sum, item) => sum + item.price.total, 0);
    const isBulk = prepared.length > 1;
    const baseRef = `BK-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const order = await createOrder({
      amount: totalAmount,
      receipt: baseRef,
      notes: {
        booking_reference: baseRef,
        facility_id: String(config.facility),
        sport: config.sport.SportName,
        sessions: String(prepared.length),
      },
    });

    const createdBookings = [];
    for (let idx = 0; idx < prepared.length; idx += 1) {
      const item = prepared[idx];
      const ref = isBulk ? `${baseRef}-${idx + 1}` : baseRef;
      const assignedCoach = await resolveAssignedCoach(config, item.slot);
      const doc = await Guest.create({
        Name: bookerName,
        Email: bookerEmail,
        ContactNum: bookerPhone,
        citizenUser: citizen?._id || null,
        Role: 0,
        IsActive: 1,
        timeslot: { from: item.slot.startTime, to: item.slot.endTime },
        duration: 1,
        sport: config.sport._id,
        SportComplexId: config.facility,
        Startdate: item.date,
        Enddate: item.date,
        facilitySportConfig: config._id,
        slotId: item.slot._id,
        coach: assignedCoach,
        memberCount: item.memberCount,
        reservedUnits: 1,
        totalAmount: item.price.total,
        bookingReference: ref,
        bookingType: isBulk ? "bulk" : "slot",
        bulkGroupId: isBulk ? baseRef : null,
        bookingStatus: "Pending Payment",
        paymentStatus: "Pending",
        razorpayOrderId: order.id,
        priceBreakdown: {
          calculation: config.price.calculation || "flat",
          baseAmount: item.price.base,
          perMemberAmount: item.price.perMember,
          memberCount: item.memberCount,
        },
      });
      createdBookings.push(doc);
    }

    await BookingPayment.create({
      booking: createdBookings[0]._id,
      bookingIds: createdBookings.map((d) => d._id),
      bookingReference: baseRef,
      facility: config.facility,
      sport: config.sport._id,
      coach: createdBookings[0].coach,
      amount: totalAmount,
      currency: "INR",
      status: "Created",
      razorpayOrderId: order.id,
      payer: { name: bookerName, email: bookerEmail, phone: bookerPhone },
    });

    const first = prepared[0];
    return res.status(201).json({
      data: {
        id: createdBookings[0]._id,
        bookingIds: createdBookings.map((d) => String(d._id)),
        reference: baseRef,
        bookingType: isBulk ? "bulk" : "slot",
        sessionsCount: prepared.length,
        sport: config.sport.SportName,
        slot: { label: first.slot.label, startTime: first.slot.startTime, endTime: first.slot.endTime },
        selections: prepared.map((item, idx) => ({
          id: String(createdBookings[idx]._id),
          reference: createdBookings[idx].bookingReference,
          date: item.date,
          slotLabel: item.slot.label,
          startTime: item.slot.startTime,
          endTime: item.slot.endTime,
          memberCount: item.memberCount,
          amount: item.price.total,
        })),
        memberCount: first.memberCount,
        totalAmount,
        reservationType: first.policy.reservationType,
        inventoryMode: first.policy.inventoryMode,
        status: createdBookings[0].bookingStatus,
        payment: {
          keyId: checkoutKeyId(),
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          description: isBulk
            ? `${config.sport.SportName} bulk booking (${prepared.length} sessions)`
            : `${config.sport.SportName} booking at the selected facility`,
          prefill: { name: bookerName, email: bookerEmail, contact: bookerPhone },
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
      bookingStatus: "Confirmed",
      paymentStatus: "Paid",
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
        bookingType: booking.bookingType || "slot",
        bulkGroupId: booking.bulkGroupId || null,
        subscriptionPlan: booking.subscriptionPlan?.name ? booking.subscriptionPlan : null,
        facility: booking.SportComplexId?.name || "Facility",
        facilityId: booking.SportComplexId?._id || booking.SportComplexId,
        location: booking.SportComplexId?.location || "",
        sport: booking.sport?.SportName || "Sport",
        sportId: booking.sport?._id || booking.sport,
        coach: booking.coach?.userId?.Name || "—",
        coachId: booking.coach?._id || booking.coach || null,
        date: booking.Startdate,
        endDate: booking.Enddate || booking.Startdate,
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
      razorpayOrderId: body.razorpay_order_id,
      $or: [{ booking: req.params.id }, { bookingIds: req.params.id }],
    });
    if (!paymentRecord) return fail(res, 404, "Payment order not found");
    if (!verifyPaymentSignature({
      orderId: paymentRecord.razorpayOrderId,
      paymentId: body.razorpay_payment_id,
      signature: body.razorpay_signature,
    })) {
      return fail(res, 400, "Payment signature verification failed");
    }

    const allBookingIds = (paymentRecord.bookingIds && paymentRecord.bookingIds.length)
      ? paymentRecord.bookingIds
      : [paymentRecord.booking];

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
        Guest.updateMany(
          { _id: { $in: allBookingIds } },
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
      "bookingReference bookingType bulkGroupId subscriptionPlan Startdate Enddate bookingStatus paymentStatus totalAmount paidAt razorpayPaymentId"
    );
    const passHelper = require("../Utils/bookingPass");
    const passes = (await Promise.all(allBookingIds.map((bid) => passHelper.loadBookingPass(bid)))).filter(Boolean);
    return res.json({ data: { ...booking.toObject(), totalAmount: paymentRecord.amount, pass: passes[0] || null, passes }, rcode: 200 });
  } catch (error) {
    console.error("Payment verification failed:", error.message);
    return fail(res, 500, "Could not verify payment");
  }
}

module.exports = { listFacilities, listConfigs, availability, createBooking, verifyBookingPayment, myBookings };
