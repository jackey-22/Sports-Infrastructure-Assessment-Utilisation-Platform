const mongoose = require("mongoose");
const Sport = require("../Model/SportModel");
const Athlete = require("../Model/athleteModel");
const Instructor = require("../Model/instructorModel");
const Template = require("../Model/EvaluationTemplateModel");
const Evaluation = require("../Model/PerformanceEvaluationModel");
const Guest = require("../Model/GuestModel");
const Achievement = require("../Model/AthleteAchievementModel");
const { ROLE } = require("../Utils/roles");
const { canAccessAthlete } = require("../Utils/scope");

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

async function ensureCoachCanEvaluate(req, athlete, sportId) {
  const coach = await Instructor.findOne({ userId: req.user._id }).select("sports SportComplexId").lean();
  const sports = (coach?.sports || []).map(item => String(item.sport));
  if (!coach || (sportId && !sports.includes(String(sportId)))) return false;
  if (await canAccessAthlete(req.user, athlete)) return true;
  // A missing profile facility is not a reason to reject a paid coaching enrolment.
  // Never use this fallback for an athlete explicitly assigned to another facility.
  if (athlete.SportComplexId || !coach.SportComplexId) return false;
  return Boolean(await Guest.exists({
    coach: coach._id, SportComplexId: coach.SportComplexId,
    citizenUser: athlete.userId?._id || athlete.userId,
    sport: sportId || { $in: sports },
    bookingStatus: "Confirmed", paymentStatus: "Paid",
  }));
}
async function canAccessPerformanceAthlete(req, athlete) {
  return req.user.Role === ROLE.COACH
    ? ensureCoachCanEvaluate(req, athlete, validId(req.query?.sportId) ? req.query.sportId : undefined)
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
    const { athleteId, sportId, details, remarks, evaluationDate } = req.body || {};
    if (!validId(athleteId) || !validId(sportId) || !Array.isArray(details)) return fail(res, 400, "Athlete, sport and parameter scores are required");
    const athlete = await Athlete.findById(athleteId).lean();
    if (!athlete || !await ensureCoachCanEvaluate(req, athlete, sportId)) return fail(res, 403, "Athlete or sport is outside your coaching scope");
    const template = await Template.findOne({ sport: sportId, status: "Published" }).sort({ version: -1 }).lean();
    if (!template) return fail(res, 404, "No published evaluation template for this sport");
    if (details.length !== template.parameters.filter((item) => item.active).length) return fail(res, 400, "Provide a score for every active parameter");
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
      athlete: athleteId, sport: sportId, coach: req.user._id, template: template._id,
      templateVersion: template.version, totalScore, recognition: recognitionFor(totalScore, template.recognitionLevels),
      remarks: String(remarks || ""), evaluationDate: evaluationDate || new Date(), details: evaluationDetails,
    });
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
    const data = await Evaluation.find(query).populate("sport", "SportName").populate("coach", "Name").sort({ evaluationDate: -1 }).lean();
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
    const athlete = await Athlete.findOne({ userId: req.user._id }).lean();
    const { sportId, title, description, category, eventName, achievementDate, rank, supportingDocuments } = req.body || {};
    if (!athlete || !validId(sportId) || !title || !category || !achievementDate) return fail(res, 400, "Complete the achievement details");
    if (!await Sport.exists({ _id: sportId })) return fail(res, 404, "Sport not found");
    const documents = Array.isArray(supportingDocuments) ? supportingDocuments.filter((item) => item && typeof item.url === "string" && item.url.length <= 2048) : [];
    const data = await Achievement.create({ athlete: athlete._id, sport: sportId, title, description, category, eventName, achievementDate, rank, supportingDocuments: documents });
    return res.status(201).json({ data, rcode: 200 });
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
      athleteId = athlete?._id;
    }
    if (!validId(athleteId)) return fail(res, 400, "athleteId is required");
    const athlete = await Athlete.findById(athleteId).lean();
    if (!athlete || !await canAccessPerformanceAthlete(req, athlete)) return fail(res, 403, "Athlete is outside your scope");
    const query = { athlete: athleteId };
    if (validId(req.query.sportId)) query.sport = req.query.sportId;
    const data = await Achievement.find(query).populate("sport", "SportName").populate("verifiedBy", "Name").sort({ achievementDate: -1 }).lean();
    return res.json({ data, rcode: 200 });
  } catch (error) {
    console.error("Could not load achievements:", error.message);
    return fail(res, 500, "Could not load achievements");
  }
}

async function verifyAchievement(req, res) {
  try {
    const achievement = await Achievement.findById(req.params.id).populate("athlete");
    if (!achievement) return fail(res, 404, "Achievement not found");
    if (req.user.Role !== ROLE.ADMIN && !await ensureCoachCanEvaluate(req, achievement.athlete, achievement.sport)) return fail(res, 403, "Achievement is outside your coaching scope");
    if (!["Verified", "Rejected"].includes(req.body?.verificationStatus)) return fail(res, 400, "Verification status must be Verified or Rejected");
    achievement.verificationStatus = req.body.verificationStatus;
    achievement.verificationRemarks = String(req.body.verificationRemarks || "");
    achievement.verifiedBy = req.user._id;
    await achievement.save();
    return res.json({ data: achievement, rcode: 200 });
  } catch (error) {
    console.error("Could not verify achievement:", error.message);
    return fail(res, 500, "Could not verify achievement");
  }
}

module.exports = {
  adminTemplates, createTemplate, updateTemplate, publishTemplate, publishedTemplate,
  coachAthletes, createEvaluation, listEvaluations, ownEvaluations,
  createAchievement, listAchievements, verifyAchievement,
};
