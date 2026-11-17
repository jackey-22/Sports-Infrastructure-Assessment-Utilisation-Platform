import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileCheck2, IndianRupee, Loader2, MessageCircleQuestion } from "lucide-react";
import { api, API_BASE_URL } from "../../API/client";
import { getPublicFacilities } from "../../services/public/publicFacilityService";

const field = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500";

export default function GrantWorkspace({ role }) {
  const [rows, setRows] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [grantForm, setGrantForm] = useState({ facility: "", title: "", purpose: "", allocatedAmount: "", startDate: "", dueDate: "" });
  const [progress, setProgress] = useState({});
  const [queries, setQueries] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try { const result = await api.get(role === "admin" ? "/api/admin/grants" : "/api/manager/grants"); setRows(result.data || []); }
    catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }, [role]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (role === "admin") getPublicFacilities().then(setFacilities).catch(() => []); }, [role]);

  const allocate = async (event) => {
    event.preventDefault();
    try { await api.post("/api/admin/grants", { ...grantForm, allocatedAmount: Number(grantForm.allocatedAmount) }); setGrantForm({ facility: "", title: "", purpose: "", allocatedAmount: "", startDate: "", dueDate: "" }); setMessage("Grant allocated."); await load(); }
    catch (error) { setMessage(error.message); }
  };

  const submitProgress = async (grantId) => {
    const value = progress[grantId] || {};
    const data = new FormData(); data.append("percent", value.percent || ""); data.append("amountUsed", value.amountUsed || ""); data.append("note", value.note || ""); if (value.proof) data.append("proof", value.proof);
    try { await api.upload(`/api/manager/grants/${grantId}/progress`, data); setProgress((old) => ({ ...old, [grantId]: {} })); setMessage("Progress and proof submitted."); await load(); }
    catch (error) { setMessage(error.message); }
  };

  const review = async (grantId, progressId, decision) => {
    try { await api.patch(`/api/admin/grants/${grantId}/progress/${progressId}`, { decision, note: queries[progressId] || "" }); setMessage(`Progress ${decision.toLowerCase()}.`); await load(); }
    catch (error) { setMessage(error.message); }
  };

  return <div className="space-y-6 p-4 sm:p-6">
    <div><h1 className="text-2xl font-extrabold text-slate-900">Grant management</h1><p className="text-sm text-slate-500">Allocation, progress evidence, verification and queries.</p></div>
    {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div> : null}
    {role === "admin" ? <form onSubmit={allocate} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
      <h2 className="md:col-span-2 font-extrabold">Allocate a grant</h2>
      <label className="text-xs font-bold">Facility<select required className={`${field} mt-1`} value={grantForm.facility} onChange={(e) => setGrantForm({ ...grantForm, facility: e.target.value })}><option value="">Select facility</option>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-bold">Grant title<input required className={`${field} mt-1`} value={grantForm.title} onChange={(e) => setGrantForm({ ...grantForm, title: e.target.value })} /></label>
      <label className="text-xs font-bold">Amount (INR)<input required min="1" type="number" className={`${field} mt-1`} value={grantForm.allocatedAmount} onChange={(e) => setGrantForm({ ...grantForm, allocatedAmount: e.target.value })} /></label>
      <label className="text-xs font-bold">Purpose<textarea required className={`${field} mt-1`} value={grantForm.purpose} onChange={(e) => setGrantForm({ ...grantForm, purpose: e.target.value })} /></label>
      <label className="text-xs font-bold">Start date<input type="date" className={`${field} mt-1`} value={grantForm.startDate} onChange={(e) => setGrantForm({ ...grantForm, startDate: e.target.value })} /></label>
      <label className="text-xs font-bold">Progress due date<input type="date" className={`${field} mt-1`} value={grantForm.dueDate} onChange={(e) => setGrantForm({ ...grantForm, dueDate: e.target.value })} /></label>
      <div className="md:col-span-2 flex justify-end"><button className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white">Allocate grant</button></div>
    </form> : null}
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div> : <div className="space-y-5">{rows.map((grant) => <article key={grant._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-extrabold text-slate-900">{grant.title}</h2><p className="text-xs text-slate-500">{grant.facility?.name}</p></div><div className="text-right"><p className="inline-flex items-center font-extrabold text-emerald-700"><IndianRupee className="h-4 w-4" />{Number(grant.allocatedAmount).toLocaleString("en-IN")}</p><p className="text-xs font-bold text-slate-500">{grant.status}</p></div></div>
      <p className="mt-3 text-sm text-slate-700">{grant.purpose}</p>
      {role === "manager" ? <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 md:grid-cols-2"><input type="number" min="0" max="100" className={field} placeholder="Progress %" value={progress[grant._id]?.percent || ""} onChange={(e) => setProgress({ ...progress, [grant._id]: { ...progress[grant._id], percent: e.target.value } })} /><input type="number" min="0" className={field} placeholder="Amount used" value={progress[grant._id]?.amountUsed || ""} onChange={(e) => setProgress({ ...progress, [grant._id]: { ...progress[grant._id], amountUsed: e.target.value } })} /><textarea className={`${field} md:col-span-2`} placeholder="Progress details and usage explanation" value={progress[grant._id]?.note || ""} onChange={(e) => setProgress({ ...progress, [grant._id]: { ...progress[grant._id], note: e.target.value } })} /><input type="file" accept="image/png,image/jpeg,application/pdf" onChange={(e) => setProgress({ ...progress, [grant._id]: { ...progress[grant._id], proof: e.target.files?.[0] } })} /><button onClick={() => submitProgress(grant._id)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Submit progress & proof</button></div> : null}
      {(grant.progressUpdates || []).length ? <div className="mt-5 space-y-3 border-t pt-4"><h3 className="font-bold">Progress submissions</h3>{grant.progressUpdates.map((item) => <div key={item._id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between"><b>{item.percent}% complete</b><span className="text-xs font-bold text-slate-500">{item.reviewStatus}</span></div><p className="mt-1 text-sm">{item.note}</p><p className="mt-1 text-xs text-slate-500">Used: ₹{Number(item.amountUsed).toLocaleString("en-IN")}</p>{item.proofUrl ? <a className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700" href={`${API_BASE_URL}${item.proofUrl}`} target="_blank" rel="noreferrer"><FileCheck2 className="h-4 w-4" />View proof</a> : null}{item.adminNote ? <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs font-semibold text-amber-800">Admin: {item.adminNote}</p> : null}
        {role === "admin" && item.reviewStatus === "Pending" ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className={`${field} flex-1`} placeholder="Query note (required when raising query)" value={queries[item._id] || ""} onChange={(e) => setQueries({ ...queries, [item._id]: e.target.value })} /><button onClick={() => review(grant._id, item._id, "Verified")} className="inline-flex items-center justify-center gap-1 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Verify</button><button onClick={() => review(grant._id, item._id, "Query Raised")} className="inline-flex items-center justify-center gap-1 rounded-xl bg-amber-500 px-4 text-sm font-bold"><MessageCircleQuestion className="h-4 w-4" />Raise query</button></div> : null}</div>)}</div> : null}
    </article>)}{!rows.length ? <div className="rounded-2xl border border-dashed p-12 text-center text-slate-500">No grants found.</div> : null}</div>}
  </div>;
}
