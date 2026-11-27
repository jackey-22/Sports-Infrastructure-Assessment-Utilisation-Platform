import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Plus, Search, Target, X } from "lucide-react";
import { api } from "../../../API/client";
import { Card, EmptyState, PageHeader, PageShell } from "../Common/CoachUI";

const input =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";

export default function CoachGoalsPage() {
  const [data, setData] = useState({ athletes: [], goals: [], summary: { total: 0, active: 0, completed: 0, overdue: 0 } });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAssign, setShowAssign] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    athleteId: "",
    sportId: "",
    title: "",
    goalType: "skill_score",
    targetValue: 85,
    targetdate: "",
    description: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/coach/goals");
      const payload = res.data || { athletes: [], goals: [], summary: { total: 0, active: 0, completed: 0, overdue: 0 } };
      setData(payload);
      if (payload.athletes?.length && !form.athleteId) {
        const first = payload.athletes[0];
        setForm((prev) => ({
          ...prev,
          athleteId: prev.athleteId || first.id,
          sportId: prev.sportId || first.sports?.[0]?.id || "",
        }));
      }
    } catch (err) {
      setNotice(err.message || "Could not load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectedAthlete = useMemo(
    () => (data.athletes || []).find((a) => a.id === form.athleteId) || data.athletes?.[0] || null,
    [data.athletes, form.athleteId]
  );

  const filteredGoals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.goals || []).filter((g) => {
      if (statusFilter !== "all" && String(g.status || "").toLowerCase() !== statusFilter) return false;
      if (q && !`${g.athleteName} ${g.sportName} ${g.title}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data.goals, search, statusFilter]);

  const assignGoal = async (e) => {
    e.preventDefault();
    if (!form.athleteId) return;
    setSaving(true);
    try {
      await api.post(`/api/coach/athletes/${form.athleteId}/goals`, form);
      setNotice("Goal assigned to athlete.");
      setShowAssign(false);
      setForm((prev) => ({ ...prev, title: "", description: "", targetdate: "" }));
      await load();
    } catch (err) {
      setNotice(err.message);
    } finally {
      setSaving(false);
    }
  };

  const { summary } = data;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Coach · Athlete Development"
        title="Athlete Goals"
        description="Assign training targets to your athletes and track their attendance & evaluation progress."
        actions={
          <button
            type="button"
            disabled={!data.athletes?.length}
            onClick={() => setShowAssign((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
          >
            {showAssign ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAssign ? "Close Form" : "Assign Goal"}
          </button>
        }
      />

      {notice ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </div>
      ) : null}

      {/* KPI Strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Goals", value: summary?.total || 0, tone: "text-slate-900", icon: Target },
          { label: "Active", value: summary?.active || 0, tone: "text-emerald-700", icon: Clock3 },
          { label: "Completed", value: summary?.completed || 0, tone: "text-emerald-700", icon: CheckCircle2 },
          { label: "Overdue", value: summary?.overdue || 0, tone: "text-rose-700", icon: AlertTriangle },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500">{kpi.label}</p>
                <Icon className="h-4 w-4 text-slate-400" />
              </div>
              <p className={`mt-2 text-2xl font-extrabold tabular-nums ${kpi.tone}`}>{kpi.value}</p>
            </Card>
          );
        })}
      </div>

      {/* Assign Goal Form */}
      {showAssign ? (
        <Card className="mb-5 border-2 border-emerald-600/20 p-5">
          <h3 className="mb-4 font-extrabold text-slate-900">Assign a goal to an athlete</h3>
          <form onSubmit={assignGoal} className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Athlete *</span>
              <select
                required
                className={input}
                value={form.athleteId}
                onChange={(e) => {
                  const ath = data.athletes.find((a) => a.id === e.target.value);
                  setForm({
                    ...form,
                    athleteId: e.target.value,
                    sportId: ath?.sports?.[0]?.id || "",
                  });
                }}
              >
                {(data.athletes || []).map((ath) => (
                  <option key={ath.id} value={ath.id}>
                    {ath.name} ({ath.rank})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Sport *</span>
              <select
                required
                className={input}
                value={form.sportId}
                onChange={(e) => setForm({ ...form, sportId: e.target.value })}
              >
                {(selectedAthlete?.sports || []).map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Goal title *</span>
              <input
                required
                placeholder="e.g. Reach 85/100 in Badminton evaluation"
                className={input}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Tracking type</span>
              <select
                className={input}
                value={form.goalType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    goalType: e.target.value,
                    targetValue: e.target.value === "skill_score" ? 85 : e.target.value === "attendance" ? 8 : 1,
                  })
                }
              >
                <option value="skill_score">Evaluation Score (/100)</option>
                <option value="attendance">Attendance Sessions</option>
                <option value="custom">Custom Milestone</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Target value *</span>
              <input
                required
                type="number"
                min={1}
                max={form.goalType === "skill_score" ? 100 : 365}
                className={input}
                value={form.targetValue}
                onChange={(e) => setForm({ ...form, targetValue: Number(e.target.value) })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Deadline</span>
              <input
                type="date"
                className={input}
                value={form.targetdate}
                onChange={(e) => setForm({ ...form, targetdate: e.target.value })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-bold text-slate-600">Instructions</span>
              <input
                placeholder="Drill focus or attendance expectations"
                className={input}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAssign(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Assign Goal
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {/* Filter & Search Bar */}
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search athlete, sport or goal..."
              className={`${input} pl-9`}
            />
          </div>
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
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === tab.id
                    ? "bg-emerald-700 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Goals Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
          </div>
        ) : filteredGoals.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Athlete</th>
                  <th className="px-5 py-3.5">Sport</th>
                  <th className="px-5 py-3.5">Goal</th>
                  <th className="px-5 py-3.5 w-48">Progress</th>
                  <th className="px-5 py-3.5">Source</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Deadline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGoals.map((g) => {
                  const target = Math.max(1, Number(g.targetValue) || 1);
                  const current = Number(g.currentValue) || 0;
                  const pct = Math.min(100, Math.round((current / target) * 100));
                  return (
                    <tr key={`${g.athleteId}-${g._id}`} className="hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{g.athleteName}</td>
                      <td className="px-5 py-3.5 text-slate-600">{g.sportName}</td>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-800">{g.title}</p>
                        {g.description ? <p className="text-xs text-slate-400">{g.description}</p> : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                g.status === "Completed"
                                  ? "bg-emerald-600"
                                  : g.status === "Overdue"
                                  ? "bg-rose-500"
                                  : "bg-emerald-700"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold tabular-nums text-slate-700">
                            {current}/{target}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            g.assignedByRole === "coach"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {g.assignedByRole === "coach" ? "Coach" : "Self"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                            g.status === "Completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : g.status === "Overdue"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {g.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {g.targetdate ? new Date(g.targetdate).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              title="No athlete goals yet"
              description="Click 'Assign Goal' above to set a training target for any athlete in your coaching batch."
            />
          </div>
        )}
      </Card>
    </PageShell>
  );
}
