import { api } from "../api/client";
export const performanceService = {
  async coachRoster() {
    const result = await api.get("/api/coach/rateable-athletes");
    return result.data || {
      athletes: [],
      summary: {}
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
  }
};
