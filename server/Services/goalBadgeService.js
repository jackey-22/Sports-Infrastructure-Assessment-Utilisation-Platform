const Athlete = require("../Model/athleteModel");
const Attendance = require("../Model/BookingAttendanceModel");
const Evaluation = require("../Model/PerformanceEvaluationModel");
const Achievement = require("../Model/AthleteAchievementModel");

const RANK_TIERS = [
  { key: "bronze", name: "Bronze Athlete", minPoints: 0, description: "Started your KhelGujarat athletic journey." },
  { key: "silver", name: "Silver Contender", minPoints: 150, description: "Reached 150+ XP across goals, attendance & awards." },
  { key: "gold", name: "Gold Performer", minPoints: 350, description: "Reached 350+ XP with consistent training." },
  { key: "platinum", name: "Platinum Elite", minPoints: 600, description: "Reached 600+ XP across multiple milestones." },
  { key: "diamond", name: "Diamond Champion", minPoints: 900, description: "Reached 900+ XP with sustained excellence." },
  { key: "crown", name: "Crown Legend", minPoints: 1250, description: "Reached 1250+ XP — top tier athlete." },
];

const MILESTONE_BADGES = [
  {
    badgeKey: "first_goal",
    name: "First Goal Achieved",
    description: "Completed your very first training goal.",
    tier: "bronze",
    points: 50,
    check: ({ completedGoals }) => completedGoals >= 1,
    hint: "Complete 1 goal to unlock",
  },
  {
    badgeKey: "goal_hat_trick",
    name: "Goal Hat-Trick",
    description: "Completed 3 or more personal or coach-assigned goals.",
    tier: "gold",
    points: 100,
    check: ({ completedGoals }) => completedGoals >= 3,
    hint: "Complete 3 goals to unlock",
  },
  {
    badgeKey: "attendance_warrior",
    name: "Gate Check-In Regular",
    description: "Checked in at sports facilities 10 or more times.",
    tier: "silver",
    points: 75,
    check: ({ attendanceCount }) => attendanceCount >= 10,
    hint: "Record 10 facility check-ins to unlock",
  },
  {
    badgeKey: "skill_master",
    name: "Skill Master (85+)",
    description: "Scored 85 or higher in an official coach evaluation.",
    tier: "platinum",
    points: 100,
    check: ({ maxEvalScore }) => maxEvalScore >= 85,
    hint: "Score 85+ in any evaluation to unlock",
  },
  {
    badgeKey: "multi_sport",
    name: "Multi-Sport Athlete",
    description: "Recorded evaluations or goals across 2 or more sports.",
    tier: "silver",
    points: 60,
    check: ({ distinctSports }) => distinctSports >= 2,
    hint: "Train in 2+ sports to unlock",
  },
  {
    badgeKey: "award_winner",
    name: "Verified Medalist",
    description: "Earned at least 1 verified achievement or medal.",
    tier: "gold",
    points: 80,
    check: ({ verifiedAchievements }) => verifiedAchievements >= 1,
    hint: "Get 1 achievement verified to unlock",
  },
];

function currentRankForPoints(points) {
  let current = RANK_TIERS[0];
  let next = RANK_TIERS[1] || null;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (points >= RANK_TIERS[i].minPoints) {
      current = RANK_TIERS[i];
      next = RANK_TIERS[i + 1] || null;
    }
  }
  return { current, next };
}

/**
 * Pure computation of goal progress, completion, XP points, and unlocked badges.
 */
