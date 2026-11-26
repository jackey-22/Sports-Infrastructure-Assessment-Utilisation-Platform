const test = require("node:test");
const assert = require("node:assert/strict");
const {
  percentForAmount,
  verifiedGrantTotals,
  validateMilestoneProgress,
} = require("../Utils/grantProgress");

test("grant progress treats 40%, 50% and 10% as separate milestones", () => {
  const grant = {
    allocatedAmount: 100000,
    progressUpdates: [
      { _id: "first", amountUsed: 40000, percent: 40, reviewStatus: "Verified" },
      { _id: "second", amountUsed: 50000, percent: 50, reviewStatus: "Verified" },
      { _id: "third", amountUsed: 10000, percent: 10, reviewStatus: "Verified" },
    ],
  };

  assert.deepEqual(verifiedGrantTotals(grant), { amountUsed: 100000, percent: 100 });
  assert.equal(percentForAmount(grant, 50000), 50);
});

test("a milestone may use only the remaining verified allocation", () => {
  const grant = {
    allocatedAmount: 100000,
    progressUpdates: [
      { _id: "first", amountUsed: 40000, percent: 40, reviewStatus: "Verified" },
      { _id: "ignored", amountUsed: 50000, percent: 50, reviewStatus: "Query Raised" },
    ],
  };
  const totals = verifiedGrantTotals(grant);

  assert.equal(validateMilestoneProgress(grant, 50000, totals, 50), "");
  assert.match(validateMilestoneProgress(grant, 70000, totals, 70), /remaining allocation/);
  assert.match(validateMilestoneProgress(grant, 50000, totals, 70), /must be 50%/);
});
