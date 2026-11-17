const express = require("express");
const UserController = require("../Controller/UserController");
const { receivePhoto } = require("../Utils/photoUpload");
const { createLoginRateLimiter } = require("../Middleware/loginRateLimit.middleware");
const { createRateLimiter } = require("../Utils/rateLimit");

const route = express.Router();

const loginRateLimiter = createLoginRateLimiter();
const uploadRateLimiter = createRateLimiter({
  windowMs:
    Number(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.UPLOAD_RATE_LIMIT_MAX) || 30,
  key: (req) => req.ip || "unknown",
  message: "Too many uploads. Please try again later.",
});

const recoveryLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 10,
  key: (req) => req.ip || "unknown", message: "Too many attempts. Please try again later." });
route.post("/forgot-password", recoveryLimiter, UserController.forgotPassword);
route.post("/reset-password", recoveryLimiter, UserController.resetPassword);
route.post("/signup", UserController.signup);
route.post(
  "/uploadPhoto",
  uploadRateLimiter,
  receivePhoto,
  UserController.uploadPhoto
);
route.post("/login", loginRateLimiter, UserController.login);

module.exports = route;
module.exports.loginRateLimiter = loginRateLimiter;
module.exports.uploadRateLimiter = uploadRateLimiter;
