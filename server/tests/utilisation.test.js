const test = require("node:test");
const assert = require("node:assert/strict");
const { summariseUtilisation } = require("../Utils/utilisation");

test("utilisation sums configured slot capacity and confirmed sport usage", () => {
  const config = {
    _id: "config",
    facility: "facility",
    sport: { _id: "sport", SportName: "Badminton" },
    unitCount: 4,
    bookingPolicy: { inventoryMode: "exclusive-unit" },
    slots: [{ _id: "slot", days: ["Wed"], capacity: 4, purpose: "open-play", bookable: true }],
  };
  const result = summariseUtilisation({
    configs: [config],
    facilities: [{ _id: "facility", name: "Test Facility" }],
    endDate: "2026-11-26",
    days: 2,
    bookings: [{ bookingStatus: "Confirmed", Startdate: "2026-11-25", SportComplexId: "facility", sport: "sport", facilitySportConfig: "config", slotId: "slot", reservedUnits: 2 }],
    payments: [],
  });
  assert.deepEqual(result.overall, { capacity: 4, used: 2, utilisationPct: 50 });
  assert.equal(result.bySport[0].sport, "Badminton");
  assert.equal(result.byFacility[0].utilisationPct, 50);
});

test("cancelled bookings do not contribute to utilisation", () => {
  const result = summariseUtilisation({
    configs: [{ _id: "config", facility: "facility", sport: { _id: "sport", SportName: "Swimming" }, slots: [{ _id: "slot", days: [], capacity: 10, bookable: true }] }],
    facilities: [{ _id: "facility", name: "Pool" }],
    endDate: "2026-11-26",
    days: 1,
    bookings: [{ bookingStatus: "Cancelled", Startdate: "2026-11-26", SportComplexId: "facility", sport: "sport", slotId: "slot", memberCount: 8 }],
    payments: [],
  });
  assert.equal(result.overall.used, 0);
  assert.equal(result.overall.utilisationPct, 0);
});

test("exclusive court capacity uses available units and includes confirmed institute reservations", () => {
  const config = {
    _id: "config",
    facility: "facility",
    sport: { _id: "sport", SportName: "Volleyball" },
    unitCount: 3,
    bookingPolicy: { inventoryMode: "exclusive-unit" },
    slots: [{ _id: "slot", days: [], capacity: 18, purpose: "open-play", bookable: true }],
  };
  const result = summariseUtilisation({
    configs: [config],
    facilities: [{ _id: "facility", name: "Arena" }],
    endDate: "2026-11-26",
    days: 1,
    bookings: [],
    institutionalBookings: [{
      status: "Confirmed",
      facility: "facility",
      selections: [{ facilitySportConfig: "config", slotId: "slot", date: "2026-11-26", participantCount: 12, reservedUnits: 2 }],
    }],
    payments: [],
  });

  assert.deepEqual(result.overall, { capacity: 3, used: 2, utilisationPct: 66.7 });
});
