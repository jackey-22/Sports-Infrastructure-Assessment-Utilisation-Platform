const SportsComplex = require("../Model/SportsComplexModel");
const Sport = require("../Model/SportModel");
const User = require("../Model/UsersModel");
const Instructor = require("../Model/instructorModel");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const Guest = require("../Model/GuestModel");
const BookingPayment = require("../Model/BookingPaymentModel");
const Complaint = require("../Model/ComplaintModel");
const Grant = require("../Model/GrantModel");
const FacilityAssessment = require("../Model/FacilityAssessmentModel");
const Review = require("../Model/ReviewModel");
const AthleteRating = require("../Model/athleteRatingModel");
const PerformanceEvaluation = require("../Model/PerformanceEvaluationModel");
const InstitutionEventBooking = require("../Model/InstitutionEventBookingModel");
const BookingAttendance = require("../Model/BookingAttendanceModel");
const { ROLE } = require("../Utils/roles");
const { verifiedGrantTotals } = require("../Utils/grantProgress");
const { summariseUtilisation } = require("../Utils/utilisation");
const { computeSchedules } = require("./MaintenanceCycleController");

const fail = (res, status, msg) => res.status(status).json({ data: "", msg, rcode: -9 });
const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

function indiaDate() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function recentMonths(count = 6) {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (count - 1 - index), 1));
    return { key: monthKey(date), label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" }), bookings: 0, revenue: 0 };
  });
}

async function managerFacility(user) {
  if (user.SportComplexId) return SportsComplex.findById(user.SportComplexId).populate("district", "District").lean();
  return SportsComplex.findOne({ manager: user._id }).populate("district", "District").lean();
}

function grantStats(grants) {
  let allocated = 0; let utilised = 0; let pendingProofs = 0; let queries = 0;
  grants.forEach((grant) => {
    allocated += Number(grant.allocatedAmount) || 0;
    const verifiedUsage = verifiedGrantTotals(grant).amountUsed;
    (grant.progressUpdates || []).forEach((progress) => {
      if (progress.reviewStatus === "Pending") pendingProofs += 1;
      if (progress.reviewStatus === "Query Raised") queries += 1;
    });
    utilised += verifiedUsage;
  });
  return { count: grants.length, allocated, utilised, pendingProofs, queries };
}

