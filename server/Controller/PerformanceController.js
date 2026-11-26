const mongoose = require("mongoose");
const Sport = require("../Model/SportModel");
const Athlete = require("../Model/athleteModel");
const Instructor = require("../Model/instructorModel");
const Template = require("../Model/EvaluationTemplateModel");
const Evaluation = require("../Model/PerformanceEvaluationModel");
const Guest = require("../Model/GuestModel");
const Attendance = require("../Model/BookingAttendanceModel");
const Achievement = require("../Model/AthleteAchievementModel");
const AthleteRating = require("../Model/athleteRatingModel");
const Users = require("../Model/UsersModel");
const { ROLE } = require("../Utils/roles");
const { canAccessAthlete, districtComplexIds } = require("../Utils/scope");

const ACHIEVEMENT_WEIGHTS = {
  "Gold Medal": 15,
  Championship: 15,
  "Competition Winner": 12,
  "Silver Medal": 10,
  "Bronze Medal": 7,
  "Personal Record": 6,
  "Tournament Participation": 4,
  Other: 4,
};

const fail = (res, status, msg) => res.status(status).json({ data: "", msg, rcode: -9 });
const validId = (value) => mongoose.isValidObjectId(value);
const number = (value) => (typeof value === "number" && Number.isFinite(value) ? value : Number(value));

function validateParameters(parameters) {
  if (!Array.isArray(parameters) || !parameters.length) return "At least one parameter is required";
  const total = parameters.reduce((sum, item) => sum + number(item.weightage), 0);
  if (!Number.isFinite(total) || Math.abs(total - 100) > 0.0001) return "Parameter weightage must total 100";
  for (const item of parameters) {
    if (!item.name || !["qualitative", "quantitative", "statistical"].includes(item.evaluationType)) {
      return "Every parameter needs a name and a valid evaluation type";
    }
    if (!Number.isFinite(number(item.weightage)) || number(item.weightage) <= 0) return "Parameter weightage must be positive";
    if (item.evaluationType === "qualitative" && (!Number.isFinite(number(item.maxScore)) || number(item.maxScore) <= 0)) {
      return "Qualitative parameters need a positive maximum score";
    }
  }
  return null;
}

function validateRecognitionLevels(levels) {
  if (levels === undefined) return null;
  if (!Array.isArray(levels)) return "Recognition levels must be an array";
  for (const level of levels) {
    if (!level.label || !Number.isFinite(number(level.minScore)) || number(level.minScore) < 0 || number(level.minScore) > 100) {
      return "Recognition levels need a label and a score between 0 and 100";
    }
  }
  return null;
}

function recognitionFor(score, levels) {
  return [...(levels || [])].sort((a, b) => b.minScore - a.minScore).find((level) => score >= level.minScore) || { label: "", badge: "" };
}

