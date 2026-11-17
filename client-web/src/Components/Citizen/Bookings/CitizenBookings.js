import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock3, Download, IndianRupee, MapPin, Star, Users } from "lucide-react";
import { api } from "../../../API/client";
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, PageShell, StatusPill, TableSkeleton } from "../Common/CitizenUI";
import { downloadBookingInvoice } from "../../../utils/bookingInvoice";
import CitizenRatingDialog, { SubmittedRatings } from "../Ratings/CitizenRatingDialog";

const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function CitizenBookings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("upcoming");
  const [reviews, setReviews] = useState([]);
  const [ratingBooking, setRatingBooking] = useState(null);
  const load = async () => {
    setLoading(true); setError(null);
    try { const [response, ratingResponse] = await Promise.all([api.get("/api/citizen/bookings"), api.get("/api/citizen/reviews")]); setRows(response.data || []); setReviews(ratingResponse.data || []); }
    catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const visible = useMemo(() => rows.filter((row) => view === "all" || (view === "upcoming" ? row.date >= today() : row.date < today())), [rows, view]);
  const paid = rows.filter((row) => row.paymentStatus === "Paid");
  return <PageShell>
    <PageHeader eyebrow="Citizen account" title="My bookings" description="Your facility reservations, coaching bookings and Razorpay payment status." />
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><KpiCard label="Total bookings" value={rows.length} caption="All reservations linked to your account" icon={CalendarCheck} tone="blue" /><KpiCard label="Upcoming" value={rows.filter((row) => row.date >= today() && row.bookingStatus !== "Cancelled").length} caption="Confirmed and pending reservations" icon={Clock3} tone="green" /><KpiCard label="Amount paid" value={money(paid.reduce((sum, row) => sum + row.amount, 0))} caption={`${paid.length} paid bookings`} icon={IndianRupee} tone="violet" /></div>
    <Card>
      <div className="flex gap-2 border-b border-slate-100 p-4">{["upcoming", "past", "all"].map((item) => <button key={item} onClick={() => setView(item)} className={`rounded-full px-4 py-2 text-xs font-bold capitalize ${view === item ? "bg-brand-primary text-white" : "bg-slate-100 text-slate-600"}`}>{item}</button>)}</div>
      {loading ? <div className="p-5"><TableSkeleton rows={5} columns={5} /></div> : error ? <div className="p-5"><ErrorState message={error.message} onRetry={load} /></div> : visible.length === 0 ? <EmptyState title={`No ${view === "all" ? "" : view} bookings`} description="Bookings made while signed in will appear here automatically." /> : <div className="divide-y divide-slate-100">{visible.map((row) => <article key={row.id} className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_auto] md:items-center">
        <div><div className="flex flex-wrap items-center gap-2"><p className="font-display text-lg font-extrabold text-brand-dark">{row.sport}</p><StatusPill status={row.bookingStatus} /><StatusPill status={row.paymentStatus} /></div><p className="mt-1 flex items-center gap-1 text-sm font-semibold text-slate-600"><MapPin className="h-4 w-4 text-brand-primary" />{row.facility}</p><p className="mt-1 font-mono text-xs text-slate-400">{row.reference}</p></div>
        <div className="space-y-1 text-sm text-slate-600"><p className="font-bold text-slate-800">{row.date} · {row.time?.from}–{row.time?.to}</p><p className="flex items-center gap-1"><Users className="h-4 w-4" />{row.members} {row.members === 1 ? "athlete" : "members"}</p>{row.coach !== "—" ? <p>Coach: {row.coach}</p> : null}</div>
        <div className="text-left md:text-right"><p className="text-lg font-extrabold text-slate-800">{money(row.amount)}</p><p className="text-xs font-semibold text-slate-500">{row.paymentStatus}</p><div className="mt-2 flex flex-wrap gap-2 md:justify-end">{row.paymentStatus === "Paid" ? <button onClick={() => downloadBookingInvoice(row)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50"><Download className="h-3.5 w-3.5" />Invoice</button> : null}{row.bookingStatus === "Confirmed" ? <button onClick={() => setRatingBooking(row)} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"><Star className="h-3.5 w-3.5 fill-current" />Rate</button> : null}</div></div>
      </article>)}</div>}
    </Card>
    <section className="mt-6"><div className="mb-3"><h2 className="text-xl font-extrabold text-slate-900">My submitted ratings</h2><p className="text-sm text-slate-500">All facility, sport and coach ratings you have submitted.</p></div>{reviews.length ? <SubmittedRatings reviews={reviews} /> : <Card><EmptyState title="No ratings submitted" description="Use the Rate button on a confirmed booking or rate from Explore." /></Card>}</section>
    <CitizenRatingDialog open={Boolean(ratingBooking)} onClose={() => setRatingBooking(null)} initialFacilityId={ratingBooking?.facilityId} initialSportId={ratingBooking?.sportId} initialCoachId={ratingBooking?.coachId} initialTarget="sport" onSaved={load} />
  </PageShell>;
}
