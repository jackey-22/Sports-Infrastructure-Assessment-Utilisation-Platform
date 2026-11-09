const jwt = require("jsonwebtoken");
const UserModel = require("../Model/UsersModel");
const { verifyAccessToken } = require("../Utils/tokens");
const { ROLE } = require("../Utils/roles");

const MESSAGES = {
  missing: "Authentication required",
  invalid: "Invalid or expired token",
  expired: "Session expired, please sign in again",
  inactive: "Account is inactive or no longer exists",
  forbidden: "You do not have permission to perform this action",
};

function sendUnauthorized(res, message) {
  return res.status(401).json({ data: "", msg: message, rcode: -9 });
}

function sendForbidden(res, message = MESSAGES.forbidden) {
  return res.status(403).json({ data: "", msg: message, rcode: -10 });
}

function extractToken(req) {
  const header = req.headers && req.headers.authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  if (req.headers && typeof req.headers.token === "string") {
    return req.headers.token;
  }
  if (req.body && typeof req.body.token === "string") {
    return req.body.token;
  }
  return null;
}

async function resolveUser(token) {
  const decoded = verifyAccessToken(token);
  if (!decoded || !decoded.sub) return null;
  const user = await UserModel.findById(decoded.sub);
  if (!user || user.IsActive === 0) return null;
  return user;
}

async function authenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return sendUnauthorized(res, MESSAGES.missing);

  try {
    const user = await resolveUser(token);
    if (!user) return sendUnauthorized(res, MESSAGES.inactive);
    req.user = user;
    req.auth = { id: String(user._id), role: Number(user.Role) };
    return next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError" ? MESSAGES.expired : MESSAGES.invalid;
    return sendUnauthorized(res, message);
  }
}

// Used by /signup: accept anonymous requests and also identify staff callers.
async function optionalAuthenticate(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const user = await resolveUser(token);
    if (!user) return sendUnauthorized(res, MESSAGES.inactive);
    req.user = user;
    req.auth = { id: String(user._id), role: Number(user.Role) };
    return next();
  } catch (error) {
    const message =
      error.name === "TokenExpiredError" ? MESSAGES.expired : MESSAGES.invalid;
    return sendUnauthorized(res, message);
  }
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) return sendUnauthorized(res, MESSAGES.missing);
    if (!roles.includes(Number(req.user.Role))) {
      return sendForbidden(res);
    }
    return next();
  };
}

module.exports = {
  ROLE,
  MESSAGES,
  extractToken,
  authenticate,
  optionalAuthenticate,
  requireRole,
  sendUnauthorized,
  sendForbidden,
};
