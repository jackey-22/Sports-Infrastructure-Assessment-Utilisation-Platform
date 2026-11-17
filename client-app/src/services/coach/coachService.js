import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../api/client";
import { COACH_ROSTER } from "../../data/coach/coachRoster";
import { demoStore } from "../../data/demoStore";
import { COACH, COACH_FACILITY } from "../../data/coach/coachDemoData";

async function isDemoSession() {
  const token = await AsyncStorage.getItem("token");
  return Boolean(token && token.startsWith("demo_"));
}

function mapAthlete(row) {
  const user = row.userId && typeof row.userId === "object" ? row.userId : {};
  const sport = row.sport || row.sports?.[0]?.sport?.SportName || "Assigned sport";
  return {
    id: String(row._id || row.id),
    name: user.Name || row.name || "Athlete",
    email: user.Email || "",
    sport,
    ageGroup: row.ageGroup || row.category || "Athlete",
    overall: Number(row.rating || row.overall || 0),
    lastRated: row.updatedAt || row.ratedAt || null,
    sessions: Number(row.sessions || 0),
    ratingId: row.ratingId || row._id,
    ratingStatus: row.ratingStatus || "Pending",
    raw: row,
  };
}

function demoAthletes() {
  return COACH_ROSTER.map((athlete) => ({ ...athlete, demo: true }));
}

export const coachService = {
  async listAthletes() {
    if (await isDemoSession()) return demoAthletes();
    const result = await api.get("/getAthletes");
    return (result.data || []).map(mapAthlete);
  },

  async getAthlete(id) {
    const athletes = await this.listAthletes();
    return athletes.find((athlete) => athlete.id === String(id)) || null;
  },

  async getDashboard() {
    if (await isDemoSession()) {
      const athletes = demoStore.listAthletes();
      const ratings = demoStore.listRatings();
      return {
        coach: COACH,
        facility: COACH_FACILITY,
        totalAthletes: athletes.length,
        activeAthletes: athletes.filter((row) => row.status === "Active").length,
        pendingRatings: athletes.filter((row) => row.ratingStatus === "Pending").length,
        ratedAthletes: athletes.filter((row) => row.ratingStatus === "Rated").length,
        averageRating: ratings.length
          ? Math.round((ratings.reduce((sum, row) => sum + row.rating, 0) / ratings.length) * 10) / 10
          : 0,
      };
    }

    const athletes = await this.listAthletes();
    const ratings = await this.listRatingHistory();
    const rated = athletes.filter((row) => row.ratingStatus === "Rated");
    return {
      totalAthletes: athletes.length,
      activeAthletes: athletes.length,
      pendingRatings: athletes.length - rated.length,
      ratedAthletes: rated.length,
      averageRating: ratings.length
        ? Math.round((ratings.reduce((sum, row) => sum + row.rating, 0) / ratings.length) * 10) / 10
        : 0,
    };
  },

  async listRatingHistory() {
    if (await isDemoSession()) return demoStore.listRatings();
    const result = await api.get("/ratingForAll");
    return (result.ratings || result.data || []).map((row) => ({
      id: String(row._id || row.id),
      athleteId: String(row.athleteId?._id || row.athleteId || ""),
      athleteName: row.athleteId?.userId?.Name || row.athleteName || "Athlete",
      rating: Number(row.rating || 0),
      remarks: row.remarks || "",
      createdAt: row.createdAt || row.updatedAt || null,
      raw: row,
    }));
  },

  async listPendingRatings(instructorId) {
    if (await isDemoSession()) {
      return demoStore.listAthletes()
        .filter((row) => row.ratingStatus === "Pending")
        .map((row) => ({ ...row, demo: true }));
    }
    if (!instructorId) throw new Error("Coach instructor profile is not linked.");
    const result = await api.get(
      `/ratingForInstructor?instructorId=${encodeURIComponent(instructorId)}`
    );
    return (result.ratings || []).map((row) => ({
      ...mapAthlete(row.athleteId || {}),
      ratingId: String(row._id),
      raw: row,
    }));
  },

  async listRateableAthletes() {
    if (await isDemoSession()) return demoAthletes();
    const instructorResult = await api.get("/getInstructorswithuser");
    const instructor = instructorResult.data?.[0];
    if (!instructor?._id) {
      throw new Error("Coach instructor profile is not linked.");
    }
    return this.listPendingRatings(instructor._id);
  },

  async submitRating({ ratingId, rating, remarks, parameters }) {
    if (await isDemoSession()) {
      return { demo: true, rating: demoStore.submitRating({ ratingId, rating, remarks }) };
    }
    if (!ratingId) throw new Error("A backend rating record is required.");
    const result = await api.post("/ratingByInstructor", {
      ratingId,
      rating: Math.round(Number(rating)),
      remarks,
      parameters,
    });
    return { demo: false, ...result };
  },
};
