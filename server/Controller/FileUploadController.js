const dns = require("dns");
const path = require("path");
const multer = require("multer");

dns.setDefaultResultOrder("ipv4first");

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const IMAGE_MIMES = new Set(["image/jpeg", "image/jpg", "image/pjpeg", "image/png", "image/webp"]);
const ATTACHMENT_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

function normalizeMime(mimetype = "", originalname = "") {
  const mime = String(mimetype || "").toLowerCase().trim();
  if (mime === "image/jpg" || mime === "image/pjpeg") return "image/jpeg";
  if (mime && mime !== "application/octet-stream" && mime !== "image") return mime;
  const ext = path.extname(String(originalname || "")).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".heic") return "image/heic";
  if (ext === ".heif") return "image/heif";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return mime;
}

const receiveImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(req, file, callback) {
    const normalized = normalizeMime(file.mimetype, file.originalname);
    callback(null, IMAGE_MIMES.has(normalized));
  },
}).single("file");

const receiveAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1 },
  fileFilter(req, file, callback) {
    const normalized = normalizeMime(file.mimetype, file.originalname);
    callback(null, ATTACHMENT_MIMES.has(normalized));
  },
}).single("file");

function parseImage(req, res, next) {
  receiveImage(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Image must be smaller than 8 MB"
          : "Only one JPEG, PNG or WebP image is allowed";
      return res.status(400).json({ data: "", msg: message, rcode: -9 });
    }
    if (!req.file) {
      return res.status(400).json({ data: "", msg: "Select a JPEG, PNG or WebP image", rcode: -9 });
    }
    return next();
  });
}

function parseAttachment(req, res, next) {
  receiveAttachment(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Attachment must be smaller than 15 MB"
          : "Only one PDF, JPEG, PNG or WebP attachment is allowed";
      return res.status(400).json({ data: "", msg: message, rcode: -9 });
    }
    if (!req.file) {
      return res.status(400).json({ data: "", msg: "Select a PDF, JPEG, PNG or WebP attachment", rcode: -9 });
    }
    return next();
  });
}

async function uploadFile(req, res, kind) {
  if (!process.env.UPLOADTHING_TOKEN) {
    return res.status(503).json({ data: "", msg: "File storage is not configured", rcode: -9 });
  }
  const normalizedMime = normalizeMime(req.file.mimetype, req.file.originalname) || req.file.mimetype;
  const { UTApi, UTFile } = await import("uploadthing/server");
  const uploadApi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
  const safeName = String(req.file.originalname || kind)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-120);
  const file = new UTFile([req.file.buffer], `${Date.now()}-${safeName}`, { type: normalizedMime });
  const result = await uploadApi.uploadFiles(file, {
    contentDisposition: "inline",
    signal: AbortSignal.timeout(25000),
  });
  if (result.error || !result.data) {
    throw new Error(result.error?.message || "Upload failed");
  }
  const fileUrl = result.data.ufsUrl || result.data.url;
  return res.status(201).json({
    data: {
      url: fileUrl,
      key: result.data.key,
      name: req.file.originalname || result.data.name,
      storedName: result.data.name,
      size: result.data.size,
      mimeType: normalizedMime,
    },
    rcode: 200,
  });
}

async function uploadImage(req, res) {
  try {
    return await uploadFile(req, res, "image");
  } catch (error) {
    console.error("UploadThing upload failed:", error.message);
    return res.status(502).json({ data: "", msg: "Could not upload the image", rcode: -9 });
  }
}

async function uploadAttachment(req, res) {
  try {
    return await uploadFile(req, res, "attachment");
  } catch (error) {
    console.error("UploadThing attachment upload failed:", error.message);
    return res.status(502).json({ data: "", msg: "Could not upload the attachment", rcode: -9 });
  }
}

module.exports = { parseImage, uploadImage, parseAttachment, uploadAttachment };
