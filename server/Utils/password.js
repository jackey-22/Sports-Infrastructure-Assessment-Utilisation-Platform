const crypto = require("crypto");

// credential: scrypt$N$r$p$saltHex$hashHex
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;
const PREFIX = "scrypt";

function isHashed(value) {
  return typeof value === "string" && value.startsWith(`${PREFIX}$`);
}

function hashPassword(password) {
  if (typeof password !== "string" || password.length === 0) {
    throw new Error("Password must be a non-empty string");
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const hash = crypto
    .scryptSync(password, salt, KEYLEN, {
      N,
      r: R,
      p: P,
      maxmem: 128 * N * R * 2,
    })
    .toString("hex");
  return `${PREFIX}$${N}$${R}$${P}$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  try {
    if (!isHashed(stored) || typeof password !== "string") return false;
    const parts = stored.split("$");
    if (parts.length !== 6) return false;

    const storedN = Number(parts[1]);
    const storedR = Number(parts[2]);
    const storedP = Number(parts[3]);
    const salt = parts[4];
    const expected = Buffer.from(parts[5], "hex");
    if (!storedN || !storedR || !storedP || !salt || expected.length === 0) {
      return false;
    }

    const derived = crypto.scryptSync(password, salt, expected.length, {
      N: storedN,
      r: storedR,
      p: storedP,
      maxmem: 128 * storedN * storedR * 2,
    });
    return crypto.timingSafeEqual(derived, expected);
  } catch (error) {
    return false;
  }
}

// Constant-time comparison for legacy plaintext credentials.
function safeEqual(supplied, stored) {
  try {
    if (typeof supplied !== "string" || typeof stored !== "string") return false;
    const a = Buffer.from(supplied);
    const b = Buffer.from(stored);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (error) {
    return false;
  }
}

module.exports = { isHashed, hashPassword, verifyPassword, safeEqual };
