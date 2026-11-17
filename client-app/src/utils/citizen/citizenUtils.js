// Pure helpers for Citizen screens. Reuses Phase 2C.1 admin utilities for
// formatting, filtering, sorting and pagination so all role modules stay
// consistent, with citizen-specific additions where needed.
export {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  percentage,
  sortRows,
  paginate,
  countBy,
  sumBy,
} from "../../utils/admin/adminUtils";

// File validation helpers (defined locally; not in adminUtils).
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

// Filter complaints.
export function filterComplaints(
  rows,
  { search, status, category } = {}
) {
  return rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (category && row.category !== category) return false;
    return matchesSearch(search, [
      row.id,
      row.subject,
      row.category,
      row.facilityName,
      row.status,
    ]);
  });
}

// Filter attendance sessions.
export function filterAttendance(rows, { search, status, from, to } = {}) {
  return rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (from && String(row.date).localeCompare(String(from)) < 0) return false;
    if (to && String(row.date).localeCompare(String(to)) > 0) return false;
    return matchesSearch(search, [
      row.id,
      row.facilityName,
      row.status,
      row.district,
    ]);
  });
}

// Filter feedback.
export function filterFeedback(
  rows,
  { search, entityType, rating } = {}
) {
  return rows.filter((row) => {
    if (entityType && row.entityType !== entityType) return false;
    if (rating && Number(row.rating) !== Number(rating)) return false;
    return matchesSearch(search, [
      row.id,
      row.entityName,
      row.entityType,
      row.remarks,
    ]);
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

// Summarise a citizen's attendance.
export function summariseCitizenAttendance(rows) {
  return rows.reduce(
    (totals, row) => {
      totals.total += 1;
      if (row.status === "Completed") totals.completed += 1;
      if (row.status === "Checked In") totals.checkedIn += 1;
      if (row.durationMinutes != null) totals.minutes += row.durationMinutes;
      return totals;
    },
    { total: 0, completed: 0, checkedIn: 0, minutes: 0 }
  );
}

// Average rating across feedback records.
export function averageFeedbackRating(feedback) {
  if (!feedback.length) return 0;
  return Math.round(
    (feedback.reduce((sum, f) => sum + (Number(f.rating) || 0), 0) /
      feedback.length) *
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

export const COMPLAINT_CATEGORIES = [
  "Turf & Surface Degradation",
  "Floodlight & Electrical Outage",
  "Sanitation & Drinking Water",
  "Locker Room & Hygiene",
  "Equipment Replacement Needed",
  "Perimeter & Security Issue",
];

export const FEEDBACK_ENTITIES = [
  { id: "facility", label: "Sports Facility" },
  { id: "sport", label: "Sport" },
  { id: "coach", label: "Coach" },
];

export const ATTENDANCE_STATUSES = ["Completed", "Checked In"];
export const COMPLAINT_STATUSES = ["Pending", "Resolved"];
