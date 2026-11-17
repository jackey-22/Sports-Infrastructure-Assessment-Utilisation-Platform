import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Loader2, Search, Star, Users } from "lucide-react";
import { api } from "../../../API/client";
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, PageShell, TableSkeleton } from "../Common/CoachUI";

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
  const [ratingOpen, setRatingOpen] = useState(null);
  const [forms, setForms] = useState({});
  const [saving, setSaving] = useState(null);
  const [notice, setNotice] = useState("");

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

  const updateForm = (id, patch) => setForms((old) => ({ ...old, [id]: { rating: 5, remarks: "", ...old[id], ...patch } }));
  const submitRating = async (row) => {
    const form = { rating: 5, remarks: "", ...forms[row.id] };
    setSaving(row.id); setNotice("");
    try {
      await api.post("/api/coach/athlete-ratings", {
        athleteId: row.athleteId,
        sport: row.nextBooking?.sportId || row.latestBooking?.sportId || row.sports[0]?.id,
        rating: form.rating,
        remarks: form.remarks,
      });
      setNotice(`Rating saved for ${row.name}.`);
      setRatingOpen(null);
      await load();
    } catch (saveError) { setNotice(saveError.message); }
    finally { setSaving(null); }
  };

  if (loading && !data) return <PageShell><div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div><Card><TableSkeleton rows={6} columns={5} /></Card></PageShell>;
  if (error && !data) return <PageShell><Card><ErrorState message={error.message} onRetry={load} /></Card></PageShell>;

  const summary = data.summary;
  return <PageShell>
    <PageHeader eyebrow="Coach Console · Live booking data" title="Booked athletes & citizens" description="People who selected a coaching slot assigned to you. Ratings are available after a booking is confirmed." />
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
        const form = { rating: 5, remarks: "", ...forms[row.id] };
        const expanded = ratingOpen === row.id;
        return <article key={row.id} className="p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold text-slate-900">{row.name}</h2>{row.confirmedBookings > 0 ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">CONFIRMED</span> : <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-700">PAYMENT PENDING</span>}</div><p className="mt-1 text-xs text-slate-500">{row.email || "No email"}{row.phone ? ` · ${row.phone}` : ""}</p><p className="mt-2 text-sm font-semibold text-slate-700">{row.sports.map((sport) => sport.name).join(", ") || "Sport unavailable"}</p></div>
            <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4 xl:min-w-[520px]"><Metric label="Bookings" value={`${row.confirmedBookings}/${row.bookings} confirmed`} /><Metric label="Paid" value={`${row.paidBookings} · ${money.format(row.totalPaid)}`} /><Metric label="Next session" value={row.nextBooking ? `${date(row.nextBooking.date)} · ${row.nextBooking.time?.from || ""}` : "None scheduled"} /><Metric label="Latest rating" value={row.latestRating ? `${row.latestRating.rating} / 5` : "Not rated"} /></div>
            <div className="xl:w-40">{row.canRate ? <button type="button" onClick={() => { setRatingOpen(expanded ? null : row.id); updateForm(row.id, row.latestRating ? { rating: row.latestRating.rating, remarks: "" } : {}); }} className="w-full rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-slate-900">{row.latestRating ? "Rate again" : "Rate athlete"}</button> : <p className="text-center text-xs font-semibold text-slate-400">{row.confirmedBookings ? "Athlete profile unavailable" : "Available after payment"}</p>}</div>
          </div>
          {expanded ? <div className="mt-4 grid gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 md:grid-cols-[220px_1fr_auto] md:items-end"><div><p className="mb-2 text-xs font-bold text-slate-600">Performance rating</p><Stars value={form.rating} onChange={(rating) => updateForm(row.id, { rating })} /></div><label><span className="mb-1.5 block text-xs font-bold text-slate-600">Coach comments</span><textarea rows="2" className={input} value={form.remarks} onChange={(event) => updateForm(row.id, { remarks: event.target.value })} placeholder="Add useful feedback for the athlete" /></label><button type="button" disabled={saving === row.id} onClick={() => submitRating(row)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving === row.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}Save rating</button></div> : null}
        </article>;
      })}</div> : <EmptyState title="No booked athletes yet" description="An assigned slot is only a schedule. Athletes will appear here after someone starts a booking for that coaching slot." />}
    </Card>
  </PageShell>;
}

function Metric({ label, value }) { return <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-700">{value}</p></div>; }