function normalizedValue(parameter, raw) {
  const value = number(raw);
  if (!Number.isFinite(value)) return null;
  if (parameter.evaluationType === "qualitative") {
    if (value < 0 || value > number(parameter.maxScore)) return null;
    return (value / number(parameter.maxScore)) * 100;
  }
  const benchmark = parameter.benchmark || {};
  const min = number(benchmark.min);
  const max = number(benchmark.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  if (value < Math.min(min, max) || value > Math.max(min, max)) return null;
  const method = parameter.scoringMethod || "higher_is_better";
  if (method === "lower_is_better") return ((max - value) / (max - min)) * 100;
  return ((value - min) / (max - min)) * 100;
}

async function ensureCoachCanEvaluate(req, athlete, sportId, bookingId) {
  const coach = await Instructor.findOne({ userId: req.user._id }).select("sports SportComplexId").lean();
  const sports = (coach?.sports || []).map(item => String(item.sport));
  if (!coach || (sportId && !sports.includes(String(sportId)))) return false;
  if (await canAccessAthlete(req.user, athlete)) return true;
  // A missing profile facility is not a reason to reject a paid coaching enrolment.
  // Never use this fallback for an athlete explicitly assigned to another facility.
  if (athlete.SportComplexId || !coach.SportComplexId) return false;
  const guestQuery = {
    coach: coach._id, SportComplexId: coach.SportComplexId,
    citizenUser: athlete.userId?._id || athlete.userId,
    sport: sportId || { $in: sports },
    bookingStatus: "Confirmed", paymentStatus: "Paid",
  };
  if (bookingId && validId(bookingId)) guestQuery._id = bookingId;
  return Boolean(await Guest.exists(guestQuery));
}
async function canAccessPerformanceAthlete(req, athlete) {
  if (req.user.Role === ROLE.ADMIN) return true;
  if (req.user.Role === ROLE.ATHLETE) {
    return String(athlete.userId?._id || athlete.userId) === String(req.user._id);
  }
  if (req.user.Role === ROLE.AUTHORITY || req.user.Role === ROLE.MANAGER) {
    return canAccessAthlete(req.user, athlete);
  }
  return req.user.Role === ROLE.COACH
    ? ensureCoachCanEvaluate(req, athlete, validId(req.query?.sportId) ? req.query.sportId : undefined, validId(req.query?.bookingId) ? req.query.bookingId : undefined)
    : canAccessAthlete(req.user, athlete);
}

async function adminTemplates(req, res) {
  try {
    const query = validId(req.query.sportId) ? { sport: req.query.sportId } : {};
    const data = await Template.find(query).populate("sport", "SportName").sort({ sport: 1, version: -1 }).lean();
    return res.json({ data, rcode: 200 });
  } catch (error) {
    console.error("Could not load evaluation templates:", error.message);
    return fail(res, 500, "Could not load evaluation templates");
  }
}

async function createTemplate(req, res) {
  try {
    const { sportId, parameters, recognitionLevels, scoringFormula } = req.body || {};
    if (!validId(sportId) || !await Sport.exists({ _id: sportId })) return fail(res, 404, "Sport not found");
    const parameterError = validateParameters(parameters);
    const recognitionError = validateRecognitionLevels(recognitionLevels);
    if (parameterError || recognitionError) return fail(res, 400, parameterError || recognitionError);
    const latest = await Template.findOne({ sport: sportId }).sort({ version: -1 }).select("version").lean();
    const data = await Template.create({
      sport: sportId,
      version: (latest?.version || 0) + 1,
      parameters,
      recognitionLevels: Array.isArray(recognitionLevels) ? recognitionLevels : [],
      scoringFormula: scoringFormula || "weighted_sum",
      createdBy: req.user._id,
    });
    return res.status(201).json({ data, rcode: 200 });
  } catch (error) {
    console.error("Could not create evaluation template:", error.message);
    return fail(res, 500, "Could not create evaluation template");
  }
}

async function updateTemplate(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid template");
    const template = await Template.findById(req.params.id);
    if (!template) return fail(res, 404, "Template not found");
    if (template.status !== "Draft") return fail(res, 409, "Only draft templates can be edited");
    if (req.body?.parameters !== undefined) {
      const parameterError = validateParameters(req.body.parameters);
      if (parameterError) return fail(res, 400, parameterError);
      template.parameters = req.body.parameters;
    }
    const recognitionError = validateRecognitionLevels(req.body?.recognitionLevels);
    if (recognitionError) return fail(res, 400, recognitionError);
    if (Array.isArray(req.body?.recognitionLevels)) template.recognitionLevels = req.body.recognitionLevels;
    if (typeof req.body.scoringFormula === "string") template.scoringFormula = req.body.scoringFormula;
    await template.save();
    return res.json({ data: template, rcode: 200 });
  } catch (error) {
    console.error("Could not update evaluation template:", error.message);
    return fail(res, 500, "Could not update evaluation template");
  }
}

async function publishTemplate(req, res) {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) return fail(res, 404, "Template not found");
    const parameterError = validateParameters(template.parameters);
    const recognitionError = validateRecognitionLevels(template.recognitionLevels);
    if (parameterError || recognitionError) return fail(res, 400, parameterError || recognitionError);
    await Template.updateMany({ sport: template.sport, status: "Published", _id: { $ne: template._id } }, { $set: { status: "Archived" } });
    template.status = "Published";
    template.publishedAt = new Date();
    await template.save();
    return res.json({ data: template, rcode: 200 });
  } catch (error) {
    console.error("Could not publish evaluation template:", error.message);
    return fail(res, 500, "Could not publish evaluation template");
  }
}

async function publishedTemplate(req, res) {
  try {
    if (!validId(req.params.sportId)) return fail(res, 400, "Invalid sport");
    const data = await Template.findOne({ sport: req.params.sportId, status: "Published" }).sort({ version: -1 }).populate("sport", "SportName").lean();
    if (!data) return fail(res, 404, "No published evaluation template for this sport");
    return res.json({ data, rcode: 200 });
  } catch (error) {
    console.error("Could not load published evaluation template:", error.message);
    return fail(res, 500, "Could not load evaluation template");
  }
}

async function coachAthletes(req, res) {
  try {
    const coach = await Instructor.findOne({ userId: req.user._id }).select("SportComplexId sports").lean();
    if (!coach) return fail(res, 404, "Coach profile not found");
    const data = await Athlete.find({ SportComplexId: coach.SportComplexId, isActive: { $ne: 0 } })
      .populate("userId", "Name Email ContactNum").lean();
    return res.json({ data, rcode: 200 });
  } catch (error) {
    console.error("Could not load coach athletes:", error.message);
    return fail(res, 500, "Could not load athletes");
  }
}

