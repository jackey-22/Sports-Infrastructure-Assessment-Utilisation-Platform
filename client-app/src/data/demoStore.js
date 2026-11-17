// Shared mutable demo store.
//
// Phase 2C built each role as a separate read-only view of static demo data.
// Phase 2D.2 needs the roles to share ONE set of records so a mutation made in
// one role is visible in another:
//   Admin allocates a grant        -> Manager sees it
//   Manager submits a proof        -> Admin reviews it -> Manager sees status
//   Coach submits a rating         -> athlete profile + rating history update
//   Grievance status change        -> dashboards recompute
//
// All data here is still fictional. Mutations are persisted locally for the
// browser demo only; nothing is sent to the backend. Services read and write
// through this module instead of importing the static demo arrays directly.
import {
  DEMO_FACILITIES,
  DEMO_GRANTS,
  DEMO_GRIEVANCES,
  DEMO_TODAY,
  DEMO_TRANSACTIONS,
  LEVEL_LABELS,
} from "./admin/adminDemoData";
import { MANAGER_ASSESSMENTS, MANAGER_FACILITY, MANAGER_FACILITY_ID } from "./manager/managerDemoData";
import { COACH_ATHLETES, COACH_FACILITY_ID, COACH_RATING_HISTORY } from "./coach/coachDemoData";

// Deep clone keeps the original demo constants immutable across tests and
// resets. JSON is enough for these plain data records.
const clone = (value) => JSON.parse(JSON.stringify(value));
export const DEMO_STORE_STORAGE_KEY = "khelgujarat-shared-demo-store";
export const DEMO_STORE_VERSION_KEY = "khelgujarat-shared-demo-store-version";
export const DEMO_STORE_VERSION = "2";
export const DEMO_STORE_RESET_EVENT = "khelgujarat:demo-store-reset";

function seed() {
  return {
    facilities: clone(DEMO_FACILITIES),
    grants: clone(DEMO_GRANTS),
    grievances: clone(DEMO_GRIEVANCES),
    transactions: clone(DEMO_TRANSACTIONS),
    assessments: clone(MANAGER_ASSESSMENTS),
    athletes: clone(COACH_ATHLETES),
    ratings: clone(COACH_RATING_HISTORY),
  };
}

function isValidState(value) {
  return (
    value &&
    Array.isArray(value.facilities) &&
    Array.isArray(value.grants) &&
    Array.isArray(value.grievances) &&
    Array.isArray(value.transactions) &&
    Array.isArray(value.assessments) &&
    Array.isArray(value.athletes) &&
    Array.isArray(value.ratings) &&
    value.grants.every(
      (grant) =>
        grant &&
        Array.isArray(grant.proofs) &&
        Array.isArray(grant.releases) &&
        Array.isArray(grant.history)
    )
  );
}

function getStorage() {
  if (typeof window === "undefined" || !window.localStorage) return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function loadState() {
  const storage = getStorage();
  if (!storage) return seed();

  try {
    if (storage.getItem(DEMO_STORE_VERSION_KEY) !== DEMO_STORE_VERSION) {
      return seed();
    }
    const saved = JSON.parse(storage.getItem(DEMO_STORE_STORAGE_KEY) || "null");
    return isValidState(saved) ? saved : seed();
  } catch (error) {
    console.warn("Unable to restore demo data; using seed data.", error);
    return seed();
  }
}

function persistState() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(DEMO_STORE_VERSION_KEY, DEMO_STORE_VERSION);
    storage.setItem(DEMO_STORE_STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn("Unable to persist demo data; continuing with in-memory data.", error);
  }
}

let store = loadState();

function notifyReset() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event(DEMO_STORE_RESET_EVENT));
  }
}

// Re-run seed() so tests start from a known state.
export function resetDemoStore() {
  store = seed();
  grantCounter = 9000;
  proofCounter = 9000;
  assessmentCounter = 9000;
  ratingCounter = 2000;
  persistState();
  notifyReset();
}

