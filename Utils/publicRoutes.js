// Routes that are intentionally reachable without an access token.
// Keep this list in sync with the route authorization matrix in
// docs/PHASE_2B_SECURITY_IMPLEMENTATION_REPORT.md
const PUBLIC_ROUTES = [
  { method: "POST", path: "/login" },
  { method: "POST", path: "/verify" },
  { method: "POST", path: "/uploadPhoto" },
  { method: "GET", path: "/getSports" },
  { method: "GET", path: "/getDistrict" },
  { method: "GET", path: "/getSportsComplex" },
  { method: "GET", path: "/getSportsComplexwithsport" },
  { method: "GET", path: "/getSportsComplexwithdistrict" },
  { method: "GET", path: "/getComplexFromSport" },
  { method: "GET", path: "/searchSportsComplex" },
  { method: "GET", path: "/sportsComplexDetail" },
  { method: "GET", path: "/getAllRatings" },
  { method: "GET", path: "/getUpdates" },
  { method: "GET", path: "/getUpdatesForAthlete" },
  { method: "GET", path: "/gettimeslotforguest" },
  { method: "POST", path: "/addGuest" },
  { method: "POST", path: "/onlinepayment/intent" },
];

// Public HTML report pages used inside mobile WebViews. WebViews cannot attach
// an Authorization header, so these stay public and are documented as a
// remaining limitation in the Phase 2B report.
const PUBLIC_PREFIXES = [
  { method: "GET", prefix: "/athelteperformance/" },
  { method: "GET", prefix: "/comparativeathelteperformance/" },
];

function isPublicRoute(method, path) {
  const verb = String(method || "").toUpperCase();
  const target = String(path || "");
  return (
    PUBLIC_ROUTES.some((r) => r.method === verb && r.path === target) ||
    PUBLIC_PREFIXES.some((r) => r.method === verb && target.startsWith(r.prefix))
  );
}

module.exports = { PUBLIC_ROUTES, PUBLIC_PREFIXES, isPublicRoute };
