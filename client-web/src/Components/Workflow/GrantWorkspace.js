import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, IndianRupee, Loader2, MessageCircleQuestion } from "lucide-react";
import { api, API_BASE_URL } from "../../API/client";
import { getPublicFacilities } from "../../services/public/publicFacilityService";

const field = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500";
const rupees = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const fileUrl = (value) => /^https?:\/\//i.test(value || "") ? value : `${API_BASE_URL}${value || ""}`;

function baselineFrom(updates) {
  return updates.filter((item) => item.reviewStatus === "Verified").reduce((result, item) => ({
    percent: Math.max(result.percent, Number(item.percent) || 0),
    amountUsed: Math.max(result.amountUsed, Number(item.amountUsed) || 0),
  }), { percent: 0, amountUsed: 0 });
}

function percentForAmount(grant, amountUsed) {
  if (!Number.isFinite(amountUsed) || !Number(grant.allocatedAmount)) return 0;
  return Math.round(((amountUsed / Number(grant.allocatedAmount)) * 100) * 100) / 100;
}

function cumulativeError(grant, amountUsed, baseline, submittedPercent = null) {
  if (!Number.isFinite(amountUsed) || amountUsed <= baseline.amountUsed) {
    return `Cumulative usage must be greater than ${rupees(baseline.amountUsed)}.`;
  }
  if (amountUsed > Number(grant.allocatedAmount)) return "Cumulative usage cannot exceed the grant allocation.";
  const calculated = percentForAmount(grant, amountUsed);
  if (submittedPercent !== null && Math.abs(Number(submittedPercent) - calculated) > 0.01) {
    return `The percentage should be ${calculated}% for ${rupees(amountUsed)} usage.`;
  }
  return "";
}

export default function GrantWorkspace({ role }) {
  const [rows, setRows] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [grantForm, setGrantForm] = useState({ facility: "", title: "", purpose: "", allocatedAmount: "", startDate: "", dueDate: "" });
  const [progress, setProgress] = useState({});
  const [submittingProgress, setSubmittingProgress] = useState({});
  const [queries, setQueries] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get(role === "admin" ? "/api/admin/grants" : "/api/manager/grants");
      setRows(result.data || []);
    } catch (error) { setNotice({ tone: "error", text: error.message }); }
    finally { setLoading(false); }
  }, [role]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (role === "admin") getPublicFacilities().then(setFacilities).catch(() => setFacilities([])); }, [role]);

  const allocate = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/admin/grants", { ...grantForm, allocatedAmount: Number(grantForm.allocatedAmount) });
      setGrantForm({ facility: "", title: "", purpose: "", allocatedAmount: "", startDate: "", dueDate: "" });
      setNotice({ tone: "success", text: "Grant allocated." });
      await load();
    } catch (error) { setNotice({ tone: "error", text: error.message }); }
  };

  const submitProgress = async (grantId) => {
    const value = progress[grantId] || {};
    setSubmittingProgress((old) => ({ ...old, [grantId]: true }));
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", value.proof);
      const uploaded = await api.upload("/api/uploads/attachment", uploadForm);
      await api.post(`/api/manager/grants/${grantId}/progress`, {
        amountUsed: Number(value.amountUsed),
        note: value.note,
        proofUrl: uploaded.data.url,
        proofName: uploaded.data.name,
        proofKey: uploaded.data.key,
        proofSize: uploaded.data.size,
        proofMimeType: uploaded.data.mimeType,
      });
      setProgress((old) => ({ ...old, [grantId]: {} }));
      setNotice({ tone: "success", text: "Cumulative milestone submitted for Admin review." });
      await load();
    } catch (error) { setNotice({ tone: "error", text: error.message }); }
    finally { setSubmittingProgress((old) => ({ ...old, [grantId]: false })); }
  };

  const review = async (grantId, progressId, decision) => {
    try {
      await api.patch(`/api/admin/grants/${grantId}/progress/${progressId}`, { decision, note: queries[progressId] || "" });
      setNotice({ tone: "success", text: `Milestone ${decision.toLowerCase()}.` });
      await load();
    } catch (error) { setNotice({ tone: "error", text: error.message }); }
  };

  return <div className="space-y-6 p-4 sm:p-6">
    <div><h1 className="text-2xl font-extrabold text-slate-900">Grant management</h1><p className="text-sm text-slate-500">Cumulative milestones, usage evidence, verification and queries.</p></div>
    {notice ? <div className={`rounded-xl px-4 py-3 text-sm font-semibold ${notice.tone === "error" ? "bg-rose-50 text-rose-800" : "bg-emerald-50 text-emerald-800"}`}>{notice.text}</div> : null}
    {role === "admin" ? <form onSubmit={allocate} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <h2 className="font-extrabold md:col-span-2">Allocate a grant</h2>
      <label className="text-xs font-bold">Facility<select required className={`${field} mt-1`} value={grantForm.facility} onChange={(event) => setGrantForm({ ...grantForm, facility: event.target.value })}><option value="">Select facility</option>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-bold">Grant title<input required className={`${field} mt-1`} value={grantForm.title} onChange={(event) => setGrantForm({ ...grantForm, title: event.target.value })} /></label>
      <label className="text-xs font-bold">Amount (INR)<input required min="1" type="number" className={`${field} mt-1`} value={grantForm.allocatedAmount} onChange={(event) => setGrantForm({ ...grantForm, allocatedAmount: event.target.value })} /></label>
      <label className="text-xs font-bold">Purpose<textarea required className={`${field} mt-1`} value={grantForm.purpose} onChange={(event) => setGrantForm({ ...grantForm, purpose: event.target.value })} /></label>
      <label className="text-xs font-bold">Start date<input type="date" className={`${field} mt-1`} value={grantForm.startDate} onChange={(event) => setGrantForm({ ...grantForm, startDate: event.target.value })} /></label>
      <label className="text-xs font-bold">Progress due date<input type="date" className={`${field} mt-1`} value={grantForm.dueDate} onChange={(event) => setGrantForm({ ...grantForm, dueDate: event.target.value })} /></label>
      <div className="flex justify-end md:col-span-2"><button className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white">Allocate grant</button></div>
    </form> : null}
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div> : <div className="space-y-5">
      {rows.map((grant) => <GrantCard key={grant._id} {...{ grant, role, progress, setProgress, submitProgress, submittingProgress, queries, setQueries, review }} />)}
      {!rows.length ? <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">No grants found.</div> : null}
    </div>}
  </div>;
}

