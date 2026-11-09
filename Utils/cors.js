const cors = require("cors");

// CORS_ORIGINS is a comma-separated allowlist, e.g.
//   CORS_ORIGINS=https://khelgujarat.gujarat.gov.in,https://admin.khelgujarat.gujarat.gov.in
function parseOrigins(value) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

// CORS is not authentication: it only controls which browser origins may read
// responses. Requests without an Origin header (server-to-server, mobile native
// HTTP, WebView navigations) are not CORS requests and continue normally.
function createCorsMiddleware(env = process.env) {
  const isProduction = env.NODE_ENV === "production";
  const origins = parseOrigins(env.CORS_ORIGINS);
  const allowAll = !isProduction && origins.length === 0;
  const missingProductionConfig = isProduction && origins.length === 0;

  if (allowAll) {
    console.warn(
      "CORS is permissive: set CORS_ORIGINS (and NODE_ENV=production in deployment) to enforce an allowlist."
    );
  }

  const corsHandler = cors(
    allowAll
      ? undefined
      : {
          origin(origin, callback) {
            if (!origin) return callback(null, true);
            return callback(null, origins.includes(origin));
          },
          credentials: true,
        }
  );

  return function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    if (!origin) return corsHandler(req, res, next);

    if (missingProductionConfig) {
      return res.status(503).json({
        data: "",
        msg: "Cross-origin access is not configured",
        rcode: -9,
      });
    }
    if (!allowAll && !origins.includes(origin)) {
      return res.status(403).json({
        data: "",
        msg: "Origin not allowed",
        rcode: -10,
      });
    }
    return corsHandler(req, res, next);
  };
}

module.exports = { parseOrigins, createCorsMiddleware };