async function createEvaluation(req, res) {
  try {
    const { athleteId, sportId, bookingId, details, remarks, evaluationDate } = req.body || {};
    if (!validId(athleteId) || !validId(sportId) || !Array.isArray(details)) {
      return fail(res, 400, "Athlete, sport and parameter scores are required");
    }
    const athlete = await Athlete.findById(athleteId).lean();
    if (!athlete || !await ensureCoachCanEvaluate(req, athlete, sportId, bookingId)) {
      return fail(res, 403, "Athlete or sport is outside your coaching scope");
    }

    // Resolve specific booking if provided or latest played booking
    let matchedBooking = null;
    if (bookingId && validId(bookingId)) {
      if (mongoose.connection.readyState === 1 || Object.hasOwn(Guest, "findById")) {
        matchedBooking = await Guest.findById(bookingId).lean();
      }
    } else if (mongoose.connection.readyState === 1 || Object.hasOwn(Guest, "findOne")) {
      const coach = await Instructor.findOne({ userId: req.user._id }).select("_id").lean();
      if (coach) {
        matchedBooking = await Guest.findOne({
          citizenUser: athlete.userId?._id || athlete.userId,
          sport: sportId,
          coach: coach._id,
          bookingStatus: "Confirmed",
          paymentStatus: "Paid",
        }).sort({ Startdate: -1 }).lean();
      }
    }

    const template = await Template.findOne({ sport: sportId, status: "Published" }).sort({ version: -1 }).lean();
    if (!template) return fail(res, 404, "No published evaluation template for this sport");
    if (details.length !== template.parameters.filter((item) => item.active).length) {
      return fail(res, 400, "Provide a score for every active parameter");
    }
    const submitted = new Map(details.map((item) => [String(item.parameterId), item]));
    const evaluationDetails = [];
    for (const parameter of template.parameters.filter((item) => item.active)) {
      const input = submitted.get(String(parameter._id));
      const normalized = input ? normalizedValue(parameter, input.actualValue) : null;
      if (!input || normalized === null) return fail(res, 400, `Invalid score for ${parameter.name}`);
      evaluationDetails.push({
        parameterId: parameter._id,
        parameterName: parameter.name,
        actualValue: input.actualValue,
        normalizedScore: Math.round(normalized * 100) / 100,
        weightedScore: Math.round(normalized * parameter.weightage) / 100,
        remarks: String(input.remarks || ""),
      });
    }
    const totalScore = Math.round(evaluationDetails.reduce((sum, item) => sum + item.weightedScore, 0) * 100) / 100;
    const data = await Evaluation.create({
      athlete: athleteId,
      sport: sportId,
      coach: req.user._id,
      booking: matchedBooking ? matchedBooking._id : null,
      sessionDate: matchedBooking?.Startdate || (evaluationDate ? new Date(evaluationDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)),
      template: template._id,
      templateVersion: template.version,
      totalScore,
      recognition: recognitionFor(totalScore, template.recognitionLevels),
      remarks: String(remarks || ""),
      evaluationDate: evaluationDate || new Date(),
      details: evaluationDetails,
    });

    if (matchedBooking && (mongoose.connection.readyState === 1 || Object.hasOwn(Guest, "updateOne"))) {
      await Guest.updateOne(
        { _id: matchedBooking._id },
        { $set: { isEvaluated: true, evaluatedAt: new Date(), evaluationScore: totalScore } }
      );
    }

    return res.status(201).json({ data, rcode: 200 });
  } catch (error) {
    console.error("Could not submit athlete evaluation:", error.message);
    return fail(res, 500, "Could not submit athlete evaluation");
  }
}

async function listEvaluations(req, res) {
  try {
    if (!validId(req.query.athleteId)) return fail(res, 400, "athleteId is required");
    const athlete = await Athlete.findById(req.query.athleteId).lean();
    if (!athlete || !await canAccessPerformanceAthlete(req, athlete)) return fail(res, 403, "Athlete is outside your scope");
    const query = { athlete: athlete._id };
    if (validId(req.query.sportId)) query.sport = req.query.sportId;
    if (req.user.Role === ROLE.COACH) query.coach = req.user._id;
    const data = await Evaluation.find(query)
      .populate("sport", "SportName")
      .populate("coach", "Name")
      .populate({ path: "booking", select: "Startdate timeslot bookingReference bookingStatus paymentStatus isEvaluated" })
      .sort({ evaluationDate: -1 })
      .lean();
    return res.json({ data, rcode: 200 });
  } catch (error) {
    console.error("Could not load athlete evaluations:", error.message);
    return fail(res, 500, "Could not load athlete evaluations");
  }
}

async function ownEvaluations(req, res) {
  const athlete = await Athlete.findOne({ userId: req.user._id }).select("_id").lean();
  if (!athlete) return fail(res, 404, "Athlete profile not found");
  req.query.athleteId = String(athlete._id);
  return listEvaluations(req, res);
}