const highestNumber = (values, pattern, fallback) =>
  values.reduce((highest, value) => {
    const match = String(value).match(pattern);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, fallback);

let grantCounter = highestNumber(store.grants.map((grant) => grant.id), /GRANT-2026-(\d+)$/, 9000);
let proofCounter = highestNumber(
  store.grants.flatMap((grant) => grant.proofs || []).map((proof) => proof.id),
  /PROOF-MGR-(\d+)$/,
  9000
);
let assessmentCounter = highestNumber(
  store.assessments.map((assessment) => assessment.id),
  /ASMT-MGR-(\d+)$/,
  9000
);
let ratingCounter = highestNumber(
  store.ratings.map((rating) => rating.id),
  /RAT-DEMO-(\d+)$/,
  2000
);

// Recompute a grant's totals and status from its proofs. Mirrors the status
// vocabulary in adminDemoData.buildGrant.
function recomputeGrant(grant) {
  const verified = grant.proofs
    .filter((proof) => proof.status === "Verified")
    .reduce((total, proof) => total + proof.claimed, 0);
  const pending = grant.proofs
    .filter((proof) => proof.status === "Submitted")
    .reduce((total, proof) => total + proof.claimed, 0);

  grant.utilised = verified;
  grant.pendingVerification = pending;
  grant.remaining = grant.allocated - grant.released;

  let status = "Allocated";
  if (pending > 0) status = "Under Verification";
  else if (grant.released > 0 && verified >= grant.released) status = "Closed";
  else if (grant.released > 0 && grant.released < grant.allocated) status = "Partially Released";
  else if (grant.released > 0 || verified > 0) status = "Utilisation Pending";
  grant.status = status;
  return grant;
}

store.grants.forEach(recomputeGrant);
persistState();

// Flat proof list across a set of grants, enriched with grant context. This is
// the shape both the Admin verification queue and the Manager proof queue use.
function proofQueue(grants) {
  return grants.flatMap((grant) =>
    (grant.proofs || []).map((proof) => ({
      ...proof,
      grantId: grant.id,
      grantStatus: grant.status,
      facilityId: grant.facilityId,
      facilityName: grant.facilityName,
      district: grant.district,
      purpose: grant.purpose,
      allocated: grant.allocated,
      released: grant.released,
      utilised: grant.utilised,
      remaining: grant.remaining,
    }))
  );
}

export const demoStore = {
  // --- raw reads (callers apply their own filters) ---
  listFacilities() {
    return store.facilities;
  },
  listGrants() {
    return store.grants;
  },
  listGrievances() {
    return store.grievances;
  },
  listTransactions() {
    return store.transactions;
  },
  listAssessments() {
    return store.assessments;
  },
  listAthletes() {
    return store.athletes;
  },
  listRatings() {
    return store.ratings;
  },

  // --- facility-scoped reads ---
  grantsForFacility(facilityId) {
    return store.grants.filter((grant) => grant.facilityId === facilityId);
  },
  grievancesForFacility(facilityId) {
    return store.grievances.filter((row) => row.facilityId === facilityId);
  },
  transactionsForFacility(facilityId) {
    return store.transactions.filter((row) => row.facilityId === facilityId);
  },
  assessmentsForFacility(facilityId) {
    return store.assessments.filter((row) => row.facilityId === facilityId);
  },

  // --- grant reads ---
  getGrant(id) {
    return store.grants.find((grant) => grant.id === id) || null;
  },
  utilisationQueue(grants = store.grants) {
    return proofQueue(grants);
  },

  // --- grant mutations ---
  allocateGrant(input) {
    grantCounter += 1;
    const facility = store.facilities.find((row) => row.id === input.facilityId);
    const allocated = Number(input.amount) || 0;
    const grant = {
      id: `GRANT-2026-${grantCounter}`,
      facilityId: input.facilityId,
      facilityName: facility ? facility.name : "Unassigned facility",
      district: facility ? facility.district : "",
      purpose: input.purpose,
      allocated,
      released: 0,
      utilised: 0,
      pendingVerification: 0,
      remaining: allocated,
      status: "Allocated",
      applicationDate: input.date,
      coordination: {
        manager: "Facility manager",
        contact: "grant.cell@example.test",
      },
      releases: [],
      proofs: [],
      history: [
        {
          at: input.date,
          actor: "Admin",
          action: "Grant allocated",
          note: input.attachments && input.attachments.length
            ? `${input.attachments.length} supporting document(s) listed`
            : "No supporting document listed",
        },
      ],
    };
    store.grants.unshift(grant);
    persistState();
    return grant;
  },

  submitUtilisationProof(input) {
    proofCounter += 1;
    const grant = store.grants.find((row) => row.id === input.grantId);
    if (!grant) return null;
    const proof = {
      id: `PROOF-MGR-${proofCounter}`,
      submittedAt: input.expenditureDate || DEMO_TODAY,
      expenditureDate: input.expenditureDate || DEMO_TODAY,
      claimed: Number(input.claimedAmount) || 0,
      status: "Submitted",
      proofFile: (input.documentNames || []).join(", ") || "utilisation-proof.pdf",
      category: input.expenseCategory,
      description: input.expenditureDescription,
      remarks: input.remarks || "",
      documents: input.documentNames || [],
      reviewedBy: null,
      reviewedAt: null,
      note: "",
    };
    grant.proofs.push(proof);
    grant.history.push({
      at: proof.submittedAt,
      actor: grant.facilityName,
      action: "Utilisation proof submitted",
      note: `${proof.proofFile} · ${proof.claimed} claimed`,
    });
    recomputeGrant(grant);
    persistState();
    return proofQueue([grant]).find((row) => row.id === proof.id);
  },

  reviewUtilisationProof({ grantId, proofId, decision, note }) {
    const grant = store.grants.find((row) => row.id === grantId);
    if (!grant) return null;
    const proof = grant.proofs.find((row) => row.id === proofId);
    if (!proof) return null;
    proof.status = decision;
    proof.reviewedBy = "Admin";
    proof.reviewedAt = DEMO_TODAY;
    proof.note = note || "";
    grant.history.push({
      at: DEMO_TODAY,
      actor: "Admin",
      action: `Utilisation proof ${decision.toLowerCase()}`,
      note: note || "No note recorded.",
    });
    recomputeGrant(grant);
    persistState();
    return proof;
  },

  // --- grievance mutations ---
  addGrievance(input) {
    const level = input.level == null ? 0 : Number(input.level);
    const today = input.submittedAt || new Date().toISOString().slice(0, 10);
    const grievance = {
      id: input.id,
      subject: input.subject || input.description,
      description: input.description || "",
      category: input.category || "Complaint",
      status: "Pending",
      statusCode: 0,
      level,
      levelLabel: LEVEL_LABELS[level] || LEVEL_LABELS[0],
      citizen: input.citizen || "Citizen",
      facilityId: input.facilityId || MANAGER_FACILITY_ID,
      facilityName: input.facilityName || MANAGER_FACILITY.name,
      district: input.district || MANAGER_FACILITY.district,
      submittedAt: today,
      resolvedAt: null,
      updatedAt: today,
      satisfied: 0,
      attachments: [],
      remarks: [],
    };
    store.grievances.unshift(grievance);
    persistState();
    return grievance;
  },

  updateGrievanceStatus({ id, status, remark, actor, level }) {
    const grievance = store.grievances.find((row) => row.id === id);
    if (!grievance) return null;
    if (status) {
      grievance.status = status;
      grievance.statusCode = status === "Resolved" ? 1 : 0;
      grievance.resolvedAt = status === "Resolved" ? DEMO_TODAY : grievance.resolvedAt;
    }
    if (level != null) {
      grievance.level = Number(level);
      grievance.levelLabel = LEVEL_LABELS[grievance.level] || grievance.levelLabel;
    }
    grievance.updatedAt = DEMO_TODAY;
    grievance.remarks = [
      ...grievance.remarks,
      {
        level: grievance.level,
        author: actor || "Staff",
        remark: remark || "Status changed.",
        date: `${DEMO_TODAY}T10:00:00.000Z`,
      },
    ];
    persistState();
    return grievance;
  },

  // --- assessment mutations ---
  saveAssessment(input) {
    const score = input.totalScore != null ? Number(input.totalScore) : null;
    const assessment = {
      id: input.id || `ASMT-MGR-${(assessmentCounter += 1)}`,
      facilityId: input.facilityId || MANAGER_FACILITY_ID,
      facilityName: input.facilityName || "Facility",
      district: input.district || "",
      date: input.assessmentDate || DEMO_TODAY,
      score,
      grade: input.grade || null,
      status: input.status || "Draft",
      inspector: input.inspectorName || "Facility Manager",
      maintenanceUrgency: input.maintenanceUrgency || "Not yet classified",
      photos: input.photos || [],
      summary: input.summary || "",
      ai: input.ai || null,
      source: input.source || "demo",
    };
    const existing = store.assessments.find((row) => row.id === assessment.id);
    if (existing) Object.assign(existing, assessment);
    else store.assessments.unshift(assessment);
    persistState();
    return existing || assessment;
  },

  // --- coach rating mutations ---
  submitRating(input) {
    ratingCounter += 1;
    const athlete = store.athletes.find((row) => row.id === input.athleteId);
    const rating = {
      id: `RAT-DEMO-${ratingCounter}`,
      athleteId: input.athleteId,
      athleteName: athlete ? athlete.name : "Unknown athlete",
      sport: input.sport || (athlete ? athlete.sport : ""),
      facilityId: COACH_FACILITY_ID,
      facilityName: athlete ? athlete.facilityName : "",
      coachId: input.coachId || "COACH-2026-0001",
      coachName: input.coachName || "Coach",
      rating: Number(input.rating) || 0,
      remarks: input.remarks || "",
      parameters: (input.parameters || []).map((param) => ({
        parameter: param.parameter,
        value: Number(param.value) || 0,
      })),
      createdAt: DEMO_TODAY,
      updatedAt: DEMO_TODAY,
    };
    store.ratings.unshift(rating);
    if (athlete) {
      athlete.rating = rating.rating;
      athlete.ratingStatus = "Rated";
      athlete.ratedAt = DEMO_TODAY;
      athlete.remarks = rating.remarks;
      athlete.params = rating.parameters;
    }
    persistState();
    return rating;
  },
};
