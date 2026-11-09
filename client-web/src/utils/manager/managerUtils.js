// Pure helpers for Manager screens. Reuses the Phase 2C.1 admin utilities so
// formatting, filtering, sorting, pagination and summaries stay consistent
// across Admin and Manager, with manager-specific additions where needed.
export {
  formatCurrency,
  formatNumber,
  formatDate,
  formatDateTime,
  percentage,
  filterFacilities,
  filterGrievances,
  filterTransactions,
  filterGrants,
  utilisationQueue,
  sortRows,
  paginate,
  summariseGrievances,
  summariseTransactions,
  summariseGrants,
  countBy,
  sumBy,
} from "../../utils/admin/adminUtils";

// Manager-only helpers.

// Scope a dataset to the manager's assigned facility.
export function scopeToFacility(rows, facilityId) {
  if (!facilityId) return rows;
  return rows.filter((row) => row.facilityId === facilityId);
}

// Summarise a manager's facility-level grievance caseload.
export function summariseManagerGrievances(rows) {
  return rows.reduce(
    (totals, row) => {
      totals.total += 1;
      if (row.status === "Pending") totals.pending += 1;
      if (row.status === "Resolved") totals.resolved += 1;
      return totals;
    },
    { total: 0, pending: 0, resolved: 0 }
  );
}

// Summarise a manager's facility-level transaction ledger.
export function summariseManagerTransactions(rows) {
  const byStatus = {
    Success: 0,
    Pending: 0,
    Failed: 0,
    Refunded: 0,
  };
  let volume = 0;
  rows.forEach((row) => {
    byStatus[row.status] = (byStatus[row.status] || 0) + 1;
    if (row.status === "Success") volume += row.amount;
  });
  return { count: rows.length, volume, byStatus };
}

// Summarise a manager's facility-level grants.
export function summariseManagerGrants(grants) {
  return grants.reduce(
    (totals, grant) => {
      totals.count += 1;
      totals.allocated += grant.allocated;
      totals.released += grant.released;
      totals.utilised += grant.utilised;
      totals.pendingVerification += grant.pendingVerification;
      totals.remaining += grant.remaining;
      return totals;
    },
    { count: 0, allocated: 0, released: 0, utilised: 0, pendingVerification: 0, remaining: 0 }
  );
}

// File validation for utilization proof / assessment photo uploads.
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
