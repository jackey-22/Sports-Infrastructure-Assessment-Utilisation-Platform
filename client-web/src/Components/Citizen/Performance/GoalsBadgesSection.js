import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Crown,
  Flame,
  Lock,
  Plus,
  Share2,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useSelector } from "react-redux";
import { api } from "../../../API/client";
import BadgeShareModal from "./BadgeShareModal";
import {
  Button,
  Card,
  EmptyState,
  Field,
  KpiCard,
  SectionHeader,
  inputClass,
  selectClass,
} from "../Common/CitizenUI";

const GOAL_TYPES = [
  { value: "attendance", label: "Attendance (facility check-ins)", defaultTarget: 10 },
  { value: "skill_score", label: "Evaluation Score (out of 100)", defaultTarget: 85 },
  { value: "custom", label: "Custom Training Milestone", defaultTarget: 1 },
];

export default function GoalsBadgesSection({
  sports = [],
  onNotify,
  showForm = false,
  setShowForm,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [shareBadge, setShareBadge] = useState(null);
  const userName = useSelector((state) => state.user?.user?.Name || "");
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
      if (setShowForm) setShowForm(false);
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
      if (onNotify) onNotify("Goal marked as completed. Badges updated.");
    } catch (err) {
      if (onNotify) onNotify(err.message);
    }
  };

  const deleteGoal = async (goalId) => {
    try {
      const res = await api.del(`/api/athlete/goals/${goalId}`);
      setData(res.data);
      if (onNotify) onNotify("Goal removed.");
    } catch (err) {
      if (onNotify) onNotify(err.message);
    }
  };

  const goals = useMemo(() => data?.goals || [], [data?.goals]);
  const badgeCatalog = data?.badgeCatalog || [];
  const xpPoints = data?.xpPoints || 0;
  const rank = data?.rank;
  const completedCount = goals.filter((g) => g.status === "Completed").length;
  const unlockedCount = badgeCatalog.filter((b) => b.unlocked).length;

  const filteredGoals = useMemo(() => {
    if (statusFilter === "all") return goals;
    return goals.filter((g) => String(g.status || "").toLowerCase() === statusFilter);
  }, [goals, statusFilter]);

  return (
    <div className="space-y-5">
      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Rank Tier"
          value={rank?.current?.name || "Bronze Athlete"}
          caption={rank?.current?.description || "KhelGujarat athlete rank"}
          icon={Crown}
          tone="amber"
        />
        <KpiCard
          label="Total XP"
          value={`${xpPoints} XP`}
          caption={
            rank?.next
              ? `${Math.max(0, rank.next.minPoints - xpPoints)} XP to ${rank.next.name}`
              : "Maximum rank reached"
          }
          icon={Flame}
          tone="green"
        />
        <KpiCard
          label="Goals Completed"
          value={`${completedCount} / ${goals.length}`}
          caption={goals.length ? `${goals.filter((g) => g.status === "Active").length} active` : "No goals yet"}
          icon={Target}
          tone="slate"
        />
        <KpiCard
          label="Milestone Badges"
          value={`${unlockedCount} / ${badgeCatalog.length}`}
          caption="Unlocked across goals & awards"
          icon={Award}
          tone="violet"
        />
      </div>

      {/* Create Goal Form */}
      {showForm ? (
        <Card className="border-2 border-emerald-600/20 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900">Create a training goal</h3>
            <button
              type="button"
              onClick={() => setShowForm && setShowForm(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            >
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

      {/* Main Content Grid */}
      <div className="grid gap-5 lg:grid-cols-12">
        {/* Goals List */}
        <Card className="lg:col-span-7">
          <SectionHeader
            title="Training Goals"
            description="Auto-tracked from gate check-ins and coach evaluations."
            action={
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {[
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "completed", label: "Completed" },
                  { id: "overdue", label: "Overdue" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      statusFilter === tab.id
                        ? "bg-brand-primary text-white shadow-2xs"
                        : "text-slate-600 hover:bg-slate-200/70"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="p-5">
            {loading && !data ? (
              <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
            ) : filteredGoals.length ? (
              <div className="space-y-3">
                {filteredGoals.map((g) => {
                  const target = Math.max(1, Number(g.targetValue) || 1);
                  const current = Number(g.currentValue) || 0;
                  const pct = Math.min(100, Math.round((current / target) * 100));
                  const done = g.status === "Completed";
                  const overdue = g.status === "Overdue";
                  return (
                    <div
                      key={g._id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {g.sport?.SportName ? (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                {g.sport.SportName}
                              </span>
                            ) : null}
                            {g.assignedByRole === "coach" ? (
                              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
                                Coach Assigned
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
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
                          <h4 className="mt-2 font-bold text-slate-900">{g.title}</h4>
                          {g.description ? (
                            <p className="mt-0.5 text-xs text-slate-500">{g.description}</p>
                          ) : null}
                        </div>
                        {g.assignedByRole !== "coach" ? (
                          <button
                            type="button"
                            onClick={() => deleteGoal(g._id)}
                            title="Remove goal"
                            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-xs font-semibold text-slate-600">
                          <span className="tabular-nums">
                            {current} / {target} {g.unit || ""}
                          </span>
                          <span className="font-bold text-slate-800 tabular-nums">{pct}%</span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              done ? "bg-emerald-600" : overdue ? "bg-rose-500" : "bg-brand-primary"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
                        <span>
                          {g.targetdate
                            ? `Due ${new Date(g.targetdate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}`
                            : "No deadline"}
                        </span>
                        {!done && g.goalType === "custom" ? (
                          <button
                            type="button"
                            onClick={() => markComplete(g._id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={statusFilter === "all" ? "No goals set yet" : `No ${statusFilter} goals`}
                description="Use '+ Set Goal' in the top right to start tracking sessions, scores, or training milestones."
              />
            )}
          </div>
        </Card>

        {/* Milestone Badges */}
        <Card className="lg:col-span-5">
          <SectionHeader
            title="Milestone Badges"
            description={`${unlockedCount} of ${badgeCatalog.length} badges unlocked`}
          />
          <div className="divide-y divide-slate-100">
            {badgeCatalog.map((b) => (
              <div
                key={b.badgeKey}
                className={`flex items-start justify-between gap-3 px-5 py-3.5 ${
                  b.unlocked ? "bg-white" : "bg-slate-50/50"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                      b.unlocked
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {b.unlocked ? <Award className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-bold ${
                        b.unlocked ? "text-slate-900" : "text-slate-500"
                      }`}
                    >
                      {b.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {b.unlocked ? b.description : b.hint}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                      b.unlocked
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    +{b.points} XP
                  </span>
                  {b.unlocked ? (
                    <button
                      type="button"
                      onClick={() => setShareBadge(b)}
                      title="Share badge post"
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition"
                    >
                      <Share2 className="h-3 w-3" /> Share
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BadgeShareModal
        badge={shareBadge}
        athleteName={userName}
        rankName={rank?.current?.name}
        xpPoints={xpPoints}
        onClose={() => setShareBadge(null)}
      />
    </div>
  );
}
