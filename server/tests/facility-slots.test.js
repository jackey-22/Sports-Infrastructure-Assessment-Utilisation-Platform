const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSlots } = require("../Controller/FacilitySportConfigController");

const slot = (label, startTime, endTime, days) => ({
  label,
  startTime,
  endTime,
  days,
  capacity: 4,
});

test("rejects overlapping slots for the same sport on a shared day", () => {
  const result = validateSlots([
    slot("Morning", "08:00", "10:00", ["Mon", "Wed"]),
    slot("Coaching", "09:30", "11:00", ["Wed", "Fri"]),
  ], "capacity", 1, 10);

  assert.match(result, /overlap on Wed/);
});

test("allows the same time on different days", () => {
  const result = validateSlots([
    slot("Monday", "08:00", "10:00", ["Mon"]),
    slot("Tuesday", "08:00", "10:00", ["Tue"]),
  ], "capacity", 1, 10);

  assert.equal(result, null);
});

test("allows adjacent slots whose endpoints only touch", () => {
  const result = validateSlots([
    slot("Morning", "08:00", "10:00", []),
    slot("Late morning", "10:00", "12:00", []),
  ], "capacity", 1, 10);

  assert.equal(result, null);
});
