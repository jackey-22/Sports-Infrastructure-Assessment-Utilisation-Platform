const crypto = require("crypto");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const FacilityAssessment = require("../Model/FacilityAssessmentModel");
const FacilitySportConfig = require("../Model/FacilitySportConfigModel");
const SportsComplexModel = require("../Model/SportsComplexModel");
const { canAccessComplex, complexFilter } = require("../Utils/scope");
const { detectImage, MAX_BYTES } = require("../Utils/photoUpload");
const { createRateLimiter } = require("../Utils/rateLimit");
const { ROLE } = require("../Utils/roles");
const { analyseImages, VisionError } = require("../Services/facilityVision");

const MAX_PHOTOS = 6;
// Leave room for base64 and the prompt within Gemini's inline request limit.
const MAX_TOTAL_PHOTO_BYTES = 14 * 1024 * 1024;
const savedRecords = { $or: [{ status: "Submitted" }, { sportId: null }] };

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

async function resolveFacility(user) {
  if (!user || user.Role !== ROLE.MANAGER) return null;
  if (user.SportComplexId) {
    if (!(await canAccessComplex(user, user.SportComplexId))) return null;
    return SportsComplexModel.findById(user.SportComplexId)
      .populate("district", "District")
      .populate("sports.sport", "SportName status")
      .lean();
  }
  // Seeded managers are stored on the complex, and the user record was left blank.
  const managed = await SportsComplexModel.find({ manager: user._id })
    .populate("district", "District")
    .populate("sports.sport", "SportName status")
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

async function availableSports(facility) {
  const configs = await FacilitySportConfig.find({ facility: facility._id })
    .select("sport status")
    .populate("sport", "SportName status")
    .lean();
  // Facilities without configuration records still use their own sport assignments.
  const entries = configs.length
    ? configs.filter((config) => config.status === "Active")
    : facility.sports || [];
  const sports = new Map();
  for (const { sport } of entries) {
    if (sport?.SportName && sport.status !== "Inactive") {
      sports.set(String(sport._id), { id: String(sport._id), name: sport.SportName });
    }
  }
  return Array.from(sports.values()).sort((a, b) => a.name.localeCompare(b.name));
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
    sportId: doc.sportId ? String(doc.sportId) : null,
    sportName: doc.sportName || "",
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
  if (files.reduce((total, file) => total + (file.buffer?.length || 0), 0) > MAX_TOTAL_PHOTO_BYTES) {
    return { error: "Photographs must total 14 MB or less." };
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

async function assignedFacility(req, res) {
  try {
    const facility = await resolveFacility(req.user);
    if (!facility) return fail(res, 403, "No facility is assigned to this account.");
    const sports = await availableSports(facility);
    return res.json({
      rcode: 200,
      facility: {
        id: String(facility._id),
        name: facility.name,
        sports,
        district: facility.district ? facility.district.District : "",
        location: facility.location || "",
        taluka: facility.taluka || "",
        area: facility.area || "",
        facilityType: facility.facilityType || "Sports Complex",
        category: facility.category || "",
        ownership: facility.ownership || "",
        operationalSince: facility.operationalSince || "",
        contactPhone: facility.contactPhone || "",
        contactEmail: facility.contactEmail || "",
        status: facility.status || "Active",
        picture: facility.picture || "",
        images: facility.images || [],
        timings: facility.timings || {},
        amenities: facility.amenities || {},
        capacityDaily: facility.capacityDaily || 0,
      },
    });
  } catch (error) {
    return fail(res, 500, "Facility details could not be loaded.");
  }
}

async function updateAssignedFacility(req, res) {
  try {
    const assigned = await resolveFacility(req.user);
    if (!assigned) return fail(res, 403, "No facility is assigned to this account.");
    const facility = await SportsComplexModel.findById(assigned._id);
    if (!facility) return fail(res, 404, "Facility was not found.");
    const body = req.body || {};
    const textFields = ["name", "location", "taluka", "area", "category", "ownership", "operationalSince", "contactPhone", "contactEmail"];
    textFields.forEach((key) => {
      if (body[key] !== undefined) facility[key] = clip(body[key], key === "location" ? 500 : 180);
    });
    if (body.picture !== undefined) facility.picture = clip(body.picture, 1500);
    if (Array.isArray(body.images)) facility.images = body.images.map((item) => clip(item, 1500)).filter(Boolean).slice(0, 8);
    if (body.capacityDaily !== undefined) facility.capacityDaily = Math.max(0, Number(body.capacityDaily) || 0);
    if (body.timings && typeof body.timings === "object") {
      facility.timings = {
        openingTime: clip(body.timings.openingTime, 20),
        closingTime: clip(body.timings.closingTime, 20),
      };
    }
    if (body.amenities && typeof body.amenities === "object") {
      Object.keys(facility.amenities.toObject ? facility.amenities.toObject() : facility.amenities).forEach((key) => {
        if (body.amenities[key] !== undefined) facility.amenities[key] = Boolean(body.amenities[key]);
      });
    }
    if (!facility.name || !facility.location) return fail(res, 400, "Facility name and address are required.");
    await facility.save();
    return assignedFacility(req, res);
  } catch (error) {
    return fail(res, 500, "Facility details could not be updated.");
  }
}

async function analyse(req, res) {
  try {
    const facility = await resolveFacility(req.user);
    if (!facility) return fail(res, 403, "No facility is assigned to this account.");
    const sports = await availableSports(facility);
    const sport = sports.find(({ id }) => id === req.body?.sportId);
    if (!sport) return fail(res, 400, "Select a sport available at your facility.");
    const parsed = readImages(req.files);
    if (parsed.error) return fail(res, 400, parsed.error);
    const ai = await analyseImages(parsed.images, {
      provider: "gemini",
      sportName: sport.name,
    });
    const doc = await FacilityAssessment.create({
      ...facilityFields(facility),
      submittedBy: req.user._id,
      sportId: sport.id,
      sportName: sport.name,
      inspectorName: req.user.Name || "",
      assessmentDate: todayInIndia(),
      status: "Analysed",
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
    const { analysisId } = req.body || {};
    if (typeof analysisId !== "string" || !mongoose.isValidObjectId(analysisId)) {
      return fail(res, 400, "Select a completed sport analysis.");
    }
    const filter = {
      _id: analysisId,
      facilityId: facility._id,
      submittedBy: req.user._id,
      sportId: { $ne: null },
      "ai.status": "completed",
      "ai.provider": "gemini",
    };
    const doc = await FacilityAssessment.findOneAndUpdate(
      { ...filter, status: "Analysed" },
      { $set: { status: "Submitted" } },
      { new: true }
    ).lean() || await FacilityAssessment.findOne({ ...filter, status: "Submitted" }).lean();
    if (!doc) return fail(res, 404, "Sport analysis was not found.");
    return res.json({ rcode: 200, assessment: present(doc) });
  } catch (error) {
    return fail(res, 500, "The assessment could not be saved.");
  }
}

async function discardAssessment(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return fail(res, 400, "Select a valid assessment.");
    const facility = await resolveFacility(req.user);
    if (!facility) return fail(res, 403, "No facility is assigned to this account.");
    const ownedReview = {
      _id: id,
      facilityId: facility._id,
      submittedBy: req.user._id,
      sportId: { $ne: null },
    };
    const result = await FacilityAssessment.deleteOne({ ...ownedReview, status: "Analysed" });
    if (!result.deletedCount && await FacilityAssessment.exists({ ...ownedReview, status: "Submitted" })) {
      return fail(res, 409, "This assessment has already been saved.");
    }
    return res.status(204).end();
  } catch (error) {
    return fail(res, 500, "The assessment could not be discarded.");
  }
}

async function list(req, res) {
  const facility = await resolveFacility(req.user);
  if (!facility) return fail(res, 403, "No facility is assigned to this account.");
  const { before, status } = req.query;
  if (before !== undefined && (typeof before !== "string" || !mongoose.isObjectIdOrHexString(before))) {
    return fail(res, 400, "Invalid assessment history cursor.");
  }
  const filter = status === "Analysed"
    ? { status: "Analysed", submittedBy: req.user._id, sportId: { $ne: null } }
    : savedRecords;
  const pageSize = 50;
  const rows = await FacilityAssessment.find({
    ...filter,
    facilityId: facility._id,
    ...(before ? { _id: { $lt: before } } : {}),
  })
    .sort({ _id: -1 })
    .limit(pageSize + 1)
    .lean();
  return res.json({
    rcode: 200,
    assessments: rows.slice(0, pageSize).map(present),
    nextCursor: rows.length > pageSize ? String(rows[pageSize - 1]._id) : null,
  });
}

async function getOne(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return fail(res, 404, "Assessment was not found.");
  }
  const doc = await FacilityAssessment.findOne({ _id: req.params.id, ...savedRecords }).lean();
  if (!doc) return fail(res, 404, "Assessment was not found.");
  if (!(await managerOwns(req.user, doc.facilityId))) {
    return fail(res, 403, "That assessment belongs to another facility.");
  }
  return res.json({ rcode: 200, assessment: present(doc) });
}

async function scopedList(req, res) {
  const scope = await complexFilter(req.user, "facilityId");
  const rows = await FacilityAssessment.find({ ...savedRecords, ...scope })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  return res.json({ rcode: 200, assessments: rows.map(present) });
}

module.exports = {
  analysisRateLimiter,
  receiveAssessmentPhotos,
  assignedFacility,
  updateAssignedFacility,
  analyse,
  createAssessment,
  discardAssessment,
  list,
  getOne,
  scopedList,
};
