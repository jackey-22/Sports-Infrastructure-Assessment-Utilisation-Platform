// Admin feature service layer. Phase 2D.2 reads and writes the shared
// in-memory demo store (src/data/demoStore.js) instead of the static demo
// arrays, so a mutation made here is visible to the Manager and Coach screens
// and to the Admin dashboards. All demo data is still fictional and persists
// in this browser only. The one real API call is listLiveComplaints(),
// which reads actual citizen complaints through the shared API client.
import {
  DEMO_MONTH_KEYS,
  DEMO_MONTH_LABELS,
  DEMO_SPORTS,
  DEMO_TODAY,
} from "../../data/admin/adminDemoData";
import { demoStore } from "../../data/demoStore";
import { api } from "../../API/client";
import {
  countBy,
  filterFacilities,
  filterGrants,
  filterGrievances,
  filterTransactions,
  summariseGrants,
  summariseTransactions,
  sumBy,
  utilisationQueue,
} from "../../utils/admin/adminUtils";

const DEMO_LATENCY_MS = 220;
const wait = (value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), DEMO_LATENCY_MS));

function monthKey(value) {
  return value ? String(value).slice(0, 7) : "";
}

function monthIndexInRange(value) {
  return DEMO_MONTH_KEYS.indexOf(monthKey(value));
}

function average(values) {
  if (!values.length) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function buildDashboard(filters = {}) {
  const facilities = filterFacilities(demoStore.listFacilities(), filters);
  const facilityIds = new Set(facilities.map((facility) => facility.id));

  // `status` is the grievance-status filter. Transactions and grants have their own
  // status vocabularies, so they must not reuse it.
  const sharedFilters = { ...filters };
  delete sharedFilters.status;

  const grievances = filterGrievances(demoStore.listGrievances(), filters).filter(
    (row) => facilityIds.has(row.facilityId)
  );
  const transactions = filterTransactions(
    demoStore.listTransactions(),
    sharedFilters
  ).filter((row) => facilityIds.has(row.facilityId));
  const grants = filterGrants(demoStore.listGrants(), sharedFilters).filter((row) =>
    facilityIds.has(row.facilityId)
  );

  const grantTotals = summariseGrants(grants);
  const transactionTotals = summariseTransactions(transactions);

  const weightedUtilisation = facilities.length
    ? Math.round(
        facilities.reduce(
          (total, facility) => total + facility.utilisation * facility.capacity,
          0
        ) /
          facilities.reduce((total, facility) => total + facility.capacity, 0)
      )
    : 0;

  const utilisationTrend = DEMO_MONTH_LABELS.map((_, month) =>
    average(facilities.map((facility) => facility.utilisationTrend[month]))
  );
  const registrationTrend = DEMO_MONTH_KEYS.map((_, month) =>
    sumBy(facilities, (facility) => facility.registrationTrend[month])
  );

  const districtCounts = countBy(facilities, (facility) => facility.district);
  const sportCounts = countBy(
    facilities.flatMap((facility) =>
      facility.sports.map((sport) => ({ sport }))
    ),
    (item) => item.sport
  );

  const sportDistribution = DEMO_SPORTS.map((sport) => ({
    sport,
    count: sportCounts[sport] || 0,
  }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const grievanceStatus = {
    Pending: grievances.filter((row) => row.status === "Pending").length,
    Resolved: grievances.filter((row) => row.status === "Resolved").length,
  };

  const createdTrend = DEMO_MONTH_KEYS.map(
    (_, month) =>
      grievances.filter((row) => monthIndexInRange(row.submittedAt) === month)
        .length
  );
  const resolvedTrend = DEMO_MONTH_KEYS.map(
    (_, month) =>
      grievances.filter(
        (row) => row.resolvedAt && monthIndexInRange(row.resolvedAt) === month
      ).length
  );

  const grantAllocatedTrend = DEMO_MONTH_KEYS.map((_, month) =>
    sumBy(
      grants.filter((grant) => monthIndexInRange(grant.applicationDate) === month),
      (grant) => grant.allocated
    )
  );
  const grantReleasedTrend = DEMO_MONTH_KEYS.map((_, month) =>
    sumBy(
      grants.flatMap((grant) =>
        grant.releases.filter(
          (release) => monthIndexInRange(release.date) === month
        )
      ),
      (release) => release.amount
    )
  );
  const grantUtilisedTrend = DEMO_MONTH_KEYS.map((_, month) =>
    sumBy(
      grants.flatMap((grant) =>
        grant.proofs.filter(
          (proof) =>
            proof.status === "Verified" &&
            monthIndexInRange(proof.submittedAt) === month
        )
      ),
      (proof) => proof.claimed
    )
  );

  const transactionStatus = ["Success", "Pending", "Failed", "Refunded"];

  return {
    demo: true,
    filters,
    facilities,
    kpis: {
      facilities: facilities.length,
      athletes: sumBy(facilities, (facility) => facility.athletes),
      coaches: sumBy(facilities, (facility) => facility.coaches),
      grievances: grievances.length,
      pendingGrievances: grievanceStatus.Pending,
      grantsAllocated: grantTotals.allocated,
      grantUtilisationPct: grantTotals.allocated
        ? Math.round((grantTotals.utilised / grantTotals.allocated) * 100)
        : 0,
      transactions: transactionTotals.count,
      transactionVolume: transactionTotals.volume,
      facilityUtilisationPct: weightedUtilisation,
    },
    charts: {
      utilisationTrend,
      registrationTrend,
      districtDistribution: Object.entries(districtCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([district, count]) => ({ district, count })),
      sportDistribution,
      grievanceStatus,
      createdTrend,
      resolvedTrend,
      grantAllocatedTrend,
      grantReleasedTrend,
      grantUtilisedTrend,
      transactionStatus,
      transactionCounts: transactionStatus.map(
        (status) => transactionTotals.byStatus[status] || 0
      ),
      transactionAmounts: transactionStatus.map((status) =>
        sumBy(
          transactions.filter((row) => row.status === status),
          (row) => row.amount
        )
      ),
    },
    recentGrievances: [...grievances]
      .sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt)))
      .slice(0, 5),
    attentionGrants: [...grants]
      .filter((grant) =>
        ["Under Verification", "Utilisation Pending", "Partially Released"].includes(
          grant.status
        )
      )
      .sort((a, b) => b.pendingVerification - a.pendingVerification)
      .slice(0, 4),
    recentTransactions: [...transactions]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 5),
    generatedAt: DEMO_TODAY,
  };
}

