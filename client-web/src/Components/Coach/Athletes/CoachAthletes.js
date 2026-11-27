import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, Search, Target, Trophy, UserRound, X } from "lucide-react";
import { api } from "../../../API/client";
import { Card, EmptyState, ErrorState, PageHeader, PageShell, TableSkeleton } from "../Common/CoachUI";
import AchievementsWorkspace from "../../Common/AchievementsWorkspace";
import { AthletePortfolioModal } from "../../Common/AthletePortfolioView";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";
const date = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Stars({ value, onChange, disabled = false }) {
  return <div className="flex gap-1" role="radiogroup" aria-label="Athlete rating">{[1, 2, 3, 4, 5].map((star) => <button key={star} type="button" disabled={disabled} onClick={() => onChange(star)} className="rounded p-0.5 disabled:cursor-default" aria-label={`${star} star`}><Star className={`h-6 w-6 ${star <= value ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} /></button>)}</div>;
}

export default function CoachAthletes() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [evaluationOpen, setEvaluationOpen] = useState(null);
  const [templates, setTemplates] = useState({});
  const [forms, setForms] = useState({});
  const [saving, setSaving] = useState(null);
  const [notice, setNotice] = useState("");
  const [achievementsAthlete, setAchievementsAthlete] = useState(null);
  const [goalAthlete, setGoalAthlete] = useState(null);
  const [goalForm, setGoalForm] = useState({ title: "", sportId: "", goalType: "skill_score", targetValue: 85, targetdate: "", description: "" });
  const [goalSaving, setGoalSaving] = useState(false);
  const [portfolioAthleteId, setPortfolioAthleteId] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const response = await api.get("/api/coach/rateable-athletes"); setData(response.data); }
    catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data?.athletes || [];
    return (data?.athletes || []).filter((row) => [row.name, row.email, row.phone, ...row.sports.map((sport) => sport.name)].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [data, search]);

  const updateForm = (id, patch) =>
    setForms((old) => {
      const current = { sportId: "", scores: {}, remarks: "", ...(old[id] || {}) };
      return {
        ...old,
        [id]: {
          ...current,
          ...patch,
          scores: patch.scores
            ? { ...current.scores, ...patch.scores }
            : current.scores,
        },
      };
    });
  const openEvaluation = async (row, session) => {
    if (!session) return;
    if (evaluationOpen === row.id && forms[row.id]?.bookingId === session.id) {
      setEvaluationOpen(null);
      return;
    }
    const sportId = session.sportId || row.sports[0]?.id;
    if (!sportId) return setNotice("No sport is associated with this session.");
    setNotice("");
    try {
      const response = await api.get(`/api/evaluation-templates/${sportId}`);
      const template = response.data;
      setTemplates((old) => ({ ...old, [row.id]: template }));
      const savedDetails =
        session.evaluationDetails?.length
          ? session.evaluationDetails
          : session.isEvaluated && String(row.latestEvaluation?.sport?._id || row.latestEvaluation?.sport || "") === String(sportId)
            ? row.latestEvaluation?.details || []
            : [];
      const savedByParam = new Map(
        savedDetails.map((detail) => [String(detail.parameterId?._id || detail.parameterId), detail.actualValue])
      );
      const savedRemarks =
        session.evaluationRemarks ||
        (session.isEvaluated && String(row.latestEvaluation?.sport?._id || row.latestEvaluation?.sport || "") === String(sportId)
          ? row.latestEvaluation?.remarks || ""
          : "");
      updateForm(row.id, {
        sportId,
        bookingId: session.id,
        sessionLabel: `${session.sport || "Session"} · ${date(session.date)}${session.time?.from ? ` · ${session.time.from}` : ""}`,
        isUpdate: Boolean(session.isEvaluated),
        scores: Object.fromEntries(
          template.parameters
            .filter((parameter) => parameter.active)
            .map((parameter) => [
              parameter._id,
              savedByParam.has(String(parameter._id))
                ? savedByParam.get(String(parameter._id))
                : parameter.evaluationType === "qualitative"
                  ? 5
                  : parameter.benchmark?.min ?? 0,
            ])
        ),
        remarks: savedRemarks,
      });
      setEvaluationOpen(row.id);
    } catch (error) { setNotice(error.message); }
  };
  const submitEvaluation = async (row) => {
    const form = { sportId: "", bookingId: null, scores: {}, remarks: "", ...(forms[row.id] || {}) };
    const template = templates[row.id];
    if (!template) return setNotice("Open a coaching session form before submitting.");
    const activeParameters = template.parameters.filter((parameter) => parameter.active);
    const missing = activeParameters.find((parameter) =>
      form.scores[parameter._id] === undefined ||
      form.scores[parameter._id] === null ||
      form.scores[parameter._id] === ""
    );
    if (missing) return setNotice(`Enter a mark for ${missing.name}.`);
    setSaving(row.id); setNotice("");
    try {
      await api.post("/api/coach/evaluations", {
        athleteId: row.athleteId,
        sportId: form.sportId,
        ...(form.bookingId ? { bookingId: form.bookingId } : {}),
        details: template.parameters.filter((parameter) => parameter.active).map((parameter) => ({
          parameterId: parameter._id,
          actualValue: Number(form.scores[parameter._id]),
        })),
        remarks: form.remarks,
      });
      setNotice(`Performance evaluation saved for ${row.name}.`);
      setEvaluationOpen(null);
      await load();
    } catch (saveError) { setNotice(saveError.message); }
    finally { setSaving(null); }
  };

  if (loading && !data) return <PageShell><Card><TableSkeleton rows={6} columns={5} /></Card></PageShell>;
  if (error && !data) return <PageShell><Card><ErrorState message={error.message} onRetry={load} /></Card></PageShell>;

  const summary = data.summary || {};
  const athleteCount = summary.confirmedAthletes ?? rows.length;
  return <PageShell>
    <PageHeader eyebrow="Coach Console · Performance evaluation" title="Athlete performance evaluations" description="Evaluate played coaching sessions using published sport parameters. Scores are calculated out of 100." />
    {notice ? <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className={`${input} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search athlete, email, phone or sport" /></div>
        <p className="text-xs font-semibold text-slate-600">
          <span className="font-extrabold text-emerald-700">{athleteCount}</span>{" "}
          confirmed {athleteCount === 1 ? "athlete" : "athletes"} under your coaching
        </p>
      </div>
      {rows.length ? <div className="divide-y divide-slate-100">{rows.map((row) => {
        const form = { sportId: "", bookingId: null, sessionLabel: "", isUpdate: false, scores: {}, remarks: "", ...forms[row.id] };
        const expanded = evaluationOpen === row.id;
        return <article key={row.id} className="p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-extrabold text-slate-900">{row.name}</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">{row.email || "No email"}{row.phone ? ` · ${row.phone}` : ""}</p>
              <p className="mt-2 text-sm font-semibold text-slate-700">{row.sports.map((sport) => sport.name).join(", ") || "Sport unavailable"}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 xl:min-w-[440px]">
              <Metric label="Coaching Sessions" value={`${row.confirmedBookings}`} />
              <Metric label="Next session" value={row.nextBooking ? `${date(row.nextBooking.date)} · ${row.nextBooking.time?.from || ""}` : "None scheduled"} />
              <Metric label="Latest score" value={row.latestEvaluation ? `${row.latestEvaluation.totalScore} / 100` : "Not evaluated"} />
            </div>
            <div className="flex flex-col gap-2 xl:w-44">
              {row.athleteId ? (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAchievementsAthlete(row)}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                    Awards
                  </button>
                  <button
                    type="button"
                    onClick={() => setPortfolioAthleteId(row.athleteId)}
                    className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:border-brand-primary hover:text-brand-primary transition"
                  >
                    <UserRound className="h-3.5 w-3.5" />
                    Portfolio
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGoalAthlete(row);
                      setGoalForm({
                        title: "",
                        sportId: row.sports?.[0]?.id || "",
                        goalType: "skill_score",
                        targetValue: 85,
                        targetdate: "",
                        description: "",
                      });
                    }}
                    className="col-span-2 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100 transition"
                  >
                    <Target className="h-3.5 w-3.5 text-indigo-600" />
                    Assign Goal
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs font-semibold text-slate-400">
                  {row.evaluationUnavailableReason || "Athlete profile unavailable"}
                </p>
              )}
            </div>
          </div>
          {row.sessions?.length ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {row.sessions.map((sess) => {
                const isSelected = expanded && form.bookingId === sess.id;
                return (
                <div key={sess.id} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${isSelected ? "border-amber-400 bg-amber-50/70" : "border-slate-200 bg-slate-50"}`}>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-800">
                      {sess.sport} · {date(sess.date)}
                      {sess.time?.from ? ` · ${sess.time.from}` : ""}
                    </p>
                    <p className={`mt-0.5 font-semibold ${sess.isEvaluated ? "text-emerald-700" : sess.canRate ? "text-amber-700" : "text-slate-500"}`}>
                      {sess.statusText}
                    </p>
                  </div>
                  {sess.canRate ? (
                    <button
                      type="button"
                      onClick={() => openEvaluation(row, sess)}
                      className={`shrink-0 rounded-lg px-2.5 py-1.5 font-bold ${
                        isSelected
                          ? "bg-slate-800 text-white"
                          : sess.isEvaluated
                            ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            : "bg-emerald-700 text-white hover:bg-emerald-800"
                      }`}
                    >
                      {isSelected ? "Close" : sess.isEvaluated ? "Update Score" : "Evaluate Session"}
                    </button>
                  ) : null}
                </div>
                );
              })}
            </div>
          ) : null}
          {expanded ? <EvaluationForm rowId={row.id} template={templates[row.id]} form={form} updateForm={updateForm} saving={saving === row.id} onSubmit={() => submitEvaluation(row)} onCancel={() => setEvaluationOpen(null)} /> : null}
        </article>;
      })}</div> : <EmptyState title="No confirmed coaching athletes yet" description="Athletes with confirmed coaching bookings under your slots will appear here." />}
    </Card>

    {achievementsAthlete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <AchievementsWorkspace
            role="coach"
            athleteId={achievementsAthlete.athleteId}
            athleteName={achievementsAthlete.name}
            embedded
            onClose={() => setAchievementsAthlete(null)}
          />
        </div>
      </div>
    )}

    <AthletePortfolioModal
      athleteId={portfolioAthleteId}
      onClose={() => setPortfolioAthleteId("")}
    />

    {goalAthlete ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Coach Goal Assignment</p>
              <h3 className="text-xl font-extrabold text-slate-900">{goalAthlete.name}</h3>
            </div>
            <button type="button" onClick={() => setGoalAthlete(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setGoalSaving(true);
              try {
                await api.post(`/api/coach/athletes/${goalAthlete.athleteId}/goals`, goalForm);
                setNotice(`Goal assigned to ${goalAthlete.name}.`);
                setGoalAthlete(null);
              } catch (err) {
                setNotice(err.message);
              } finally {
                setGoalSaving(false);
              }
            }}
            className="space-y-4"
          >
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Goal title *</span>
              <input
                required
                placeholder="e.g. Reach 85/100 in Badminton evaluation"
                className={input}
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">Sport *</span>
                <select
                  required
                  className={input}
                  value={goalForm.sportId}
                  onChange={(e) => setGoalForm({ ...goalForm, sportId: e.target.value })}
                >
                  {(goalAthlete.sports || []).map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">Goal type</span>
                <select
                  className={input}
                  value={goalForm.goalType}
                  onChange={(e) => setGoalForm({
                    ...goalForm,
                    goalType: e.target.value,
                    targetValue: e.target.value === "skill_score" ? 85 : e.target.value === "attendance" ? 8 : 1,
                  })}
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
                  max={goalForm.goalType === "skill_score" ? 100 : 365}
                  className={input}
                  value={goalForm.targetValue}
                  onChange={(e) => setGoalForm({ ...goalForm, targetValue: Number(e.target.value) })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold text-slate-600">Deadline</span>
                <input
                  type="date"
                  className={input}
                  value={goalForm.targetdate}
                  onChange={(e) => setGoalForm({ ...goalForm, targetdate: e.target.value })}
                />
              </label>
            </div>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-slate-600">Training instructions</span>
              <textarea
                rows={2}
                placeholder="Key drills or attendance expectations..."
                className={input}
                value={goalForm.description}
                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setGoalAthlete(null)} className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button type="submit" disabled={goalSaving} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {goalSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Target className="h-3.5 w-3.5" />}
                Assign Goal
              </button>
            </div>
          </form>
        </div>
      </div>
    ) : null}
  </PageShell>;
}

function Metric({ label, value }) { return <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-700">{value}</p></div>; }

function EvaluationForm({ rowId, template, form, updateForm, saving, onSubmit, onCancel }) {
  if (!template) return <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Loading the published evaluation template…</div>;
  const parameters = template.parameters.filter((parameter) => parameter.active);
  const total = parameters.reduce((sum, parameter) => {
    const value = Number(form.scores[parameter._id]);
    if (!Number.isFinite(value)) return sum;
    if (parameter.evaluationType === "qualitative") return sum + (value / parameter.maxScore) * parameter.weightage;
    const min = Number(parameter.benchmark?.min);
    const max = Number(parameter.benchmark?.max);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return sum;
    const normalized = parameter.scoringMethod === "lower_is_better"
      ? ((max - value) / (max - min)) * 100
      : ((value - min) / (max - min)) * 100;
    return sum + Math.max(0, Math.min(100, normalized)) * parameter.weightage / 100;
  }, 0);
  return <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
          {form.sessionLabel ? `${form.sessionLabel} · ` : ""}{template.sport?.SportName || "Sport"} · Template v{template.version}
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-700">Enter each parameter mark. The weighted score is calculated out of 100.</p>
      </div>
      <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm">
        <p className="text-[10px] font-bold uppercase text-slate-400">Current total</p>
        <p className="text-2xl font-extrabold text-emerald-700">{total.toFixed(2)} / 100</p>
      </div>
    </div>
    <div className="grid gap-3 md:grid-cols-2">{parameters.map((parameter) => <label key={parameter._id} className="rounded-xl border border-white bg-white p-3"><span className="flex items-center justify-between gap-2 text-sm font-bold text-slate-700"><span>{parameter.name}</span><span className="text-xs text-emerald-700">{parameter.weightage}%</span></span><span className="mt-2 block text-xs text-slate-500">{parameter.evaluationType === "qualitative" ? `Rating 0–${parameter.maxScore}` : `Range ${parameter.benchmark?.min ?? "—"}–${parameter.benchmark?.max ?? "—"}`}</span><input required type="number" min={parameter.evaluationType === "qualitative" ? 0 : parameter.benchmark?.min} max={parameter.evaluationType === "qualitative" ? parameter.maxScore : parameter.benchmark?.max} step="1" className={`${input} mt-2`} value={form.scores[parameter._id] ?? ""} onChange={(event) => {
      const value = event.target.value;
      updateForm(rowId, { scores: { [parameter._id]: value === "" ? "" : Number(value) } });
    }} /></label>)}</div>
    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
      <label>
        <span className="mb-1.5 block text-xs font-bold text-slate-600">Coach observations</span>
        <textarea rows="2" className={input} value={form.remarks} onChange={(event) => updateForm(rowId, { remarks: event.target.value })} placeholder="Add feedback and improvement suggestions" />
      </label>
      <button type="button" onClick={onCancel} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
      <button type="button" disabled={saving} onClick={onSubmit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}{form.isUpdate ? "Update evaluation" : "Save evaluation"}</button>
    </div>
  </div>;
}
