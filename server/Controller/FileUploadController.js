const multer = require("multer");

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const receiveImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  fileFilter(req, file, callback) {
    callback(null, ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype));
  },
}).single("file");

function parseImage(req, res, next) {
  receiveImage(req, res, (error) => {
    if (error) {
      const message = error.code === "LIMIT_FILE_SIZE"
        ? "Image must be smaller than 8 MB"
        : "Only one JPEG, PNG or WebP image is allowed";
      return res.status(400).json({ data: "", msg: message, rcode: -9 });
    }
    if (!req.file) return res.status(400).json({ data: "", msg: "Select a JPEG, PNG or WebP image", rcode: -9 });
    return next();
  });
}

async function uploadImage(req, res) {
  try {
    if (!process.env.UPLOADTHING_TOKEN) {
      return res.status(503).json({ data: "", msg: "File storage is not configured", rcode: -9 });
    }
    const { UTApi, UTFile } = await import("uploadthing/server");
    const api = new UTApi({ token: process.env.UPLOADTHING_TOKEN });
    const safeName = String(req.file.originalname || "image")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .slice(-120);
    const file = new UTFile([req.file.buffer], `${Date.now()}-${safeName}`, { type: req.file.mimetype });
    const result = await api.uploadFiles(file, {
      metadata: { uploadedBy: String(req.user._id), role: req.user.Role },
      contentDisposition: "inline",
    });
    if (result.error || !result.data) throw new Error(result.error?.message || "Upload failed");
    return res.status(201).json({
      data: { url: result.data.ufsUrl || result.data.url, key: result.data.key, name: result.data.name, size: result.data.size },
      rcode: 200,
    });
  } catch (error) {
    console.error("UploadThing upload failed:", error.message);
    return res.status(502).json({ data: "", msg: "Could not upload the image", rcode: -9 });
  }
}

module.exports = { parseImage, uploadImage };
