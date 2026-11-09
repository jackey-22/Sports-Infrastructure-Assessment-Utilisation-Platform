// Deterministic demo data for the District Authority analysis screen.
//
// The analysis charts read directly from the backend. When a local demo has no
// backend running, or the selected complex has no records for a filter, the
// charts fall back to these seeded values so the screen still tells a coherent
// story. Real API data always wins when it is present.
import { DEMO_FACILITIES } from "../admin/adminDemoData";
import { SPORTS_LIST } from "../gujaratSportsData";

const DEMO_DISTRICT = DEMO_FACILITIES[0] ? DEMO_FACILITIES[0].district : "";

// Two complexes from the demo district, shaped like GET /getSportsComplex.
export const DEMO_AUTHORITY_COMPLEXES = DEMO_FACILITIES.filter(
  (facility) => facility.district === DEMO_DISTRICT
)
  .slice(0, 4)
  .map((facility) => ({ _id: facility.id, name: facility.name }));

// Shaped like GET /getSports.
export const DEMO_AUTHORITY_SPORTS = SPORTS_LIST.map((sport) => ({
  _id: sport.id,
  SportName: sport.name,
}));

export const DEMO_TIME_SLOT_ATTENDANCE = [
  24, 58, 86, 64, 38, 26, 18, 22, 34, 52, 78, 46,
];

export const DEMO_CAPACITY = {
  categories: [
    "Badminton",
    "Table Tennis",
    "Athletics & Track",
    "Swimming",
    "Basketball",
  ],
  capacity: [180, 120, 260, 90, 110],
  enrolled: [156, 92, 218, 74, 61],
};

export const DEMO_COMPLAINTS = {
  categories: [
    "Maintenance",
    "Cleanliness",
    "Equipment",
    "Coaching",
    "Safety",
  ],
  total: [14, 11, 8, 19, 6],
  resolved: [12, 8, 6, 16, 5],
  unresolved: [2, 3, 2, 3, 1],
  satisfied: [10, 7, 5, 13, 4],
  unsatisfied: [2, 1, 1, 3, 1],
};

export const DEMO_MONTHLY_ENROLMENT = [
  118, 132, 145, 139, 168, 154, 171, 189, 176, 198, 214, 226,
];

export const DEMO_AGE_GROUP = {
  categories: [
    "Badminton",
    "Table Tennis",
    "Athletics & Track",
    "Swimming",
    "Basketball",
  ],
  values: [164, 98, 221, 76, 62],
};

// Narrower age bands show a proportional slice of the full athlete base.
export function demoAgeGroupValues(minAge, maxAge) {
  const span = Number(maxAge) - Number(minAge);
  const factor = !Number.isFinite(span) || span >= 90 ? 1 : Math.max(0.05, span / 100);
  return DEMO_AGE_GROUP.values.map((value) =>
    Math.max(4, Math.round(value * factor))
  );
}

export const DEMO_AGE_PROFILE = {
  categories: [
    "Under 10",
    "10–20",
    "20–25",
    "25–30",
    "30–40",
    "40–50",
    "Over 50",
  ],
  values: [42, 168, 214, 186, 132, 74, 38],
};

export const DEMO_ATTENDANCE_BY_SPORT = {
  categories: [
    "Badminton",
    "Table Tennis",
    "Athletics & Track",
    "Swimming",
    "Basketball",
  ],
  values: [312, 186, 428, 154, 132],
};

export const DEMO_DISTRICT_FACILITIES = {
  categories: [
    "Badminton",
    "Cricket",
    "Football",
    "Athletics & Track",
    "Swimming",
    "Table Tennis",
    "Basketball",
    "Kabaddi",
  ],
  values: [5, 4, 3, 6, 2, 4, 3, 2],
};

export const DEMO_MONTHLY_EVENTS = [2, 3, 1, 4, 2, 5, 3, 2, 6, 4, 3, 5];

export const DEMO_MONTHLY_COMPLAINTS = [
  7, 9, 6, 11, 8, 5, 12, 9, 7, 6, 8, 10,
];