async function buildDashboard({ facility = null, days = 30 }) {
  const facilityFilter = facility ? { facility: facility._id } : {};
  const bookingFacilityFilter = facility ? { SportComplexId: facility._id } : {};
  const complaintFilter = facility ? { sportsComplex: facility._id } : {};
  const grantFilter = facility ? { facility: facility._id } : {};
  const assessmentFilter = facility ? { facilityId: facility._id } : {};
  const coachFilter = facility ? { SportComplexId: facility._id } : {};
  const months = recentMonths();
  const trendStart = new Date(`${months[0].key}-01T00:00:00.000Z`);
  const today = indiaDate();
  const windowStart = new Date(new Date(`${today}T00:00:00.000Z`) - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [facilities, sportsCount, coachesCount, citizensCount, configs, bookings, institutionalBookings, trendBookings, payments, complaints, grants, assessmentCount, reviews, attendances] = await Promise.all([
    facility ? [facility] : SportsComplex.find().populate("district", "District").lean(),
    facility ? FacilitySportConfig.distinct("sport", { facility: facility._id, status: "Active" }).then((ids) => ids.length) : Sport.countDocuments({ status: "Active" }),
    Instructor.countDocuments({ ...coachFilter, status: "Active" }),
    facility ? Guest.distinct("citizenUser", { ...bookingFacilityFilter, bookingStatus: "Confirmed", paymentStatus: "Paid", citizenUser: { $ne: null } }).then((ids) => ids.length) : User.countDocuments({ Role: ROLE.ATHLETE, IsActive: { $ne: 0 } }),
    FacilitySportConfig.find({ ...facilityFilter, status: "Active" }).populate("sport", "SportName").lean(),
    Guest.find({ ...bookingFacilityFilter, bookingStatus: "Confirmed", paymentStatus: "Paid" }).select("Startdate bookingStatus paymentStatus memberCount reservedUnits slotId facilitySportConfig sport SportComplexId").lean(),
    InstitutionEventBooking.find(facility ? { facility: facility._id } : {}).select("facility status selections").lean(),
    Guest.find({ ...bookingFacilityFilter, bookingStatus: "Confirmed", paymentStatus: "Paid", createdAt: { $gte: trendStart } }).select("createdAt").lean(),
    BookingPayment.find(facilityFilter).populate("sport", "SportName").populate("facility", "name").sort({ createdAt: -1 }).lean(),
    Complaint.find(complaintFilter).select("workflowStatus status dueAt createdAt subject sportsComplex").sort({ createdAt: -1 }).lean(),
    Grant.find(grantFilter).select("allocatedAmount status progressUpdates facility title").lean(),
    FacilityAssessment.countDocuments(assessmentFilter),
    Review.find(facilityFilter).select("targetType rating facility").lean(),
    BookingAttendance.find({ ...(facility ? { facility: facility._id } : {}), date: { $gte: windowStart, $lte: today } }).select("booking facility date members").lean(),
  ]);

  const monthMap = new Map(months.map((item) => [item.key, item]));
  trendBookings.forEach((booking) => { const item = monthMap.get(monthKey(new Date(booking.createdAt))); if (item) item.bookings += 1; });
  payments.filter((payment) => payment.status === "Paid" && new Date(payment.paidAt || payment.createdAt) >= trendStart).forEach((payment) => { const item = monthMap.get(monthKey(new Date(payment.paidAt || payment.createdAt))); if (item) item.revenue += Number(payment.amount) || 0; });

  const paidPayments = payments.filter((payment) => payment.status === "Paid");
  const revenue = paidPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const sportMap = new Map();
  paidPayments.forEach((payment) => {
    const key = String(payment.sport?._id || payment.sport || "unknown");
    const current = sportMap.get(key) || { sport: payment.sport?.SportName || "Sport", bookings: 0, paidBookings: 0, revenue: 0 };
    current.bookings += 1;
    current.paidBookings += 1;
    current.revenue += Number(payment.amount) || 0;
    sportMap.set(key, current);
  });

  const now = new Date();
  const openComplaints = complaints.filter((item) => item.status !== 1 && item.workflowStatus !== "Resolved");
  const escalated = complaints.filter((item) => item.workflowStatus === "Escalated").length;
  const overdue = openComplaints.filter((item) => item.dueAt && new Date(item.dueAt) < now).length;
  const grantSummary = grantStats(grants);
  const ratingSummary = reviews.reduce((summary, review) => {
    summary.count += 1;
    summary.total += Number(review.rating) || 0;
    summary.byType[review.targetType].count += 1;
    summary.byType[review.targetType].total += Number(review.rating) || 0;
    return summary;
  }, { count: 0, total: 0, byType: { facility: { count: 0, total: 0 }, sport: { count: 0, total: 0 }, coach: { count: 0, total: 0 } } });
  const ratings = {
    count: ratingSummary.count,
    average: ratingSummary.count ? ratingSummary.total / ratingSummary.count : 0,
    byType: Object.fromEntries(Object.entries(ratingSummary.byType).map(([key, value]) => [key, { count: value.count, average: value.count ? value.total / value.count : 0 }])),
  };
  const configuredFacilityIds = new Set(configs.map((config) => String(config.facility)));
  const recent = await Guest.find({ ...bookingFacilityFilter, bookingStatus: "Confirmed", paymentStatus: "Paid" })
    .populate("SportComplexId", "name")
    .populate("sport", "SportName")
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  const configSummary = configs.map((config) => ({
    id: String(config._id), sport: config.sport?.SportName || "Sport", bookingMode: config.bookingMode,
    units: config.unitCount, slots: (config.slots || []).filter((slot) => slot.bookable).length,
    capacity: config.unitCount * config.capacityPerUnit, price: config.price?.amount || 0,
  }));
  const utilisation = summariseUtilisation({
    configs,
    bookings,
    institutionalBookings,
    payments,
    facilities,
    attendances,
    endDate: today,
    days,
  });

  const maintenanceSchedules = await computeSchedules({ facilityId: facility ? facility._id : null });
  const maintenanceDue = maintenanceSchedules.filter((item) => item.needsAction);

  return {
    generatedAt: new Date(),
    facility: facility ? { id: String(facility._id), name: facility.name, district: facility.district?.District || "", location: facility.location } : null,
    kpis: {
      facilities: facilities.length,
      bookingReadyFacilities: facility ? (configs.length ? 1 : 0) : configuredFacilityIds.size,
      activeSports: sportsCount,
      activeCoaches: coachesCount,
      citizens: citizensCount,
      bookings: bookings.length,
      confirmedBookings: bookings.filter((item) => item.bookingStatus === "Confirmed").length,
      todayBookings: bookings.filter((item) => item.Startdate === today).length,
      upcomingBookings: bookings.filter((item) => item.Startdate >= today && item.bookingStatus !== "Cancelled").length,
      revenue,
      paidPayments: paidPayments.length,
      pendingPayments: 0,
      openGrievances: openComplaints.length,
      resolvedGrievances: complaints.length - openComplaints.length,
      escalatedGrievances: escalated,
      overdueGrievances: overdue,
      grants: grantSummary,
      assessments: assessmentCount,
      ratings,
    },
    trend: months,
    topSports: [...sportMap.values()].sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings).slice(0, 8),
    recentBookings: recent.map((booking) => ({
      id: String(booking._id), reference: booking.bookingReference, facility: booking.SportComplexId?.name || "Facility",
      sport: booking.sport?.SportName || "Sport", citizen: booking.Name || "Citizen", date: booking.Startdate,
      amount: booking.totalAmount || 0, bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus,
    })),
    configuration: configSummary,
    utilisation,
    facilityReadiness: facility ? [] : facilities.map((item) => ({ id: String(item._id), name: item.name, district: item.district?.District || "", ready: configuredFacilityIds.has(String(item._id)), sports: configs.filter((config) => String(config.facility) === String(item._id)).length })),
    alerts: {
      facilitiesNotReady: facility ? (configs.length ? 0 : 1) : facilities.length - configuredFacilityIds.size,
      escalatedGrievances: escalated,
      overdueGrievances: overdue,
      pendingGrantProofs: grantSummary.pendingProofs,
      grantQueries: grantSummary.queries,
      maintenanceDueCount: maintenanceDue.length,
    },
  };
}

