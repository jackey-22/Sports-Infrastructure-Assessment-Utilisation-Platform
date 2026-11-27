import React, { useCallback, useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  Crown,
  Flame,
  Lock,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../../API/client";
import { Button, Card, EmptyState, Field, inputClass, selectClass } from "../Common/CitizenUI";

const TIER_STYLES = {
  bronze: "border-amber-300/80 bg-amber-50/70 text-amber-900",
  silver: "border-slate-300 bg-slate-100/80 text-slate-800",
  gold: "border-yellow-300 bg-yellow-50/80 text-yellow-900",
  platinum: "border-cyan-300 bg-cyan-50/80 text-cyan-900",
  diamond: "border-indigo-300 bg-indigo-50/80 text-indigo-900",
  crown: "border-purple-300 bg-purple-50/80 text-purple-900",
};

const GOAL_TYPES = [
  { value: "attendance", label: "Attendance (facility check-ins)", defaultTarget: 10, unit: "sessions" },
  { value: "skill_score", label: "Evaluation Score (out of 100)", defaultTarget: 85, unit: "score" },
  { value: "custom", label: "Custom Training Milestone", defaultTarget: 1, unit: "milestone" },
];

export default function GoalsBadgesSection({ sports = [], onNotify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    sportId: "",
    goalType: "attendance",
    targetValue: 10,
    targetdate: "",
    description: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/athlete/goals");
      setData(res.data || null);
    } catch (err) {
      if (onNotify) onNotify(err.message);
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    load();
  }, [load]);

  const createGoal = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post("/api/athlete/goals", form);
      setData(res.data);
      setForm({
        title: "",
        sportId: "",
        goalType: "attendance",
        targetValue: 10,
        targetdate: "",
        description: "",
      });
      setShowForm(false);
      if (onNotify) onNotify("Goal added and progress synced.");
    } catch (err) {
      if (onNotify) onNotify(err.message);
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (goalId) => {
    try {
      const res = await api.patch(`/api/athlete/goals/${goalId}`, { achieved: "1" });
      setData(res.data);
      if (onNotify) onNotify("Goal marked as completed! Badges updated.");
    } catch (err) {
      if (onNotify) onNotify(err.message);
    }
  };

  const deleteGoal = async (goalId) => {
    try {
      const res = await api.del(`/api/athlete/goals/${goalId}`);
      setData(res.data);
    } catch (err) {
      if (onNotify) onNotify(err.message);
    }
  };

  const goals = data?.goals || [];
  const badgeCatalog = data?.badgeCatalog || [];
  const xpPoints = data?.xpPoints || 0;
  const rank = data?.rank;
  const nextMin = rank?.next?.minPoints || null;
  const curMin = rank?.current?.minPoints || 0;
  const rankPct = nextMin
    ? Math.min(100, Math.round(((xpPoints - curMin) / Math.max(1, nextMin - curMin)) * 100))
    : 100;

  return (
    <div className="mb-8 space-y-5">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6 text-emerald-700" />
            <h2 className="text-xl font-extrabold text-slate-900">Goals &amp; Badges</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            Set sport-wise attendance, skill score, or milestone targets — auto-tracked from check-ins and evaluations to unlock badges.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={showForm ? "bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-none border-0" : ""}
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Close Form" : "Set Goal"}
        </Button>
      </div>

      {/* Rank Tier & XP Card */}
      {rank ? (
        <Card className={`border p-5 ${TIER_STYLES[rank.current?.key] || TIER_STYLES.bronze}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
                <Crown className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-75">
                  Current Rank Tier
                </p>
                <h3 className="text-lg font-extrabold">{rank.current?.name}</h3>
                <p className="text-xs opacity-80">{rank.current?.description}</p>
              </div>
            </div>
            <div className="min-w-[200px] text-right">
              <p className="flex items-center justify-end gap-1 text-2xl font-extrabold tabular-nums">
                <Flame className="h-5 w-5 text-amber-500" /> {xpPoints} XP
              </p>
              {rank.next ? (
                <p className="text-xs font-semibold opacity-80">
                  {Math.max(0, rank.next.minPoints - xpPoints)} XP to {rank.next.name}
                </p>
              ) : (
                <p className="text-xs font-semibold opacity-80">Maximum rank achieved</p>
              )}
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${rankPct}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Create Goal Form */}
      {showForm ? (
        <Card className="border-2 border-emerald-500/20 p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900">Create a training goal</h3>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={createGoal} className="grid gap-4 md:grid-cols-2">
            <Field label="Goal title">
              <input
                required
                placeholder="e.g. Attend 10 Badminton sessions this month"
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
            <Field label="Sport (optional)">
              <select
                className={selectClass}
                value={form.sportId}
                onChange={(e) => setForm({ ...form, sportId: e.target.value })}
              >
                <option value="">All sports</option>
                {sports.map((sp) => (
                  <option key={sp._id} value={sp._id}>
                    {sp.SportName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Goal tracking type">
              <select
                className={selectClass}
                value={form.goalType}
                onChange={(e) => {
                  const opt = GOAL_TYPES.find((g) => g.value === e.target.value) || GOAL_TYPES[0];
                  setForm({ ...form, goalType: opt.value, targetValue: opt.defaultTarget });
                }}
              >
                {GOAL_TYPES.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target value">
              <input
                required
                type="number"
                min={1}
                max={form.goalType === "skill_score" ? 100 : 365}
                className={inputClass}
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })}
              />
            </Field>
            <Field label="Target deadline">
              <input
                type="date"
                className={inputClass}
                value={form.targetdate}
                onChange={(e) => setForm({ ...form, targetdate: e.target.value })}
              />
            </Field>
            <Field label="Notes (optional)">
              <input
                placeholder="Training focus or drill notes"
                className={inputClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Field>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button type="submit" disabled={saving}>
                <Plus className="h-4 w-4" /> Save Goal
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {/* Goals + Badges 2-column layout */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900">Your Goals</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {goals.filter((g) => g.status === "Completed").length} / {goals.length} completed
            </span>
          </div>
          {loading && !data ? (
            <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
          ) : goals.length ? (
            <div className="space-y-3">
              {goals.map((g) => {
                const target = Math.max(1, Number(g.targetValue) || 1);
                const current = Number(g.currentValue) || 0;
                const pct = Math.min(100, Math.round((current / target) * 100));
                const done = g.status === "Completed";
                const overdue = g.status === "Overdue";
                return (
                  <div
                    key={g._id}
                    className={`rounded-2xl border p-4 ${
                      done
                        ? "border-emerald-200 bg-emerald-50/40"
                        : overdue
                        ? "border-rose-200 bg-rose-50/40"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {g.sport?.SportName ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200/70">
                              {g.sport.SportName}
                            </span>
                          ) : null}
                          {g.assignedByRole === "coach" ? (
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200/70">
                              Coach Assigned
                            </span>
                          ) : null}
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                              done
                                ? "bg-emerald-100 text-emerald-800"
                                : overdue
                                ? "bg-rose-100 text-rose-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {g.status}
                          </span>
                        </div>
                        <h4 className="mt-1.5 font-bold text-slate-900">{g.title}</h4>
                        {g.description ? <p className="mt-0.5 text-xs text-slate-500">{g.description}</p> : null}
                      </div>
                      {g.assignedByRole !== "coach" ? (
                        <button
                          type="button"
                          onClick={() => deleteGoal(g._id)}
                          title="Remove goal"
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>
                          {current} / {target} {g.unit || ""}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${done ? "bg-emerald-600" : overdue ? "bg-rose-500" : "bg-brand-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {g.targetdate ? `Due ${new Date(g.targetdate).toLocaleDateString("en-IN")}` : "No deadline"}
                      </span>
                      {!done && g.goalType === "custom" ? (
                        <button
                          type="button"
                          onClick={() => markComplete(g._id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-800"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Mark Complete
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              title="No goals set yet"
              description="Click '+ Set Goal' above to start tracking your sessions, evaluation score, or training milestones."
            />
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h3 className="font-extrabold text-slate-900">Milestone Badges</h3>
            </div>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
              {badgeCatalog.filter((b) => b.unlocked).length} / {badgeCatalog.length} unlocked
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {badgeCatalog.map((b) => (
              <div
                key={b.badgeKey}
                className={`rounded-2xl border p-3.5 transition ${
                  b.unlocked
                    ? TIER_STYLES[b.tier] || TIER_STYLES.bronze
                    : "border-slate-200 bg-slate-50/70 text-slate-400 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {b.unlocked ? (
                      <Award className="h-5 w-5 shrink-0 text-amber-600" />
                    ) : (
                      <Lock className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <span className="text-xs font-extrabold">{b.name}</span>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-extrabold">
                    +{b.points} XP
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] leading-snug">
                  {b.unlocked ? b.description : b.hint}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
