const mongoose = require("mongoose");
const Athlete = require("../Model/athleteModel");
const Sport = require("../Model/SportModel");
const Instructor = require("../Model/instructorModel");
const Guest = require("../Model/GuestModel");
const { ROLE } = require("../Utils/roles");
const { canAccessAthlete } = require("../Utils/scope");
const { syncAthleteGoalsAndBadges } = require("../Services/goalBadgeService");

const fail = (res, status, msg) => res.status(status).json({ data: "", msg, rcode: -9 });
const validId = (value) => mongoose.isValidObjectId(value);

async function ensureCoachScope(req, athlete, sportId) {
  const coach = await Instructor.findOne({ userId: req.user._id }).select("sports SportComplexId").lean();
  if (!coach || !coach.SportComplexId) return false;
  const sports = (coach.sports || []).map((s) => String(s.sport?._id || s.sport));
  if (sportId && !sports.includes(String(sportId))) return false;
  if (await canAccessAthlete(req.user, athlete)) return true;
  if (athlete.SportComplexId) return false;
  return Boolean(
    await Guest.exists({
      coach: coach._id,
      SportComplexId: coach.SportComplexId,
      citizenUser: athlete.userId?._id || athlete.userId,
      sport: sportId || { $in: sports },
      bookingStatus: "Confirmed",
      paymentStatus: "Paid",
    })
  );
}

/** GET /api/athlete/goals */
async function athleteList(req, res) {
  try {
    const athlete = await Athlete.findOne({ userId: req.user._id }).select("_id").lean();
    if (!athlete) return res.json({ data: { goals: [], badges: [], badgeCatalog: [], xpPoints: 0, rank: null }, rcode: 200 });
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.json({ data: synced, rcode: 200 });
  } catch (error) {
    console.error("athleteList goals error:", error);
    return fail(res, 500, "Could not load goals & badges");
  }
}

/** POST /api/athlete/goals */
async function athleteCreate(req, res) {
  try {
    let athlete = await Athlete.findOne({ userId: req.user._id });
    if (!athlete) {
      athlete = await Athlete.create({ userId: req.user._id, isActive: 1 });
    }
    const { title, description, sportId, goalType, targetValue, unit, targetdate } = req.body || {};
    if (!title || !String(title).trim()) return fail(res, 400, "Goal title is required");
    if (sportId && (!validId(sportId) || !(await Sport.exists({ _id: sportId })))) {
      return fail(res, 400, "Invalid sport selected");
    }
    const type = ["attendance", "skill_score", "custom"].includes(goalType) ? goalType : "custom";
    const target = Math.max(1, Number(targetValue) || (type === "skill_score" ? 80 : type === "attendance" ? 10 : 1));

    athlete.goals.push({
      title: String(title).trim().slice(0, 140),
      description: String(description || "").trim().slice(0, 500),
      sport: sportId || null,
      goalType: type,
      targetValue: target,
      currentValue: 0,
      unit: String(unit || (type === "attendance" ? "sessions" : type === "skill_score" ? "score" : "milestone")).trim(),
      assignedBy: req.user._id,
      assignedByRole: "athlete",
      status: "Active",
      startdate: new Date(),
      targetdate: targetdate ? new Date(targetdate) : undefined,
      achieved: "0",
    });

    await athlete.save();
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.status(201).json({ data: synced, rcode: 200, msg: "Goal created" });
  } catch (error) {
    console.error("athleteCreate goal error:", error);
    return fail(res, 500, "Could not create goal");
  }
}

/** PATCH /api/athlete/goals/:goalId */
async function athleteUpdate(req, res) {
  try {
    const athlete = await Athlete.findOne({ userId: req.user._id });
    if (!athlete) return fail(res, 404, "Athlete profile not found");
    const goal = athlete.goals.id(req.params.goalId);
    if (!goal) return fail(res, 404, "Goal not found");

    const { achieved, currentValue, title, description, targetdate } = req.body || {};
    if (title !== undefined) goal.title = String(title).trim().slice(0, 140);
    if (description !== undefined) goal.description = String(description).trim().slice(0, 500);
    if (targetdate !== undefined) goal.targetdate = targetdate ? new Date(targetdate) : undefined;
    if (currentValue !== undefined && Number.isFinite(Number(currentValue))) {
      goal.currentValue = Math.max(0, Number(currentValue));
    }
    if (achieved === "1" || achieved === true) {
      goal.achieved = "1";
      goal.status = "Completed";
      goal.actualdate = new Date();
      goal.currentValue = Math.max(goal.currentValue || 0, goal.targetValue || 1);
    }

    await athlete.save();
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.json({ data: synced, rcode: 200, msg: "Goal updated" });
  } catch (error) {
    console.error("athleteUpdate goal error:", error);
    return fail(res, 500, "Could not update goal");
  }
}

/** DELETE /api/athlete/goals/:goalId */
async function athleteDelete(req, res) {
  try {
    const athlete = await Athlete.findOne({ userId: req.user._id });
    if (!athlete) return fail(res, 404, "Athlete profile not found");
    const goal = athlete.goals.id(req.params.goalId);
    if (!goal) return fail(res, 404, "Goal not found");
    goal.deleteOne();
    await athlete.save();
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.json({ data: synced, rcode: 200, msg: "Goal removed" });
  } catch (error) {
    console.error("athleteDelete goal error:", error);
    return fail(res, 500, "Could not remove goal");
  }
}

