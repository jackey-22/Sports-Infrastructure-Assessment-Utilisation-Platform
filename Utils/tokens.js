const jwt = require("jsonwebtoken");

// No development fallback: the server must be configured with ACCESS_TOKEN_SECRET.
function getSecret() {
  const secret = process.env.ACCESS_TOKEN_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("ACCESS_TOKEN_SECRET is not configured");
  }
  return secret;
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: String(user._id), Role: Number(user.Role) },
    getSecret(),
    { expiresIn: "1d" }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { signAccessToken, verifyAccessToken };
