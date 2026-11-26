import React, { useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Clock, Loader2, Medal, Plus, Trophy, X, XCircle } from "lucide-react";
import { api } from "../../../API/client";
import { Button, Card, EmptyState, Field, PageHeader, PageShell, inputClass, selectClass } from "../Common/CitizenUI";

const CATEGORIES = ["Tournament Participation", "Gold Medal", "Silver Medal", "Bronze Medal", "Competition Winner", "Championship", "Personal Record", "Other"];

export default function AthletePerformance() {
  const [sports, setSports] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [sportId, setSportId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ sportId: "", title: "", description: "", category: CATEGORIES[0], eventName: "", achievementDate: "", rank: "" });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [sportResult, evaluationResult, achievementResult] = await Promise.all([
        api.get("/getSports"), api.get("/api/athlete/evaluations"), api.get("/api/athlete/achievements"),
      ]);
      setSports(sportResult.data || []);
      setEvaluations(evaluationResult.data || []);
      setAchievements(achievementResult.data || []);
      setSportId((current) => current || evaluationResult.data?.[0]?.sport?._id || "");
    } catch (error) { setNotice(error.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => evaluations.filter((item) => !sportId || String(item.sport?._id || item.sport) === String(sportId)), [evaluations, sportId]);
  const selectedSport = sports.find((item) => String(item._id) === String(sportId));
  const submitAchievement = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/athlete/achievements", { ...form, sportId: form.sportId || sportId });
      setForm({ sportId: form.sportId || sportId, title: "", description: "", category: CATEGORIES[0], eventName: "", achievementDate: "", rank: "" });
      setShowAddForm(false);
      setNotice("Achievement submitted for verification.");
      await load();
    } catch (error) { setNotice(error.message); }
  };

  return <PageShell>
    <PageHeader eyebrow="Athlete performance" title="Performance & achievements" description="Review sport-wise evaluations and submit achievements for verification." />
    {notice ? <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p> : null}
    {loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : <>
      <div className="mb-5 flex flex-wrap items-center gap-3"><label className="text-sm font-bold text-slate-600" htmlFor="performance-sport">Sport</label><select id="performance-sport" className={`${selectClass} max-w-xs`} value={sportId} onChange={(event) => setSportId(event.target.value)}><option value="">All sports</option>{sports.map((sport) => <option key={sport._id} value={sport._id}>{sport.SportName}</option>)}</select></div>
      {visible.length ? <div className="mb-5 grid gap-4 md:grid-cols-2">{visible.map((evaluation) => <Card key={evaluation._id} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{evaluation.sport?.SportName || selectedSport?.SportName || "Sport"}</p><h2 className="mt-1 text-3xl font-extrabold text-slate-900">{evaluation.totalScore}<span className="text-base text-slate-400"> / 100</span></h2></div><Award className="h-7 w-7 text-amber-500" /></div><p className="mt-2 text-sm font-bold text-slate-700">{evaluation.recognition?.label || "Evaluated"} · template v{evaluation.templateVersion}</p><p className="mt-1 text-xs text-slate-500">{new Date(evaluation.evaluationDate).toLocaleDateString()} · Coach {evaluation.coach?.Name || "—"}</p><div className="mt-4 space-y-3">{evaluation.details.map((detail) => <div key={String(detail.parameterId)}><div className="flex justify-between text-xs font-semibold text-slate-600"><span>{detail.parameterName}</span><span>{detail.normalizedScore}/100 · {detail.weightedScore.toFixed(2)} weighted</span></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${detail.normalizedScore}%` }} /></div></div>)}</div>{evaluation.remarks ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{evaluation.remarks}</p> : null}</Card>)}</div> : <Card className="mb-5 p-8"><EmptyState title="No evaluations yet" description="Published coach evaluations will appear here." /></Card>}

      <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-amber-500" />
            <h2 className="text-xl font-extrabold text-slate-900">Achievements</h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">Record your sports achievements, tournament wins, and medals for verification.</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className={showAddForm ? "bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-none border-0" : ""}
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Close Form" : "Submit achievement"}
        </Button>
      </div>

      {showAddForm ? (
        <Card className="mb-6 border-2 border-emerald-500/20 p-5 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Medal className="h-5 w-5 text-emerald-600" />
              <h3 className="font-extrabold text-slate-900">Submit an achievement</h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={submitAchievement} className="grid gap-4 md:grid-cols-2">
            <Field label="Sport">
              <select required className={selectClass} value={form.sportId || sportId} onChange={(event) => setForm({ ...form, sportId: event.target.value })}>
                <option value="">Select sport</option>
                {sports.map((sport) => <option key={sport._id} value={sport._id}>{sport.SportName}</option>)}
              </select>
            </Field>
            <Field label="Category">
              <select className={selectClass} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
                {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="Title">
              <input required placeholder="e.g. State Championship Gold Medal" className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </Field>
            <Field label="Achievement date">
              <input required type="date" className={inputClass} value={form.achievementDate} onChange={(event) => setForm({ ...form, achievementDate: event.target.value })} />
            </Field>
            <Field label="Event / competition">
              <input placeholder="e.g. Gujarat State Athletics Meet 2026" className={inputClass} value={form.eventName} onChange={(event) => setForm({ ...form, eventName: event.target.value })} />
            </Field>
            <Field label="Rank / position">
              <input placeholder="e.g. 1st Place / Winner" className={inputClass} value={form.rank} onChange={(event) => setForm({ ...form, rank: event.target.value })} />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <textarea rows={3} placeholder="Provide details about the achievement, match score, personal records, etc." className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </Field>
            <div className="flex items-center gap-3 md:col-span-2">
              <Button type="submit">
                <Plus className="h-4 w-4" />
                Submit achievement
              </Button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900">Submitted achievements</h3>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {achievements.length} recorded
          </span>
        </div>
        {achievements.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {achievements.map((item) => (
              <div key={item._id} className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200/60">
                      {item.sport?.SportName || "Sport"} · {item.category}
                    </span>
                    {item.verificationStatus === "Verified" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verified
                      </span>
                    ) : item.verificationStatus === "Rejected" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                        <XCircle className="h-3.5 w-3.5 text-rose-600" /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                        <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending
                      </span>
                    )}
                  </div>
                  <h4 className="mt-2.5 font-bold text-slate-900">{item.title}</h4>
                  {item.eventName ? <p className="mt-0.5 text-xs font-medium text-slate-600">Event: {item.eventName}{item.rank ? ` (${item.rank})` : ""}</p> : null}
                  {item.description ? <p className="mt-2 text-xs text-slate-500 line-clamp-3">{item.description}</p> : null}
                </div>
                <div className="mt-4 border-t border-slate-100 pt-2.5 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>{item.achievementDate ? new Date(item.achievementDate).toLocaleDateString() : ""}</span>
                  {item.verifiedBy?.Name ? <span className="font-semibold text-slate-600">Verified by {item.verifiedBy.Name}</span> : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No achievements submitted" description="Click '+ Submit achievement' above to record tournament wins, medals, and milestone records." />
        )}
      </Card>
    </>}
  </PageShell>;
}
