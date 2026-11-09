const crypto = require("crypto");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const FacilityAssessment = require("../Model/FacilityAssessmentModel");
const SportsComplexModel = require("../Model/SportsComplexModel");
const { canAccessComplex } = require("../Utils/scope");
const { detectImage, MAX_BYTES } = require("../Utils/photoUpload");
const { createRateLimiter } = require("../Utils/rateLimit");
const { ROLE } = require("../Utils/roles");
const { analyseImages, VisionError } = require("../Services/facilityVision");

const MAX_PHOTOS = 6;
const SCORE_LIMITS = {
  turf: 25,
  lighting: 20,
  sanitation: 20,
  safety: 15,
  accessibility: 20,
};
const URGENCY = new Set([
  "Normal / Routine",
  "Minor Attention Required",
  "High Priority Repair",
  "Critical Renovation",
]);

const analysisRateLimiter = createRateLimiter({
  windowMs: Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX) || 30,
  key: (req) => `assessment:${req.auth ? req.auth.id : req.ip || "unknown"}`,
  message: "Too many assessment uploads. Please try again later.",
});

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: MAX_PHOTOS },
  fileFilter(req, file, callback) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
      const error = new Error("UNSUPPORTED_IMAGE_TYPE");
      error.code = "UNSUPPORTED_IMAGE_TYPE";
      return callback(error);
    }
    return callback(null, true);
  },
}).array("photos", MAX_PHOTOS);

function fail(res, status, message) {
  return res.status(status).json({ data: "", msg: message, rcode: status === 403 ? -10 : -9 });
}

function receiveAssessmentPhotos(req, res, next) {
  parser(req, res, (error) => {
    if (!error) return next();
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Photo is too large"
        : error.code === "LIMIT_FILE_COUNT" || error.code === "LIMIT_UNEXPECTED_FILE"
          ? `Attach at most ${MAX_PHOTOS} photographs`
          : "Only JPEG, PNG or WebP images are allowed";
    return fail(res, 400, message);
  });
}

function safeName(name) {
  const base = path
    .basename(String(name || "photo"))
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 80);
  return base || "photo";
}

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

