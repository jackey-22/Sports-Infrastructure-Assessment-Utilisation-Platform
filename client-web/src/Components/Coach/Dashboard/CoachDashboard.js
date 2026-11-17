import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Clock3, IndianRupee, RefreshCw, Star, Users } from "lucide-react";
import { api } from "../../../API/client";
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, PageShell, TableSkeleton } from "../Common/CoachUI";

const number = new Intl.NumberFormat("en-IN");
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const date = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function Status({ children }) {
  const success = children === "Paid" || children === "Confirmed";
  const failed = children === "Failed" || children === "Cancelled" || children === "Refunded";
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${success ? "bg-emerald-50 text-emerald-700" : failed ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{children || "Pending"}</span>;
}

function Section({ title, description, action, children, className = "" }) {
  return <Card className={`overflow-hidden ${className}`}><div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4"><div><h2 className="font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-xs text-slate-500">{description}</p></div>{action}</div>{children}</Card>;
}

function Trend({ rows }) {
  const maximum = Math.max(1, ...rows.map((row) => row.bookings));
  return <div className="p-5"><div className="flex h-52 items-end gap-3 sm:gap-5">{rows.map((row) => <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center"><div className="flex h-40 w-full items-end justify-center"><div className="w-3/5 max-w-12 rounded-t-lg bg-emerald-600" style={{ height: `${Math.max(row.bookings ? 12 : 3, (row.bookings / maximum) * 150)}px` }} title={`${row.bookings} bookings`} /></div><span className="mt-2 text-[10px] font-bold text-slate-500 sm:text-xs">{row.label}</span><span className="mt-0.5 text-[10px] text-slate-400">{row.bookings}</span></div>)}</div></div>;
}

export default function CoachDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const response = await api.get("/api/dashboard/coach"); setData(response.data); }
    catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <PageShell><div className="mb-5 h-28 animate-pulse rounded-3xl bg-emerald-950" /><div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div><Card><TableSkeleton rows={6} columns={5} /></Card></PageShell>;
  if (error && !data) return <PageShell><Card><ErrorState message={error.message} onRetry={load} /></Card></PageShell>;

  const { coach, facility, kpis } = data;
  return <PageShell>
    <PageHeader eyebrow="Coach Console · Live operational overview" title={`${coach.name} — Dashboard`} description={`${facility?.name || "No facility assigned"}${facility?.district ? ` · ${facility.district}` : ""}${coach.sports.length ? ` · ${coach.sports.join(", ")}` : ""}`} actions={<button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Refresh</button>} />

    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="My bookings" value={number.format(kpis.bookings)} caption={`${kpis.confirmedBookings} confirmed`} icon={CalendarCheck} tone="green" />
      <KpiCard label="Upcoming" value={number.format(kpis.upcomingBookings)} caption={`${kpis.todayBookings} scheduled today`} icon={Clock3} tone="amber" />
      <KpiCard label="Booked athletes" value={number.format(kpis.uniqueAthletes)} caption="Unique confirmed bookers" icon={Users} tone="violet" />
      <KpiCard label="Collected" value={money.format(kpis.revenue)} caption={`${kpis.paidBookings} paid · ${kpis.pendingPayments} pending`} icon={IndianRupee} tone="green" />
      <KpiCard label="Assigned slots" value={number.format(kpis.coachingSlots)} caption="Active facility coaching slots" icon={Clock3} tone="blue" />
      <KpiCard label="Ratings submitted" value={number.format(kpis.ratingsGiven)} caption={kpis.ratingsGiven ? `${kpis.averageRatingGiven} average given` : "No athlete ratings yet"} icon={Star} tone="amber" />
      <KpiCard label="Citizen ratings" value={number.format(kpis.ratingsReceived)} caption={kpis.ratingsReceived ? `${kpis.averageRatingReceived} / 5 average` : "No coach ratings yet"} icon={Star} tone="amber" />
      <KpiCard label="Coach status" value={coach.status} caption={coach.qualification || "Qualification not added"} icon={Users} tone="slate" />
    </div>

    <div className="mb-5 grid gap-5 xl:grid-cols-3">
      <Section title="Booking activity" description="Actual bookings assigned to you over the latest six calendar months." className="xl:col-span-2"><Trend rows={data.trend} /></Section>
      <Section title="Assigned coaching slots" description="Slots mapped to you by the Facility Manager." action={<Link to="/coach/bookings" className="text-xs font-bold text-emerald-700">View bookings</Link>}>
        {data.assignedSlots.length ? <div className="divide-y divide-slate-100">{data.assignedSlots.map((slot) => <div key={slot.id} className="px-5 py-4"><div className="flex items-center justify-between gap-3"><p className="font-bold text-slate-800">{slot.sport}</p><span className="text-xs font-bold text-emerald-700">{slot.startTime}–{slot.endTime}</span></div><p className="mt-1 text-xs text-slate-500">{slot.label} · Capacity {slot.capacity}</p><p className="mt-1 text-[11px] text-slate-400">{slot.days.join(", ") || "Days not configured"} · {slot.audience}</p></div>)}</div> : <EmptyState title="No coaching slots assigned" description="Ask the Facility Manager to map you to a coaching slot." />}
      </Section>
    </div>

    <Section title="Recent bookings" description="Latest athletes and citizens who booked a coaching slot under you." action={<div className="flex gap-3"><Link to="/coach/athletes" className="text-xs font-bold text-amber-700">Athletes & ratings</Link><Link to="/coach/bookings" className="text-xs font-bold text-emerald-700">Full report</Link></div>}>
      {data.recentBookings.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Athlete</th><th className="px-5 py-3">Sport / slot</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3">Booking</th><th className="px-5 py-3">Payment</th></tr></thead><tbody className="divide-y divide-slate-100">{data.recentBookings.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-3 font-bold text-slate-700">{row.reference || row.id.slice(-8).toUpperCase()}</td><td className="px-5 py-3"><p className="font-bold text-slate-700">{row.athlete}</p><p className="text-xs text-slate-400">{row.email || row.phone}</p></td><td className="px-5 py-3"><p className="font-semibold text-slate-700">{row.sport}</p><p className="text-xs text-slate-400">{row.time?.from || "—"}–{row.time?.to || "—"}</p></td><td className="px-5 py-3 text-slate-600">{date(row.date)}</td><td className="px-5 py-3 text-right font-bold">{money.format(row.amount)}</td><td className="px-5 py-3"><Status>{row.bookingStatus}</Status></td><td className="px-5 py-3"><Status>{row.paymentStatus}</Status></td></tr>)}</tbody></table></div> : <EmptyState title="No bookings yet" description="Bookings assigned to your coaching slots will appear here." />}
    </Section>
  </PageShell>;
}
