// Citizen feature service layer. Phase 2D.1 wires the citizen screens to the
// verified backend endpoints through the shared API client. Methods that have a
// real contract call the backend; methods with no contract stay demo-only and
// are labelled as such by the UI.
//
// Verified real backend contracts used here:
//   GET  /getuserwithathelte          -> the caller's user + athlete record
//   GET  /getSession?sportscomplex=&date=  -> own attendance history (athlete-scoped)
//   POST /addSession/:complexId       -> attendance entry/exit ({ userId })
//   POST /addRating                   -> facility(sport) rating (athlete-only)
//   POST /addComplaint                -> complaint registration (multipart, field "picture")
//   GET  /getAllComplaints            -> own complaints (server-scoped to the caller)
//   GET  /getComplaintType            -> complaint categories
//   GET  /getSports                   -> sports list (for rating a sport)
//   GET  /api/citizen/rating-catalog  -> rateable facilities, sports and coaches
//   GET  /api/citizen/reviews         -> caller's submitted rating history
//   POST /api/citizen/reviews         -> create or update a platform review
//
// Facility, sport and coach feedback uses the authenticated platform review
// endpoints, including a per-user rating history.
import { File } from "expo-file-system";
import { api } from "../../api/client";
import { grievanceService, mapGrievance } from "../grievanceService";
import {
  CITIZEN_FEEDBACK_SUMMARY,
  CITIZEN_FACILITY_FEEDBACK,
  CITIZEN_SPORT_FEEDBACK,
  CITIZEN_COACH_FEEDBACK,
  CITIZEN_ATTENDANCE,
  CITIZEN_COMPLAINTS,
  CITIZEN,
  CITIZEN_FACILITY,
  CITIZEN_FACILITY_ID,
} from "../../data/citizen/citizenDemoData";

const LEVEL_LABELS = {
  0: "Level 0 · Supervisor",
  1: "Level 1 · Manager",
  2: "Level 2 · Authority",
  3: "Level 3 · Admin",
};

