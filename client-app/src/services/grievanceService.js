import { api } from "../api/client";
export const mapGrievance = row => ({
  ...row,
  id: row._id,
  subject: row.subject,
  description: row.Description,
  facilityId: row.sportsComplex?._id || row.sportsComplex,
  facilityName: row.sportsComplex?.name || "",
  citizenName: row.userId?.Name || "",
  submittedAt: row.createdAt,
  status: row.status === 1 ? "Resolved" : "Pending",
  workflowStatus: row.workflowStatus
});
export const grievanceService = {
  async list(view = "mine") {
    const result = await api.get(`/api/grievances?view=${view}`);
    return (result.data || []).map(mapGrievance);
  },
  async update({
    id,
    status,
    remark,
    revision
  }) {
    const result = await api.post(`/api/grievances/${id}/${status === "Escalated" ? "escalate" : "respond"}`, {
      response: remark,
      reason: remark,
      resolve: status === "Resolved",
      revision
    });
    return mapGrievance(result.data);
  }
};
