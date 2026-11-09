// Login abuse protection: one bucket per source IP and one per account.
// Limits are intentionally generous enough that a shared NAT address is not
// locked out by normal use, and they reset after the window (no permanent
// lockout). Successful sign-ins clear the account bucket and refund the IP
// bucket so only failed attempts count against it.
const DEFAULTS = {
  windowMs: 15 * 60 * 1000,
  maxPerIp: 30,
  maxPerAccount: 8,
};

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function createLoginRateLimiter(options = {}) {
  const windowMs = numberFromEnv(
    options.windowMs || process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
    DEFAULTS.windowMs
  );
  const maxPerIp = numberFromEnv(
    options.maxPerIp || process.env.LOGIN_RATE_LIMIT_MAX_IP,
    DEFAULTS.maxPerIp
  );
  const maxPerAccount = numberFromEnv(
    options.maxPerAccount || process.env.LOGIN_RATE_LIMIT_MAX_ACCOUNT,
    DEFAULTS.maxPerAccount
  );
  const now = options.now || Date.now;
  const ipBuckets = new Map();
  const accountBuckets = new Map();

  function prune(time) {
    for (const buckets of [ipBuckets, accountBuckets]) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= time) buckets.delete(key);
      }
    }
  }

  function isLimited(buckets, key, max) {
    const bucket = buckets.get(key);
    return Boolean(bucket && bucket.count >= max);
  }

  function hit(buckets, key, time) {
    const bucket = buckets.get(key);
    if (!bucket) {
      buckets.set(key, { count: 1, resetAt: time + windowMs });
      return;
    }
    bucket.count += 1;
  }

  function middleware(req, res, next) {
    const time = now();
    prune(time);

    const ipKey = String(req.ip || "unknown");
    const email = String((req.body && req.body.Email) || "")
      .trim()
      .toLowerCase();

    if (isLimited(ipBuckets, ipKey, maxPerIp)) {
      res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({
        data: "",
        msg: "Too many login attempts. Please try again later.",
        rcode: -9,
      });
    }
    if (email && isLimited(accountBuckets, email, maxPerAccount)) {
      res.setHeader("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({
        data: "",
        msg: "Too many login attempts. Please try again later.",
        rcode: -9,
      });
    }

    hit(ipBuckets, ipKey, time);
    if (email) hit(accountBuckets, email, time);

    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      if (email) accountBuckets.delete(email);
      const bucket = ipBuckets.get(ipKey);
      if (bucket && bucket.count > 0) bucket.count -= 1;
    });

    return next();
  }

  middleware.reset = () => {
    ipBuckets.clear();
    accountBuckets.clear();
  };
  middleware.limits = { windowMs, maxPerIp, maxPerAccount };

  return middleware;
}

module.exports = { createLoginRateLimiter, DEFAULTS };