function todayInIndia() {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function gradeFor(score) {
  if (score >= 85) return "Grade A (Excellent)";
  if (score >= 70) return "Grade B (Good)";
  if (score >= 55) return "Grade C (Fair)";
  return "Grade D (Needs attention)";
}

async function resolveFacility(user) {
  if (!user || user.Role !== ROLE.MANAGER) return null;
  if (user.SportComplexId) {
    if (!(await canAccessComplex(user, user.SportComplexId))) return null;
    return SportsComplexModel.findById(user.SportComplexId)
      .populate("district", "District")
      .lean();
  }
  // Seeded managers are stored on the complex, and the user record was left blank.
  const managed = await SportsComplexModel.find({ manager: user._id })
    .populate("district", "District")
    .lean();
  return managed.length === 1 ? managed[0] : null;
}

async function managerOwns(user, facilityId) {
  if (!user || !facilityId) return false;
  if (user.Role === ROLE.ADMIN) return true;
  if (await canAccessComplex(user, facilityId)) return true;
  if (user.Role !== ROLE.MANAGER) return false;
  const complex = await SportsComplexModel.findById(facilityId).select("manager").lean();
  return Boolean(complex && complex.manager && String(complex.manager) === String(user._id));
}

function facilityFields(facility) {
  return {
    facilityId: facility._id,
    facilityName: facility.name || "",
    districtName: facility.district && facility.district.District
      ? facility.district.District
      : "",
  };
}

function present(doc) {
  const ai = doc.ai || { status: "not_requested" };
  const questionnaire = doc.questionnaire || {};
  return {
    id: String(doc._id),
    facilityId: String(doc.facilityId),
    facilityName: doc.facilityName || "",
    district: doc.districtName || "",
    date: doc.assessmentDate || "",
    inspector: doc.inspectorName || "",
    status: doc.status,
    maintenanceUrgency: questionnaire.maintenanceUrgency || "",
    score: questionnaire.totalScore != null ? questionnaire.totalScore : null,
    grade: questionnaire.grade || null,
    scores: questionnaire.scores || null,
    summary: doc.managerObservations || "",
    photos: (doc.photos || []).map((photo) => photo.filename).filter(Boolean),
    ai,
    source: "database",
  };
}

function readImages(files) {
  if (!files || !files.length) {
    return { error: "At least one photograph is required." };
  }
  if (files.length > MAX_PHOTOS) {
    return { error: `Attach at most ${MAX_PHOTOS} photographs.` };
  }
  const images = [];
  for (const file of files) {
    if (!file.buffer || file.buffer.length < 64) {
      return { error: "A photograph is empty or unusable." };
    }
    const detected = detectImage(file.buffer);
    if (!detected) return { error: "Unsupported image content." };
    images.push({
      buffer: file.buffer,
      mime: detected.mime,
      filename: safeName(file.originalname),
      sha256: crypto.createHash("sha256").update(file.buffer).digest("hex"),
      bytes: file.buffer.length,
    });
  }
  return { images };
}

function readQuestionnaire(body) {
  const scores = {};
  let totalScore = 0;
  for (const [key, max] of Object.entries(SCORE_LIMITS)) {
    const value = Number(body.scores && body.scores[key]);
    if (!Number.isFinite(value) || value < 0 || value > max) {
      return { error: `Score for ${key} must be between 0 and ${max}.` };
    }
    scores[key] = value;
    totalScore += value;
  }
  const inspectorName = clip(body.inspectorName, 120);
  const assessmentDate = clip(body.assessmentDate, 10);
  const managerObservations = clip(body.managerObservations, 4000);
  const maintenanceUrgency = clip(body.maintenanceUrgency, 80);
  if (!inspectorName) return { error: "Inspector name is required." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(assessmentDate) || assessmentDate > todayInIndia()) {
    return { error: "Assessment date must be today or earlier." };
  }
  if (!managerObservations) return { error: "Field observations are required." };
  if (!URGENCY.has(maintenanceUrgency)) {
    return { error: "Urgency classification is required." };
  }
  return {
    value: {
      inspectorName,
      assessmentDate,
      managerObservations,
      questionnaire: {
        scores,
        totalScore,
        grade: gradeFor(totalScore),
        maintenanceUrgency,
        scoreMethod:
          "Questionnaire score is the sum of manager-entered component ratings (surface 25, lighting 20, sanitation 20, safety 15, accessibility 20). It is not an AI result.",
      },
    },
  };
}

async function assignedFacility(req, res) {
  const facility = await resolveFacility(req.user);
  if (!facility) return fail(res, 403, "No facility is assigned to this account.");
  return res.json({
    rcode: 200,
    facility: {
      id: String(facility._id),
      name: facility.name,
      district: facility.district ? facility.district.District : "",
    },
  });
}

async function analyse(req, res) {
  try {
    const facility = await resolveFacility(req.user);
    if (!facility) return fail(res, 403, "No facility is assigned to this account.");
    const parsed = readImages(req.files);
    if (parsed.error) return fail(res, 400, parsed.error);
    const ai = await analyseImages(parsed.images, {
      managerNotes: clip(req.body && req.body.managerNotes, 1500),
    });
    const doc = await FacilityAssessment.create({
      ...facilityFields(facility),
      submittedBy: req.user._id,
      status: "Analysed",
      managerObservations: clip(req.body && req.body.managerNotes, 4000),
      photos: parsed.images.map((image) => ({
        filename: image.filename,
        mime: image.mime,
        bytes: image.bytes,
        sha256: image.sha256,
        retained: false,
      })),
      ai,
    });
    return res.json({ rcode: 200, assessment: present(doc) });
  } catch (error) {
    if (error instanceof VisionError) return fail(res, error.status, error.message);
    return fail(res, 500, "The assessment could not be analysed.");
  }
}

async function createAssessment(req, res) {
  try {
    const facility = await resolveFacility(req.user);
    if (!facility) return fail(res, 403, "No facility is assigned to this account.");
    const questionnaire = readQuestionnaire(req.body || {});
    if (questionnaire.error) return fail(res, 400, questionnaire.error);
    const fields = questionnaire.value;

    if (req.body && req.body.analysisId) {
      if (!mongoose.isValidObjectId(req.body.analysisId)) {
        return fail(res, 400, "Analysis reference is invalid.");
      }
      const existing = await FacilityAssessment.findById(req.body.analysisId);
      if (!existing) return fail(res, 404, "Analysis was not found.");
      if (String(existing.facilityId) !== String(facility._id)) {
        return fail(res, 403, "That analysis belongs to another facility.");
      }
      if (String(existing.submittedBy) !== String(req.user._id)) {
        return fail(res, 403, "That analysis belongs to another manager.");
      }
      if (existing.status !== "Analysed") {
        return fail(res, 409, "This analysis was already submitted.");
      }
      existing.inspectorName = fields.inspectorName;
      existing.assessmentDate = fields.assessmentDate;
      existing.managerObservations = fields.managerObservations;
      existing.questionnaire = fields.questionnaire;
      existing.status = "Submitted";
      await existing.save();
      return res.json({ rcode: 200, assessment: present(existing) });
    }

    const names = Array.isArray(req.body.photoNames) ? req.body.photoNames : [];
    const doc = await FacilityAssessment.create({
      ...facilityFields(facility),
      submittedBy: req.user._id,
      inspectorName: fields.inspectorName,
      assessmentDate: fields.assessmentDate,
      managerObservations: fields.managerObservations,
      questionnaire: fields.questionnaire,
      status: "Submitted",
      photos: names.slice(0, MAX_PHOTOS).map((name) => ({
        filename: safeName(name),
        verified: false,
        retained: false,
      })),
      ai: {
        status: "not_requested",
        disclaimer: "No photograph analysis was requested. Questionnaire scores are manager-entered.",
      },
    });
    return res.json({ rcode: 200, assessment: present(doc) });
  } catch (error) {
    return fail(res, 500, "The assessment could not be saved.");
  }
}

async function list(req, res) {
  const facility = await resolveFacility(req.user);
  if (!facility) return fail(res, 403, "No facility is assigned to this account.");
  const rows = await FacilityAssessment.find({ facilityId: facility._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return res.json({ rcode: 200, assessments: rows.map(present) });
}

async function getOne(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 404, "Assessment was not found.");
  }
  const doc = await FacilityAssessment.findById(req.params.id).lean();
  if (!doc) return fail(res, 404, "Assessment was not found.");
  if (!(await managerOwns(req.user, doc.facilityId))) {
    return fail(res, 403, "That assessment belongs to another facility.");
  }
  return res.json({ rcode: 200, assessment: present(doc) });
}

async function adminList(req, res) {
  const rows = await FacilityAssessment.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return res.json({ rcode: 200, assessments: rows.map(present) });
}

module.exports = {
  analysisRateLimiter,
  receiveAssessmentPhotos,
  assignedFacility,
  analyse,
  createAssessment,
  list,
  getOne,
  adminList,
};
