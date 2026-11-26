import React, { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, Check, IndianRupee, School, X } from "lucide-react";
import { api } from "../../API/client";

const input = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const date = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function InstitutionEventManagement({ admin = false }) {
  const [rows, setRows] = useState([]);
  const [forms, setForms] = useState({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const endpoint = admin ? "/api/admin/institution-events" : "/api/manager/institution-events";
  const load = () => api.get(endpoint).then((response) => setRows(response.data || [])).catch((err) => setError(err.message));
  useEffect(() => { load(); }, [endpoint]);
  const totals = useMemo(() => ({
    requests: rows.length,
    pending: rows.filter((row) => row.status === "Submitted").length,
    confirmed: rows.filter((row) => row.status === "Confirmed").length,
    collected: rows.filter((row) => row.paymentStatus === "Paid").reduce((sum, row) => sum + Number(row.quotedAmount || 0), 0),
  }), [rows]);
  const update = (id, key, value) => setForms((current) => ({ ...current, [id]: { quotedAmount: "", note: "", ...current[id], [key]: value } }));
  const review = async (row, decision) => {
    setBusy(row.id); setError("");
    try { await api.patch(`/api/manager/institution-events/${row.id}/review`, { decision, ...(forms[row.id] || {}) }); await load(); }
    catch (err) { setError(err.message); }
    finally { setBusy(""); }
  };

  return <div className="mx-auto max-w-7xl p-5 sm:p-8"><header><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">{admin ? "Platform overview" : "Facility operations"}</p><h1 className="mt-2 text-3xl font-extrabold text-slate-900">Institution event bookings</h1><p className="mt-2 text-sm text-slate-600">{admin ? "Monitor multi-sport institution requests and payments across all facilities." : "Review the complete multi-day schedule, recheck inventory and issue the final quotation."}</p></header>
    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={School} label="Requests" value={totals.requests} /><Metric icon={CalendarDays} label="Awaiting review" value={totals.pending} /><Metric icon={Check} label="Confirmed" value={totals.confirmed} /><Metric icon={IndianRupee} label="Payments collected" value={money.format(totals.collected)} /></section>
    {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
    <div className="mt-6 space-y-4">{rows.length ? rows.map((row) => {
      const form = forms[row.id] || {};
      const sports = [...new Set((row.selections || []).map((item) => item.sportName))];
      return <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-bold text-emerald-700">{row.bookingReference}</p><h2 className="mt-1 text-xl font-extrabold">{row.eventName}</h2><p className="mt-1 text-sm text-slate-500">{row.institutionName} · Coordinator: {row.contactPerson}</p></div><Status value={row.status} /></div>
        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4"><Detail label="Facility" value={row.facilityName} /><Detail label="Dates" value={`${date(row.startDate)} to ${date(row.endDate)}`} /><Detail label="Sports" value={sports.join(", ")} /><Detail label="Students / slots" value={`${row.participantCount} students · ${row.selections?.length || 0} slots`} /></div>
        <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm md:grid-cols-2"><p><strong>Purpose:</strong> {row.purpose}</p><p><strong>Requirements:</strong> {row.requirements || "None specified"}</p><p><strong>Contact:</strong> {row.contactEmail} · {row.contactPhone}</p><p><strong>Institution estimate:</strong> {money.format(row.estimatedAmount || 0)}</p></div>
        <details className="mt-4 rounded-xl border border-slate-200" open={row.status === "Submitted"}><summary className="cursor-pointer px-4 py-3 text-sm font-bold">Complete requested schedule ({row.selections?.length || 0})</summary><div className="overflow-x-auto border-t"><table className="w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-400"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Sport</th><th className="px-4 py-3">Slot</th><th className="px-4 py-3">Capacity / units</th><th className="px-4 py-3 text-right">Estimate</th></tr></thead><tbody className="divide-y">{(row.selections || []).map((item) => <tr key={item.id}><td className="px-4 py-3 font-semibold">{date(item.date)}</td><td className="px-4 py-3 font-bold">{item.sportName}</td><td className="px-4 py-3">{item.slot?.label}<span className="block text-xs text-slate-400">{item.slot?.startTime}–{item.slot?.endTime}</span></td><td className="px-4 py-3">{item.requestedUnits} {item.unitLabel}</td><td className="px-4 py-3 text-right font-semibold">{money.format(item.estimatedAmount || 0)}</td></tr>)}</tbody></table></div></details>
        {!admin && row.status === "Submitted" ? <div className="mt-4 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 md:grid-cols-2"><label><span className="mb-1 block text-xs font-bold text-slate-600">Final quotation (₹)</span><input type="number" min="1" className={input} placeholder={String(row.estimatedAmount || "")} value={form.quotedAmount || ""} onChange={(e) => update(row.id, "quotedAmount", e.target.value)} /></label><label><span className="mb-1 block text-xs font-bold text-slate-600">Manager note / rejection reason</span><input className={input} value={form.note || ""} onChange={(e) => update(row.id, "note", e.target.value)} /></label><div className="flex gap-2 md:col-span-2 md:justify-end"><button disabled={busy === row.id} onClick={() => review(row, "Rejected")} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50"><X className="h-4 w-4" />Reject</button><button disabled={busy === row.id} onClick={() => review(row, "Approved")} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Check className="h-4 w-4" />Approve all slots & send quotation</button></div></div> : null}
        {row.quotedAmount ? <p className="mt-4 rounded-xl border border-slate-200 p-3 text-sm"><strong>Final quotation:</strong> {money.format(row.quotedAmount)} · {row.paymentStatus}</p> : null}{row.managerNote && row.status !== "Submitted" ? <p className="mt-3 rounded-xl border border-slate-200 p-3 text-sm"><strong>Manager note:</strong> {row.managerNote}</p> : null}
      </article>;
    }) : <div className="rounded-2xl border border-dashed bg-white p-10 text-center"><Building2 className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-extrabold">No institution requests</h2><p className="text-sm text-slate-500">New bulk event requests will appear here.</p></div>}</div>
  </div>;
}

function Metric({ icon: Icon, label, value }) { return <div className="rounded-2xl border bg-white p-5"><Icon className="h-5 w-5 text-emerald-700" /><p className="mt-3 text-2xl font-extrabold">{value}</p><p className="text-xs font-bold text-slate-500">{label}</p></div>; }
function Detail({ label, value }) { return <div><p className="text-xs font-bold text-slate-400">{label}</p><p className="mt-1 font-semibold text-slate-700">{value || "—"}</p></div>; }
function Status({ value }) { const cls = value === "Confirmed" ? "bg-emerald-100 text-emerald-800" : value === "Rejected" ? "bg-red-100 text-red-700" : value === "Approved" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"; return <span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${cls}`}>{value}</span>; }
