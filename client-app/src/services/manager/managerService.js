import { File } from "expo-file-system";
import { grievanceService } from "../grievanceService";
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
import { api } from "../../api/client";

const DEMO_LATENCY_MS = 220;
const wait = (value) =>
  new Promise((resolve) => setTimeout(() => resolve(value), DEMO_LATENCY_MS));

function managerDashboard(grievances) {
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
  async getDashboard() {
    return managerDashboard(await grievanceService.list("assigned"));
  },

  async listGrievances() { return grievanceService.list("assigned"); },
  async getGrievance(id) { return (await this.listGrievances()).find(row => row.id === id) || null; },
  updateGrievanceStatus(input) { return grievanceService.update(input); },

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

  async analyseSportPhotos(sportId, photos) {
    const body = new FormData();
    body.append("sportId", sportId);
    body.append("photoMetadata", JSON.stringify(photos.map(({ geo }) => geo)));
    for (const { file, uri } of photos) {
      const photo = file || new File(uri);
      if (!file && !photo.exists) {
        throw new Error("A selected photo is unavailable. Remove it and choose it again.");
      }
      body.append("photos", photo);
    }
    const { assessment } = await api.upload("/api/manager/assessments/analyse", body);
    return assessment;
  },

  async listPendingAssessments() {
    const { assessments } = await api.get("/api/manager/assessments?status=Analysed");
    return assessments || [];
  },

  async listAssessments(before) {
    const query = before ? `?before=${encodeURIComponent(before)}` : "";
    const { assessments, nextCursor } = await api.get(`/api/manager/assessments${query}`);
    return { assessments: assessments || [], nextCursor: nextCursor || null };
  },

  async saveAssessment(analysisId) {
    const { assessment } = await api.post("/api/manager/assessments", { analysisId });
    return assessment;
  },

  discardAssessment(analysisId) {
    return api.del(`/api/manager/assessments/${encodeURIComponent(analysisId)}`);
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