async function createAchievement(req, res) {
  try {
    const {
      sportId,
      title,
      description,
      category,
      eventName,
      achievementDate,
      rank,
      supportingDocuments,
      athleteId: bodyAthleteId,
      verificationStatus,
      verificationRemarks,
    } = req.body || {};

    let targetAthlete = null;

    if (req.user.Role === ROLE.ATHLETE) {
      targetAthlete = await Athlete.findOne({ userId: req.user._id }).lean();
      if (!targetAthlete) return fail(res, 404, "Athlete profile not found");
    } else if ([ROLE.ADMIN, ROLE.MANAGER].includes(req.user.Role)) {
      if (!validId(bodyAthleteId)) return fail(res, 400, "Valid athleteId is required");
      targetAthlete = await Athlete.findById(bodyAthleteId).lean();
      if (!targetAthlete || !await canAccessPerformanceAthlete(req, targetAthlete)) {
        return fail(res, 403, "Athlete is outside your management scope");
      }
    } else {
      return fail(res, 403, "Permission denied");
    }

    if (!validId(sportId) || !title || !category || !achievementDate) {
      return fail(res, 400, "Complete the achievement details (sport, category, title, achievement date)");
    }
    if (!await Sport.exists({ _id: sportId })) return fail(res, 404, "Sport not found");

    const documents = Array.isArray(supportingDocuments)
      ? supportingDocuments.filter((item) => item && typeof item.url === "string" && item.url.length <= 2048)
      : [];

    const isStaff = [ROLE.ADMIN, ROLE.MANAGER].includes(req.user.Role);
    const finalStatus = isStaff ? (verificationStatus || "Verified") : "Pending";
    const finalVerifiedBy = isStaff ? req.user._id : null;
    const finalRemarks = isStaff ? (verificationRemarks || "Recorded by staff") : "";

    const created = await Achievement.create({
      athlete: targetAthlete._id,
      sport: sportId,
      title: String(title).trim(),
      description: String(description || "").trim(),
      category,
      eventName: String(eventName || "").trim(),
      achievementDate,
      rank: String(rank || "").trim(),
      supportingDocuments: documents,
      verificationStatus: finalStatus,
      verifiedBy: finalVerifiedBy,
      verificationRemarks: finalRemarks,
    });

    const populated = await Achievement.findById(created._id)
      .populate("sport", "SportName")
      .populate("verifiedBy", "Name Email")
      .populate({
        path: "athlete",
        select: "userId SportComplexId",
        populate: [
          { path: "userId", select: "Name Email ContactNum" },
          { path: "SportComplexId", select: "name location" },
        ],
      })
      .lean();

    return res.status(201).json({ data: populated, rcode: 200 });
  } catch (error) {
    console.error("Could not submit achievement:", error.message);
    return fail(res, 500, "Could not submit achievement");
  }
}

async function listAchievements(req, res) {
  try {
    let athleteId = req.query.athleteId;
    if (req.user.Role === ROLE.ATHLETE) {
      const athlete = await Athlete.findOne({ userId: req.user._id }).select("_id").lean();
      if (!athlete) return res.json({ data: [], rcode: 200 });
      athleteId = athlete._id;
    }

    const query = {};

    if (validId(athleteId)) {
      const athlete = await Athlete.findById(athleteId).lean();
      if (!athlete || !await canAccessPerformanceAthlete(req, athlete)) {
        return fail(res, 403, "Athlete is outside your scope");
      }
      query.athlete = athleteId;
    } else {
      if (req.user.Role === ROLE.ADMIN) {
        // Statewide: all achievements
      } else if (req.user.Role === ROLE.MANAGER) {
        const athletes = await Athlete.find({ SportComplexId: req.user.SportComplexId }).select("_id").lean();
        query.athlete = { $in: athletes.map((a) => a._id) };
      } else if (req.user.Role === ROLE.COACH) {
        const coach = await Instructor.findOne({ userId: req.user._id }).select("_id SportComplexId sports").lean();
        const complexAthletes = coach?.SportComplexId ? await Athlete.find({ SportComplexId: coach.SportComplexId }).select("_id").lean() : [];
        const guestUsers = coach ? await Guest.find({ coach: coach._id, bookingStatus: "Confirmed" }).distinct("citizenUser") : [];
        const guestAthletes = guestUsers.length ? await Athlete.find({ userId: { $in: guestUsers } }).select("_id").lean() : [];
        const athleteIds = [...new Set([...complexAthletes.map((a) => String(a._id)), ...guestAthletes.map((a) => String(a._id))])];
        query.athlete = { $in: athleteIds };
      } else if (req.user.Role === ROLE.AUTHORITY) {
        const cIds = await districtComplexIds(req.user.DistrictId);
        const athletes = await Athlete.find({ SportComplexId: { $in: cIds } }).select("_id").lean();
        query.athlete = { $in: athletes.map((a) => a._id) };
      }
    }

    if (validId(req.query.sportId)) query.sport = req.query.sportId;
    if (req.query.verificationStatus && ["Pending", "Verified", "Rejected"].includes(req.query.verificationStatus)) {
      query.verificationStatus = req.query.verificationStatus;
    }

    const data = await Achievement.find(query)
      .populate("sport", "SportName")
      .populate("verifiedBy", "Name Email")
      .populate({
        path: "athlete",
        select: "userId SportComplexId",
        populate: [
          { path: "userId", select: "Name Email ContactNum" },
          { path: "SportComplexId", select: "name location" },
        ],
      })
      .sort({ achievementDate: -1, createdAt: -1 })
      .lean();

    return res.json({ data, rcode: 200 });
  } catch (error) {
    console.error("Could not load achievements:", error.message);
    return fail(res, 500, "Could not load achievements");
  }
}

