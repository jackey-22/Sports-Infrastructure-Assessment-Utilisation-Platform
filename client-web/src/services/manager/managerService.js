// Manager feature service layer. Phase 2D.2 reads and writes the shared
// in-memory demo store (src/data/demoStore.js) scoped to the manager's facility,
// so Admin allocations, proofs and grievance changes appear here and vice versa.
// All demo data is fictional and persists in this browser only.
import {
  MANAGER_FACILITY,
  MANAGER_FACILITY_ID,
  MANAGER_GRANT_ACTIONS,
  summariseManagerGrievances,
  summariseManagerGrants,
  summariseManagerTransactions,
} from "../../data/manager/managerDemoData";
import { demoStore } from "../../data/demoStore";
import { adminService } from "../../services/admin/adminService";
import { api } from "../../API/client";

const DEMO_LATENCY_MS = 220;
const wait = (value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), DEMO_LATENCY_MS));

function managerDashboard() {
  const grievances = demoStore.grievancesForFacility(MANAGER_FACILITY_ID);
  const transactions = demoStore.transactionsForFacility(MANAGER_FACILITY_ID);
  const grants = demoStore.grantsForFacility(MANAGER_FACILITY_ID);
  const assessments = demoStore.assessmentsForFacility(MANAGER_FACILITY_ID);

  const grievanceSummary = summariseManagerGrievances(grievances);
  const transactionSummary = summariseManagerTransactions(transactions);
  const grantSummary = summariseManagerGrants(grants);
  const pendingProofs = demoStore
    .utilisationQueue(grants)
    .filter((proof) => proof.status === "Submitted").length;
  const latestAssessment =
    assessments.find((row) => row.status !== "Draft") ||
    assessments[assessments.length - 1];

  return {
    facility: MANAGER_FACILITY,
    grievances: grievanceSummary,
    transactions: transactionSummary,
    grants: grantSummary,
    pendingProofs,
    latestAssessment,
  };
}

export const managerService = {
  // GET /api/manager/dashboard
  getDashboard() {
    return wait(managerDashboard());
  },

  // GET /api/manager/grievances
  listGrievances() {
    return wait(demoStore.grievancesForFacility(MANAGER_FACILITY_ID));
  },

  // GET /api/manager/grievances/:id
  getGrievance(id) {
    return wait(
      demoStore.grievancesForFacility(MANAGER_FACILITY_ID).find((row) => row.id === id) ||
        null
    );
  },

  // PATCH /api/manager/grievances/:id — demo-only; persists to the shared store
  // so the Admin grievance view sees the same status.
  updateGrievanceStatus({ id, status, remark }) {
    const grievance = demoStore.updateGrievanceStatus({
      id,
      status,
      remark,
      actor: "Facility Manager",
    });
    return wait({ demo: true, id, status, remark, grievance });
  },

  // GET /api/manager/transactions
  listTransactions() {
    return wait(demoStore.transactionsForFacility(MANAGER_FACILITY_ID));
  },

  // GET /api/manager/transactions/:id
  getTransaction(id) {
    return wait(
      demoStore.transactionsForFacility(MANAGER_FACILITY_ID).find((row) => row.id === id) ||
        null
    );
  },

  // GET /api/manager/grants
  listGrants() {
    return wait(demoStore.grantsForFacility(MANAGER_FACILITY_ID));
  },

  // GET /api/manager/grants/:id
  getGrant(id) {
    return wait(demoStore.getGrant(id));
  },

  // GET /api/manager/grants/utilisation-proofs
  listUtilisationProofs() {
    return wait(demoStore.utilisationQueue(demoStore.grantsForFacility(MANAGER_FACILITY_ID)));
  },

  // POST /api/manager/grants/:id/utilisation-proofs — demo-only submission that
  // persists to the shared store so the Admin verification queue sees it.
  submitUtilisationProof(input) {
    const proof = demoStore.submitUtilisationProof(input);
    return wait({ demo: true, proof });
  },

  // GET /api/manager/facility — the complex assigned to the signed-in manager.
  async getAssignedFacility() {
    const data = await api.get("/api/manager/facility");
    return data.facility;
  },

  // POST /api/manager/assessments/analyse — real vision call. No demo fallback.
  analyseFacilityPhotos(fileList, managerNotes) {
    const body = new FormData();
    Array.from(fileList || []).forEach((file) => {
      body.append("photos", file, file.name);
    });
    if (managerNotes) body.append("managerNotes", managerNotes);
    return api.upload("/api/manager/assessments/analyse", body);
  },

  // GET /api/manager/assessments. Database rows win; demo rows fill the gaps.
  async listAssessments() {
    const local = demoStore.assessmentsForFacility(MANAGER_FACILITY_ID);
    try {
      const data = await api.get("/api/manager/assessments");
      const remote = data.assessments || [];
      const ids = new Set(remote.map((row) => row.id));
      const extras = local.filter((row) => !ids.has(row.id) && row.source !== "database");
      return [...remote, ...extras];
    } catch (error) {
      return local;
    }
  },

  // GET /api/manager/assessments/:id
  async getAssessment(id) {
    const local = () =>
      demoStore.assessmentsForFacility(MANAGER_FACILITY_ID).find((row) => row.id === id) ||
      null;
    if (/^[a-f\d]{24}$/i.test(String(id || ""))) {
      try {
        const data = await api.get(`/api/manager/assessments/${id}`);
        return data.assessment || null;
      } catch (error) {
        return local() || Promise.reject(error);
      }
    }
    return local();
  },

  // POST /api/manager/assessments. Saves the questionnaire on the server.
  // A browser copy keeps the manager dashboard in step after refresh.
  async saveAssessment(input) {
    try {
      const data = await api.post("/api/manager/assessments", input);
      const assessment = data.assessment;
      demoStore.saveAssessment({
        id: assessment.id,
        facilityId: MANAGER_FACILITY_ID,
        facilityName: assessment.facilityName,
        district: assessment.district,
        assessmentDate: assessment.date,
        totalScore: assessment.score,
        grade: assessment.grade,
        status: assessment.status,
        inspectorName: assessment.inspector,
        maintenanceUrgency: assessment.maintenanceUrgency,
        photos: assessment.photos,
        summary: assessment.summary,
        ai: assessment.ai,
        source: "database",
      });
      return { demo: false, assessment };
    } catch {
      const score = Object.values(input.scores || {}).reduce(
        (total, value) => total + (Number(value) || 0),
        0
      );
      const grade =
        score >= 85
          ? "Grade A (Excellent)"
          : score >= 70
            ? "Grade B (Good)"
            : "Grade C (Fair)";
      const assessment = demoStore.saveAssessment({
        facilityId: MANAGER_FACILITY_ID,
        facilityName: MANAGER_FACILITY.name,
        district: MANAGER_FACILITY.district,
        assessmentDate: input.assessmentDate,
        totalScore: score,
        grade,
        status: "Submitted",
        inspectorName: input.inspectorName,
        maintenanceUrgency: input.maintenanceUrgency,
        photos: input.photoNames || [],
        summary: input.managerObservations,
        source: "demo",
      });
      return { demo: true, assessment };
    }
  },

  // Expose role-bound capabilities for the UI.
  getCapabilities() {
    return wait({
      grievance: MANAGER_GRANT_ACTIONS,
      grant: MANAGER_GRANT_ACTIONS,
      facility: MANAGER_FACILITY,
    });
  },

  // Delegate Admin-wide dashboard aggregation (read-only) when the Manager needs
  // facility-filtered insight already computed by the Admin service.
  getAdminDashboard(filters = {}) {
    return adminService.getDashboard(filters);
  },
};
