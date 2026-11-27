import { api } from "../api/client";

export const performanceService = {
  async coachRoster() {
    const result = await api.get("/api/coach/rateable-athletes");
    return result.data || { athletes: [], summary: {} };
  },
  async coachOverview() {
    const [dashboardRes, reportRes, rosterRes] = await Promise.all([
      api.get("/api/dashboard/coach"),
      api.get("/api/booking-payments/report"),
      api.get("/api/coach/rateable-athletes"),
    ]);
    return {
      dashboard: dashboardRes.data || null,
      report: reportRes.data || { summary: {}, rows: [] },
      roster: rosterRes.data || { athletes: [], summary: {} },
    };
  },
  async template(sportId) {
    const result = await api.get(`/api/evaluation-templates/${encodeURIComponent(sportId)}`);
    return result.data;
  },
  async evaluate(payload) {
    const result = await api.post("/api/coach/evaluations", payload);
    return result.data;
  },
  async ownEvaluations() {
    const result = await api.get("/api/athlete/evaluations");
    return result.data || [];
  },
  async sports() {
    const result = await api.get("/getSports");
    return result.data || [];
  },
  async achievements() {
    const result = await api.get("/api/athlete/achievements");
    return result.data || [];
  },
  async submitAchievement(payload) {
    const result = await api.post("/api/athlete/achievements", payload);
    return result.data;
  },
  async staffAchievements(athleteId = "") {
    const query = athleteId ? `?athleteId=${encodeURIComponent(athleteId)}` : "";
    const result = await api.get(`/api/achievements${query}`);
    return result.data || [];
  },
  async createStaffAchievement(payload) {
    const result = await api.post("/api/achievements", payload);
    return result.data;
  },
  async verifyAchievement(id, payload) {
    const result = await api.patch(`/api/achievements/${encodeURIComponent(id)}/verification`, payload);
    return result.data;
  },
  async scopedAthletes() {
    const result = await api.get("/getAthletes");
    return result.data || [];
  },
  async ownGoals() {
    const result = await api.get("/api/athlete/goals");
    return result.data || { goals: [], badges: [], badgeCatalog: [], xpPoints: 0, rank: null };
  },
  async createGoal(payload) {
    const result = await api.post("/api/athlete/goals", payload);
    return result.data;
  },
  async completeGoal(goalId) {
    const result = await api.patch(`/api/athlete/goals/${encodeURIComponent(goalId)}`, { achieved: "1" });
    return result.data;
  },
  async deleteGoal(goalId) {
    const result = await api.del(`/api/athlete/goals/${encodeURIComponent(goalId)}`);
    return result.data;
  },
  async coachGoals() {
    const result = await api.get("/api/coach/goals");
    return result.data || { athletes: [], goals: [], summary: { total: 0, active: 0, completed: 0, overdue: 0 } };
  },
  async coachAssignGoal(athleteId, payload) {
    const result = await api.post(`/api/coach/athletes/${encodeURIComponent(athleteId)}/goals`, payload);
    return result.data;
  },
};
