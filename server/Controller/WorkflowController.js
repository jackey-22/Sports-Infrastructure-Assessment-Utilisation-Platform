const mongoose = require("mongoose");
const Complaint = require("../Model/ComplaintModel");
const Review = require("../Model/ReviewModel");
const Grant = require("../Model/GrantModel");
const User = require("../Model/UsersModel");
const SportsComplex = require("../Model/SportsComplexModel");
const Instructor = require("../Model/instructorModel");
const Athlete = require("../Model/athleteModel");
const AthleteRating = require("../Model/athleteRatingModel");
const PerformanceEvaluation = require("../Model/PerformanceEvaluationModel");
const Guest = require("../Model/GuestModel");
const Attendance = require("../Model/BookingAttendanceModel");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const { setReminder } = require("../SetReminder");
const { ROLE } = require("../Utils/roles");
const { percentForAmount, verifiedGrantTotals, validateMilestoneProgress } = require("../Utils/grantProgress");

const fail = (res, status, msg) => res.status(status).json({ data: "", msg, rcode: -9 });
const validId = (value) => mongoose.Types.ObjectId.isValid(String(value || ""));
const validHostedFile = (value) => {
  try { return new URL(String(value || "")).protocol === "https:"; }
  catch (error) { return false; }
};

const { escalateOverdueComplaints, grievanceList, createGrievance, respondGrievance } = require("./GrievanceController");

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

    // Automatically bind unassigned confirmed+paid bookings for this coach's sports and complex
    const coachSportIds = (coach.sports || []).map((s) => s.sport);
    if (mongoose.connection.readyState === 1 || Object.hasOwn(Guest, "updateMany")) {
      await Guest.updateMany(
        {
          coach: null,
          SportComplexId: coach.SportComplexId,
          bookingStatus: "Confirmed",
          paymentStatus: "Paid",
          sport: { $in: coachSportIds },
        },
        { $set: { coach: coach._id } }
      );
    }

    const rawBookings = await Guest.find({
      coach: coach._id,
      SportComplexId: coach.SportComplexId,
      bookingStatus: "Confirmed",
      paymentStatus: "Paid",
    })
      .populate("citizenUser", "Name Email ContactNum")
      .populate("sport", "SportName")
      .sort({ Startdate: -1, createdAt: -1 })
      .lean();

    const bookings = rawBookings.filter(
      (item) => item.bookingStatus === "Confirmed" && item.paymentStatus === "Paid"
    );

    const [athletes, ratings, attendances] = await Promise.all([
      Athlete.find({
        $or: [
          { SportComplexId: coach.SportComplexId },
          { SportComplexId: null, userId: { $in: bookings.map(item => item.citizenUser?._id).filter(Boolean) } },
        ],
        isActive: { $ne: 0 },
      }).populate("userId", "Name Email ContactNum").lean(),
      AthleteRating.find({ instructorId: req.user._id }).sort({ createdAt: -1 }).lean(),
      mongoose.connection.readyState === 1 || Object.hasOwn(Attendance, "find")
        ? Attendance.find({ booking: { $in: bookings.map(b => b._id) } }).lean()
        : Promise.resolve([]),
    ]);

    const attendanceByBooking = new Map(attendances.map(a => [String(a.booking), a]));

    const evaluations = await PerformanceEvaluation.find({
      $or: [
        { booking: { $in: bookings.map((item) => item._id) } },
        { athlete: { $in: athletes.map((item) => item._id) }, coach: req.user._id },
      ],
    }).sort({ evaluationDate: -1 }).lean();

    const evaluationByBooking = new Map();
    const latestEvaluationByAthlete = new Map();
    evaluations.forEach((evaluation) => {
      if (evaluation.booking && !evaluationByBooking.has(String(evaluation.booking))) {
        evaluationByBooking.set(String(evaluation.booking), evaluation);
      }
      const key = String(evaluation.athlete);
      if (!latestEvaluationByAthlete.has(key)) latestEvaluationByAthlete.set(key, evaluation);
    });

    const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
    const normalizePhone = (value) => String(value || "").replace(/\D/g, "");
    const athleteByUser = new Map(
      athletes
        .filter((item) => item.userId?._id)
        .map((item) => [String(item.userId._id), item])
    );
    const athleteByEmail = new Map(
      athletes
        .filter((item) => item.userId?.Email)
        .map((item) => [normalizeEmail(item.userId.Email), item])
    );
    const athleteByPhone = new Map(
      athletes
        .filter((item) => item.userId?.ContactNum)
        .map((item) => [normalizePhone(item.userId.ContactNum), item])
    );

    const latestRatingByAthlete = new Map();
    ratings.forEach((rating) => {
      const key = String(rating.athleteId || "");
      if (key && !latestRatingByAthlete.has(key)) latestRatingByAthlete.set(key, rating);
    });

    const todayStr = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const grouped = new Map();

    bookings.forEach((booking) => {
      const user = booking.citizenUser;
      const athlete = (user?._id && athleteByUser.get(String(user._id))) ||
        athleteByEmail.get(normalizeEmail(user?.Email || booking.Email)) ||
        athleteByPhone.get(normalizePhone(user?.ContactNum || booking.ContactNum));
      const identity = athlete ? `athlete:${athlete._id}` : user?._id
        ? `user:${user._id}`
        : `guest:${String(booking.Email || "").toLowerCase()}:${booking.ContactNum || ""}`;
      const current = grouped.get(identity) || {
        id: identity, athleteId: athlete ? String(athlete._id) : null, userId: user?._id || null,
        name: user?.Name || booking.Name || "Athlete", email: user?.Email || booking.Email || "",
        phone: user?.ContactNum || booking.ContactNum || "", bookings: 0, confirmedBookings: 0, eligibleRatingBookings: 0,
        completedPlayedBookings: 0, evaluatedBookings: 0,
        sports: new Map(), sessions: [], latestBooking: null, nextBooking: null,
      };

      current.bookings += 1;
      const isConfirmed = booking.bookingStatus === "Confirmed";
      const isPaid = booking.paymentStatus === "Paid";
      const hasAttendance = Boolean(attendanceByBooking.get(String(booking._id))?.entryAt);
      const isPlayed = hasAttendance || (isConfirmed && isPaid && String(booking.Startdate) <= todayStr);
      const bookingEval = evaluationByBooking.get(String(booking._id));
      const isEvaluated = Boolean(bookingEval || booking.isEvaluated);

      if (isConfirmed) current.confirmedBookings += 1;
      if (isConfirmed && isPaid) current.eligibleRatingBookings += 1;
      if (isPlayed) current.completedPlayedBookings += 1;
      if (isEvaluated) current.evaluatedBookings += 1;

      if (booking.sport) current.sports.set(String(booking.sport._id), { id: String(booking.sport._id), name: booking.sport.SportName });

      const sessionItem = {
        id: String(booking._id),
        bookingId: String(booking._id),
        reference: booking.bookingReference,
        sport: booking.sport?.SportName || "Sport",
        sportId: booking.sport?._id ? String(booking.sport._id) : null,
        date: booking.Startdate,
        time: booking.timeslot || {},
        hasAttendance,
        isPlayed,
        isEvaluated,
        evaluationScore: bookingEval ? bookingEval.totalScore : (booking.evaluationScore || null),
        evaluationDate: bookingEval ? bookingEval.evaluationDate : (booking.evaluatedAt || null),
        evaluationRemarks: bookingEval?.remarks || "",
        evaluationDetails: (bookingEval?.details || []).map((detail) => ({
          parameterId: String(detail.parameterId),
          actualValue: detail.actualValue,
        })),
        canRate: Boolean(athlete && isConfirmed && isPaid && isPlayed),
        statusText: isEvaluated
          ? `Evaluated (${Number(bookingEval?.totalScore || booking.evaluationScore || 0).toFixed(1)}/100)`
          : isPlayed
          ? "Played - Ready to Evaluate"
          : "Upcoming Session",
      };
      current.sessions.push(sessionItem);

      const bookingSummary = {
        id: String(booking._id), reference: booking.bookingReference, sport: booking.sport?.SportName || "Sport",
        sportId: booking.sport?._id ? String(booking.sport._id) : null, date: booking.Startdate,
        time: booking.timeslot || {},
        isPlayed, isEvaluated,
      };
      if (!current.latestBooking || String(booking.Startdate) > String(current.latestBooking.date)) current.latestBooking = bookingSummary;
      if (booking.bookingStatus === "Confirmed" && booking.Startdate >= todayStr && (!current.nextBooking || booking.Startdate < current.nextBooking.date)) current.nextBooking = bookingSummary;
      grouped.set(identity, current);
    });

    const rows = [...grouped.values()].map((item) => {
      const athlete = item.athleteId
        ? athletes.find((candidate) => String(candidate._id) === String(item.athleteId))
        : item.userId ? athleteByUser.get(String(item.userId)) : null;
      const latestRating = athlete ? latestRatingByAthlete.get(String(athlete._id)) : null;
      const latestEvaluation = athlete ? latestEvaluationByAthlete.get(String(athlete._id)) || null : null;
      const hasUnratedCompleted = item.sessions.some(s => s.canRate && !s.isEvaluated);
      const canRate = Boolean(athlete && (hasUnratedCompleted || item.eligibleRatingBookings > 0));

      return {
        ...item,
        athleteId: athlete ? String(athlete._id) : null,
        sports: [...item.sports.values()],
        canRate,
        evaluationUnavailableReason: !athlete
          ? "An athlete profile must be linked to this booking."
          : item.eligibleRatingBookings === 0
          ? "A confirmed, paid coaching booking is required."
          : item.completedPlayedBookings === 0
          ? "Session is scheduled for a future date (awaiting completion of play)."
          : "",
        latestRating: latestRating ? {
          rating: latestRating.rating, remarks: latestRating.remarks || "", createdAt: latestRating.createdAt,
        } : null,
        latestEvaluation,
      };
    }).sort((a, b) => b.confirmedBookings - a.confirmedBookings || String(b.latestBooking?.date || "").localeCompare(String(a.latestBooking?.date || "")));

    return res.json({
      data: {
        summary: {
          confirmedAthletes: rows.length,
          totalCompletedSessions: rows.reduce((acc, r) => acc + r.completedPlayedBookings, 0),
          totalEvaluatedSessions: rows.reduce((acc, r) => acc + r.evaluatedBookings, 0),
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
    const athlete = validId(req.body.athleteId)
      ? await Athlete.findById(req.body.athleteId).populate("userId", "Email ContactNum").lean()
      : null;
    if (!coach || !athlete) return fail(res, 404, "Coach or athlete profile not found");
    const bookingIdentity = [];
    if (athlete.userId?._id) bookingIdentity.push({ citizenUser: athlete.userId._id });
    if (athlete.userId?.Email) bookingIdentity.push({ Email: athlete.userId.Email });
    if (athlete.userId?.ContactNum) bookingIdentity.push({ ContactNum: athlete.userId.ContactNum });
    const bookingQuery = {
      coach: coach._id,
      bookingStatus: "Confirmed",
      paymentStatus: "Paid",
      $or: bookingIdentity.length ? bookingIdentity : [{ _id: null }],
    };
    if (validId(req.body.bookingId)) bookingQuery._id = req.body.bookingId;
    const booked = await Guest.findOne(bookingQuery).sort({ Startdate: -1 });
    if (!booked) return fail(res, 403, "Only athletes with a completed booking under you can be rated");
    const rating = Number(req.body.rating);
    if (rating < 1 || rating > 5) return fail(res, 400, "Rating must be between 1 and 5");
    const data = await AthleteRating.create({
      athleteId: athlete._id, instructorId: req.user._id, rating,
      booking: booked._id,
      sport: validId(req.body.sport) ? req.body.sport : booked.sport || coach.sports?.[0]?.sport,
      sportComplex: coach.SportComplexId, remarks: String(req.body.remarks || ""),
      parameters: Array.isArray(req.body.parameters) ? req.body.parameters : [], isEvaluated: 1,
    });
    await Guest.updateOne({ _id: booked._id }, { $set: { isEvaluated: true, evaluatedAt: new Date() } });
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
    const verifiedTotal = verifiedGrantTotals(grant);
    const validationError = validateMilestoneProgress(grant, amountUsed, verifiedTotal);
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
      const verifiedTotal = verifiedGrantTotals(grant, progress._id);
      const validationError = validateMilestoneProgress(grant, Number(progress.amountUsed), verifiedTotal, Number(progress.percent));
      if (validationError) return fail(res, 400, `Cannot verify: ${validationError}`);
    }
    progress.reviewStatus = decision;
    progress.adminNote = String(req.body.note || "");
    progress.reviewedBy = req.user._id;
    progress.reviewedAt = new Date();
    const verifiedAfterReview = decision === "Verified"
      ? verifiedGrantTotals(grant, progress._id).amountUsed + Number(progress.amountUsed)
      : verifiedGrantTotals(grant).amountUsed;
    grant.status = decision === "Verified"
      ? (verifiedAfterReview >= Number(grant.allocatedAmount) ? "Verified" : "In Progress")
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