async function verifyAchievement(req, res) {
  try {
    if (!validId(req.params.id)) return fail(res, 400, "Invalid achievement ID");
    const achievement = await Achievement.findById(req.params.id).populate("athlete");
    if (!achievement) return fail(res, 404, "Achievement not found");

    const isAllowed =
      req.user.Role === ROLE.ADMIN ||
      (req.user.Role === ROLE.MANAGER && await canAccessAthlete(req.user, achievement.athlete)) ||
      (req.user.Role === ROLE.COACH && await ensureCoachCanEvaluate(req, achievement.athlete, achievement.sport));

    if (!isAllowed) {
      return fail(res, 403, "Achievement is outside your management or coaching scope");
    }

    if (!["Pending", "Verified", "Rejected"].includes(req.body?.verificationStatus)) {
      return fail(res, 400, "Verification status must be Pending, Verified, or Rejected");
    }

    achievement.verificationStatus = req.body.verificationStatus;
    achievement.verificationRemarks = String(req.body.verificationRemarks || "");
    achievement.verifiedBy = req.user._id;
    await achievement.save();

    const populated = await Achievement.findById(achievement._id)
      .populate("sport", "SportName")
      .populate("verifiedBy", "Name Email")
      .populate({
        path: "athlete",
        select: "userId SportComplexId",
        populate: [
          { path: "userId", select: "Name Email ContactNum" },
          { path: "SportComplexId", select: "name location" },
        ],
      })
      .lean();

    return res.json({ data: populated, rcode: 200 });
  } catch (error) {
    console.error("Could not verify achievement:", error.message);
    return fail(res, 500, "Could not verify achievement");
  }
}

async function computeLeaderboardEntries({ sportId = "", districtId = "" } = {}) {
  const athleteFilter = { isActive: { $ne: 0 } };
  const athletes = await Athlete.find(athleteFilter)
    .populate("userId", "Name Email ContactNum DOB")
    .populate({
      path: "SportComplexId",
      select: "name location district",
      populate: { path: "district", select: "District" },
    })
    .lean();

  const evalFilter = validId(sportId) ? { sport: sportId } : {};
  const achFilter = { verificationStatus: "Verified", ...(validId(sportId) ? { sport: sportId } : {}) };
  const legacyFilter = { isEvaluated: 1, ...(validId(sportId) ? { sport: sportId } : {}) };

  const [evaluations, achievements, legacyRatings, confirmedBookings] = await Promise.all([
    Evaluation.find(evalFilter).populate("sport", "SportName").sort({ evaluationDate: -1 }).lean(),
    Achievement.find(achFilter).populate("sport", "SportName").lean(),
    AthleteRating.find(legacyFilter).populate("sport", "SportName").lean(),
    mongoose.connection.readyState === 1 || Object.hasOwn(Guest, "find")
      ? Guest.find({ bookingStatus: "Confirmed", citizenUser: { $ne: null } })
          .populate({
            path: "SportComplexId",
            select: "name location district",
            populate: { path: "district", select: "District" },
          })
          .sort({ Startdate: -1, createdAt: -1 })
          .lean()
      : Promise.resolve([]),
  ]);

  const fallbackComplexByUser = new Map();
  for (const bk of confirmedBookings || []) {
    const uid = bk.citizenUser ? String(bk.citizenUser) : "";
    if (uid && bk.SportComplexId && !fallbackComplexByUser.has(uid)) {
      fallbackComplexByUser.set(uid, bk.SportComplexId);
    }
  }

  const evalsByAthlete = new Map();
  for (const ev of evaluations) {
    const k = String(ev.athlete);
    if (!evalsByAthlete.has(k)) evalsByAthlete.set(k, []);
    evalsByAthlete.get(k).push(ev);
  }

  const achsByAthlete = new Map();
  for (const ach of achievements) {
    const k = String(ach.athlete);
    if (!achsByAthlete.has(k)) achsByAthlete.set(k, []);
    achsByAthlete.get(k).push(ach);
  }

  const legacyByAthlete = new Map();
  for (const lr of legacyRatings) {
    const k = String(lr.athleteId);
    if (!legacyByAthlete.has(k)) legacyByAthlete.set(k, []);
    legacyByAthlete.get(k).push(lr);
  }

  const rows = [];
  for (const athlete of athletes) {
    if (!athlete.userId) continue;
    const aid = String(athlete._id);
    const complex = athlete.SportComplexId || fallbackComplexByUser.get(String(athlete.userId._id)) || null;
    const distId = complex?.district?._id ? String(complex.district._id) : "";
    const distName = complex?.district?.District || "";

    if (validId(districtId) && distId !== String(districtId)) continue;

    const evals = evalsByAthlete.get(aid) || [];
    const achs = achsByAthlete.get(aid) || [];
    const leg = legacyByAthlete.get(aid) || [];

    // Only rank athletes who have recorded evaluations, verified achievements, or ratings
    if (!evals.length && !achs.length && !leg.length) continue;

    const avgEvalScore = evals.length
      ? Math.round((evals.reduce((s, e) => s + Number(e.totalScore || 0), 0) / evals.length) * 10) / 10
      : 0;
    const bestEvalScore = evals.length
      ? Math.round(Math.max(...evals.map((e) => Number(e.totalScore || 0))) * 10) / 10
      : 0;

    const medals = { gold: 0, silver: 0, bronze: 0, awards: 0 };
    let achievementBonus = 0;
    for (const ach of achs) {
      if (ach.category === "Gold Medal" || ach.category === "Championship") medals.gold += 1;
      else if (ach.category === "Silver Medal") medals.silver += 1;
      else if (ach.category === "Bronze Medal") medals.bronze += 1;
      else medals.awards += 1;
      achievementBonus += ACHIEVEMENT_WEIGHTS[ach.category] || 4;
    }

    const legacyAvg = leg.length
      ? Math.round((leg.reduce((s, r) => s + Number(r.rating || 0), 0) / leg.length) * 10) / 10
      : 0;
    const baseScore = evals.length ? avgEvalScore : Math.min(100, legacyAvg);
    const compositePoints = Math.round((baseScore + Math.min(60, achievementBonus)) * 10) / 10;

    const sportSet = new Map();
    for (const ev of evals) {
      if (ev.sport?._id) sportSet.set(String(ev.sport._id), ev.sport.SportName);
    }
    for (const ach of achs) {
      if (ach.sport?._id) sportSet.set(String(ach.sport._id), ach.sport.SportName);
    }
    for (const lr of leg) {
      if (lr.sport?._id) sportSet.set(String(lr.sport._id), lr.sport.SportName);
    }

    const latestEval = evals[0] || null;
    rows.push({
      athleteId: aid,
      userId: String(athlete.userId._id),
      name: athlete.userId.Name || "Athlete",
      complexId: complex?._id ? String(complex._id) : "",
      complexName: complex?.name || "Independent / Unassigned",
      districtId: distId,
      districtName: distName || "Gujarat",
      sports: [...sportSet.entries()].map(([id, name]) => ({ id, name })),
      avgEvaluationScore: avgEvalScore,
      bestEvaluationScore: bestEvalScore,
      evaluationsCount: evals.length,
      verifiedAchievementsCount: achs.length,
      medals,
      achievementBonus,
      compositePoints,
      recognitionLabel: latestEval?.recognition?.label || "",
      latestEvaluationDate: latestEval?.evaluationDate || null,
      _athleteDoc: athlete,
    });
  }

  rows.sort((a, b) => {
    if (b.compositePoints !== a.compositePoints) return b.compositePoints - a.compositePoints;
    if (b.avgEvaluationScore !== a.avgEvaluationScore) return b.avgEvaluationScore - a.avgEvaluationScore;
    if (b.verifiedAchievementsCount !== a.verifiedAchievementsCount) {
      return b.verifiedAchievementsCount - a.verifiedAchievementsCount;
    }
    return String(a.name).localeCompare(String(b.name));
  });

  rows.forEach((row, index) => {
    row.rank = index + 1;
  });

  return rows;
}

