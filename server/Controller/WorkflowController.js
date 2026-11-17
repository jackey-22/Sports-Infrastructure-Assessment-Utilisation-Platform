const mongoose = require("mongoose");
const Complaint = require("../Model/ComplaintModel");
const Review = require("../Model/ReviewModel");
const Grant = require("../Model/GrantModel");
const User = require("../Model/UsersModel");
const SportsComplex = require("../Model/SportsComplexModel");
const Instructor = require("../Model/instructorModel");
const Athlete = require("../Model/athleteModel");
const AthleteRating = require("../Model/athleteRatingModel");
const Guest = require("../Model/GuestModel");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const { setReminder } = require("../SetReminder");
const { ROLE } = require("../Utils/roles");

const fail = (res, status, msg) => res.status(status).json({ data: "", msg, rcode: -9 });
const validId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));
const validHostedFile = (value) => {
  try { return new URL(String(value || "")).protocol === "https:"; }
  catch (error) { return false; }
};

async function notifyEscalations(complaints) {
  if (!complaints.length) return;
  const admins = await User.find({ Role: ROLE.ADMIN, IsActive: { $ne: 0 } }).select("_id").lean();
  const ids = admins.map((item) => item._id);
  if (ids.length) {
    await Promise.all(complaints.map((item) => setReminder(
      new Date(),
      `Grievance ${item._id} missed its manager response deadline.`,
      "Grievance escalated to Admin",
      ids
    )));
  }
}

async function escalateOverdueComplaints() {
  const overdue = await Complaint.find({
    workflowStatus: "Open",
    dueAt: { $lte: new Date() },
    escalationNotified: { $ne: true },
  }).select("_id");
  if (!overdue.length) return 0;
  const ids = overdue.map((item) => item._id);
  await Complaint.updateMany({ _id: { $in: ids } }, {
    $set: { workflowStatus: "Escalated", level: 3, escalatedAt: new Date(), escalationNotified: true },
  });
  await notifyEscalations(overdue);
  return ids.length;
}

