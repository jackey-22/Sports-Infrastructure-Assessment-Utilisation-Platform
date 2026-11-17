// Manager-scoped demo dataset for Phase 2C.2.
//
// The Manager is assigned a single sports complex (SAG Khokhra Sports Complex,
// fac_khokhra_01) and only sees records belonging to that facility. Records are
// derived from the centralized Phase 2C.1 demo dataset so Admin and Manager
// charts/tables always agree on the same underlying data.
//
// Every record here is fictional and exists only to exercise the UI.
import {
  DEMO_FACILITIES,
  DEMO_GRIEVANCES,
  DEMO_GRANTS,
  DEMO_TODAY,
  DEMO_TRANSACTIONS,
  GRANT_STATUSES,
} from "../../data/admin/adminDemoData";

export const MANAGER_MODE = true;
export const MANAGER_TODAY = DEMO_TODAY;

// The Manager's assigned facility. Mirrors the existing ManagerDashboard which
// uses GUJARAT_FACILITIES[0] (SAG Khokhra Sports Complex).
export const MANAGER_FACILITY = DEMO_FACILITIES[0];
export const MANAGER_FACILITY_ID = MANAGER_FACILITY.id;

export const MANAGER_GRIEVANCES = DEMO_GRIEVANCES.filter(
  (row) => row.facilityId === MANAGER_FACILITY_ID
);

export const MANAGER_TRANSACTIONS = DEMO_TRANSACTIONS.filter(
  (row) => row.facilityId === MANAGER_FACILITY_ID
);

export const MANAGER_GRANTS = DEMO_GRANTS.filter(
  (row) => row.facilityId === MANAGER_FACILITY_ID
);

// Deterministic condition-assessment history for the manager's facility.
// assessmentScore is on a 0-100 scale.
export const MANAGER_ASSESSMENTS = [
  {
    id: "ASMT-2026-0001",
    facilityId: MANAGER_FACILITY_ID,
    facilityName: MANAGER_FACILITY.name,
    district: MANAGER_FACILITY.district,
    date: "2026-06-15",
    score: 82,
    grade: "Grade A (Excellent)",
    status: "Verified",
    inspector: "DSO Ahmedabad (SAG Quality Cell)",
    maintenanceUrgency: "Normal / Routine",
    photos: ["condition-khokhra-01.jpg"],
    summary:
      "Overall sound condition. Minor turf wear near the north goalpost noted; resurfacing scheduled before the next district tournament.",
  },
  {
    id: "ASMT-2026-0002",
    facilityId: MANAGER_FACILITY_ID,
    facilityName: MANAGER_FACILITY.name,
    district: MANAGER_FACILITY.district,
    date: "2026-09-10",
    score: 78,
    grade: "Grade B (Good)",
    status: "Verified",
    inspector: "DSO Ahmedabad (SAG Quality Cell)",
    maintenanceUrgency: "Minor Attention Required",
    photos: ["condition-khokhra-02.jpg", "condition-khokhra-03.jpg"],
    summary:
      "Floodlight bank in court 2 requires replacement. Sanitation consumables refill scheduled. Accessibility path repair proposed.",
  },
  {
    id: "ASMT-2026-0003",
    facilityId: MANAGER_FACILITY_ID,
    facilityName: MANAGER_FACILITY.name,
    district: MANAGER_FACILITY.district,
    date: MANAGER_TODAY,
    score: null,
    grade: null,
    status: "Draft",
    inspector: "Facility Manager (pending)",
    maintenanceUrgency: "Not yet classified",
    photos: [],
    summary: "Assessment in draft. Photo evidence and component scoring pending submission.",
  },
];

export const MANAGER_LATEST_ASSESSMENT =
  MANAGER_ASSESSMENTS.find((row) => row.status !== "Draft") ||
  MANAGER_ASSESSMENTS[MANAGER_ASSESSMENTS.length - 1];

// Manager-specific grant actions are demo-only: a Manager can submit utilization
// proofs but cannot allocate grants or approve/reject proofs (Admin powers).
export const MANAGER_GRANT_ACTIONS = {
  canAllocate: false,
  canApproveProof: false,
  canSubmitProof: true,
};

export const MANAGER_COMPLAINT_ACTIONS = {
  canResolve: true,   // existing Manager permission on in-scope complaints
  canForward: true,   // existing Manager forward-to-authority permission
  canEscalate: false, // pending Phase 2B.1 policy decision
  canReassign: false, // pending Phase 2B.1 policy decision
};

// Pending verification proofs across the manager's grants, for the proof queue.
export function managerProofQueue(grants = MANAGER_GRANTS) {
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

export function managerDashboardSummary() {
  const grievanceSummary = summariseManagerGrievances(MANAGER_GRIEVANCES);
  const transactionSummary = summariseManagerTransactions(MANAGER_TRANSACTIONS);
  const grantSummary = summariseManagerGrants(MANAGER_GRANTS);
  const pendingProofs = managerProofQueue().filter(
    (proof) => proof.status === "Submitted"
  ).length;

  return {
    facility: MANAGER_FACILITY,
    grievances: grievanceSummary,
    transactions: transactionSummary,
    grants: grantSummary,
    pendingProofs,
    latestAssessment: MANAGER_LATEST_ASSESSMENT,
    facilityUtilisation: MANAGER_FACILITY.utilisation.utilizationRate,
    facilityCapacity: MANAGER_FACILITY.utilisation.capacityDaily,
    facilityFootfall: MANAGER_FACILITY.utilisation.currentDailyFootfall,
  };
}

// Keep a named export for convenience.
const summariseManagerGrievances = (rows) =>
  rows.reduce(
    (totals, row) => {
      totals.total += 1;
      if (row.status === "Pending") totals.pending += 1;
      if (row.status === "Resolved") totals.resolved += 1;
      return totals;
    },
    { total: 0, pending: 0, resolved: 0 }
  );

const summariseManagerTransactions = (rows) => {
  const byStatus = { Success: 0, Pending: 0, Failed: 0, Refunded: 0 };
  let volume = 0;
  rows.forEach((row) => {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    if (row.status === "Success") volume += row.amount;
  });
  return { count: rows.length, volume, byStatus };
};

const summariseManagerGrants = (grants) =>
  grants.reduce(
    (totals, grant) => {
      totals.count += 1;
      totals.allocated += grant.allocated;
      totals.released += grant.released;
      totals.utilised += grant.utilised;
      totals.pendingVerification += grant.pendingVerification;
      totals.remaining += grant.remaining;
      return totals;
    },
    { count: 0, allocated: 0, released: 0, utilised: 0, pendingVerification: 0, remaining: 0 }
  );

export { summariseManagerGrievances, summariseManagerTransactions, summariseManagerGrants };