async function resolveScopeAccess(req, athleteDoc) {
  if (req.user.Role === ROLE.ADMIN) return true;
  if (req.user.Role === ROLE.ATHLETE) {
    return String(athleteDoc.userId?._id || athleteDoc.userId) === String(req.user._id);
  }
  return canAccessPerformanceAthlete(req, athleteDoc);
}

async function leaderboard(req, res) {
  try {
    const sportId = validId(req.query.sportId) ? req.query.sportId : "";
    const districtId = validId(req.query.districtId) ? req.query.districtId : "";
    const scopeOnly = req.query.scope === "my";

    const ranked = await computeLeaderboardEntries({ sportId, districtId });

    let coachAllowedSet = null;
    if (req.user.Role === ROLE.COACH) {
      const coach = await Instructor.findOne({ userId: req.user._id }).select("_id SportComplexId").lean();
      const guestUsers = coach ? await Guest.find({ coach: coach._id, bookingStatus: "Confirmed", paymentStatus: "Paid" }).distinct("citizenUser") : [];
      coachAllowedSet = { complexId: coach?.SportComplexId ? String(coach.SportComplexId) : "", guestUsers: new Set(guestUsers.map(String)) };
    }

    let authorityComplexSet = null;
    if (req.user.Role === ROLE.AUTHORITY) {
      const cIds = await districtComplexIds(req.user.DistrictId);
      authorityComplexSet = new Set(cIds.map(String));
    }

    const canQuickAccess = (athleteDoc) => {
      if (req.user.Role === ROLE.ADMIN) return true;
      if (req.user.Role === ROLE.ATHLETE) return String(athleteDoc.userId?._id) === String(req.user._id);
      if (req.user.Role === ROLE.MANAGER) return Boolean(req.user.SportComplexId) && String(athleteDoc.SportComplexId?._id || athleteDoc.SportComplexId) === String(req.user.SportComplexId);
      if (req.user.Role === ROLE.AUTHORITY) return authorityComplexSet.has(String(athleteDoc.SportComplexId?._id || athleteDoc.SportComplexId));
      if (req.user.Role === ROLE.COACH && coachAllowedSet) {
        if (coachAllowedSet.complexId && String(athleteDoc.SportComplexId?._id || athleteDoc.SportComplexId) === coachAllowedSet.complexId) return true;
        return !athleteDoc.SportComplexId && coachAllowedSet.guestUsers.has(String(athleteDoc.userId?._id));
      }
      return false;
    };

    const output = [];
    for (const entry of ranked) {
      const isMe = String(entry.userId) === String(req.user._id);
      const canViewPortfolio = canQuickAccess(entry._athleteDoc);
      if (scopeOnly && !canViewPortfolio) continue;

      const { _athleteDoc, userId, ...publicFields } = entry;
      output.push({
        ...publicFields,
        isMe,
        canViewPortfolio,
      });
    }

    const totalAthletes = output.length;
    const avgPoints = totalAthletes
      ? Math.round((output.reduce((s, r) => s + r.compositePoints, 0) / totalAthletes) * 10) / 10
      : 0;
    const totalVerifiedAwards = output.reduce((s, r) => s + r.verifiedAchievementsCount, 0);
    const evaluatedAthletes = output.filter((r) => r.evaluationsCount > 0).length;

    return res.json({
      data: output,
      summary: {
        totalAthletes,
        evaluatedAthletes,
        avgPoints,
        totalVerifiedAwards,
      },
      rcode: 200,
    });
  } catch (error) {
    console.error("Could not load leaderboard:", error.message);
    return fail(res, 500, "Could not load leaderboard");
  }
}