function GrantCard({ grant, role, progress, setProgress, submitProgress, submittingProgress, queries, setQueries, review }) {
  const updates = [...(grant.progressUpdates || [])].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  const pending = updates.filter((item) => item.reviewStatus === "Pending");
  const baseline = baselineFrom(updates);
  const draft = progress[grant._id] || {};
  const amountUsed = draft.amountUsed === "" || draft.amountUsed == null ? NaN : Number(draft.amountUsed);
  const calculatedPercent = percentForAmount(grant, amountUsed);
  const validation = cumulativeError(grant, amountUsed, baseline);
  const complete = baseline.amountUsed >= Number(grant.allocatedAmount);
  const canSubmit = !pending.length && !complete && !validation && String(draft.note || "").trim() && draft.proof;
  const updateDraft = (key, value) => setProgress((old) => ({ ...old, [grant._id]: { ...old[grant._id], [key]: value } }));

  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-extrabold text-slate-900">{grant.title}</h2><p className="text-xs text-slate-500">{grant.facility?.name}</p></div><div className="text-right"><p className="inline-flex items-center font-extrabold text-emerald-700"><IndianRupee className="h-4 w-4" />{Number(grant.allocatedAmount).toLocaleString("en-IN")}</p><p className="text-xs font-bold text-slate-500">{grant.status}</p></div></div>
    <p className="mt-3 text-sm text-slate-700">{grant.purpose}</p>
    <div className="mt-4 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
      <Summary label="Verified utilisation" value={`${baseline.percent}%`} />
      <Summary label="Verified usage" value={rupees(baseline.amountUsed)} />
      <Summary label="Allocation remaining" value={rupees(Number(grant.allocatedAmount) - baseline.amountUsed)} />
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 sm:col-span-3"><div className="h-full rounded-full bg-emerald-600" style={{ width: `${baseline.percent}%` }} /></div>
    </div>
    {role === "manager" && pending.length ? <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">A milestone is awaiting Admin review. The next milestone can be submitted after it is verified or queried.</div> : null}
    {role === "manager" && complete && !pending.length ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">This grant has reached 100% verified utilisation.</div> : null}
    {role === "manager" && !pending.length && !complete ? <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
      <Labeled label="Cumulative amount used (₹)"><input type="number" min={baseline.amountUsed + 1} max={Number(grant.allocatedAmount)} className={field} placeholder={`Up to ${rupees(grant.allocatedAmount)}`} value={draft.amountUsed || ""} onChange={(event) => updateDraft("amountUsed", event.target.value)} /></Labeled>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Automatically calculated utilisation</p><p className="mt-1 text-xl font-extrabold text-emerald-900">{Number.isFinite(amountUsed) ? `${calculatedPercent}%` : "—"}</p></div>
      <div className="md:col-span-2"><p className="text-xs text-slate-500">Enter the total amount used so far. Utilisation is calculated automatically from the {rupees(grant.allocatedAmount)} allocation.</p>{draft.amountUsed && validation ? <p className="mt-1 text-xs font-bold text-rose-600">{validation}</p> : null}</div>
      <textarea className={`${field} md:col-span-2`} placeholder="Describe completed work and cumulative expenditure" value={draft.note || ""} onChange={(event) => updateDraft("note", event.target.value)} />
      <Labeled label="Usage proof (PDF, JPG or PNG)"><input type="file" accept="image/png,image/jpeg,application/pdf" onChange={(event) => updateDraft("proof", event.target.files?.[0])} /></Labeled>
      <button type="button" disabled={!canSubmit || submittingProgress[grant._id]} onClick={() => submitProgress(grant._id)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{submittingProgress[grant._id] ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{submittingProgress[grant._id] ? "Uploading proof…" : "Submit milestone for review"}</button>
    </div> : null}
    {updates.length ? <div className="mt-5 space-y-3 border-t pt-4"><h3 className="font-bold">Milestone history</h3>{updates.map((item, index) => <Milestone key={item._id} {...{ item, index, updates, pending, grant, role, queries, setQueries, review }} />)}</div> : null}
  </article>;
}

function Milestone({ item, index, updates, pending, grant, role, queries, setQueries, review }) {
  const itemError = cumulativeError(grant, Number(item.amountUsed), baselineFrom(updates.slice(0, index)), Number(item.percent));
  const isFirstPending = pending[0] && String(pending[0]._id) === String(item._id);
  return <div className={`rounded-xl border p-4 ${itemError ? "border-rose-200 bg-rose-50/40" : "border-slate-200"}`}>
    <div className="flex flex-wrap justify-between gap-2"><b>{item.percent}% cumulative utilisation</b><span className="text-xs font-bold text-slate-500">{item.reviewStatus}</span></div>
    <p className="mt-1 text-sm">{item.note}</p><p className="mt-1 text-xs text-slate-500">Cumulative usage: {rupees(item.amountUsed)}</p>
    {itemError ? <p className="mt-2 rounded-lg bg-rose-100 p-2 text-xs font-bold text-rose-700">Invalid milestone: {itemError}</p> : null}
    {item.proofUrl ? <a className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700" href={fileUrl(item.proofUrl)} target="_blank" rel="noreferrer"><FileCheck2 className="h-4 w-4" />View {item.proofName || "proof"}</a> : null}
    {item.adminNote ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800">Admin: {item.adminNote}</p> : null}
    {role === "admin" && item.reviewStatus === "Pending" ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className={`${field} flex-1`} placeholder="Query note (required when raising query)" value={queries[item._id] || ""} onChange={(event) => setQueries({ ...queries, [item._id]: event.target.value })} /><button type="button" disabled={!isFirstPending || Boolean(itemError)} onClick={() => review(grant._id, item._id, "Verified")} className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />Verify</button><button type="button" disabled={!isFirstPending} onClick={() => review(grant._id, item._id, "Query Raised")} className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold disabled:opacity-40"><MessageCircleQuestion className="h-4 w-4" />Raise query</button></div> : null}
  </div>;
}

function Summary({ label, value }) { return <div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-lg font-extrabold text-slate-800">{value}</p></div>; }
function Labeled({ label, children }) { return <label><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>; }
