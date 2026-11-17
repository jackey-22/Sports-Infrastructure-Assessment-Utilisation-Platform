const jwt = require("jsonwebtoken");

// Chart pages are rendered inside a React Native WebView, which cannot attach
// an Authorization header. They are therefore protected by a short-lived,
// resource-scoped token placed in the URL instead of a permanent credential.
const TTL = process.env.CHART_TOKEN_TTL || "10m";
const PURPOSE = Object.freeze({
  PERFORMANCE: "performance",
  COMPARATIVE: "comparative",
});

function getChartSecret() {
  const secret = process.env.CHART_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret || secret.trim().length === 0) {
    throw new Error("ACCESS_TOKEN_SECRET is not configured");
  }
  return secret;
}

function signChartToken(claims, options = {}) {
  return jwt.sign({ ...claims, aud: "chart" }, getChartSecret(), {
    expiresIn: TTL,
    ...options,
  });
}

function verifyChartToken(token, expected = {}) {
  const decoded = jwt.verify(token, getChartSecret(), { audience: "chart" });
  for (const [key, value] of Object.entries(expected)) {
    if (String(decoded[key]) !== String(value)) {
      throw new Error("Chart token scope mismatch");
    }
  }
  return decoded;
}

module.exports = { PURPOSE, signChartToken, verifyChartToken };
