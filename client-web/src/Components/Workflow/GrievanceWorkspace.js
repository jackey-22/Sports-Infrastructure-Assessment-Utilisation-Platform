import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock, Loader2, MessageSquarePlus, RefreshCw } from "lucide-react";
import "./GrievanceWorkspace.css";
import { api, API_BASE_URL } from "../../API/client";


const inputClass = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500";
const fileUrl = (value) => /^https?:\/\//i.test(value || "") ? value : `${API_BASE_URL}${value || ""}`;

export default function GrievanceWorkspace({ role }) {
  const citizen = ["citizen", "athlete"].includes(role);
  const [rows, setRows] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ sportsComplex: "", subject: "", description: "", proof: null });
  const [responses, setResponses] = useState({});
  const [view, setView] = useState("mine");
  const [status, setStatus] = useState("all");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true); setMessage(""); setRows([]);
    try {
      const result = await api.get(`/api/grievances?view=${view}`);
      if (currentRequest === requestId.current) setRows(result.data || []);
    } catch (error) { if (currentRequest === requestId.current) setMessage(error.message); }
    finally { if (currentRequest === requestId.current) setLoading(false); }
  }, [view]);

  useEffect(() => { load(); }, [load]);
  const loadFacilities = useCallback(async () => {
    try { const result = await api.get("/api/grievances/facilities"); setFacilities(result.data || []); }
    catch (error) { setMessage(error.message); }
  }, []);
  useEffect(() => { loadFacilities(); }, [loadFacilities]);
  useEffect(() => { window.addEventListener("focus", load); return () => window.removeEventListener("focus", load); }, [load]);


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
      setForm({ sportsComplex: "", subject: "", description: "", proof: null }); await load(); setMessage("Grievance raised successfully. View it in My grievances.");
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  const respond = async (id, resolve, escalate = false) => {
    const response = String(responses[id] || "").trim();
    if (!response) return setMessage("Enter a response first.");
    setSaving(true);
    try { await api.post(`/api/grievances/${id}/${escalate ? "escalate" : "respond"}`, { response, reason: response, resolve, revision: rows.find(row => row._id === id)?.revision }); setResponses((old) => ({ ...old, [id]: "" })); await load(); }
    catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  return <div className="grievance-workspace space-y-6 p-4 sm:p-6">
    <div className="grievance-banner flex items-center justify-between"><div><p className="grievance-eyebrow">Government of Gujarat / Sports Authority of Gujarat (SAG)</p><h1 className="text-2xl font-extrabold text-slate-900">Grievances</h1><p className="text-sm text-slate-500">Report facility issues and track their progress.</p></div><button onClick={() => { load(); loadFacilities(); }} aria-label="Refresh grievances and facilities" className="rounded-xl border border-slate-200 p-2"><RefreshCw className="h-4 w-4" /></button></div>
    {role === "supervisor" && <button onClick={() => { localStorage.removeItem("token"); window.location.assign("/login"); }}>Sign out</button>}
    {role === "gate" && <a href="/gate" className="text-blue-700">Back to gate scanner</a>}
    {message ? <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">{message}</div> : null}
    <form onSubmit={submit} className="grievance-form grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <div className="md:col-span-2 flex items-center gap-2 font-extrabold"><MessageSquarePlus className="h-5 w-5 text-blue-600" />Raise a grievance</div>
      <label className="text-xs font-bold text-slate-600">Facility<select required className={`${inputClass} mt-1`} value={form.sportsComplex} onChange={(e) => setForm({ ...form, sportsComplex: e.target.value })}><option value="">Select facility</option>{facilities.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">Title<input required className={`${inputClass} mt-1`} maxLength={240} placeholder="Short title for your complaint" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></label>
      <label className="md:col-span-2 text-xs font-bold text-slate-600">Complaint<textarea required rows="4" maxLength={5000} className={`${inputClass} mt-1`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <label className="text-xs font-bold text-slate-600">Photo/PDF (optional)<input type="file" accept="image/png,image/jpeg,application/pdf" className="mt-1 block text-sm" onChange={(e) => setForm({ ...form, proof: e.target.files?.[0] || null })} /></label>
      <div className="flex items-end justify-end"><button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? "Uploading & submitting…" : "Submit grievance"}</button></div>
    </form>
    <div className="grievance-filters flex flex-wrap gap-3"><button onClick={() => setView("mine")} aria-pressed={view === "mine"} className="rounded-xl border p-3">My grievances</button>{["admin","authority","manager","supervisor"].includes(role) && <button onClick={() => setView("assigned")} aria-pressed={view === "assigned"} className="rounded-xl border p-3">Assigned grievances</button>}<select aria-label="Filter grievance status" value={status} onChange={e => setStatus(e.target.value)} className={inputClass}><option value="all">All statuses</option>{["Open","Responded","Escalated","Resolved"].map(value => <option key={value}>{value}</option>)}</select></div>
    {loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin" /></div> : <div className="space-y-4">{rows.filter(item => status === "all" || item.workflowStatus === status).map((item) => {
      const escalated = item.workflowStatus === "Escalated";
      return <article key={item._id} className={`grievance-entry rounded-2xl border bg-white p-5 shadow-sm ${escalated ? "border-red-300" : "border-slate-200"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-extrabold text-slate-900">{item.subject || "Facility grievance"}</h2><p className="text-xs text-slate-500">{item.sportsComplex?.name} · {item.userId?.Name || "Citizen"}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${escalated ? "bg-red-100 text-red-700" : item.workflowStatus === "Resolved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{escalated ? <AlertTriangle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}{item.workflowStatus || "Open"} / {item.handlingRole}</span></div>
        <p className="mt-4 text-sm text-slate-700">{item.Description}</p>
        {item.photo ? <a href={fileUrl(item.photo)} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-bold text-blue-700">View {item.proofName || "attachment"}</a> : null}
        {item.dueAt && item.workflowStatus !== "Resolved" ? <p className="mt-2 text-xs font-semibold text-amber-700">{item.handlingRole} deadline{item.overdue ? " (overdue)" : ""}: {new Date(item.dueAt).toLocaleString()}</p> : null}
        <p className="mt-2 text-sm font-semibold">Handling role: {item.handlingRole}</p>
        <div className="mt-4 space-y-2 border-t pt-3">{(item.history?.length ? [...(item.remarks || []).filter(remark => !item.history.some(event => event.reason === remark.remark && String(event.userId?._id || event.userId) === String(remark.userId?._id || remark.userId))), ...item.history] : item.remarks || []).map((event, index) => <div key={index} className="rounded-xl bg-slate-50 p-3 text-sm"><b>{event.userId?.Name || "System"}</b> {event.action || "response"}{event.toLevel !== undefined ? ` to ${["Supervisor","Manager","District Authority","Admin"][event.toLevel]}` : ""}<p>{event.reason || event.remark}</p><small>{event.date ? new Date(event.date).toLocaleString() : ""}</small></div>)}</div>
        {(!citizen && (item.permissions?.canRespond || item.permissions?.canEscalate)) && <div className="mt-4 space-y-3 border-t pt-4"><textarea className={inputClass} rows="2" aria-label="Response or escalation reason" placeholder="Write a response or escalation reason" value={responses[item._id] || ""} onChange={e => setResponses({ ...responses, [item._id]: e.target.value })} /><div className="flex flex-wrap gap-3">{item.permissions.canRespond && <button disabled={saving} onClick={() => respond(item._id, false)} className="rounded-xl border p-3">Respond</button>}{item.permissions.canResolve && <button disabled={saving} onClick={() => respond(item._id, true)} className="rounded-xl bg-emerald-600 p-3 text-white">Resolve</button>}{!citizen && item.permissions.canEscalate && <button disabled={saving} onClick={() => respond(item._id, false, true)} className="rounded-xl bg-amber-100 p-3">Escalate to higher role</button>}</div></div>}

      </article>;
    })}{!rows.filter(item => status === "all" || item.workflowStatus === status).length ? <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-slate-500">No grievances found.</div> : null}</div>}
  </div>;
}