export const adminService = {
  // GET /api/admin/dashboard
  getDashboard(filters = {}) {
    return wait(buildDashboard(filters));
  },

  // GET /api/admin/grievances
  listGrievances(filters = {}) {
    return wait(filterGrievances(demoStore.listGrievances(), filters));
  },

  // GET /api/admin/grievances/:id
  getGrievance(id) {
    return wait(demoStore.listGrievances().find((row) => row.id === id) || null);
  },

  // PATCH /api/admin/grievances/:id — demo-only until the policy in Phase 2B.1
  // section 10 is resolved. Persists to the shared demo store so the Manager
  // grievance view sees the same status; never a backend success.
  updateGrievanceStatus({ id, status, remark }) {
    const grievance = demoStore.updateGrievanceStatus({
      id,
      status,
      remark,
      actor: "Admin",
    });
    return wait({ demo: true, id, status, remark, grievance });
  },

  // GET /api/admin/transactions
  listTransactions(filters = {}) {
    return wait(filterTransactions(demoStore.listTransactions(), filters));
  },

  // GET /api/admin/transactions/:id
  getTransaction(id) {
    return wait(demoStore.listTransactions().find((row) => row.id === id) || null);
  },

  // GET /api/admin/grants
  listGrants(filters = {}) {
    return wait(filterGrants(demoStore.listGrants(), filters));
  },

  // GET /api/admin/grants/:id
  getGrant(id) {
    return wait(demoStore.getGrant(id));
  },

  // GET /api/admin/grants/utilisation-proofs
  listUtilisationProofs(filters = {}) {
    const grants = filterGrants(demoStore.listGrants(), filters);
    return wait(utilisationQueue(grants));
  },

  // POST /api/admin/grants — provisional contract; demo-only in this phase.
  // Persists to the shared demo store so the Manager sees the new grant.
  createGrantDraft(input) {
    const grant = demoStore.allocateGrant(input);
    return wait({ demo: true, grant });
  },

  // PATCH /api/admin/grants/:id/utilisation/:proofId — demo-only. Persists the
  // decision and recomputes the grant totals so Admin and Manager agree.
  reviewUtilisationProof({ grantId, proofId, decision, note }) {
    const proof = demoStore.reviewUtilisationProof({
      grantId,
      proofId,
      decision,
      note,
    });
    return wait({ demo: true, grantId, proofId, decision, note, proof });
  },

  // GET /getAllComplaintsAdmin — the ONE real backend call in this module.
  // Citizen complaints are created against the live backend (Phase 2D.1), so
  // the Admin grievance view reads them here rather than mixing them into the
  // fictional grievance table. No fake fallback: a failure is surfaced.
  async listLiveComplaints() {
    const response = await api.get("/getAllComplaintsAdmin");
    const rows = Array.isArray(response?.data) ? response.data : [];
    return rows.map((row) => ({
      id: row._id,
      citizenName: (row.userId && row.userId.Name) || "Citizen",
      category: (row.type && row.type.Type) || "Uncategorised",
      description: row.Description || "",
      status: row.status === 1 ? "Resolved" : "Pending",
      level: row.level,
      facilityName: (row.sportsComplex && row.sportsComplex.name) || "—",
      district:
        (row.sportsComplex &&
          row.sportsComplex.district &&
          row.sportsComplex.district.District) ||
        "",
      submittedAt: row.createdAt || row.created_at || null,
    }));
  },
};
