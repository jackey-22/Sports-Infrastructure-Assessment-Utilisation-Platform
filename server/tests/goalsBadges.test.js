const test = require("node:test");
const assert = require("node:assert/strict");
const { computeGoalAndBadgeState } = require("../Services/goalBadgeService");

test("attendance goal tracks check-ins by sport and unlocks First Goal + Bronze/Silver tier", () => {
  const sportA = "64b000000000000000000001";
  const sportB = "64b000000000000000000002";
  const result = computeGoalAndBadgeState({
    goals: [
      {
        _id: "g1",
        title: "Attend 3 Badminton sessions",
        sport: sportA,
        goalType: "attendance",
        targetValue: 3,
        startdate: new Date("2026-11-01T00:00:00Z"),
      },
    ],
    attendances: [
      { date: "2026-11-05", booking: { sport: sportA } },
      { date: "2026-11-10", booking: { sport: sportA } },
      { date: "2026-11-15", booking: { sport: sportA } },
      { date: "2026-11-16", booking: { sport: sportB } },
    ],
    evaluations: [],
    achievements: [],
    now: new Date("2026-11-27T10:00:00Z"),
  });

  assert.equal(result.goals[0].currentValue, 3);
  assert.equal(result.goals[0].status, "Completed");
  assert.equal(result.goals[0].achieved, "1");
  assert.ok(result.badges.some((b) => b.badgeKey === "first_goal"));
  assert.ok(result.xpPoints >= 140);
});

test("skill_score goal completes when evaluation meets target and unlocks skill_master", () => {
  const sportA = "64b000000000000000000001";
  const result = computeGoalAndBadgeState({
    goals: [
      {
        _id: "g2",
        title: "Reach 85 in Swimming",
        sport: sportA,
        goalType: "skill_score",
        targetValue: 85,
        startdate: new Date("2026-11-01T00:00:00Z"),
      },
    ],
    attendances: [],
    evaluations: [
      { sport: sportA, totalScore: 88, evaluationDate: new Date("2026-11-20T10:00:00Z") },
    ],
    achievements: [],
    now: new Date("2026-11-27T10:00:00Z"),
  });

  assert.equal(result.goals[0].currentValue, 88);
  assert.equal(result.goals[0].status, "Completed");
  assert.ok(result.badges.some((b) => b.badgeKey === "skill_master"));
});

test("past-deadline incomplete goal is marked Overdue", () => {
  const result = computeGoalAndBadgeState({
    goals: [
      {
        _id: "g3",
        title: "Complete 10 sessions",
        goalType: "attendance",
        targetValue: 10,
        startdate: new Date("2026-10-01T00:00:00Z"),
        targetdate: new Date("2026-11-10T00:00:00Z"),
      },
    ],
    attendances: [{ date: "2026-10-12" }],
    now: new Date("2026-11-27T10:00:00Z"),
  });

  assert.equal(result.goals[0].status, "Overdue");
  assert.equal(result.goals[0].achieved, "0");
});
