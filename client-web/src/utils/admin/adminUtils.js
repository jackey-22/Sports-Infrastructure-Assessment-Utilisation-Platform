// Pure formatting and filtering helpers for the Admin demo screens. Keeping
// these outside components makes them reusable and directly testable.

export function formatCurrency(value, { compact = false } = {}) {
  const amount = Number(value) || 0;
  if (compact) {
    if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-IN").format(Number(value) || 0);
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function percentage(part, whole) {
  if (!whole) return 0;
  return Math.round((Number(part) / Number(whole)) * 1000) / 10;
}

function timeOf(value) {
  if (!value) return null;
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function inRange(value, from, to) {
  const time = timeOf(value);
  if (time === null) return true;
  if (from && time < timeOf(from)) return false;
  if (to && time > timeOf(to)) return false;
  return true;
}

function matchesSearch(search, fields) {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) =>
    String(field == null ? "" : field).toLowerCase().includes(needle)
  );
}

export function filterFacilities(facilities, { district, facilityId, sport } = {}) {
  return facilities.filter((facility) => {
    if (district && facility.district !== district) return false;
    if (facilityId && facility.id !== facilityId) return false;
    if (sport && !facility.sports.includes(sport)) return false;
    return true;
  });
}

export function filterGrievances(
  rows,
  { search, status, district, facilityId, category, level, from, to } = {}
) {
  return rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (district && row.district !== district) return false;
    if (facilityId && row.facilityId !== facilityId) return false;
    if (category && row.category !== category) return false;
    if (level !== undefined && level !== "" && Number(row.level) !== Number(level))
      return false;
    if (!inRange(row.submittedAt, from, to)) return false;
    return matchesSearch(search, [
      row.id,
      row.subject,
      row.category,
      row.citizen.name,
      row.facilityName,
      row.district,
    ]);
  });
}

export function filterTransactions(
  rows,
  { search, status, method, district, facilityId, from, to } = {}
) {
  return rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (method && row.method !== method) return false;
    if (district && row.district !== district) return false;
    if (facilityId && row.facilityId !== facilityId) return false;
    if (!inRange(row.date, from, to)) return false;
    return matchesSearch(search, [
      row.id,
      row.reference,
      row.customerName,
      row.facilityName,
      row.bookingReference,
    ]);
  });
}

export function filterGrants(
  rows,
  { search, status, district, facilityId, purpose, from, to } = {}
) {
  return rows.filter((row) => {
    if (status && row.status !== status) return false;
    if (district && row.district !== district) return false;
    if (facilityId && row.facilityId !== facilityId) return false;
    if (purpose && row.purpose !== purpose) return false;
    if (!inRange(row.applicationDate, from, to)) return false;
    return matchesSearch(search, [
      row.id,
      row.facilityName,
      row.district,
      row.purpose,
    ]);
  });
}

// Flattens grant utilisation proofs into review-queue rows.
export function utilisationQueue(grants) {
  return grants.flatMap((grant) =>
    grant.proofs.map((proof) => ({
      ...proof,
      grantId: grant.id,
      grantStatus: grant.status,
      facilityId: grant.facilityId,
      facilityName: grant.facilityName,
      district: grant.district,
      purpose: grant.purpose,
      allocated: grant.allocated,
      released: grant.released,
      utilised: grant.utilised,
    }))
  );
}

export function sortRows(rows, sort) {
  if (!sort || !sort.key) return rows;
  const direction = sort.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    const left = a[sort.key];
    const right = b[sort.key];
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    if (typeof left === "number" && typeof right === "number") {
      return (left - right) * direction;
    }
    return String(left).localeCompare(String(right), "en-IN") * direction;
  });
}

export function paginate(rows, page, pageSize) {
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

export function summariseGrievances(rows) {
  return rows.reduce(
    (totals, row) => {
      totals.total += 1;
      if (row.status === "Pending") totals.pending += 1;
      if (row.status === "Resolved") totals.resolved += 1;
      if (row.level >= 2) totals.atAuthorityOrAdmin += 1;
      return totals;
    },
    { total: 0, pending: 0, resolved: 0, atAuthorityOrAdmin: 0 }
  );
}

export function summariseTransactions(rows) {
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

export function summariseGrants(grants) {
  return grants.reduce(
    (totals, grant) => {
      totals.allocated += grant.allocated;
      totals.released += grant.released;
      totals.utilised += grant.utilised;
      totals.pendingVerification += grant.pendingVerification;
      totals.remaining += grant.remaining;
      return totals;
    },
    {
      allocated: 0,
      released: 0,
      utilised: 0,
      pendingVerification: 0,
      remaining: 0,
    }
  );
}

export function countBy(items, selector) {
  return items.reduce((acc, item) => {
    const key = selector(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

export function sumBy(items, selector) {
  return items.reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}
