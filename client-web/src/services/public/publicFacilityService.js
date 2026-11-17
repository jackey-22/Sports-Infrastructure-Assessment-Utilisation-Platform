import { api, API_BASE_URL } from "../../API/client";

function assetUrl(value) {
  if (!value || /^https?:\/\//i.test(value) || value.startsWith("data:")) return value || "";
  return `${API_BASE_URL}/${value.replace(/^\.?[\\/]+/, "")}`;
}

function normalizeFacility(row) {
  return {
    ...row,
    id: String(row.id),
    picture: assetUrl(row.picture),
    gallery: (row.gallery || []).map(assetUrl),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    sports: (row.sports || []).map((sport) => ({
      ...sport,
      image: assetUrl(sport.image),
      courts: sport.units,
    })),
  };
}

export async function getPublicFacilities({ signal } = {}) {
  const response = await api.get("/api/public/facilities", { auth: false, signal });
  return (response.data || []).map(normalizeFacility);
}