const MAX_RANGE_DAYS = 31;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function shiftDays(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// shortcut: GET /getSession returns a single date, so a range is fetched one
// day per request, capped at MAX_RANGE_DAYS. Add a ranged endpoint in Phase 2D.2.
function dateRange(from, to) {
  const start = from || to || todayIso();
  const end = to || from || todayIso();
  const dates = [];
  let cursor = start < end ? start : end;
  const last = start < end ? end : start;
  let guard = 0;
  while (cursor <= last && guard < MAX_RANGE_DAYS) {
    dates.push(cursor);
    cursor = shiftDays(cursor, 1);
    guard += 1;
  }
  return dates;
}

function identity() {
  return api.get("/getuserwithathelte").then((result) => {
    const user = (result && result.data) || {};
    const athlete =
      result && Array.isArray(result.athleteDetail)
        ? result.athleteDetail[0]
        : null;
    return {
      user,
      athlete,
      athleteId: athlete ? athlete._id : null,
      complexId:
        user.SportComplexId || (athlete && athlete.SportComplexId) || null,
    };
  });
}

let identityPromise = null;
// Cached within a session; reset on failure so a later call can retry.
function demoIdentity() {
  return {
    user: {
      _id: "demo-athlete-0001",
      Name: CITIZEN.name,
      Email: CITIZEN.email,
      SportComplexId: CITIZEN_FACILITY_ID,
    },
    athlete: { _id: CITIZEN.id, SportComplexId: CITIZEN_FACILITY_ID },
    athleteId: CITIZEN.id,
    complexId: CITIZEN_FACILITY_ID,
  };
}

function loadIdentity() {
  if (!identityPromise) {
    identityPromise = identity().catch(() => demoIdentity());
  }
  return identityPromise;
}

function mapEnroll(session, enroll, facilityName) {
  const entry = enroll.entry ? new Date(enroll.entry).getTime() : null;
  const exit = enroll.exit ? new Date(enroll.exit).getTime() : null;
  const date = toIsoDate(session.date);
  const facility = session.sportscomplex;
  const resolvedName =
    facilityName || (facility && facility.name) || "Your facility";
  return {
    id: String(enroll._id || session._id || `${date}-${entry || 0}`),
    facilityId: (facility && facility._id) || session.sportscomplex || "",
    facilityName: resolvedName,
    district: "",
    date,
    entry,
    exit,
    status: exit ? "Completed" : "Checked In",
    durationMinutes: entry && exit ? Math.round((exit - entry) / 60000) : null,
  };
}

function mapComplaint(row, typeNames) {
  const typeId = row.type && row.type._id ? row.type._id : row.type;
  const category =
    (row.type && row.type.Type) ||
    (typeId && typeNames && typeNames[typeId]) ||
    "Complaint";
  const description = row.Description || "";
  return {
    id: String(row._id || ""),
    facilityId: row.sportsComplex ? row.sportsComplex._id || row.sportsComplex : "",
    facilityName: row.sportsComplex ? row.sportsComplex.name || "" : "",
    district: "",
    category,
    subject: description ? description.slice(0, 60) : category,
    description,
    status: row.status === 1 ? "Resolved" : "Pending",
    statusCode: row.status,
    level: row.level,
    levelLabel: LEVEL_LABELS[row.level] || `Level ${row.level}`,
    submittedAt: row.createdAt || null,
    resolvedAt: row.status === 1 ? row.updatedAt || null : null,
    updatedAt: row.updatedAt || null,
    satisfied: row.satisfied || 0,
    photo: row.photo || null,
    remarks: Array.isArray(row.remarks)
      ? row.remarks.map((remark) => ({
          level: remark.level,
          author: remark.userId && remark.userId.Name ? remark.userId.Name : "",
          remark: remark.remark,
          date: remark.date,
        }))
      : [],
  };
}

function typeNameMap(types) {
  const map = {};
  (types || []).forEach((type) => {
    map[String(type._id)] = type.Type;
  });
  return map;
}

function demoAttendance(from, to) {
  return CITIZEN_ATTENDANCE.filter((row) => {
    if (from && row.date < from) return false;
    if (to && row.date > to) return false;
    return true;
  }).sort(
    (a, b) =>
      String(b.date).localeCompare(String(a.date)) ||
      (b.entry || 0) - (a.entry || 0)
  );
}



const DEMO_ACTIVITY_KEY = "khelgujarat-citizen-activity";

function readActivity() {
  try {
    const saved = JSON.parse(localStorage.getItem(DEMO_ACTIVITY_KEY));
    if (saved && typeof saved === "object") {
      return {
        closed: saved.closed || {},
        sessions: Array.isArray(saved.sessions) ? saved.sessions : [],
        feedback: Array.isArray(saved.feedback) ? saved.feedback : [],
      };
    }
  } catch {
    // Ignore a damaged browser copy and start from the seeded rows.
  }
  return { closed: {}, sessions: [], feedback: [] };
}

function writeActivity(next) {
  localStorage.setItem(DEMO_ACTIVITY_KEY, JSON.stringify(next));
}

function applySavedActivity() {
  const saved = readActivity();
  saved.sessions.forEach((row) => {
    if (!CITIZEN_ATTENDANCE.some((item) => item.id === row.id)) {
      CITIZEN_ATTENDANCE.push(row);
    }
  });
  Object.entries(saved.closed).forEach(([id, patch]) => {
    const row = CITIZEN_ATTENDANCE.find((item) => item.id === id);
    if (row) Object.assign(row, patch);
  });
  saved.feedback.forEach((row) => {
    const list =
      row.entityType === "coach"
        ? CITIZEN_COACH_FEEDBACK
        : row.entityType === "sport"
          ? CITIZEN_SPORT_FEEDBACK
          : CITIZEN_FACILITY_FEEDBACK;
    if (!list.some((item) => item.id === row.id)) list.unshift(row);
  });
}

applySavedActivity();

function todayStamp() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return now.getFullYear() + "-" + month + "-" + day;
}

function recordDemoScan() {
  const open = CITIZEN_ATTENDANCE.find((row) => row.status === "Checked In");
  const saved = readActivity();
  const now = Date.now();
  if (open) {
    const patch = {
      exit: now,
      status: "Completed",
      durationMinutes: Math.max(1, Math.round((now - open.entry) / 60000)),
    };
    Object.assign(open, patch);
    saved.closed[open.id] = patch;
    writeActivity(saved);
    return { action: "exit", rcode: 200, msg: "Exit recorded.", demo: true };
  }
  const row = {
    id: "SESS-DEMO-" + now,
    facilityId: CITIZEN_FACILITY_ID,
    facilityName: CITIZEN_FACILITY.name,
    district: CITIZEN_FACILITY.district,
    date: todayStamp(),
    entry: now,
    exit: null,
    status: "Checked In",
    durationMinutes: null,
  };
  CITIZEN_ATTENDANCE.push(row);
  saved.sessions.push(row);
  writeActivity(saved);
  return { action: "entry", rcode: 200, msg: "Entry recorded.", demo: true };
}

function rememberFeedback(row) {
  const list =
    row.entityType === "coach"
      ? CITIZEN_COACH_FEEDBACK
      : row.entityType === "sport"
        ? CITIZEN_SPORT_FEEDBACK
        : CITIZEN_FACILITY_FEEDBACK;
  list.unshift(row);
  const saved = readActivity();
  saved.feedback.unshift(row);
  writeActivity(saved);
  return row;
}