async function buildAthletePortfolio(athlete, userDoc) {
  if (!athlete) {
    const u = userDoc || {};
    return {
      exists: false,
      user: {
        id: String(u._id || ""),
        name: u.Name || "Citizen Athlete",
        email: u.Email || "",
        phone: u.ContactNum || "",
        dob: u.DOB || "",
      },
      athlete: null,
      summary: {
        stateRank: null,
        totalRankedAthletes: 0,
        compositePoints: 0,
        avgEvaluationScore: 0,
        bestEvaluationScore: 0,
        evaluationsCount: 0,
        verifiedAchievementsCount: 0,
        pendingAchievementsCount: 0,
        medals: { gold: 0, silver: 0, bronze: 0, awards: 0 },
        confirmedBookingsCount: 0,
        attendedSessionsCount: 0,
      },
      sportBreakdown: [],
      evaluations: [],
      achievements: [],
    };
  }

  const aid = String(athlete._id);
  const uid = athlete.userId?._id || athlete.userId;

  const [evaluations, achievements, bookings, ranked] = await Promise.all([
    Evaluation.find({ athlete: aid })
      .populate("sport", "SportName Category")
      .populate("coach", "Name Email")
      .sort({ evaluationDate: -1 })
      .lean(),
    Achievement.find({ athlete: aid })
      .populate("sport", "SportName")
      .populate("verifiedBy", "Name")
      .sort({ achievementDate: -1, createdAt: -1 })
      .lean(),
    uid
      ? Guest.find({ citizenUser: uid, bookingStatus: "Confirmed" })
          .select("sport SportComplexId Startdate isEvaluated evaluationScore paymentStatus")
          .populate({
            path: "SportComplexId",
            select: "name location district",
            populate: { path: "district", select: "District" },
          })
          .sort({ Startdate: -1, createdAt: -1 })
          .lean()
      : [],
    computeLeaderboardEntries({}),
  ]);

  const bookingIds = (bookings || []).map((b) => b._id);
  const attendances = bookingIds.length
    ? await Attendance.find({ booking: { $in: bookingIds } }).select("booking entryAt exitAt").lean()
    : [];
  const attendanceByBooking = new Set(attendances.map((a) => String(a.booking)));
  const todayStr = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rankRow = ranked.find((r) => r.athleteId === aid) || null;
  const fallbackBookingComplex = (bookings || []).find((b) => b.SportComplexId)?.SportComplexId || null;
  const effectiveComplex = athlete.SportComplexId || fallbackBookingComplex;

  // Build per-sport performance summaries
  const sportMap = new Map();
  for (const ev of evaluations) {
    const sid = String(ev.sport?._id || ev.sport);
    const sName = ev.sport?.SportName || "Sport";
    if (!sportMap.has(sid)) {
      sportMap.set(sid, {
        sportId: sid,
        sportName: sName,
        evaluations: [],
        verifiedAchievements: 0,
      });
    }
    sportMap.get(sid).evaluations.push(ev);
  }
  for (const ach of achievements) {
    if (ach.verificationStatus !== "Verified") continue;
    const sid = String(ach.sport?._id || ach.sport);
    const sName = ach.sport?.SportName || "Sport";
    if (!sportMap.has(sid)) {
      sportMap.set(sid, {
        sportId: sid,
        sportName: sName,
        evaluations: [],
        verifiedAchievements: 0,
      });
    }
    sportMap.get(sid).verifiedAchievements += 1;
  }

  const sportBreakdown = [];
  for (const entry of sportMap.values()) {
    const scores = entry.evaluations.map((e) => Number(e.totalScore || 0));
    const latest = entry.evaluations[0] || null;
    const avgScore = scores.length ? Math.round((scores.reduce((s, n) => s + n, 0) / scores.length) * 10) / 10 : 0;
    const bestScore = scores.length ? Math.round(Math.max(...scores) * 10) / 10 : 0;
    sportBreakdown.push({
      sportId: entry.sportId,
      sportName: entry.sportName,
      evaluationsCount: entry.evaluations.length,
      avgScore,
      bestScore,
      latestScore: latest ? latest.totalScore : 0,
      latestRecognition: latest?.recognition?.label || "",
      latestParameters: (latest?.details || []).map((d) => ({
        name: d.parameterName,
        normalizedScore: d.normalizedScore,
        weightedScore: d.weightedScore,
      })),
      verifiedAchievements: entry.verifiedAchievements,
    });
  }
  sportBreakdown.sort((a, b) => b.latestScore - a.latestScore || b.verifiedAchievements - a.verifiedAchievements);

  const verifiedAchs = achievements.filter((a) => a.verificationStatus === "Verified");
  const medals = rankRow?.medals || {
    gold: verifiedAchs.filter((a) => a.category === "Gold Medal" || a.category === "Championship").length,
    silver: verifiedAchs.filter((a) => a.category === "Silver Medal").length,
    bronze: verifiedAchs.filter((a) => a.category === "Bronze Medal").length,
    awards: verifiedAchs.filter((a) => !["Gold Medal", "Championship", "Silver Medal", "Bronze Medal"].includes(a.category)).length,
  };

  const avgEval = evaluations.length
    ? Math.round((evaluations.reduce((s, e) => s + Number(e.totalScore || 0), 0) / evaluations.length) * 10) / 10
    : 0;
  const bestEval = evaluations.length
    ? Math.round(Math.max(...evaluations.map((e) => Number(e.totalScore || 0))) * 10) / 10
    : 0;

  return {
    exists: true,
    user: {
      id: String(athlete.userId?._id || uid || ""),
      name: athlete.userId?.Name || userDoc?.Name || "Athlete",
      email: athlete.userId?.Email || userDoc?.Email || "",
      phone: athlete.userId?.ContactNum || userDoc?.ContactNum || "",
      dob: athlete.userId?.DOB || userDoc?.DOB || "",
    },
    athlete: {
      id: aid,
      complexName: effectiveComplex?.name || "Unassigned",
      complexLocation: effectiveComplex?.location || "",
      districtName: effectiveComplex?.district?.District || rankRow?.districtName || "",
      baseUrl: athlete.baseUrl || "",
      isApproved: athlete.isApproved,
      joinedAt: athlete.createdAt,
    },
    summary: {
      stateRank: rankRow?.rank || null,
      totalRankedAthletes: ranked.length,
      compositePoints: rankRow?.compositePoints || avgEval,
      avgEvaluationScore: avgEval,
      bestEvaluationScore: bestEval,
      evaluationsCount: evaluations.length,
      verifiedAchievementsCount: verifiedAchs.length,
      pendingAchievementsCount: achievements.filter((a) => a.verificationStatus === "Pending").length,
      medals,
      confirmedBookingsCount: bookings.length,
      attendedSessionsCount: bookings.filter(
        (b) =>
          attendanceByBooking.has(String(b._id)) ||
          b.isEvaluated ||
          (b.paymentStatus === "Paid" && String(b.Startdate || "") <= todayStr)
      ).length,
    },
    sportBreakdown,
    evaluations,
    achievements,
  };
}

