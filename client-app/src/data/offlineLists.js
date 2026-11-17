// Static rows for the older list screens. Those screens still call
// localhost:9999; when that server is down the demo keeps these records.
import { GUJARAT_FACILITIES, SPORTS_LIST } from "./gujaratSportsData";

// A closed API port can take a long time to fail. Show the demo rows if the
// request has not succeeded within this window.
export function withOffline(request, fallback, ms = 700) {
  return Promise.race([
    Promise.resolve(request).catch(() => fallback),
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const ahmedabad = GUJARAT_FACILITIES.filter(
  (facility) => facility.district === "Ahmedabad"
);
const home = GUJARAT_FACILITIES[0];

const PORTRAIT =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="200"><rect width="160" height="200" fill="#e7f6ee"/><circle cx="80" cy="72" r="32" fill="#007D40"/><rect x="36" y="118" width="88" height="48" rx="24" fill="#007D40"/></svg>'
  );

export const DEMO_MANAGERS = [
  {
    _id: "mgr-khokhra",
    Name: "Rajesh Vaghela",
    ContactNum: "+91 79 2216 4801",
    Email: "manager.khokhra@sag.gujarat.gov.in",
    SportComplexId: { name: home.name },
    CreatedAt: "2024-06-01",
    date: "2024-06-01",
  },
  {
    _id: "mgr-navrangpura",
    Name: "Kiran Patel",
    ContactNum: "+91 79 2630 4412",
    Email: "manager.navrangpura@sag.gujarat.gov.in",
    SportComplexId: { name: ahmedabad[1] ? ahmedabad[1].name : "Sardar Patel Sports Complex" },
    CreatedAt: "2024-08-14",
    date: "2024-08-14",
  },
  {
    _id: "mgr-paldi",
    Name: "Mehul Shah",
    ContactNum: "+91 79 2657 2290",
    Email: "manager.paldi@sag.gujarat.gov.in",
    SportComplexId: { name: ahmedabad[2] ? ahmedabad[2].name : "Riverfront Athletics Centre" },
    CreatedAt: "2025-01-20",
    date: "2025-01-20",
  },
];

export const DEMO_COMPLEX_ROWS = (ahmedabad.length ? ahmedabad : GUJARAT_FACILITIES.slice(0, 4)).map(
  (facility) => ({
    _id: facility.id,
    name: facility.name,
    manager: { Name: facility.contactPerson || "Complex manager" },
    location: facility.location,
    operationalSince: facility.operationalSince,
    area: facility.areaAcres ? `${facility.areaAcres} acres` : "",
    taluka: facility.taluka,
    district: { District: facility.district },
    createdAt: "2024-04-12",
  })
);

export const DEMO_SUPERVISORS = [
  {
    _id: "sup-1",
    Name: "Hitesh Parmar",
    ContactNum: "+91 98790 22110",
    Email: "hitesh.parmar@sag.gujarat.gov.in",
    CreatedAt: "2025-02-11",
    date: "2025-02-11",
  },
  {
    _id: "sup-2",
    Name: "Falguni Dave",
    ContactNum: "+91 98250 11880",
    Email: "falguni.dave@sag.gujarat.gov.in",
    CreatedAt: "2025-05-03",
    date: "2025-05-03",
  },
];

export const DEMO_INSTRUCTORS = [
  {
    _id: "ins-1",
    userId: {
      Name: "Nirav Joshi",
      Email: "coach.khokhra@sag.gujarat.gov.in",
      ContactNum: "+91 79 2216 4810",
    },
    sports: [
      {
        sport: { SportName: "Badminton" },
        experience: 11,
        timeSlot: [
          { from: "06:00", to: "08:00" },
          { from: "16:00", to: "18:00" },
        ],
      },
    ],
  },
  {
    _id: "ins-2",
    userId: {
      Name: "Pooja Rana",
      Email: "pooja.rana@sag.gujarat.gov.in",
      ContactNum: "+91 79 2216 4814",
    },
    sports: [
      {
        sport: { SportName: "Swimming" },
        experience: 8,
        timeSlot: [{ from: "07:00", to: "09:00" }],
      },
      {
        sport: { SportName: "Athletics & Track" },
        experience: 6,
        timeSlot: [{ from: "17:00", to: "19:00" }],
      },
    ],
  },
];

export const DEMO_GUEST_SLOTS = [
  {
    _id: "slot-1",
    Name: "School Games Federation",
    Email: "sgfi.ahmedabad@example.test",
    ContactNum: "+91 79 2216 4900",
    sport: { SportName: "Badminton" },
    timeslot: { from: "06:00", to: "08:00" },
    duration: 5,
    Startdate: "2026-11-02",
    Enddate: "2026-11-16",
  },
  {
    _id: "slot-2",
    Name: "Maninagar Swim Club",
    Email: "swim.maninagar@example.test",
    ContactNum: "+91 98240 33421",
    sport: { SportName: "Swimming" },
    timeslot: { from: "07:00", to: "09:00" },
    duration: 12,
    Startdate: "2026-11-01",
    Enddate: "2026-11-30",
  },
  {
    _id: "slot-3",
    Name: "District Athletics Camp",
    Email: "athletics.dso@sag.gujarat.gov.in",
    ContactNum: "+91 79 2216 4808",
    sport: { SportName: "Athletics & Track" },
    timeslot: { from: "16:00", to: "18:30" },
    duration: 7,
    Startdate: "2026-11-10",
    Enddate: "2026-11-20",
  },
];

export const DEMO_FACILITY_SPORTS = (home.sports || []).map((sport, index) => ({
  _id: `sport-row-${index}`,
  sport: {
    SportName: sport.name,
    Category: (SPORTS_LIST.find((item) => item.name === sport.name) || {}).category || "Sport",
  },
  fees: sport.feePerHour || "—",
  images: home.picture ? [home.picture] : [],
}));

export const DEMO_COMPLEX_NEWS = [
  {
    _id: "news-1",
    title: "Khel Mahakumbh court booking opens",
    description: "Evening badminton courts are reserved for the district trials from 10 November.",
    image: home.picture || "",
    active: "1",
    date: "2026-11-01",
  },
  {
    _id: "news-2",
    title: "Floodlight maintenance on court 2",
    description: "Court 2 floodlights are offline on Sunday morning while the bank is replaced.",
    image: home.picture || "",
    active: "1",
    date: "2026-10-28",
  },
];

const complaint = (id, level, status, name, description, extra = {}) => ({
  _id: id,
  date: extra.date || "2026-10-18",
  level,
  status,
  Description: description,
  raisedBy: extra.raisedBy || "citizen",
  userId: { Name: name, Role: extra.role == null ? 0 : extra.role },
  sportsComplex: { name: home.name },
  type: { Type: extra.type || "Turf & Surface Degradation" },
  remarks:
    status === 1
      ? [
          {
            remark: "Resolved by the complex team.",
            level,
            date: extra.date || "2026-10-18",
            userId: { Name: "Facility manager", Role: 3 },
          },
        ]
      : [],
  photo: home.picture ? [home.picture] : [],
});

export const DEMO_MANAGER_COMPLAINTS = [
  complaint("cmp-m-1", 0, 0, "Rohan Mehta", "Turf wear near the north goalpost.", {
    type: "Turf & Surface Degradation",
    date: "2026-11-02",
  }),
  complaint("cmp-m-2", 1, 0, "Priya Desai", "Floodlights not switching on in court 2.", {
    type: "Floodlight & Electrical Outage",
    date: "2026-11-03",
  }),
  complaint("cmp-m-3", 1, 1, "Aarav Trivedi", "Drinking water point on the track was dry.", {
    type: "Sanitation & Drinking Water",
    date: "2026-10-28",
  }),
  complaint("cmp-m-4", 0, 0, "Kavya Shah", "Court 3 drinking water tap is leaking onto the playing surface.", {
    type: "Sanitation & Drinking Water",
    date: "2026-11-07",
  }),
  complaint("cmp-m-5", 1, 0, "Neel Joshi", "Badminton nets on court 1 are frayed and need replacement.", {
    type: "Equipment Replacement Needed",
    date: "2026-11-08",
  }),
  complaint("cmp-m-6", 0, 0, "Meera Patel", "Locker room taps near the swimming pool stay dry after 6 pm.", {
    type: "Locker Room & Hygiene",
    date: "2026-11-08",
  }),
  complaint("cmp-m-7", 1, 0, "Ishaan Rao", "Perimeter light on the east gate has been out for three nights.", {
    type: "Perimeter & Security Issue",
    date: "2026-11-09",
  }),
  complaint("cmp-m-8", 2, 0, "Rajesh Vaghela", "Pump room seepage needs a district works visit.", {
    type: "Sanitation & Drinking Water",
    raisedBy: "manager",
    role: 3,
    date: "2026-11-05",
  }),
  complaint("cmp-m-9", 2, 1, "Rajesh Vaghela", "Boundary wall repair beside court 1 is complete.", {
    type: "Perimeter & Security Issue",
    raisedBy: "manager",
    role: 3,
    date: "2026-10-22",
  }),
];

export const DEMO_AUTHORITY_COMPLAINTS = [
  complaint("cmp-a-1", 2, 0, "Rohan Mehta", "Turf wear forwarded by the complex manager.", {
    type: "Turf & Surface Degradation",
  }),
  complaint("cmp-a-2", 2, 0, "School Games Federation", "Request for extra mats during district trials.", {
    type: "Equipment Replacement Needed",
    role: 6,
  }),
  complaint("cmp-a-3", 2, 1, "Priya Desai", "Locker-room hygiene complaint, since closed.", {
    type: "Locker Room & Hygiene",
  }),
  complaint("cmp-m-8", 2, 0, "Rajesh Vaghela", "Pump room seepage needs a district works visit.", {
    type: "Sanitation & Drinking Water",
    raisedBy: "manager",
    role: 3,
    date: "2026-11-05",
  }),
];

export const DEMO_ATHLETE_ROWS = [
  {
    _id: "ath-1",
    user: [{ Name: "Aarav Trivedi", ContactNum: "+91 98980 12345", Email: "athlete.aarav@gmail.com" }],
    sports: [{ SportName: "Badminton" }],
  },
  {
    _id: "ath-2",
    user: [{ Name: "Rohan Mehta", ContactNum: "+91 98250 44110", Email: "rohan.mehta@example.test" }],
    sports: [{ SportName: "Football" }, { SportName: "Athletics & Track" }],
  },
  {
    _id: "ath-3",
    user: [{ Name: "Priya Desai", ContactNum: "+91 98765 22001", Email: "priya.desai@example.test" }],
    sports: [{ SportName: "Swimming" }],
  },
];

export const DEMO_LEADERBOARD = [
  {
    _id: "lb-1",
    name: "Aarav Trivedi",
    rating: 92,
    email: "athlete.aarav@gmail.com",
    contact: "+91 98980 12345",
    address: "Khokhra, Ahmedabad",
    dob: "2002-09-14",
    image: PORTRAIT,
    parameter: { Footwork: 90, Stamina: 88, Accuracy: 94, Consistency: 91 },
    complaint: [
      { type: "Court", solved: 2, unsolved: 0, solvedsatisfied: 2, solvednotsatisfied: 0 },
    ],
  },
  {
    _id: "lb-2",
    name: "Priya Desai",
    rating: 88,
    email: "priya.desai@example.test",
    contact: "+91 98765 22001",
    address: "Maninagar, Ahmedabad",
    dob: "2004-03-22",
    image: PORTRAIT,
    parameter: { Endurance: 86, Technique: 90, Starts: 84, Turns: 89 },
    complaint: [
      { type: "Pool", solved: 1, unsolved: 1, solvedsatisfied: 1, solvednotsatisfied: 0 },
    ],
  },
  {
    _id: "lb-3",
    name: "Rohan Mehta",
    rating: 81,
    email: "rohan.mehta@example.test",
    contact: "+91 98250 44110",
    address: "Paldi, Ahmedabad",
    dob: "2003-12-02",
    image: PORTRAIT,
    parameter: { Speed: 84, Passing: 78, Positioning: 80, Discipline: 82 },
    complaint: [
      { type: "Turf", solved: 1, unsolved: 1, solvedsatisfied: 1, solvednotsatisfied: 0 },
    ],
  },
];

export const DEMO_SPORT_OPTIONS = SPORTS_LIST.slice(0, 6).map((sport) => ({
  _id: sport.id,
  SportName: sport.name,
}));

export const DEMO_COMPLAINT_TYPES = [
  { _id: "turf", Type: "Turf & Surface Degradation" },
  { _id: "floodlight", Type: "Floodlight & Electrical Outage" },
  { _id: "sanitation", Type: "Sanitation & Drinking Water" },
  { _id: "locker", Type: "Locker Room & Hygiene" },
];

const ADDS_KEY = "khelgujarat-offline-adds";

function readAdds() {
  try {
    const saved = JSON.parse(localStorage.getItem(ADDS_KEY) || "null");
    if (!saved || typeof saved !== "object") {
      return { managers: [], supervisors: [], instructors: [], news: [], complaints: [] };
    }
    return {
      managers: saved.managers || [],
      supervisors: saved.supervisors || [],
      instructors: saved.instructors || [],
      news: saved.news || [],
      complaints: saved.complaints || [],
    };
  } catch {
    return { managers: [], supervisors: [], instructors: [], news: [], complaints: [] };
  }
}

function writeAdds(data) {
  try {
    localStorage.setItem(ADDS_KEY, JSON.stringify(data));
  } catch {
    // The in-memory row still shows until the tab is closed.
  }
}

function upsert(list, row) {
  const index = list.findIndex((item) => item._id === row._id);
  if (index === -1) list.unshift(row);
  else Object.assign(list[index], row);
}

function remember(bucket, row) {
  const data = readAdds();
  data[bucket] = [row, ...data[bucket].filter((item) => item._id !== row._id)];
  writeAdds(data);
}

(function hydrateAdds() {
  const saved = readAdds();
  saved.managers.forEach((row) => upsert(DEMO_MANAGERS, row));
  saved.supervisors.forEach((row) => upsert(DEMO_SUPERVISORS, row));
  saved.instructors.forEach((row) => upsert(DEMO_INSTRUCTORS, row));
  saved.news.forEach((row) => upsert(DEMO_COMPLEX_NEWS, row));
  saved.complaints.forEach((row) => {
    if ((row.lists || []).includes("manager")) upsert(DEMO_MANAGER_COMPLAINTS, row);
    if ((row.lists || []).includes("authority")) upsert(DEMO_AUTHORITY_COMPLAINTS, row);
  });
})();

export function addDemoManager(row) {
  upsert(DEMO_MANAGERS, row);
  remember("managers", row);
  return row;
}

export function addDemoSupervisor(row) {
  upsert(DEMO_SUPERVISORS, row);
  remember("supervisors", row);
  return row;
}

export function addDemoInstructor(row) {
  upsert(DEMO_INSTRUCTORS, row);
  remember("instructors", row);
  return row;
}

export function addDemoNews(row) {
  upsert(DEMO_COMPLEX_NEWS, row);
  remember("news", row);
  return row;
}

export function saveDemoComplaint(row) {
  const lists = row.lists || ["manager"];
  const stored = { ...row, lists };
  if (lists.includes("manager")) upsert(DEMO_MANAGER_COMPLAINTS, stored);
  if (lists.includes("authority")) upsert(DEMO_AUTHORITY_COMPLAINTS, stored);
  remember("complaints", stored);
  return stored;
}

export function managerComplaintRows(scope) {
  if (scope === "mine") {
    return DEMO_MANAGER_COMPLAINTS.filter((row) => row.raisedBy === "manager");
  }
  return DEMO_MANAGER_COMPLAINTS.filter(
    (row) => row.raisedBy !== "manager" && Number(row.status) !== 1 && Number(row.level) < 2
  );
}

export function authorityComplaintRows() {
  return DEMO_AUTHORITY_COMPLAINTS.filter((row) => Number(row.level) >= 2);
}