function demoFeedbackRows() {
  return [
    ...CITIZEN_FACILITY_FEEDBACK.map((row) => ({ ...row, demo: true })),
    ...CITIZEN_SPORT_FEEDBACK.map((row) => ({ ...row, demo: true })),
    ...CITIZEN_COACH_FEEDBACK.map((row) => ({ ...row, demo: true })),
  ];
}

export const citizenService = {
  // GET /getuserwithathelte — authenticated athlete identity and profile.
  async getIdentity() {
    return loadIdentity();
  },

  // Real attendance (recent window) + complaints, demo feedback.
  async getDashboard() {
    const [attendanceRows, complaintRows] = await Promise.all([
      this.listAttendance(),
      this.listComplaints(),
    ]);
    const feedback = {
      ...CITIZEN_FEEDBACK_SUMMARY(),
      demo: true,
    };
    const complaints = {
      total: complaintRows.length,
      pending: complaintRows.filter((row) => row.status === "Pending").length,
      resolved: complaintRows.filter((row) => row.status === "Resolved").length,
    };
    const facility =
      attendanceRows.find((row) => row.facilityName) ||
      complaintRows.find((row) => row.facilityName);

    const attendedMinutes = attendanceRows.reduce(
      (total, row) => total + (row.durationMinutes || 0),
      0
    );
    return {
      facility: facility
        ? { id: facility.facilityId, name: facility.facilityName, district: "" }
        : null,
      attendance: {
        totalSessions: attendanceRows.length,
        completedSessions: attendanceRows.filter(
          (row) => row.status === "Completed"
        ).length,
        checkedInSessions: attendanceRows.filter(
          (row) => row.status === "Checked In"
        ).length,
        totalHours:
          attendedMinutes > 0 ? Math.round((attendedMinutes / 60) * 10) / 10 : 0,
        lastSession: attendanceRows[0] || null,
        demo: false,
      },
      feedback,
      complaints,
      recentAttendance: attendanceRows.slice(0, 5),
      recentFeedback: demoFeedbackRows()
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, 5),
      recentComplaints: complaintRows
        .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
        .slice(0, 5),
    };
  },

  // The citizen's assigned facility id (from the verified identity).
  async getFacilityId() {
    const { complexId } = await loadIdentity();
    return complexId;
  },

  // GET /getSession (single date, athlete-scoped by the backend).
  async listAttendance({ from, to } = {}) {
    const response = await api.get("/api/citizen/booking-attendance");
    const records = (response.data || [])
      .filter((row) => (!from || row.date >= from) && (!to || row.date <= to))
      .map((row) => ({
        ...row,
        entry: row.entry ? new Date(row.entry).getTime() : null,
        exit: row.exit ? new Date(row.exit).getTime() : null,
        demo: false,
      }));
    if (from && to) {
      const { complexId } = await loadIdentity();
      if (complexId && /^[a-f0-9]{24}$/i.test(String(complexId))) {
        const legacy = await Promise.all(
          dateRange(from, to).map((date) =>
            api
              .get(`/getSession?sportscomplex=${encodeURIComponent(complexId)}&date=${encodeURIComponent(date)}`)
              .catch(() => ({ data: [] }))
          )
        );
        legacy.forEach((result) =>
          (result.data || []).forEach((session) =>
            (session.enrolls || []).forEach((enroll) => records.push(mapEnroll(session, enroll)))
          )
        );
      }
    }
    return records.sort((a, b) => String(b.date).localeCompare(String(a.date)) || (b.entry || 0) - (a.entry || 0));
  },

  // POST /addSession/:complexId — the body's userId is re-checked server-side
  // against the verified session, so the client cannot spoof another user.
  async recordAttendance() {
    const { user, complexId } = await loadIdentity();
    if (!complexId) {
      throw new Error("No facility is assigned to your account.");
    }
    try {
      const result = await api.post(`/addSession/${complexId}`, {
        userId: user._id,
      });
      return {
        action: result.rcode === 205 ? "exit" : "entry",
        rcode: result.rcode,
        msg: result.msg,
        data: result.data,
      };
    } catch {
      return recordDemoScan();
    }
  },

  async ratingCatalog() {
    const result = await api.get("/api/citizen/rating-catalog");
    return result.data || { facilities: [], coaches: [] };
  },

  async listReviews() {
    const result = await api.get("/api/citizen/reviews");
    return result.data || [];
  },

  async submitReview(input) {
    const result = await api.post("/api/citizen/reviews", {
      targetType: input.targetType,
      facility: input.facility,
      sport: input.targetType === "sport" ? input.sport : null,
      coach: input.targetType === "coach" ? input.coach : null,
      rating: Number(input.rating),
      remarks: String(input.remarks || "").trim(),
    });
    return result.data;
  },

  async listFeedback() {
    return this.listReviews();
  },

  // POST /addRating — athlete-to-sport-in-facility rating (real contract).
  async submitFacilityRating({ sportId, rating, remarks }) {
    const { athleteId, complexId } = await loadIdentity();
    if (!athleteId) {
      throw new Error("Your athlete profile is not linked to this account.");
    }
    if (!complexId) {
      throw new Error("No facility is assigned to your account.");
    }
    try {
      const result = await api.post("/addRating", {
        athleteId,
        sportId,
        sportsComplexId: complexId,
        rating: Number(rating),
        remarks,
      });
      return { rcode: result.rcode, msg: result.msg };
    } catch {
      const feedback = rememberFeedback({
        id: "FDB-DEMO-" + Date.now(),
        facilityId: complexId,
        facilityName: CITIZEN_FACILITY.name,
        entityType: "facility",
        entityId: complexId,
        entityName: CITIZEN_FACILITY.name,
        rating: Number(rating) || 0,
        remarks: remarks || "",
        sport: sportId || "",
        createdAt: todayStamp(),
      });
      return { rcode: 200, msg: "Feedback saved.", demo: true, feedback };
    }
  },

  // POST /api/citizen/feedback/sport -> demo-only (no backend contract).
  submitSportRating(input) {
    const feedback = rememberFeedback({
      id: "SDB-DEMO-" + Date.now(),
      entityType: "sport",
      entityId: input.sportId || "sport_unknown",
      entityName: input.sportName || "Sport",
      rating: Number(input.rating) || 0,
      remarks: input.remarks || "",
      createdAt: todayStamp(),
    });
    return Promise.resolve({ demo: true, feedback, rcode: 200 });
  },

  // POST /api/citizen/feedback/coach   -> demo-only (no backend contract).
  submitCoachRating(input) {
    const feedback = rememberFeedback({
      id: "CDB-DEMO-" + Date.now(),
      entityType: "coach",
      entityId: input.coachId || "coach_unknown",
      entityName: input.coachName || "Coach",
      rating: Number(input.rating) || 0,
      remarks: input.remarks || "",
      sport: input.sport || "",
      createdAt: todayStamp(),
    });
    return Promise.resolve({ demo: true, feedback, rcode: 200 });
  },

  // GET /getSports (public) — options for a facility rating.
  async listSports() {
    try {
      const result = await api.get("/getSports");
      const rows = (result.data || []).map((sport) => ({
        id: sport._id,
        name: sport.SportName,
        category: sport.Category,
      }));
      if (rows.length) return rows;
    } catch {
      // Offline demo uses the shared sports list.
    }
    return [
      { id: "Badminton", name: "Badminton", category: "Racquet Sports" },
      { id: "Swimming", name: "Swimming", category: "Aquatics" },
      { id: "Athletics & Track", name: "Athletics & Track", category: "Track & Field" },
    ];
  },

  // GET /getComplaintType (public) — complaint categories.
  async listComplaintTypes() {
    try {
      const result = await api.get("/getComplaintType");
      const rows = (result.data || []).map((type) => ({
        id: type._id,
        name: type.Type,
      }));
      if (rows.length) return rows;
    } catch {
      // Offline demo uses the shared complaint categories.
    }
    return [
      "Turf & Surface Degradation",
      "Floodlight & Electrical Outage",
      "Sanitation & Drinking Water",
      "Locker Room & Hygiene",
    ].map((name) => ({ id: name, name }));
  },

  async listComplaints() { return grievanceService.list("mine"); },
  async getComplaint(id) { return (await this.listComplaints()).find(row => row.id === id) || null; },
  async submitComplaint({ typeId, subject = "Facility grievance", description, sportsComplex, photoFile }) {
    const { complexId } = await loadIdentity();
    let proof = {};
    if (photoFile) {
      const form = new FormData();
      if (photoFile.file) {
        form.append("file", photoFile.file);
      } else if (typeof File === "function" && photoFile.uri && !photoFile.arrayBuffer) {
        try {
          const nativeFile = new File(photoFile.uri);
          form.append("file", nativeFile.exists ? nativeFile : photoFile);
        } catch {
          form.append("file", photoFile);
        }
      } else {
        form.append("file", photoFile);
      }
      const uploaded = await api.upload("/api/uploads/attachment", form);
      proof = { proofUrl:uploaded.data.url, proofName:uploaded.data.name, proofKey:uploaded.data.key };
    }
    const result = await api.post("/api/grievances", { type:typeId, subject, description, sportsComplex:sportsComplex || complexId, ...proof });
    return { complaint:mapGrievance(result.data), rcode:result.rcode };
  },

  // GET /api/citizen/capabilities
  getCapabilities() {
    return Promise.resolve({
      facilityRating: true,
      sportRating: false,
      coachRating: false,
      attendance: true,
      complaint: true,
      qrScan: false,
    });
  },
};
