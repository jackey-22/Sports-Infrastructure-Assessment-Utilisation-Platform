import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock3, Loader2, Search, Star, Trophy, UserRound, Users } from "lucide-react";
import { api } from "../../../API/client";
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, PageShell, TableSkeleton } from "../Common/CoachUI";
import AchievementsWorkspace from "../../Common/AchievementsWorkspace";
import { AthletePortfolioModal } from "../../Common/AthletePortfolioView";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
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
  const openEvaluation = async (row) => {
    const sportId = row.nextBooking?.sportId || row.latestBooking?.sportId || row.sports[0]?.id;
    if (!sportId) return setNotice("No sport is associated with this athlete.");
    setNotice("");
    try {
      const response = await api.get(`/api/evaluation-templates/${sportId}`);
      const template = response.data;
      setTemplates((old) => ({ ...old, [row.id]: template }));
      updateForm(row.id, {
        sportId,
        scores: Object.fromEntries(template.parameters.filter((parameter) => parameter.active).map((parameter) => [parameter._id, parameter.evaluationType === "qualitative" ? 5 : parameter.benchmark?.min ?? 0])),
        remarks: "",
      });
      setEvaluationOpen(row.id);
    } catch (error) { setNotice(error.message); }
  };
  const submitEvaluation = async (row) => {
    const form = { sportId: "", scores: {}, remarks: "", ...(forms[row.id] || {}) };
    const template = templates[row.id];
    if (!template) return setNotice("Open the evaluation form before submitting.");
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

  if (loading && !data) return <PageShell><div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div><Card><TableSkeleton rows={6} columns={5} /></Card></PageShell>;
  if (error && !data) return <PageShell><Card><ErrorState message={error.message} onRetry={load} /></Card></PageShell>;

  const summary = data.summary;
  return <PageShell>
    <PageHeader eyebrow="Coach Console · Performance evaluation" title="Athlete performance evaluations" description="Evaluate athletes using the published sport-specific parameters. Scores are calculated out of 100." />
    {notice ? <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="People" value={summary.people} caption="Across all booking attempts" icon={Users} tone="blue" />
      <KpiCard label="Confirmed athletes" value={summary.confirmedAthletes} caption="At least one confirmed booking" icon={CheckCircle2} tone="green" />
      <KpiCard label="Eligible to rate" value={summary.eligibleToRate} caption="Confirmed with an athlete profile" icon={Star} tone="amber" />
      <KpiCard label="Pending payment only" value={summary.pendingOnly} caption="Not eligible for rating yet" icon={Clock3} tone="slate" />
    </div>
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 p-4"><div className="relative max-w-lg"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className={`${input} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search athlete, email, phone or sport" /></div></div>
      {rows.length ? <div className="divide-y divide-slate-100">{rows.map((row) => {
        const form = { sportId: "", scores: {}, remarks: "", ...forms[row.id] };
        const expanded = evaluationOpen === row.id;
        return <article key={row.id} className="p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold text-slate-900">{row.name}</h2>{row.confirmedBookings > 0 ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">CONFIRMED</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">PAYMENT PENDING</span>}</div><p className="mt-1 text-xs text-slate-500">{row.email || "No email"}{row.phone ? ` · ${row.phone}` : ""}</p><p className="mt-2 text-sm font-semibold text-slate-700">{row.sports.map((sport) => sport.name).join(", ") || "Sport unavailable"}</p></div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 xl:min-w-[520px]"><Metric label="Bookings" value={`${row.confirmedBookings}/${row.bookings} confirmed`} /><Metric label="Paid" value={`${row.paidBookings} · ${money.format(row.totalPaid)}`} /><Metric label="Next session" value={row.nextBooking ? `${date(row.nextBooking.date)} · ${row.nextBooking.time?.from || ""}` : "None scheduled"} /><Metric label="Latest score" value={row.latestEvaluation ? `${row.latestEvaluation.totalScore} / 100` : "Not evaluated"} /></div>
            <div className="flex flex-col gap-2 xl:w-44">
              {row.canRate ? (
                <button
                  type="button"
                  onClick={() => {
                    if (evaluationOpen === row.id) setEvaluationOpen(null);
                    else openEvaluation(row);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-900"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  {row.latestEvaluation ? "Evaluate again" : "Evaluate athlete"}
                </button>
              ) : (
                <p className="text-center text-xs font-semibold text-slate-400">
                  {row.evaluationUnavailableReason ||
                    (row.athleteId && !row.eligibleRatingBookings
                      ? "Available after confirmation and payment"
                      : "Athlete profile unavailable")}
                </p>
              )}
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
                </div>
              ) : null}
            </div>
          </div>
          {expanded ? <EvaluationForm rowId={row.id} template={templates[row.id]} form={form} updateForm={updateForm} saving={saving === row.id} onSubmit={() => submitEvaluation(row)} /> : null}
        </article>;
      })}</div> : <EmptyState title="No booked athletes yet" description="An assigned slot is only a schedule. Athletes will appear here after someone starts a booking for that coaching slot." />}
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
  </PageShell>;
}

function Metric({ label, value }) { return <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-700">{value}</p></div>; }

function EvaluationForm({ rowId, template, form, updateForm, saving, onSubmit }) {
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
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-amber-700">{template.sport?.SportName || "Sport"} · Template v{template.version}</p><p className="mt-1 text-sm font-semibold text-slate-700">Enter each parameter mark. The weighted score is calculated out of 100.</p></div><div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm"><p className="text-[10px] font-bold uppercase text-slate-400">Current total</p><p className="text-2xl font-extrabold text-emerald-700">{total.toFixed(2)} / 100</p></div></div>
    <div className="grid gap-3 md:grid-cols-2">{parameters.map((parameter) => <label key={parameter._id} className="rounded-xl border border-white bg-white p-3"><span className="flex items-center justify-between gap-2 text-sm font-bold text-slate-700"><span>{parameter.name}</span><span className="text-xs text-emerald-700">{parameter.weightage}%</span></span><span className="mt-2 block text-xs text-slate-500">{parameter.evaluationType === "qualitative" ? `Rating 0–${parameter.maxScore}` : `Range ${parameter.benchmark?.min ?? "—"}–${parameter.benchmark?.max ?? "—"}`}</span><input required type="number" min={parameter.evaluationType === "qualitative" ? 0 : parameter.benchmark?.min} max={parameter.evaluationType === "qualitative" ? parameter.maxScore : parameter.benchmark?.max} step="1" className={`${input} mt-2`} value={form.scores[parameter._id] ?? ""} onChange={(event) => {
      const value = event.target.value;
      updateForm(rowId, { scores: { [parameter._id]: value === "" ? "" : Number(value) } });
    }} /></label>)}</div>
    <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end"><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Coach observations</span><textarea rows="2" className={input} value={form.remarks} onChange={(event) => updateForm(rowId, { remarks: event.target.value })} placeholder="Add feedback and improvement suggestions" /></label><button type="button" disabled={saving} onClick={onSubmit} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}Submit evaluation</button></div>
  </div>;
}
