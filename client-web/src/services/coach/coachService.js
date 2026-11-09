// Coach feature service layer. Phase 2D.2 reads and writes the shared in-memory
// demo store (src/data/demoStore.js), so a submitted rating appears in the
// athlete profile, the rating history and the coach dashboard at the same time.
//
// IMPORTANT: There is no backend contract for coach-to-athlete rating. The
// existing `addRating` endpoint is for citizens/athletes rating their own
// facility record, and the mobile app's `ratingByInstructor` endpoint is not
// implemented in the backend. All rating interactions here are demo-only.
import {
  COACH,
  COACH_FACILITY,
} from "../../data/coach/coachDemoData";
import { demoStore } from "../../data/demoStore";

const DEMO_LATENCY_MS = 220;
const wait = (value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), DEMO_LATENCY_MS));

function coachDashboard() {
  const athletes = demoStore.listAthletes();
  const ratings = demoStore.listRatings();
  const total = athletes.length;
  const avgRating =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 10
        ) / 10
      : 0;
  const recentRatings = [...ratings]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, 5);
  const sportDistribution = athletes.reduce((acc, a) => {
    acc[a.sport] = (acc[a.sport] || 0) + 1;
    return acc;
  }, {});

  return {
    coach: COACH,
    facility: COACH_FACILITY,
    facilityUtilisation: COACH_FACILITY.utilisation,
    totalAthletes: total,
    activeAthletes: athletes.filter((a) => a.status === "Active").length,
    pendingRatings: athletes.filter((a) => a.ratingStatus === "Pending").length,
    ratedAthletes: athletes.filter((a) => a.ratingStatus === "Rated").length,
    averageRating: avgRating,
    totalRatings: ratings.length,
    recentRatings,
    sportDistribution,
  };
}

export const coachService = {
  // GET /api/coach/dashboard
  getDashboard() {
    return wait(coachDashboard());
  },

  // GET /api/coach/athletes
  // Query: search, sport, ageGroup, status, ratingStatus, page, pageSize
  listAthletes() {
    return wait(demoStore.listAthletes());
  },

  // GET /api/coach/athletes/:id
  getAthlete(id) {
    return wait(demoStore.listAthletes().find((row) => row.id === id) || null);
  },

  // GET /api/coach/rating-history
  // Query: search, sport, rating, page, pageSize
  listRatingHistory() {
    return wait(demoStore.listRatings());
  },

  // GET /api/coach/rating-history/:id
  getRating(id) {
    return wait(demoStore.listRatings().find((row) => row.id === id) || null);
  },

  // POST /api/coach/ratings — demo-only. No backend endpoint exists. Persists to
  // the shared store so the athlete profile and rating history reflect it.
  submitRating(input) {
    const rating = demoStore.submitRating(input);
    return wait({ demo: true, rating });
  },

  // GET /api/coach/capabilities — demo-only role-bound capabilities.
  getCapabilities() {
    return wait({
      canRateAthletes: true,
      canEditRating: false,
      canViewRatingHistory: true,
    });
  },
};