/** GET /api/coach/goals — all goals for athletes in this coach's scope */
async function coachAllGoals(req, res) {
  try {
    const coach = await Instructor.findOne({ userId: req.user._id })
      .populate("sports.sport", "SportName")
      .lean();
    if (!coach || !coach.SportComplexId) {
      return res.json({ data: { athletes: [], goals: [], summary: { total: 0, active: 0, completed: 0, overdue: 0 } }, rcode: 200 });
    }
    const coachSports = (coach.sports || [])
      .map((s) => ({ id: String(s.sport?._id || s.sport), name: s.sport?.SportName || "Sport" }))
      .filter((s) => s.id);
    const coachSportIds = coachSports.map((s) => s.id);

    const [complexAthletes, guestUsers] = await Promise.all([
      Athlete.find({ SportComplexId: coach.SportComplexId }).populate("userId", "Name Email").lean(),
      Guest.find({
        coach: coach._id,
        SportComplexId: coach.SportComplexId,
        bookingStatus: "Confirmed",
        paymentStatus: "Paid",
      }).distinct("citizenUser"),
    ]);

    const unlinkedAthletes = guestUsers.length
      ? await Athlete.find({ userId: { $in: guestUsers }, SportComplexId: null }).populate("userId", "Name Email").lean()
      : [];

    const byId = new Map();
    [...complexAthletes, ...unlinkedAthletes].forEach((a) => byId.set(String(a._id), a));
    const scopedAthletes = [...byId.values()];

    const goals = [];
    const athletesList = [];

    for (const ath of scopedAthletes) {
      const synced = await syncAthleteGoalsAndBadges(ath._id);
      const athName = ath.userId?.Name || "Athlete";
      athletesList.push({
        id: String(ath._id),
        name: athName,
        email: ath.userId?.Email || "",
        xpPoints: synced?.xpPoints || 0,
        rank: synced?.rank?.current?.name || "Bronze Athlete",
        sports: coachSports,
      });
      (synced?.goals || []).forEach((g) => {
        const gSportId = g.sport ? String(g.sport?._id || g.sport) : "";
        if (gSportId && coachSportIds.length && !coachSportIds.includes(gSportId)) return;
        goals.push({
          _id: String(g._id),
          athleteId: String(ath._id),
          athleteName: athName,
          sportId: gSportId,
          sportName: g.sport?.SportName || "All sports",
          title: g.title,
          description: g.description || "",
          goalType: g.goalType || "custom",
          targetValue: g.targetValue || 1,
          currentValue: g.currentValue || 0,
          unit: g.unit || "",
          status: g.status || "Active",
          assignedByRole: g.assignedByRole || "athlete",
          targetdate: g.targetdate || null,
          startdate: g.startdate || null,
        });
      });
    }

    const summary = {
      total: goals.length,
      active: goals.filter((g) => g.status === "Active").length,
      completed: goals.filter((g) => g.status === "Completed").length,
      overdue: goals.filter((g) => g.status === "Overdue").length,
    };

    return res.json({ data: { athletes: athletesList, goals, summary }, rcode: 200 });
  } catch (error) {
    console.error("coachAllGoals error:", error);
    return fail(res, 500, "Could not load coach goals");
  }
}

/** GET /api/coach/athletes/:athleteId/goals */
async function coachListGoals(req, res) {
  try {
    if (!validId(req.params.athleteId)) return fail(res, 400, "Invalid athlete ID");
    const athlete = await Athlete.findById(req.params.athleteId).lean();
    if (!athlete || !(await ensureCoachScope(req, athlete))) {
      return fail(res, 403, "Athlete is outside your coaching scope");
    }
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.json({ data: synced, rcode: 200 });
  } catch (error) {
    console.error("coachListGoals error:", error);
    return fail(res, 500, "Could not load athlete goals");
  }
}

/** POST /api/coach/athletes/:athleteId/goals */
async function coachAssignGoal(req, res) {
  try {
    if (!validId(req.params.athleteId)) return fail(res, 400, "Invalid athlete ID");
    const athlete = await Athlete.findById(req.params.athleteId);
    const { title, description, sportId, goalType, targetValue, unit, targetdate } = req.body || {};
    if (!athlete || !(await ensureCoachScope(req, athlete, sportId))) {
      return fail(res, 403, "Athlete or sport is outside your coaching scope");
    }
    if (!title || !String(title).trim()) return fail(res, 400, "Goal title is required");
    const type = ["attendance", "skill_score", "custom"].includes(goalType) ? goalType : "skill_score";
    const target = Math.max(1, Number(targetValue) || (type === "skill_score" ? 80 : type === "attendance" ? 8 : 1));

    athlete.goals.push({
      title: String(title).trim().slice(0, 140),
      description: String(description || "").trim().slice(0, 500),
      sport: sportId || null,
      goalType: type,
      targetValue: target,
      currentValue: 0,
      unit: String(unit || (type === "attendance" ? "sessions" : type === "skill_score" ? "score" : "milestone")).trim(),
      assignedBy: req.user._id,
      assignedByRole: "coach",
      status: "Active",
      startdate: new Date(),
      targetdate: targetdate ? new Date(targetdate) : undefined,
      achieved: "0",
    });

    await athlete.save();
    const synced = await syncAthleteGoalsAndBadges(athlete._id);
    return res.status(201).json({ data: synced, rcode: 200, msg: "Goal assigned to athlete" });
  } catch (error) {
    console.error("coachAssignGoal error:", error);
    return fail(res, 500, "Could not assign goal");
  }
}

module.exports = {
  athleteList,
  athleteCreate,
  athleteUpdate,
  athleteDelete,
  coachAllGoals,
  coachListGoals,
  coachAssignGoal,
};
