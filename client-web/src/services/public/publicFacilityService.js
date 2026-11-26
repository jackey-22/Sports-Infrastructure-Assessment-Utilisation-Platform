import { api, API_BASE_URL } from "../../API/client";

export const PUBLIC_IMAGE_FALLBACK = `${API_BASE_URL}/SportComplexes/sportcomplex_gandhinagar.png`;

const SPORT_IMAGES = {
  Badminton: "/uploads/badminton.jpeg",
  Basketball: "/uploads/basketball1.jpg",
  Cricket: "/uploads/cricket-stadium-1.jpg",
  Football: "/uploads/football1.jpg",
  Kabaddi: "/uploads/kabaddi1.jpg",
  "Table Tennis": "/uploads/tabletennis1.jpg",
};

function assetUrl(value) {
  if (!value || /^https?:\/\//i.test(value) || value.startsWith("data:")) return value || "";
  return `${API_BASE_URL}/${value.replace(/^\.?[\\/]+/, "")}`;
}

function normalizeFacility(row) {
  return {
    ...row,
    id: String(row.id),
    picture: assetUrl(row.picture) || PUBLIC_IMAGE_FALLBACK,
    gallery: (row.gallery || []).map(assetUrl),
    conditionPhotos: (row.conditionPhotos || []).map((p) => ({
      ...p,
      url: assetUrl(p.url),
    })).filter((p) => p.url),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    sports: (row.sports || []).map((sport) => {
      const sportImgs = Array.isArray(sport.images) ? sport.images.map(assetUrl).filter(Boolean) : [];
      return {
        ...sport,
        image: sportImgs[0] || assetUrl(SPORT_IMAGES[sport.name] || (/^\.?[\\/]sports[\\/]/i.test(sport.image || "") ? "" : sport.image)),
        images: sportImgs,
        courts: sport.units,
      };
    }),
  };
}

export function applyPublicImageFallback(event) {
  if (event.currentTarget.src !== PUBLIC_IMAGE_FALLBACK) {
    event.currentTarget.src = PUBLIC_IMAGE_FALLBACK;
  }
}

export async function getPublicFacilities({ signal, bookableOnly = false } = {}) {
  const path = bookableOnly
    ? "/api/public/facilities?bookableOnly=true"
    : "/api/public/facilities";
  const response = await api.get(path, { auth: false, signal });
  return (response.data || []).map(normalizeFacility);
}