function computeGoalAndBadgeState({
  goals = [],
  existingBadges = [],
  attendances = [],
  evaluations = [],
  achievements = [],
  now = new Date(),
}) {
  const todayStr = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const updatedGoals = goals.map((raw) => {
    const g = typeof raw.toObject === "function" ? raw.toObject() : { ...raw };
    const startDate = g.startdate ? new Date(g.startdate) : new Date(0);
    const startStr = !Number.isNaN(startDate.getTime()) ? startDate.toISOString().slice(0, 10) : "1970-01-01";
    const sportId = g.sport ? String(g.sport?._id || g.sport) : "";
    const goalType = g.goalType || "custom";
    const targetValue = Math.max(1, Number(g.targetValue) || 1);

    let currentValue = Number(g.currentValue) || 0;

    if (goalType === "attendance") {
      currentValue = attendances.filter((att) => {
        const attDate = String(att.date || (att.entryAt ? new Date(att.entryAt).toISOString().slice(0, 10) : ""));
        if (attDate < startStr) return false;
        if (!sportId) return true;
        const attSport = String(att.booking?.sport?._id || att.booking?.sport || att.sport || "");
        return attSport === sportId;
      }).length;
    } else if (goalType === "skill_score") {
      const matchingEvals = evaluations.filter((ev) => {
        const evDate = ev.evaluationDate ? new Date(ev.evaluationDate) : new Date(0);
        if (evDate < startDate) return false;
        if (!sportId) return true;
        return String(ev.sport?._id || ev.sport || "") === sportId;
      });
      if (matchingEvals.length) {
        currentValue = Math.max(...matchingEvals.map((ev) => Number(ev.totalScore) || 0));
      }
    }

    const wasCompleted = g.achieved === "1" || g.status === "Completed";
    const isNowCompleted = wasCompleted || currentValue >= targetValue;
    const targetStr = g.targetdate && !Number.isNaN(new Date(g.targetdate).getTime())
      ? new Date(g.targetdate).toISOString().slice(0, 10)
      : null;

    let status = "Active";
    let actualdate = g.actualdate || null;
    let achieved = "0";
    if (isNowCompleted) {
      status = "Completed";
      achieved = "1";
      actualdate = actualdate || now;
      if (goalType === "custom" && currentValue < targetValue) currentValue = targetValue;
    } else if (targetStr && targetStr < todayStr) {
      status = "Overdue";
    }

    return {
      ...g,
      goalType,
      targetValue,
      currentValue: Math.round(currentValue * 10) / 10,
      status,
      achieved,
      actualdate,
    };
  });

  const completedGoals = updatedGoals.filter((g) => g.status === "Completed").length;
  const attendanceCount = attendances.length;
  const maxEvalScore = evaluations.length
    ? Math.max(...evaluations.map((ev) => Number(ev.totalScore) || 0))
    : 0;
  const verifiedAchievements = achievements.filter((a) => a.verificationStatus === "Verified").length;

  const sportSet = new Set();
  evaluations.forEach((ev) => {
    const s = String(ev.sport?._id || ev.sport || "");
    if (s) sportSet.add(s);
  });
  updatedGoals.forEach((g) => {
    const s = String(g.sport?._id || g.sport || "");
    if (s) sportSet.add(s);
  });

  const stats = {
    completedGoals,
    attendanceCount,
    maxEvalScore,
    distinctSports: sportSet.size,
    verifiedAchievements,
  };

  const existingByKey = new Map(existingBadges.map((b) => [b.badgeKey, b]));
  const unlockedBadges = [];
  let badgeBonusPoints = 0;

  for (const def of MILESTONE_BADGES) {
    if (def.check(stats)) {
      const prev = existingByKey.get(def.badgeKey);
      unlockedBadges.push({
        badgeKey: def.badgeKey,
        name: def.name,
        description: def.description,
        category: "milestone",
        tier: def.tier,
        points: def.points,
        awardedAt: prev?.awardedAt || now,
      });
      badgeBonusPoints += def.points;
    }
  }

  const baseXp =
    completedGoals * 50 +
    attendanceCount * 10 +
    verifiedAchievements * 40 +
    badgeBonusPoints;

  const rank = currentRankForPoints(baseXp);

  // Add current rank tier badge
  unlockedBadges.push({
    badgeKey: `tier_${rank.current.key}`,
    name: rank.current.name,
    description: rank.current.description,
    category: "tier",
    tier: rank.current.key,
    points: rank.current.minPoints,
    awardedAt: existingByKey.get(`tier_${rank.current.key}`)?.awardedAt || now,
  });

  const badgeCatalog = MILESTONE_BADGES.map((def) => ({
    badgeKey: def.badgeKey,
    name: def.name,
    description: def.description,
    tier: def.tier,
    points: def.points,
    hint: def.hint,
    unlocked: unlockedBadges.some((b) => b.badgeKey === def.badgeKey),
    awardedAt: unlockedBadges.find((b) => b.badgeKey === def.badgeKey)?.awardedAt || null,
  }));

  return {
    goals: updatedGoals,
    badges: unlockedBadges,
    badgeCatalog,
    xpPoints: baseXp,
    rank,
    stats,
  };
}

/**
 * Loads live attendance, evaluations & achievements for an athlete,
 * syncs goal progress & unlocked badges, and saves back to MongoDB.
 */
async function syncAthleteGoalsAndBadges(athleteId) {
  const athlete = await Athlete.findById(athleteId);
  if (!athlete) return null;

  const [attendances, evaluations, achievements] = await Promise.all([
    athlete.userId
      ? Attendance.find({ citizenUser: athlete.userId })
          .populate({ path: "booking", select: "sport" })
          .lean()
      : [],
    Evaluation.find({ athlete: athlete._id }).select("sport totalScore evaluationDate").lean(),
    Achievement.find({ athlete: athlete._id }).select("verificationStatus sport").lean(),
  ]);

  const result = computeGoalAndBadgeState({
    goals: athlete.goals || [],
    existingBadges: athlete.badges || [],
    attendances,
    evaluations,
    achievements,
  });

  athlete.goals = result.goals;
  athlete.badges = result.badges;
  athlete.xpPoints = result.xpPoints;
  await athlete.save();

  await athlete.populate("goals.sport", "SportName");
  await athlete.populate("goals.assignedBy", "Name");

  return {
    goals: athlete.goals,
    badges: result.badges,
    badgeCatalog: result.badgeCatalog,
    xpPoints: result.xpPoints,
    rank: result.rank,
    stats: result.stats,
  };
}

module.exports = {
  RANK_TIERS,
  MILESTONE_BADGES,
  currentRankForPoints,
  computeGoalAndBadgeState,
  syncAthleteGoalsAndBadges,
};
