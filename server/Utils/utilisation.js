const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function percentage(used, capacity) {
  return capacity > 0 ? Math.round((used / capacity) * 1000) / 10 : 0;
}

function dateRange(endDate, days = 30) {
  const end = new Date(`${endDate}T00:00:00.000Z`);
  return Array.from({ length: days }, (_, index) => {
    const value = new Date(end);
    value.setUTCDate(end.getUTCDate() - (days - 1 - index));
    return value.toISOString().slice(0, 10);
  });
}

function runsOn(slot, date) {
  const days = slot.days || [];
  return !days.length || days.includes(DAY_NAMES[new Date(`${date}T00:00:00.000Z`).getUTCDay()]);
}

function summariseUtilisation({ configs, bookings, institutionalBookings = [], payments, facilities, attendances = [], endDate, days = 30 }) {
  const dates = dateRange(endDate, days);
  const startDate = dates[0];
  const facilityNames = new Map((facilities || []).map((item) => [String(item._id), item.name || "Facility"]));
  const configById = new Map();
  const configByFacilitySport = new Map();
  const sports = new Map();
  const facilityRows = new Map();
  const daily = new Map(dates.map((date) => [date, { date, capacity: 0, used: 0, attended: 0 }]));

  const rowFor = (config) => {
    const sportId = String(config.sport?._id || config.sport || "unknown");
    const key = sportId;
    if (!sports.has(key)) sports.set(key, { sportId, sport: config.sport?.SportName || "Sport", capacity: 0, used: 0, attended: 0, bookings: 0, revenue: 0 });
    return sports.get(key);
  };
  const facilityRowFor = (facilityId) => {
    const key = String(facilityId || "unknown");
    if (!facilityRows.has(key)) facilityRows.set(key, { facilityId: key, facility: facilityNames.get(key) || "Facility", capacity: 0, used: 0, attended: 0, bookings: 0, revenue: 0 });
    return facilityRows.get(key);
  };

  (configs || []).forEach((config) => {
    const configId = String(config._id);
    const facilityId = String(config.facility?._id || config.facility);
    const sportId = String(config.sport?._id || config.sport);
    configById.set(configId, config);
    configByFacilitySport.set(`${facilityId}:${sportId}`, config);
    const sportRow = rowFor(config);
    const facilityRow = facilityRowFor(facilityId);
    const configuredFrom = config.createdAt && !Number.isNaN(new Date(config.createdAt).getTime())
      ? new Date(config.createdAt).toISOString().slice(0, 10)
      : null;
    dates.forEach((date) => {
      if (configuredFrom && date < configuredFrom) return;
      (config.slots || []).filter((slot) => slot.bookable !== false && runsOn(slot, date)).forEach((slot) => {
        const exclusive = config.bookingPolicy?.inventoryMode === "exclusive-unit" && slot.purpose !== "coaching";
        const capacity = Math.max(0, Number(exclusive ? config.unitCount : slot.capacity) || 0);
        sportRow.capacity += capacity;
        facilityRow.capacity += capacity;
        const dayRow = daily.get(date);
        if (dayRow) dayRow.capacity += capacity;
      });
    });
  });

  // Build set of attended booking IDs for quick lookup
  const attendedBookingIds = new Map((attendances || []).map((a) => [String(a.booking), Math.max(1, Number(a.members) || 1)]));

  (bookings || []).filter((booking) => (
    booking.bookingStatus === "Confirmed" && booking.Startdate >= startDate && booking.Startdate <= endDate
  )).forEach((booking) => {
    const facilityId = String(booking.SportComplexId?._id || booking.SportComplexId);
    const sportId = String(booking.sport?._id || booking.sport);
    const config = configById.get(String(booking.facilitySportConfig)) || configByFacilitySport.get(`${facilityId}:${sportId}`);
    if (!config) return;
    const slot = (config.slots || []).find((item) => String(item._id) === String(booking.slotId));
    const exclusive = config.bookingPolicy?.inventoryMode === "exclusive-unit" && slot?.purpose !== "coaching";
    const used = Math.max(1, Number(exclusive ? booking.reservedUnits : booking.memberCount) || 1);
    const attended = attendedBookingIds.get(String(booking._id)) || 0;
    const sportRow = rowFor(config);
    const facilityRow = facilityRowFor(facilityId);
    sportRow.used += used;
    sportRow.attended += attended;
    sportRow.bookings += 1;
    facilityRow.used += used;
    facilityRow.attended += attended;
    facilityRow.bookings += 1;
    const dayRow = daily.get(booking.Startdate);
    if (dayRow) {
      dayRow.used += used;
      dayRow.attended += attended;
    }
  });

  (institutionalBookings || []).filter((booking) => booking.status === "Confirmed").forEach((booking) => {
    const facilityId = String(booking.facility?._id || booking.facility);
    (booking.selections || []).filter((selection) => (
      selection.date >= startDate && selection.date <= endDate
    )).forEach((selection) => {
      const config = configById.get(String(selection.facilitySportConfig));
      if (!config) return;
      const slot = (config.slots || []).find((item) => String(item._id) === String(selection.slotId));
      const exclusive = config.bookingPolicy?.inventoryMode === "exclusive-unit" && slot?.purpose !== "coaching";
      const used = Math.max(1, Number(exclusive ? selection.reservedUnits : selection.participantCount) || 1);
      const sportRow = rowFor(config);
      const facilityRow = facilityRowFor(facilityId);
      sportRow.used += used;
      sportRow.bookings += 1;
      facilityRow.used += used;
      facilityRow.bookings += 1;
      const dayRow = daily.get(selection.date);
      if (dayRow) dayRow.used += used;
    });
  });

  (payments || []).filter((payment) => {
    const paidAt = new Date(payment.paidAt || payment.createdAt || 0);
    if (Number.isNaN(paidAt.getTime())) return false;
    const paidDate = paidAt.toISOString().slice(0, 10);
    return payment.status === "Paid" && paidDate >= startDate && paidDate <= endDate;
  }).forEach((payment) => {
    const sportId = String(payment.sport?._id || payment.sport || "unknown");
    const facilityId = String(payment.facility?._id || payment.facility || "unknown");
    const sportRow = sports.get(sportId);
    if (sportRow) sportRow.revenue += Number(payment.amount) || 0;
    facilityRowFor(facilityId).revenue += Number(payment.amount) || 0;
  });

  const finish = (row) => ({ ...row, utilisationPct: percentage(row.used, row.capacity), attendancePct: percentage(row.attended || 0, row.capacity) });
  const bySport = [...sports.values()].map(finish).sort((a, b) => b.utilisationPct - a.utilisationPct || b.used - a.used);
  const byFacility = [...facilityRows.values()].map(finish).sort((a, b) => b.utilisationPct - a.utilisationPct || b.used - a.used);
  const capacity = bySport.reduce((sum, row) => sum + row.capacity, 0);
  const used = bySport.reduce((sum, row) => sum + row.used, 0);
  const overall = { capacity, used, utilisationPct: percentage(used, capacity) };
  const highest = bySport[0];
  const lowest = [...bySport].filter((row) => row.capacity > 0).sort((a, b) => a.utilisationPct - b.utilisationPct)[0];
  const insights = [];
  if (!capacity) insights.push("No bookable slot capacity is configured for this reporting period.");
  if (highest) insights.push(`${highest.sport} has the highest utilisation at ${highest.utilisationPct}%.`);
  if (lowest && lowest.sportId !== highest?.sportId && lowest.utilisationPct < 35) insights.push(`${lowest.sport} is under-utilised at ${lowest.utilisationPct}%; review its schedule or promotion.`);
  if (overall.utilisationPct >= 80) insights.push("Overall demand is high; consider adding capacity or additional slots.");
  else if (capacity && overall.utilisationPct < 25) insights.push("Overall utilisation is below 25%; review slot timing and citizen demand.");

  const trend = [...daily.values()].map((row) => ({
    date: row.date,
    label: new Date(`${row.date}T00:00:00.000Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" }),
    capacity: row.capacity,
    used: row.used,
    attended: row.attended,
    utilisationPct: percentage(row.used, row.capacity),
    attendancePct: percentage(row.attended, row.used),
  }));

  return { period: { startDate, endDate, days }, overall, bySport, byFacility, trend, insights };
}

module.exports = { dateRange, runsOn, summariseUtilisation };
