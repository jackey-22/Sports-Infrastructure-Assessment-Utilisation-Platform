// Coach-scoped demo dataset for Phase 2C.3.
//
// The Coach is assigned to a single sports complex and only sees athletes and
// ratings belonging to that facility. Records are deterministic and shared
// across the Coach dashboard, athlete list, profile, rating form and history so
// every screen always agrees on the same underlying data.
//
// Every record here is fictional and exists only to exercise the UI. There is no
// backend contract for coach-to-athlete rating (the mobile app calls an
// unimplemented `ratingByInstructor` endpoint), so all rating interactions are
// demo-only.
import {
  DEMO_FACILITIES,
  DEMO_MONTH_LABELS,
  DEMO_TODAY,
} from "../../data/admin/adminDemoData";
import { sumBy } from "../../utils/admin/adminUtils";

export const COACH_MODE = true;
export const COACH_TODAY = DEMO_TODAY;

// The Coach's assigned facility. Mirrors the Manager assignment so Admin and
// Coach data stays consistent on the same complex.
export const COACH_FACILITY = DEMO_FACILITIES[0];
export const COACH_FACILITY_ID = COACH_FACILITY.id;

// Coach identity (demo).
export const COACH = {
  id: "COACH-2026-0001",
  name: "Manav Rathod",
  role: "Coach",
  email: "manav.rathod@example.test",
  facilityId: COACH_FACILITY_ID,
  facilityName: COACH_FACILITY.name,
  district: COACH_FACILITY.district,
  sports: COACH_FACILITY.sports,
};

const ATHLETE_NAMES = [
  { name: "Rohan Mehta", sport: "Badminton" },
  { name: "Priya Desai", sport: "Swimming" },
  { name: "Aarav Patel", sport: "Athletics & Track" },
  { name: "Isha Trivedi", sport: "Football" },
  { name: "Neel Shah", sport: "Table Tennis" },
  { name: "Hetal Joshi", sport: "Badminton" },
  { name: "Foram Bhatt", sport: "Swimming" },
  { name: "Dev Chauhan", sport: "Athletics & Track" },
  { name: "Riya Solanki", sport: "Football" },
  { name: "Kabir Nair", sport: "Badminton" },
  { name: "Anika Patel", sport: "Table Tennis" },
  { name: "Siddharth Joshi", sport: "Athletics & Track" },
];

const AGE_GROUPS = ["Under 14", "Under 17", "Under 19", "Open"];
const STATUSES = ["Active", "Inactive", "On Leave"];
const RATING_STATUSES = ["Rated", "Pending"];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Deterministic rating parameters (criteria) a coach evaluates.
const RATING_CRITERIA = [
  "Technique",
  "Fitness",
  "Discipline",
  "Teamwork",
  "Punctuality",
];

function buildAthlete(index) {
  const template = ATHLETE_NAMES[index % ATHLETE_NAMES.length];
  const sport = template.sport;
  const ageGroup = AGE_GROUPS[index % AGE_GROUPS.length];
  const status = STATUSES[index % STATUSES.length];
  const rated = index % 3 !== 0; // ~2/3 rated
  const rating = rated ? 1 + ((index * 7) % 5) : null; // 1-5
  const ratedAt = rated
    ? daysBefore(COACH_TODAY, 10 + index * 5)
    : null;
  const remarks = rated
    ? index % 2 === 0
      ? "Shows steady improvement in technique and attendance."
      : "Needs more focus on fitness and punctuality."
    : null;

  return {
    id: `ATH-2026-${String(1000 + index).padStart(4, "0")}`,
    name: template.name,
    sport,
    ageGroup,
    status,
    facilityId: COACH_FACILITY_ID,
    facilityName: COACH_FACILITY.name,
    district: COACH_FACILITY.district,
    coachId: COACH.id,
    coachName: COACH.name,
    joinedAt: daysBefore(COACH_TODAY, 60 + index * 8),
    lastSessionAt: daysBefore(COACH_TODAY, 1 + (index % 14)),
    attendancePct: clamp(60 + ((index * 13) % 40), 60, 100),
    rating,
    ratingStatus: rated ? "Rated" : "Pending",
    ratedAt,
    remarks,
    progressTrend: DEMO_MONTH_LABELS.map((_, m) =>
      clamp(40 + ((index * 9 + m * 5) % 55) + Math.round(Math.sin(m) * 5), 35, 95)
    ),
  };
}

function daysBefore(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export const COACH_ATHLETES = ATHLETE_NAMES.map((_, index) => buildAthlete(index));

// Deterministic rating history (matches COACH_ATHLETES ratings).
export const COACH_RATING_HISTORY = COACH_ATHLETES.filter(
  (a) => a.ratingStatus === "Rated"
).map((athlete) => ({
  id: `RAT-2026-${String(2000 + COACH_ATHLETES.indexOf(athlete)).padStart(4, "0")}`,
  athleteId: athlete.id,
  athleteName: athlete.name,
  sport: athlete.sport,
  facilityId: athlete.facilityId,
  facilityName: athlete.facilityName,
  coachId: COACH.id,
  coachName: COACH.name,
  rating: athlete.rating,
  remarks: athlete.remarks,
  parameters: RATING_CRITERIA.map((criterion, i) => ({
    parameter: criterion,
    value: clamp(athlete.rating - 1 + ((i * 3) % 5), 1, 5),
  })),
  createdAt: athlete.ratedAt,
  updatedAt: athlete.ratedAt,
}));

export const COACH_DASHBOARD_SUMMARY = () => {
  const athletes = COACH_ATHLETES;
  const total = athletes.length;
  const active = athletes.filter((a) => a.status === "Active").length;
  const pending = athletes.filter((a) => a.ratingStatus === "Pending").length;
  const rated = athletes.filter((a) => a.ratingStatus === "Rated").length;
  const ratings = COACH_RATING_HISTORY;
  const avgRating =
    ratings.length > 0
      ? Math.round(
          (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) *
            10
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
    totalAthletes: total,
    activeAthletes: active,
    pendingRatings: pending,
    ratedAthletes: rated,
    averageRating: avgRating,
    totalRatings: ratings.length,
    recentRatings,
    sportDistribution,
  };
};

// Coach capabilities (demo-only; backend contract does not exist).
export const COACH_ACTIONS = {
  canRateAthletes: true,      // demo-only; no backend endpoint
  canEditRating: false,       // duplicate/edit rules not defined by backend
  canViewRatingHistory: true, // demo-only
};

// Keep named exports consistent with Admin/Manager pattern.
export {
  COACH_ATHLETES as athletes,
  COACH_RATING_HISTORY as ratingHistory,
  COACH_DASHBOARD_SUMMARY as dashboardSummary,
};