async function admin(req, res) {
  try {
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    return res.json({ data: await buildDashboard({ days }), rcode: 200 });
  }
  catch (error) { console.error("Admin dashboard failed:", error); return fail(res, 500, "Could not load admin dashboard"); }
}

async function manager(req, res) {
  try {
    const facility = await managerFacility(req.user);
    if (!facility) return fail(res, 403, "No facility is assigned to this manager");
    const days = Math.min(90, Math.max(7, Number(req.query.days) || 30));
    return res.json({ data: await buildDashboard({ facility, days }), rcode: 200 });
  } catch (error) { console.error("Manager dashboard failed:", error); return fail(res, 500, "Could not load facility dashboard"); }
}

async function coach(req, res) {
  try {
    const profile = await Instructor.findOne({ userId: req.user._id })
      .populate("userId", "Name Email ContactNum")
      .populate({ path: "SportComplexId", select: "name location district", populate: { path: "district", select: "District" } })
      .populate("sports.sport", "SportName")
      .lean();
    if (!profile) return fail(res, 404, "Coach profile not found");

    const months = recentMonths().map((m) => ({ ...m, evaluations: 0 }));
    const trendStart = new Date(`${months[0].key}-01T00:00:00.000Z`);
    const today = indiaDate();

    const coachSportIds = (profile.sports || []).map((s) => s.sport?._id || s.sport).filter(Boolean);
    if (profile.SportComplexId && coachSportIds.length) {
      await Guest.updateMany(
        {
          coach: null,
          SportComplexId: profile.SportComplexId._id || profile.SportComplexId,
          bookingStatus: "Confirmed",
          paymentStatus: "Paid",
          sport: { $in: coachSportIds },
        },
        { $set: { coach: profile._id } }
      );
    }

    const [bookings, evaluations, configurations] = await Promise.all([
      Guest.find({ coach: profile._id, bookingStatus: "Confirmed", paymentStatus: "Paid" })
        .populate("sport", "SportName")
        .sort({ Startdate: -1, createdAt: -1 })
        .lean(),
      PerformanceEvaluation.find({ coach: req.user._id })
        .populate("sport", "SportName")
        .sort({ evaluationDate: -1, createdAt: -1 })
        .lean(),
      FacilitySportConfig.find({ facility: profile.SportComplexId?._id || profile.SportComplexId, status: "Active", "slots.coach": profile._id })
        .populate("sport", "SportName")
        .lean(),
    ]);

    const uniqueEvaluationsMap = new Map();
    evaluations.forEach((evaluation) => {
      const dedupeKey = evaluation.booking ? `booking:${evaluation.booking}` : `eval:${evaluation._id}`;
      if (!uniqueEvaluationsMap.has(dedupeKey)) {
        uniqueEvaluationsMap.set(dedupeKey, evaluation);
      }
    });
    const uniqueEvaluations = [...uniqueEvaluationsMap.values()];

    const trend = new Map(months.map((month) => [month.key, month]));
    bookings.filter((booking) => new Date(booking.createdAt) >= trendStart).forEach((booking) => {
      const month = trend.get(monthKey(new Date(booking.createdAt)));
      if (month) month.bookings += 1;
    });
    uniqueEvaluations.forEach((evaluation) => {
      const evDate = new Date(evaluation.evaluationDate || evaluation.createdAt);
      if (!Number.isNaN(evDate.getTime()) && evDate >= trendStart) {
        const month = trend.get(monthKey(evDate));
        if (month) month.evaluations += 1;
      }
    });

    const evaluatedBookingIds = new Set(
      uniqueEvaluations.map((ev) => (ev.booking ? String(ev.booking) : "")).filter(Boolean)
    );

    const sportMap = new Map();
    const evaluationBreakdown = { evaluated: 0, readyToEvaluate: 0, upcoming: 0 };

    bookings.forEach((booking) => {
      const sportName = booking.sport?.SportName || "Sport";
      const existingSport = sportMap.get(sportName) || { sport: sportName, bookings: 0, upcoming: 0 };
      existingSport.bookings += 1;
      if (String(booking.Startdate) >= today) existingSport.upcoming += 1;
      sportMap.set(sportName, existingSport);

      const isEval = Boolean(booking.isEvaluated || evaluatedBookingIds.has(String(booking._id)));
      if (isEval) {
        evaluationBreakdown.evaluated += 1;
      } else if (String(booking.Startdate) <= today) {
        evaluationBreakdown.readyToEvaluate += 1;
      } else {
        evaluationBreakdown.upcoming += 1;
      }
    });

    const sportStats = [...sportMap.values()].sort((a, b) => b.bookings - a.bookings);

    const uniqueAthletes = new Set(bookings.map((booking) => {
      const identity = booking.citizenUser || booking.Email || booking.ContactNum;
      return identity ? String(identity).trim().toLowerCase() : "";
    }).filter(Boolean));
    const coachingSlots = configurations.flatMap((config) => (config.slots || [])
      .filter((slot) => String(slot.coach) === String(profile._id))
      .map((slot) => ({
        id: String(slot._id), sport: config.sport?.SportName || "Sport", label: slot.label,
        startTime: slot.startTime, endTime: slot.endTime, days: slot.days || [],
        audience: slot.audience, capacity: slot.capacity, bookable: slot.bookable,
      })));

    return res.json({
      data: {
        generatedAt: new Date(),
        coach: {
          id: String(profile._id), name: profile.userId?.Name || req.user.Name || "Coach",
          email: profile.userId?.Email || req.user.Email || "",
          status: profile.status, sports: (profile.sports || []).map((item) => item.sport?.SportName).filter(Boolean),
        },
        facility: profile.SportComplexId ? {
          id: String(profile.SportComplexId._id), name: profile.SportComplexId.name,
          location: profile.SportComplexId.location || "", district: profile.SportComplexId.district?.District || "",
        } : null,
        kpis: {
          bookings: bookings.length,
          todayBookings: bookings.filter((item) => item.Startdate === today).length,
          upcomingBookings: bookings.filter((item) => String(item.Startdate) >= today).length,
          uniqueAthletes: uniqueAthletes.size,
          evaluationsCount: uniqueEvaluations.length,
          coachingSlots: coachingSlots.length,
        },
        trend: months.map(({ key, label, bookings: count, evaluations: evalCount }) => ({ key, label, bookings: count, evaluations: evalCount })),
        sportStats,
        evaluationBreakdown,
        assignedSlots: coachingSlots,
        recentBookings: bookings.slice(0, 8).map((booking) => ({
          id: String(booking._id), reference: booking.bookingReference,
          athlete: booking.Name || "Athlete", email: booking.Email || "", phone: booking.ContactNum || "",
          sport: booking.sport?.SportName || "Sport", date: booking.Startdate,
          time: booking.timeslot || {}, members: booking.memberCount || 1,
        })),
      },
      rcode: 200,
    });
  } catch (error) {
    console.error("Coach dashboard failed:", error);
    return fail(res, 500, "Could not load coach dashboard");
  }
}

module.exports = { admin, manager, coach };
