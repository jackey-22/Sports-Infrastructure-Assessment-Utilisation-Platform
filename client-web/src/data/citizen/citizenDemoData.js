// Citizen/Athlete-scoped demo dataset for Phase 2C.4.
//
// The Citizen/Athlete is associated with a single sports complex and only sees
// their own attendance, feedback and complaint records. Records are deterministic
// and shared across the Citizen dashboard, attendance, feedback and complaints
// screens so every screen agrees on the same underlying data.
//
// Every record here is fictional and exists only to exercise the UI. Where a real
// backend contract exists (facility rating, complaint submission, attendance
// entry/exit) the service layer mirrors that contract; where none exists (sport
// feedback, coach feedback, QR camera scanning on web) the interaction is
// clearly labelled demo-only.
import { DEMO_FACILITIES } from "../../data/admin/adminDemoData";
import { sumBy } from "../../utils/admin/adminUtils";

export const CITIZEN_MODE = true;
// Relative dates keep the demo open session on the current day, so the
// attendance history never looks like an old visit was left unchecked out.
export const CITIZEN_TODAY = new Date().toISOString().slice(0, 10);

// The Citizen's assigned facility. Mirrors the Coach/Manager assignment so all
// role-scoped data stays consistent on the same complex.
export const CITIZEN_FACILITY = DEMO_FACILITIES[0];
export const CITIZEN_FACILITY_ID = CITIZEN_FACILITY.id;

// Citizen identity (demo).
export const CITIZEN = {
  id: "CIT-2026-0001",
  name: "Rohan Mehta",
  role: "Athlete",
  email: "rohan.mehta@example.test",
  facilityId: CITIZEN_FACILITY_ID,
  facilityName: CITIZEN_FACILITY.name,
  district: CITIZEN_FACILITY.district,
  joinedAt: "2026-01-15",
  memberId: "MEM-2026-0001",
};

const SPORT_NAMES = [
  "Badminton",
  "Swimming",
  "Athletics & Track",
  "Football",
  "Table Tennis",
];