async function ownPortfolio(req, res) {
  try {
    const [athlete, userDoc] = await Promise.all([
      Athlete.findOne({ userId: req.user._id })
        .populate("userId", "Name Email ContactNum DOB")
        .populate({
          path: "SportComplexId",
          select: "name location district",
          populate: { path: "district", select: "District" },
        })
        .lean(),
      Users.findById(req.user._id).select("Name Email ContactNum DOB").lean(),
    ]);
    const portfolio = await buildAthletePortfolio(athlete, userDoc);
    return res.json({ data: portfolio, rcode: 200 });
  } catch (error) {
    console.error("Could not load own portfolio:", error.message);
    return fail(res, 500, "Could not load athlete portfolio");
  }
}

async function athletePortfolio(req, res) {
  try {
    const { athleteId } = req.params;
    if (!validId(athleteId)) return fail(res, 400, "Invalid athlete ID");
    const athlete = await Athlete.findById(athleteId)
      .populate("userId", "Name Email ContactNum DOB")
      .populate({
        path: "SportComplexId",
        select: "name location district",
        populate: { path: "district", select: "District" },
      })
      .lean();
    if (!athlete) return fail(res, 404, "Athlete profile not found");
    if (!(await resolveScopeAccess(req, athlete))) {
      return fail(res, 403, "Athlete portfolio is outside your scope");
    }
    const portfolio = await buildAthletePortfolio(athlete, athlete.userId);
    return res.json({ data: portfolio, rcode: 200 });
  } catch (error) {
    console.error("Could not load athlete portfolio:", error.message);
    return fail(res, 500, "Could not load athlete portfolio");
  }
}

module.exports = {
  adminTemplates, createTemplate, updateTemplate, publishTemplate, publishedTemplate,
  coachAthletes, createEvaluation, listEvaluations, ownEvaluations,
  createAchievement, listAchievements, verifyAchievement,
  leaderboard, ownPortfolio, athletePortfolio,
};