async function grievanceList(req, res) {
  try {
    await escalateOverdueComplaints();
    const query = {};
    if (req.user.Role === ROLE.ATHLETE) query.userId = req.user._id;
    if (req.user.Role === ROLE.MANAGER) query.sportsComplex = req.user.SportComplexId;
    if (req.user.Role === ROLE.ADMIN && req.query.escalated === "true") query.workflowStatus = "Escalated";
    const data = await Complaint.find(query)
      .populate("userId", "Name Email ContactNum")
      .populate("sportsComplex", "name location")
      .populate("remarks.userId", "Name Role")
      .sort({ createdAt: -1 });
    return res.json({ data, rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not load grievances"); }
}

async function createGrievance(req, res) {
  try {
    const facility = req.body.sportsComplex;
    const description = String(req.body.description || req.body.Description || "").trim();
    const subject = String(req.body.subject || "Facility grievance").trim();
    if (!validId(facility) || !description) return fail(res, 400, "Facility and complaint details are required");
    if (req.body.proofUrl && !validHostedFile(req.body.proofUrl)) return fail(res, 400, "Attachment must be uploaded before submitting the grievance");
    if (!await SportsComplex.exists({ _id: facility, status: { $ne: "Inactive" } })) return fail(res, 404, "Facility not found");
    const responseHours = Math.max(1, Number(process.env.GRIEVANCE_RESPONSE_HOURS) || 48);
    const complaint = await Complaint.create({
      subject, Description: description, userId: req.user._id, sportsComplex: facility,
      photo: String(req.body.proofUrl || "").trim().slice(0, 1500),
      proofName: String(req.body.proofName || "").trim().slice(0, 240),
      proofKey: String(req.body.proofKey || "").trim().slice(0, 500),
      level: 1, status: 0, workflowStatus: "Open",
      dueAt: new Date(Date.now() + responseHours * 60 * 60 * 1000),
    });
    const managers = await User.find({ Role: ROLE.MANAGER, SportComplexId: facility, IsActive: { $ne: 0 } }).select("_id").lean();
    if (managers.length) await setReminder(new Date(), subject, "New facility grievance", managers.map((item) => item._id));
    return res.status(201).json({ data: complaint, msg: "Grievance raised", rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not raise grievance"); }
}

async function respondGrievance(req, res) {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return fail(res, 404, "Grievance not found");
    if (req.user.Role === ROLE.MANAGER && String(complaint.sportsComplex) !== String(req.user.SportComplexId)) return fail(res, 403, "This grievance belongs to another facility");
    if (req.user.Role === ROLE.ADMIN && complaint.workflowStatus !== "Escalated") return fail(res, 409, "Admin action is available after escalation");
    const remark = String(req.body.response || req.body.remark || "").trim();
    if (!remark) return fail(res, 400, "A response is required");
    const resolve = Boolean(req.body.resolve);
    complaint.remarks.push({ level: complaint.level, userId: req.user._id, remark, date: new Date() });
    if (req.user.Role === ROLE.MANAGER) complaint.managerRespondedAt = new Date();
    complaint.workflowStatus = resolve ? "Resolved" : "Manager Responded";
    complaint.status = resolve ? 1 : 0;
    if (resolve) complaint.resolvedAt = new Date();
    await complaint.save();
    await setReminder(new Date(), remark, resolve ? "Grievance resolved" : "Response to your grievance", [complaint.userId]);
    return res.json({ data: complaint, msg: "Response saved", rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not update grievance"); }
}

async function ratingCatalog(req, res) {
  try {
    const facilities = await SportsComplex.find({ status: { $ne: "Inactive" } })
      .select("name sports")
      .populate("sports.sport", "SportName")
      .lean();
    const configured = await FacilitySportConfig.find({ status: "Active" })
      .select("facility sport")
      .populate("sport", "SportName")
      .lean();
    const byFacility = new Map();
    configured.forEach((item) => {
      const key = String(item.facility);
      if (!byFacility.has(key)) byFacility.set(key, []);
      byFacility.get(key).push({ sport: item.sport });
    });
    const configuredFacilityIds = new Set(configured.map((item) => String(item.facility)));
    facilities.forEach((facility) => {
      const all = [...(facility.sports || []), ...(byFacility.get(String(facility._id)) || [])];
      facility.sports = all.filter((item, index) => item.sport && all.findIndex((candidate) => String(candidate.sport?._id) === String(item.sport?._id)) === index);
    });
    const coaches = await Instructor.find({ status: "Active" })
      .populate("userId", "Name")
      .populate("sports.sport", "SportName")
      .lean();
    return res.json({
      data: {
        facilities: facilities.filter((facility) => configuredFacilityIds.has(String(facility._id))),
        coaches: coaches.filter((coach) => configuredFacilityIds.has(String(coach.SportComplexId))),
      },
      rcode: 200,
    });
  } catch (error) { return fail(res, 500, "Could not load rating choices"); }
}

async function saveCitizenReview(req, res) {
  try {
    const { targetType, facility, sport, coach, rating, remarks } = req.body;
    if (!["facility", "sport", "coach"].includes(targetType) || !validId(facility) || Number(rating) < 1 || Number(rating) > 5) return fail(res, 400, "Complete the rating details");
    if (targetType === "sport" && !validId(sport)) return fail(res, 400, "Select a sport");
    if (targetType === "coach" && !validId(coach)) return fail(res, 400, "Select a coach");
    if (!await SportsComplex.exists({ _id: facility, status: { $ne: "Inactive" } })) return fail(res, 404, "Facility not found");
    if (targetType === "sport") {
      const configured = await FacilitySportConfig.exists({ facility, sport, status: "Active" });
      const embedded = await SportsComplex.exists({ _id: facility, "sports.sport": sport });
      if (!configured && !embedded) return fail(res, 400, "That sport is not available at this facility");
    }
    if (targetType === "coach" && !await Instructor.exists({ _id: coach, SportComplexId: facility, status: "Active" })) return fail(res, 400, "That coach is not assigned to this facility");
    const query = {
      reviewer: req.user._id, targetType, facility,
      sport: targetType === "sport" ? sport : null,
      coach: targetType === "coach" ? coach : null,
    };
    const data = await Review.findOneAndUpdate(query, { $set: { rating: Number(rating), remarks: String(remarks || "") } }, { new: true, upsert: true, runValidators: true });
    return res.json({ data, msg: "Rating saved", rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not save rating"); }
}

async function citizenReviews(req, res) {
  try {
    const data = await Review.find({ reviewer: req.user._id }).populate("facility", "name").populate("sport", "SportName").populate({ path: "coach", populate: { path: "userId", select: "Name" } }).sort({ updatedAt: -1 });
    return res.json({ data, rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not load ratings"); }
}

async function coachRateableAthletes(req, res) {
  try {
    const coach = await Instructor.findOne({ userId: req.user._id }).lean();
    if (!coach) return fail(res, 404, "Coach profile not found");
    const bookings = await Guest.find({ coach: coach._id })
      .populate("citizenUser", "Name Email ContactNum")
      .populate("sport", "SportName")
      .sort({ createdAt: -1 })
      .lean();
    const userIds = [...new Set(bookings.map((item) => item.citizenUser?._id).filter(Boolean).map(String))];
    const [athletes, ratings] = await Promise.all([
      Athlete.find({ userId: { $in: userIds } }).lean(),
      AthleteRating.find({ instructorId: req.user._id }).sort({ createdAt: -1 }).lean(),
    ]);
    const athleteByUser = new Map(athletes.map((item) => [String(item.userId), item]));
    const latestRatingByAthlete = new Map();
    ratings.forEach((rating) => {
      const key = String(rating.athleteId || "");
      if (key && !latestRatingByAthlete.has(key)) latestRatingByAthlete.set(key, rating);
    });
    const grouped = new Map();
    bookings.forEach((booking) => {
      const user = booking.citizenUser;
      const identity = user?._id
        ? `user:${user._id}`
        : `guest:${String(booking.Email || "").toLowerCase()}:${booking.ContactNum || ""}`;
      const current = grouped.get(identity) || {
        id: identity, athleteId: null, userId: user?._id || null,
        name: user?.Name || booking.Name || "Citizen", email: user?.Email || booking.Email || "",
        phone: user?.ContactNum || booking.ContactNum || "", bookings: 0, confirmedBookings: 0,
        paidBookings: 0, totalPaid: 0, sports: new Map(), latestBooking: null, nextBooking: null,
      };
      current.bookings += 1;
      if (booking.bookingStatus === "Confirmed") current.confirmedBookings += 1;
      if (booking.paymentStatus === "Paid") {
        current.paidBookings += 1;
        current.totalPaid += Number(booking.totalAmount) || 0;
      }
      if (booking.sport) current.sports.set(String(booking.sport._id), { id: String(booking.sport._id), name: booking.sport.SportName });
      const bookingSummary = {
        id: String(booking._id), reference: booking.bookingReference, sport: booking.sport?.SportName || "Sport",
        sportId: booking.sport?._id ? String(booking.sport._id) : null, date: booking.Startdate,
        time: booking.timeslot || {}, bookingStatus: booking.bookingStatus, paymentStatus: booking.paymentStatus,
      };
      if (!current.latestBooking || String(booking.Startdate) > String(current.latestBooking.date)) current.latestBooking = bookingSummary;
      const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (booking.bookingStatus === "Confirmed" && booking.Startdate >= today && (!current.nextBooking || booking.Startdate < current.nextBooking.date)) current.nextBooking = bookingSummary;
      grouped.set(identity, current);
    });
    const rows = [...grouped.values()].map((item) => {
      const athlete = item.userId ? athleteByUser.get(String(item.userId)) : null;
      const latestRating = athlete ? latestRatingByAthlete.get(String(athlete._id)) : null;
      return {
        ...item,
        athleteId: athlete ? String(athlete._id) : null,
        sports: [...item.sports.values()],
        canRate: Boolean(athlete && item.confirmedBookings > 0),
        latestRating: latestRating ? {
          rating: latestRating.rating, remarks: latestRating.remarks || "", createdAt: latestRating.createdAt,
        } : null,
      };
    }).sort((a, b) => b.confirmedBookings - a.confirmedBookings || String(b.latestBooking?.date || "").localeCompare(String(a.latestBooking?.date || "")));
    return res.json({
      data: {
        summary: {
          people: rows.length,
          confirmedAthletes: rows.filter((item) => item.confirmedBookings > 0).length,
          eligibleToRate: rows.filter((item) => item.canRate).length,
          pendingOnly: rows.filter((item) => item.confirmedBookings === 0).length,
        },
        athletes: rows,
      },
      rcode: 200,
    });
  } catch (error) { return fail(res, 500, "Could not load booked athletes"); }
}

async function saveCoachRating(req, res) {
  try {
    const coach = await Instructor.findOne({ userId: req.user._id }).lean();
    const athlete = validId(req.body.athleteId) ? await Athlete.findById(req.body.athleteId).lean() : null;
    if (!coach || !athlete) return fail(res, 404, "Coach or athlete profile not found");
    const booked = await Guest.exists({ coach: coach._id, citizenUser: athlete.userId, bookingStatus: "Confirmed" });
    if (!booked) return fail(res, 403, "Only athletes booked under you can be rated");
    const rating = Number(req.body.rating);
    if (rating < 1 || rating > 5) return fail(res, 400, "Rating must be between 1 and 5");
    const data = await AthleteRating.create({
      athleteId: athlete._id, instructorId: req.user._id, rating,
      sport: validId(req.body.sport) ? req.body.sport : coach.sports?.[0]?.sport,
      sportComplex: coach.SportComplexId, remarks: String(req.body.remarks || ""),
      parameters: Array.isArray(req.body.parameters) ? req.body.parameters : [], isEvaluated: 1,
    });
    return res.status(201).json({ data, msg: "Athlete rating saved", rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not rate athlete"); }
}

async function coachRatingHistory(req, res) {
  try {
    const data = await AthleteRating.find({ instructorId: req.user._id }).populate({ path: "athleteId", populate: { path: "userId", select: "Name Email" } }).populate("sport", "SportName").sort({ createdAt: -1 });
    return res.json({ data, rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not load rating history"); }
}

const populateGrant = (query) => query.populate("facility", "name location").populate("allocatedBy", "Name").populate("progressUpdates.submittedBy", "Name").populate("progressUpdates.reviewedBy", "Name");

async function adminGrants(req, res) {
  try { return res.json({ data: await populateGrant(Grant.find().sort({ createdAt: -1 })), rcode: 200 }); }
  catch (error) { return fail(res, 500, "Could not load grants"); }
}
async function createGrant(req, res) {
  try {
    const { facility, title, purpose, allocatedAmount, startDate, dueDate } = req.body;
    if (!validId(facility) || !title || !purpose || Number(allocatedAmount) <= 0) return fail(res, 400, "Complete the grant details");
    if (!await SportsComplex.exists({ _id: facility })) return fail(res, 404, "Facility not found");
    const data = await Grant.create({ facility, title, purpose, allocatedAmount: Number(allocatedAmount), startDate, dueDate, allocatedBy: req.user._id });
    const managers = await User.find({ Role: ROLE.MANAGER, SportComplexId: facility, IsActive: { $ne: 0 } }).select("_id").lean();
    if (managers.length) await setReminder(new Date(), title, "New grant allocated", managers.map((item) => item._id));
    return res.status(201).json({ data, msg: "Grant allocated", rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not allocate grant"); }
}
async function managerGrants(req, res) {
  try { return res.json({ data: await populateGrant(Grant.find({ facility: req.user.SportComplexId }).sort({ createdAt: -1 })), rcode: 200 }); }
  catch (error) { return fail(res, 500, "Could not load grants"); }
}

function orderedProgress(grant, status) {
  return (grant.progressUpdates || [])
    .filter((item) => !status || item.reviewStatus === status)
    .sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
}

function verifiedGrantBaseline(grant, excludeId = null) {
  return (grant.progressUpdates || []).reduce((baseline, item) => {
    if (item.reviewStatus !== "Verified" || (excludeId && String(item._id) === String(excludeId))) return baseline;
    return {
      percent: Math.max(baseline.percent, Number(item.percent) || 0),
      amountUsed: Math.max(baseline.amountUsed, Number(item.amountUsed) || 0),
    };
  }, { percent: 0, amountUsed: 0 });
}

function percentForAmount(grant, amountUsed) {
  return Math.round(((amountUsed / Number(grant.allocatedAmount)) * 100) * 100) / 100;
}

function validateCumulativeProgress(grant, amountUsed, baseline, submittedPercent = null) {
  if (!Number.isFinite(amountUsed) || amountUsed <= baseline.amountUsed) {
    return `Cumulative amount used must be greater than ₹${baseline.amountUsed.toLocaleString("en-IN")}`;
  }
  if (amountUsed > Number(grant.allocatedAmount)) {
    return "Cumulative amount used cannot exceed the grant allocation";
  }
  const calculatedPercent = percentForAmount(grant, amountUsed);
  if (submittedPercent !== null && Math.abs(Number(submittedPercent) - calculatedPercent) > 0.01) {
    return `The stored percentage must be ${calculatedPercent}% for ₹${amountUsed.toLocaleString("en-IN")} usage`;
  }
  return "";
}

async function submitGrantProgress(req, res) {
  try {
    const grant = await Grant.findById(req.params.id);
    if (!grant) return fail(res, 404, "Grant not found");
    if (String(grant.facility) !== String(req.user.SportComplexId)) return fail(res, 403, "This grant belongs to another facility");
    const amountUsed = Number(req.body.amountUsed);
    const note = String(req.body.note || "").trim();
    if (!note) return fail(res, 400, "Progress details and usage explanation are required");
    if (!validHostedFile(req.body.proofUrl)) return fail(res, 400, "Upload the grant proof before submitting progress");
    if (orderedProgress(grant, "Pending").length) {
      return fail(res, 409, "A progress submission is already awaiting Admin review");
    }
    const baseline = verifiedGrantBaseline(grant);
    const validationError = validateCumulativeProgress(grant, amountUsed, baseline);
    if (validationError) return fail(res, 400, validationError);
    const percent = percentForAmount(grant, amountUsed);

    const proofUrl = String(req.body.proofUrl || "").trim().slice(0, 1500);
    const proofName = String(req.body.proofName || "").trim().slice(0, 240);
    const proofKey = String(req.body.proofKey || "").trim().slice(0, 500);
    const proofSize = Math.max(0, Number(req.body.proofSize) || 0);
    const proofMimeType = String(req.body.proofMimeType || "").trim().slice(0, 120);
    const queried = orderedProgress(grant, "Query Raised").at(-1);
    if (queried) {
      queried.percent = percent;
      queried.amountUsed = amountUsed;
      queried.note = note;
      queried.proofUrl = proofUrl;
      queried.proofName = proofName;
      queried.proofKey = proofKey;
      queried.proofSize = proofSize;
      queried.proofMimeType = proofMimeType;
      queried.submittedBy = req.user._id;
      queried.submittedAt = new Date();
      queried.reviewStatus = "Pending";
      queried.adminNote = "";
      queried.reviewedBy = undefined;
      queried.reviewedAt = undefined;
    } else {
      grant.progressUpdates.push({ percent, amountUsed, note, proofUrl, proofName, proofKey, proofSize, proofMimeType, submittedBy: req.user._id });
    }
    grant.status = "Proof Submitted";
    await grant.save();
    const admins = await User.find({ Role: ROLE.ADMIN, IsActive: { $ne: 0 } }).select("_id").lean();
    if (admins.length) await setReminder(new Date(), grant.title, "Grant progress submitted", admins.map((item) => item._id));
    return res.status(201).json({ data: grant, msg: "Progress submitted", rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not submit progress"); }
}
async function reviewGrantProgress(req, res) {
  try {
    const grant = await Grant.findById(req.params.id);
    const progress = grant?.progressUpdates.id(req.params.progressId);
    if (!grant || !progress) return fail(res, 404, "Grant progress not found");
    const decision = req.body.decision;
    if (!["Verified", "Query Raised"].includes(decision)) return fail(res, 400, "Choose Verify or Query Raised");
    if (decision === "Query Raised" && !String(req.body.note || "").trim()) return fail(res, 400, "Add the query for the facility manager");
    if (progress.reviewStatus !== "Pending") return fail(res, 409, "This submission has already been reviewed");
    const pending = orderedProgress(grant, "Pending");
    if (pending.length && String(pending[0]._id) !== String(progress._id)) {
      return fail(res, 409, "Review the earlier pending milestone first");
    }
    if (decision === "Verified") {
      const baseline = verifiedGrantBaseline(grant, progress._id);
      const validationError = validateCumulativeProgress(grant, Number(progress.amountUsed), baseline, Number(progress.percent));
      if (validationError) return fail(res, 400, `Cannot verify: ${validationError}`);
    }
    progress.reviewStatus = decision;
    progress.adminNote = String(req.body.note || "");
    progress.reviewedBy = req.user._id;
    progress.reviewedAt = new Date();
    grant.status = decision === "Verified"
      ? (Number(progress.percent) === 100 ? "Verified" : "In Progress")
      : "Query Raised";
    await grant.save();
    const managers = await User.find({ Role: ROLE.MANAGER, SportComplexId: grant.facility, IsActive: { $ne: 0 } }).select("_id").lean();
    if (managers.length) await setReminder(new Date(), progress.adminNote || "Progress proof verified", `Grant progress ${decision.toLowerCase()}`, managers.map((item) => item._id));
    return res.json({ data: grant, msg: `Progress ${decision.toLowerCase()}`, rcode: 200 });
  } catch (error) { return fail(res, 500, "Could not review progress"); }
}

module.exports = {
  escalateOverdueComplaints, grievanceList, createGrievance, respondGrievance,
  ratingCatalog, saveCitizenReview, citizenReviews, coachRateableAthletes, saveCoachRating, coachRatingHistory,
  adminGrants, createGrant, managerGrants, submitGrantProgress, reviewGrantProgress,
};