const COMPLAINT_CATEGORIES = [
  "Turf & Surface Degradation",
  "Floodlight & Electrical Outage",
  "Sanitation & Drinking Water",
  "Locker Room & Hygiene",
  "Equipment Replacement Needed",
  "Perimeter & Security Issue",
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function daysBefore(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

// Build deterministic attendance sessions for the citizen's facility.
// Each session has enrolls (entry/exit) for the citizen.
function buildAttendanceSessions() {
  const sessions = [];
  // Last 30 days, sessions on alternating days. Every past session has a
  // check-out; only today's session is still open, so the history never shows
  // old visits that were left without an exit.
  for (let day = 0; day < 30; day += 2) {
    const date = daysBefore(CITIZEN_TODAY, day);
    const entryHour = 6 + (day % 3);
    const entry = new Date(
      `${date}T${String(entryHour).padStart(2, "0")}:30:00Z`
    ).getTime();
    const exit = day === 0 ? null : entry + (150 + (day % 3) * 45) * 60000;
    sessions.push({
      id: `SESS-2026-${String(100 + day).padStart(4, "0")}`,
      facilityId: CITIZEN_FACILITY_ID,
      facilityName: CITIZEN_FACILITY.name,
      district: CITIZEN_FACILITY.district,
      date,
      entry,
      exit,
      status: exit ? "Completed" : "Checked In",
      durationMinutes: exit ? Math.round((exit - entry) / 60000) : null,
    });
  }
  return sessions.reverse(); // most recent last for display ordering
}

export const CITIZEN_ATTENDANCE = buildAttendanceSessions();

export const CITIZEN_ATTENDANCE_SUMMARY = () => {
  const sessions = CITIZEN_ATTENDANCE;
  const total = sessions.length;
  const completed = sessions.filter((s) => s.status === "Completed").length;
  const checkedIn = sessions.filter((s) => s.status === "Checked In").length;
  const totalMinutes = sumBy(
    sessions.filter((s) => s.durationMinutes != null),
    (s) => s.durationMinutes
  );
  return {
    totalSessions: total,
    completedSessions: completed,
    checkedInSessions: checkedIn,
    totalHours: totalMinutes > 0 ? Math.round((totalMinutes / 60) * 10) / 10 : 0,
    lastSession: sessions[sessions.length - 1] || null,
  };
};

// Deterministic facility feedback (real backend contract via RatingController).
function buildFacilityFeedback() {
  return [
    {
      id: "FDB-2026-0001",
      facilityId: CITIZEN_FACILITY_ID,
      facilityName: CITIZEN_FACILITY.name,
      entityType: "facility",
      entityId: CITIZEN_FACILITY_ID,
      entityName: CITIZEN_FACILITY.name,
      rating: 4,
      remarks: "Good facilities overall, turf needs minor repair.",
      sport: "Badminton",
      sportComplex: CITIZEN_FACILITY_ID,
      createdAt: daysBefore(CITIZEN_TODAY, 12),
      updatedAt: daysBefore(CITIZEN_TODAY, 12),
    },
    {
      id: "FDB-2026-0002",
      facilityId: CITIZEN_FACILITY_ID,
      facilityName: CITIZEN_FACILITY.name,
      entityType: "facility",
      entityId: CITIZEN_FACILITY_ID,
      entityName: CITIZEN_FACILITY.name,
      rating: 3,
      remarks: "Floodlights in court 2 were out during evening session.",
      sport: "Football",
      sportComplex: CITIZEN_FACILITY_ID,
      createdAt: daysBefore(CITIZEN_TODAY, 25),
      updatedAt: daysBefore(CITIZEN_TODAY, 25),
    },
  ];
}

export const CITIZEN_FACILITY_FEEDBACK = buildFacilityFeedback();

// Demo-only sport feedback (no backend contract).
function buildSportFeedback() {
  return [
    {
      id: "SDB-2026-0001",
      entityType: "sport",
      entityId: "sport_cricket",
      entityName: "Cricket",
      rating: 5,
      remarks: "Excellent cricket coaching program.",
      createdAt: daysBefore(CITIZEN_TODAY, 8),
    },
    {
      id: "SDB-2026-0002",
      entityType: "sport",
      entityId: "sport_swimming",
      entityName: "Swimming",
      rating: 4,
      remarks: "Good pool maintenance.",
      createdAt: daysBefore(CITIZEN_TODAY, 18),
    },
  ];
}

export const CITIZEN_SPORT_FEEDBACK = buildSportFeedback();

// Demo-only coach feedback (no backend contract).
function buildCoachFeedback() {
  return [
    {
      id: "CDB-2026-0001",
      entityType: "coach",
      entityId: "coach_manav",
      entityName: "Manav Rathod",
      rating: 5,
      remarks: "Very supportive coach, explains techniques well.",
      sport: "Badminton",
      createdAt: daysBefore(CITIZEN_TODAY, 5),
    },
  ];
}

export const CITIZEN_COACH_FEEDBACK = buildCoachFeedback();

// Deterministic complaints (real backend contract via ComplaintController).
function buildComplaints() {
  return [
    {
      id: "COM-2026-0001",
      facilityId: CITIZEN_FACILITY_ID,
      facilityName: CITIZEN_FACILITY.name,
      district: CITIZEN_FACILITY.district,
      category: "Turf & Surface Degradation",
      subject: "Turf wear near north goalpost",
      description:
        "The synthetic turf around the north goalpost has worn through and players have reported slipping.",
      status: "Resolved",
      statusCode: 1,
      level: 2,
      levelLabel: "Level 2 · Authority",
      submittedAt: daysBefore(CITIZEN_TODAY, 14),
      resolvedAt: daysBefore(CITIZEN_TODAY, 10),
      updatedAt: daysBefore(CITIZEN_TODAY, 10),
      satisfied: 1,
      attachments: ["turf-photo-01.jpg"],
      remarks: [
        {
          level: 2,
          author: "Authority Staff",
          remark: "Site inspected. Turf repair scheduled.",
          date: daysBefore(CITIZEN_TODAY, 11),
        },
      ],
    },
    {
      id: "COM-2026-0002",
      facilityId: CITIZEN_FACILITY_ID,
      facilityName: CITIZEN_FACILITY.name,
      district: CITIZEN_FACILITY.district,
      category: "Floodlight & Electrical Outage",
      subject: "Floodlights not switching on in court 2",
      description:
        "Two floodlight banks in indoor court 2 remain off after maintenance.",
      status: "Pending",
      statusCode: 0,
      level: 0,
      levelLabel: "Level 0 · Supervisor",
      submittedAt: daysBefore(CITIZEN_TODAY, 3),
      resolvedAt: null,
      updatedAt: daysBefore(CITIZEN_TODAY, 3),
      satisfied: 0,
      attachments: [],
      remarks: [],
    },
  ];
}

export const CITIZEN_COMPLAINTS = buildComplaints();

export const CITIZEN_COMPLAINT_SUMMARY = () => {
  const complaints = CITIZEN_COMPLAINTS;
  return {
    total: complaints.length,
    pending: complaints.filter((c) => c.status === "Pending").length,
    resolved: complaints.filter((c) => c.status === "Resolved").length,
  };
};

export const CITIZEN_FEEDBACK_SUMMARY = () => {
  const facilityFeedback = CITIZEN_FACILITY_FEEDBACK;
  const sportFeedback = CITIZEN_SPORT_FEEDBACK;
  const coachFeedback = CITIZEN_COACH_FEEDBACK;
  const all = [...facilityFeedback, ...sportFeedback, ...coachFeedback];
  return {
    total: all.length,
    facility: facilityFeedback.length,
    sport: sportFeedback.length,
    coach: coachFeedback.length,
    averageRating:
      all.length > 0
        ? Math.round(
            (sumBy(all, (f) => f.rating) / all.length) * 10
          ) / 10
        : 0,
  };
};

// Citizen capabilities (demo-only where no backend contract exists).
export const CITIZEN_ACTIONS = {
  canSubmitFacilityRating: true,    // real backend contract
  canSubmitSportRating: false,      // no backend contract -> demo-only
  canSubmitCoachRating: false,      // no backend contract -> demo-only
  canRecordAttendance: true,        // real backend contract
  canSubmitComplaint: true,         // real backend contract
  canScanQR: false,                 // no camera contract on web -> demo-only
};

// Keep named exports consistent with other role modules.
export {
  CITIZEN_ATTENDANCE as attendance,
  CITIZEN_FACILITY_FEEDBACK as facilityFeedback,
  CITIZEN_SPORT_FEEDBACK as sportFeedback,
  CITIZEN_COACH_FEEDBACK as coachFeedback,
  CITIZEN_COMPLAINTS as complaints,
};
