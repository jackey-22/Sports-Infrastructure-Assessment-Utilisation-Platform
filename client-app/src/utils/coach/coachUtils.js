// Pure helpers for Coach screens. Reuses Phase 2C.1 admin utilities for
// formatting, filtering, sorting and pagination so Admin, Manager and Coach stay
// consistent, with coach-specific additions where needed.
export {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  percentage,
  filterTransactions,
  sortRows,
  paginate,
  summariseTransactions,
  countBy,
  sumBy,
} from "../../utils/admin/adminUtils";

// Coach-specific file validation constants (defined locally; not in adminUtils).
export const MAX_FILE_SIZE_MB = 5;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_DOCUMENT_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
];

export function validateFile(file) {
  const errors = [];
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    errors.push(`Unsupported file type: ${file.type}. Use JPEG, PNG, WEBP or PDF.`);
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    errors.push(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum ${MAX_FILE_SIZE_MB} MB.`);
  }
  return errors;
}

export function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Filter athletes assigned to the coach's facility.
export function filterAthletes(
  rows,
  { search, sport, ageGroup, status, ratingStatus } = {}
) {
  return rows.filter((row) => {
    if (sport && row.sport !== sport) return false;
    if (ageGroup && row.ageGroup !== ageGroup) return false;
    if (status && row.status !== status) return false;
    if (ratingStatus && row.ratingStatus !== ratingStatus) return false;
    return matchesSearch(search, [
      row.id,
      row.name,
      row.sport,
      row.ageGroup,
      row.status,
      row.ratingStatus,
    ]);
  });
}

// Filter rating history.
export function filterRatingHistory(
  rows,
  { search, sport, rating } = {}
) {
  return rows.filter((row) => {
    if (sport && row.sport !== sport) return false;
    if (rating && Number(row.rating) !== Number(rating)) return false;
    return matchesSearch(search, [row.id, row.athleteName, row.sport, row.remarks]);
  });
}

function matchesSearch(search, fields) {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) =>
    String(field == null ? "" : field).toLowerCase().includes(needle)
  );
}

// Summarise a coach's athlete caseload.
export function summariseCoachAthletes(rows) {
  return rows.reduce(
    (totals, row) => {
      totals.total += 1;
      if (row.status === "Active") totals.active += 1;
      if (row.ratingStatus === "Pending") totals.pending += 1;
      if (row.ratingStatus === "Rated") totals.rated += 1;
      return totals;
    },
    { total: 0, active: 0, pending: 0, rated: 0 }
  );
}

// Average rating across a set of rating records.
export function averageRating(ratings) {
  if (!ratings.length) return 0;
  return Math.round(
    (ratings.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
      ratings.length) *
      10
  ) / 10;
}

// Rating star helpers.
export function ratingStars(rating, max = 5) {
  const value = Number(rating) || 0;
  return {
    full: Math.floor(value),
    half: value % 1 >= 0.5 ? 1 : 0,
    empty: max - Math.ceil(value),
  };
}

export const RATING_CRITERIA = [
  "Technique",
  "Fitness",
  "Discipline",
  "Teamwork",
  "Punctuality",
];

export const AGE_GROUPS = ["Under 14", "Under 17", "Under 19", "Open"];
export const ATHLETE_STATUSES = ["Active", "Inactive", "On Leave"];
export const RATING_STATUSES = ["Rated", "Pending"];
