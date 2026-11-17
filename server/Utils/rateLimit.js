// Small in-memory rate limiter. It is intentionally per-process: with multiple
// API instances each process enforces its own budget. Move to a shared store
// (e.g. Redis) if the API is ever scaled horizontally.
function createRateLimiter({ windowMs, max, key, message, now = Date.now }) {
  const buckets = new Map();

  function prune(time) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= time) buckets.delete(bucketKey);
    }
  }

  function consume(bucketKey, time) {
    const bucket = buckets.get(bucketKey);
    if (!bucket) {
      buckets.set(bucketKey, { count: 1, resetAt: time + windowMs });
      return { allowed: true, retryAfter: 0 };
    }
    if (bucket.count >= max) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((bucket.resetAt - time) / 1000)),
      };
    }
    bucket.count += 1;
    return { allowed: true, retryAfter: 0 };
  }

  function middleware(req, res, next) {
    const time = now();
    prune(time);
    const result = consume(String(key(req) || "unknown"), time);
    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        data: "",
        msg: message || "Too many requests, please try again later",
        rcode: -9,
      });
    }
    return next();
  }

  middleware.reset = () => buckets.clear();
  return middleware;
}

module.exports = { createRateLimiter };
