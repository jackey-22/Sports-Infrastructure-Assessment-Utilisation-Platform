const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "public", "athletes");
const MAX_BYTES = Number(process.env.UPLOAD_MAX_BYTES) || 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// File type is decided from the content signature, never the client filename or
// extension. Only raster image formats are accepted, so an upload can never be
// served as HTML or script.
const SIGNATURES = [
  {
    mime: "image/jpeg",
    ext: ".jpg",
    matches: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    ext: ".png",
    matches: (b) =>
      b.length > 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: "image/webp",
    ext: ".webp",
    matches: (b) =>
      b.length > 12 &&
      b.slice(0, 4).toString("ascii") === "RIFF" &&
      b.slice(8, 12).toString("ascii") === "WEBP",
  },
];

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter(req, file, callback) {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return callback(new Error("UNSUPPORTED_IMAGE_TYPE"));
    }
    return callback(null, true);
  },
}).single("photo");

function detectImage(buffer) {
  return SIGNATURES.find((signature) => signature.matches(buffer)) || null;
}

// Parses and stores the photo, replacing any client-supplied filename with a
// random server name. Responds directly on validation failure so multer errors
// never leak storage paths.
function receivePhoto(req, res, next) {
  parser(req, res, (error) => {
    if (error) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Photo is too large"
          : "Only JPEG, PNG or WebP images are allowed";
      return res.status(400).json({ data: "", msg: message, rcode: -9 });
    }
    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ data: "", msg: "Photo is required", rcode: -9 });
    }

    const image = detectImage(req.file.buffer);
    if (!image) {
      return res.status(400).json({
        data: "",
        msg: "Unsupported image content",
        rcode: -9,
      });
    }

    // EXIF metadata is not stripped: doing that safely needs an image
    // re-encoding library, which is out of scope for this phase. The API never
    // returns the metadata and only raster images are served.
    const filename = `${crypto.randomUUID()}${image.ext}`;
    try {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
    } catch (writeError) {
      return res
        .status(500)
        .json({ data: "", msg: "Could not store photo", rcode: -9 });
    }

    req.savedPhotoName = filename;
    return next();
  });
}

module.exports = { receivePhoto, detectImage, UPLOAD_DIR, MAX_BYTES };
