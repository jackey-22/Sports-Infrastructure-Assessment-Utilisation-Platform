import React, { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, MessageSquarePlus, RefreshCw } from "lucide-react";
import { api, API_BASE_URL } from "../../API/client";
import { getPublicFacilities } from "../../services/public/publicFacilityService";

const inputClass = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500";
const fileUrl = (value) => /^https?:\/\//i.test(value || "") ? value : `${API_BASE_URL}${value || ""}`;

export default function GrievanceWorkspace({ role }) {
  const [rows, setRows] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ sportsComplex: "", subject: "", description: "", proof: null });
  const [responses, setResponses] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get(`/api/grievances${role === "admin" ? "?escalated=false" : ""}`);
      setRows(result.data || []);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }, [role]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (role === "citizen") getPublicFacilities().then(setFacilities).catch(() => setFacilities([]));
  }, [role]);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      let proof = {};
      if (form.proof) {
        const uploadForm = new FormData();
        uploadForm.append("file", form.proof);
        const uploaded = await api.upload("/api/uploads/attachment", uploadForm);
        proof = { proofUrl: uploaded.data.url, proofName: uploaded.data.name, proofKey: uploaded.data.key };
      }
      await api.post("/api/grievances", {
        sportsComplex: form.sportsComplex,
        subject: form.subject,
        description: form.description,
        ...proof,
      });
      setForm({ sportsComplex: "", subject: "", description: "", proof: null }); setMessage("Grievance raised successfully."); await load();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const respond = async (id, resolve) => {
    const response = String(responses[id] || "").trim();
    if (!response) return setMessage("Enter a response first.");
    setSaving(true);
    try { await api.post(`/api/grievances/${id}/respond`, { response, resolve }); setResponses((old) => ({ ...old, [id]: "" })); await load(); }
    catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  return <div className="space-y-6 p-4 sm:p-6">
    <div className="flex items-center justify-between"><div><h1 className="text-2xl font-extrabold text-slate-900">Grievances</h1><p className="text-sm text-slate-500">Facility complaints, responses and deadline escalation.</p></div><button onClick={load} className="rounded-xl border border-slate-200 p-2"><RefreshCw className="h-4 w-4" /></button></div>
    {message ? <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</div> : null}
    {role === "citizen" ? <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <div className="md:col-span-2 flex items-center gap-2 font-extrabold"><MessageSquarePlus className="h-5 w-5 text-blue-600" />Raise a facility complaint</div>
      <label className="text-xs font-bold text-slate-600">Facility<select required className={`${inputClass} mt-1`} value={form.sportsComplex} onChange={(e) => setForm({ ...form, sportsComplex: e.target.value })}><option value="">Select facility</option>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">Title<input required className={`${inputClass} mt-1`} placeholder="Short title for your complaint" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
      <label className="md:col-span-2 text-xs font-bold text-slate-600">Complaint<textarea required rows="4" className={`${inputClass} mt-1`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="text-xs font-bold text-slate-600">Photo/PDF (optional)<input type="file" accept="image/png,image/jpeg,application/pdf" className="mt-1 block text-sm" onChange={(e) => setForm({ ...form, proof: e.target.files?.[0] || null })} /></label>
      <div className="flex items-end justify-end"><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Uploading & submitting…" : "Submit grievance"}</button></div>
    </form> : null}
    {loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div> : <div className="space-y-4">{rows.map((item) => {
      const escalated = item.workflowStatus === "Escalated";
      return <article key={item._id} className={`rounded-2xl border bg-white p-5 shadow-sm ${escalated ? "border-red-300" : "border-slate-200"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-extrabold text-slate-900">{item.subject || "Facility grievance"}</h2><p className="text-xs text-slate-500">{item.sportsComplex?.name} · {item.userId?.Name || "Citizen"}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${escalated ? "bg-red-100 text-red-700" : item.workflowStatus === "Resolved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{escalated ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{item.workflowStatus || "Open"}</span></div>
        <p className="mt-4 text-sm text-slate-700">{item.Description}</p>
        {item.photo ? <a href={fileUrl(item.photo)} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-blue-700">View {item.proofName || "attachment"}</a> : null}
        {item.dueAt && item.workflowStatus === "Open" ? <p className="mt-2 text-xs font-semibold text-amber-700">Manager response due: {new Date(item.dueAt).toLocaleString()}</p> : null}
        {(item.remarks || []).length ? <div className="mt-4 space-y-2 border-t pt-3">{item.remarks.map((remark, index) => <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{remark.userId?.Name || "Staff"}:</b> {remark.remark}</div>)}</div> : null}
        {role !== "citizen" && item.workflowStatus !== "Resolved" && (role !== "admin" || escalated) ? <div className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row"><textarea className={`${inputClass} flex-1`} rows="2" placeholder="Write response or query..." value={responses[item._id] || ""} onChange={(e) => setResponses({ ...responses, [item._id]: e.target.value })} /><div className="flex gap-2"><button disabled={saving} onClick={() => respond(item._id, false)} className="rounded-xl border border-blue-300 px-4 text-sm font-bold text-blue-700">Respond</button><button disabled={saving} onClick={() => respond(item._id, true)} className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white"><CheckCircle2 className="h-4 w-4" />Resolve</button></div></div> : null}
      </article>;
    })}{!rows.length ? <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-slate-500">No grievances found.</div> : null}</div>}
  </div>;
}
