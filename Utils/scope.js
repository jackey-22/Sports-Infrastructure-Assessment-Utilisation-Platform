const SportsComplexModel = require("../Model/SportsComplexModel");
const athleteModel = require("../Model/athleteModel");
const { ROLE } = require("./roles");

// Only accept primitive filter values. Express query parsing can produce
// objects (e.g. ?status[$ne]=1), which must never reach a Mongoose query.
function sanitizeFilters(source, allowedKeys) {
  const out = {};
  if (!source || typeof source !== "object") return out;
  allowedKeys.forEach((key) => {
    const value = source[key];
    if (typeof value === "string" || typeof value === "number") {
      out[key] = value;
    }
  });
  return out;
}

async function districtComplexIds(districtId) {
  if (!districtId) return [];
  const complexes = await SportsComplexModel.find({ district: districtId })
    .select("_id")
    .lean();
  return complexes.map((complex) => complex._id);
}

// null means "no facility restriction" (admin). An empty array means the user
// has no facility assigned, so every facility query must return nothing.
async function scopedComplexIds(user) {
  if (!user) return [];
  if (user.Role === ROLE.ADMIN) return null;
  if (user.Role === ROLE.AUTHORITY) return districtComplexIds(user.DistrictId);
  if (user.Role === ROLE.ATHLETE) {
    const athlete = await athleteModel
      .findOne({ userId: user._id })
      .select("SportComplexId")
      .lean();
    return athlete && athlete.SportComplexId ? [athlete.SportComplexId] : [];
  }
  return user.SportComplexId ? [user.SportComplexId] : [];
}

async function complexFilter(user, field = "SportComplexId") {
  const ids = await scopedComplexIds(user);
  if (ids === null) return {};
  return { [field]: { $in: ids } };
}

// Returns the athlete document when the caller may see it, otherwise null.
async function canAccessAthleteId(user, athleteId) {
  if (!user || !athleteId) return null;
  let athlete;
  try {
    athlete = await athleteModel
      .findById(athleteId)
      .select("userId SportComplexId")
      .lean();
  } catch (error) {
    return null;
  }
  if (!athlete) return null;
  return (await canAccessAthlete(user, athlete)) ? athlete : null;
}

// Returns true when the authenticated user may act on the given complex.
async function canAccessComplex(user, complexId) {
  if (!user) return false;
  if (user.Role === ROLE.ADMIN) return true;
  if (!complexId) return false;
  if (user.Role === ROLE.AUTHORITY) {
    const ids = await districtComplexIds(user.DistrictId);
    return ids.some((id) => String(id) === String(complexId));
  }
  return Boolean(user.SportComplexId) &&
    String(user.SportComplexId) === String(complexId);
}

// Adds the caller's facility/district scope to an athlete query.
// Admin: unscoped. Authority: all complexes in own district.
// Supervisor/coach/manager: own complex. Athlete: own athlete record.
async function athleteQueryScope(user, query = {}) {
  if (!user) return query;
  if (user.Role === ROLE.ADMIN) return query;
  if (user.Role === ROLE.ATHLETE) {
    query.userId = user._id;
    return query;
  }
  if (user.Role === ROLE.AUTHORITY) {
    query.SportComplexId = { $in: await districtComplexIds(user.DistrictId) };
    return query;
  }
  query.SportComplexId = user.SportComplexId || null;
  return query;
}

async function canAccessAthlete(user, athlete) {
  if (!user || !athlete) return false;
  if (user.Role === ROLE.ADMIN) return true;
  if (user.Role === ROLE.ATHLETE) {
    return String(athlete.userId) === String(user._id);
  }
  return canAccessComplex(user, athlete.SportComplexId);
}

// Complaint scope is applied last so client-supplied query parameters cannot
// widen it.
async function complaintQueryScope(user) {
  if (!user) return { _id: null };
  if (user.Role === ROLE.ADMIN) return {};
  if (user.Role === ROLE.AUTHORITY) {
    return {
      sportsComplex: { $in: await districtComplexIds(user.DistrictId) },
    };
  }
  if (user.Role === ROLE.ATHLETE) {
    return { userId: user._id };
  }
  return { sportsComplex: user.SportComplexId || null };
}

async function guestQueryScope(user) {
  if (!user) return { _id: null };
  if (user.Role === ROLE.ADMIN) return {};
  if (user.Role === ROLE.AUTHORITY) {
    return {
      SportComplexId: { $in: await districtComplexIds(user.DistrictId) },
    };
  }
  return { SportComplexId: user.SportComplexId || null };
}

module.exports = {
  sanitizeFilters,
  districtComplexIds,
  scopedComplexIds,
  complexFilter,
  canAccessComplex,
  canAccessAthlete,
  canAccessAthleteId,
  athleteQueryScope,
  complaintQueryScope,
  guestQueryScope,
};
