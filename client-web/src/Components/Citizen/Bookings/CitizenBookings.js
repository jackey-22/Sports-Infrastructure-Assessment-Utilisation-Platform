import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock3, Download, IndianRupee, MapPin, Star, Users } from "lucide-react";
import { api } from "../../../API/client";
import BookingPassCard from "../../Booking/BookingPassCard";
import BookingAttendance from "./BookingAttendance";
import { Card, EmptyState, ErrorState, KpiCard, PageHeader, PageShell, StatusPill, TableSkeleton } from "../Common/CitizenUI";
import { downloadBookingInvoice } from "../../../utils/bookingInvoice";
import CitizenRatingDialog, { SubmittedRatings } from "../Ratings/CitizenRatingDialog";

const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};
const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);

export default function CitizenBookings() {
  const [pass, setPass] = useState(null);
  const [passError, setPassError] = useState("");
  const openPass = async id => { setPassError(""); try { const result = await api.get(`/api/citizen/bookings/${id}/pass`); setPass(result.data); } catch (error) { setPassError(error.message); } };
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
    {!!passError && <p role="alert" className="mb-4 text-red-700">{passError}</p>}
    {pass && (
      <div className="fixed inset-0 z-[2100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-2xl">
          <BookingPassCard pass={pass} onClose={() => setPass(null)} />
        </div>
      </div>
    )}
    <Card>
      <div className="flex gap-2 border-b border-slate-100 p-4">
        {["upcoming", "past", "all"].map((item) => (
          <button
            key={item}
            onClick={() => setView(item)}
            className={`rounded-full px-4 py-2 text-xs font-bold capitalize transition-colors ${
              view === item
                ? "bg-brand-primary text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="p-5">
          <TableSkeleton rows={5} columns={5} />
        </div>
      ) : error ? (
        <div className="p-5">
          <ErrorState message={error.message} onRetry={load} />
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={`No ${view === "all" ? "" : view} bookings`}
          description="Bookings made while signed in will appear here automatically."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {visible.map((row) => (
            <article
              key={row.id}
              className="grid gap-4 p-5 transition-colors hover:bg-slate-50/50 sm:p-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)_250px] md:items-start md:gap-6"
            >
              {/* Column 1: Sport, status pills, facility, reference */}
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display text-lg font-extrabold text-brand-dark">
                    {row.sport}
                  </p>
                  <StatusPill status={row.bookingStatus} />
                  <StatusPill status={row.paymentStatus} />
                </div>
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0 text-brand-primary" />
                  <span className="truncate">{row.facility}</span>
                </p>
                <p className="font-mono text-xs text-slate-400">
                  {row.reference}
                </p>
              </div>

              {/* Column 2: Date, time, members, coach */}
              <div className="min-w-0 space-y-1.5 text-sm text-slate-600">
                <p className="font-bold text-slate-800">
                  {formatDate(row.date)}{row.time?.from ? ` · ${row.time.from}–${row.time.to}` : ""}
                </p>
                <p className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 shrink-0 text-slate-400" />
                  <span>{row.members} {row.members === 1 ? "athlete" : "members"}</span>
                </p>
                {row.coach && row.coach !== "—" ? (
                  <p className="text-xs text-slate-500">
                    Coach: <span className="font-semibold text-slate-700">{row.coach}</span>
                  </p>
                ) : null}
              </div>

              {/* Column 3: Amount, status, actions */}
              <div className="min-w-0 flex flex-col justify-between text-left md:items-end md:text-right">
                <div>
                  <p className="text-lg font-extrabold text-slate-800">
                    {money(row.amount)}
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      row.attendanceStatus === "Completed"
                        ? "text-emerald-700"
                        : "text-slate-500"
                    }`}
                  >
                    {row.attendanceStatus === "Completed"
                      ? "Visit completed"
                      : row.paymentStatus}
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 md:mt-3 md:justify-end">
                  {row.paymentStatus === "Paid" ? (
                    <button
                      onClick={() => downloadBookingInvoice(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-500"
                      title="Download booking invoice"
                    >
                      <Download className="h-3.5 w-3.5 shrink-0" />
                      <span>Invoice</span>
                    </button>
                  ) : null}
                  {row.qrAvailable ? (
                    <button
                      onClick={() => openPass(row.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-emerald-600"
                      title="View and scan your entry QR pass"
                    >
                      <span>QR pass</span>
                    </button>
                  ) : null}
                  {row.bookingStatus === "Confirmed" ? (
                    <button
                      onClick={() => setRatingBooking(row)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700 shadow-sm transition hover:bg-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-amber-500"
                      title="Rate this facility, sport or coach"
                    >
                      <Star className="h-3.5 w-3.5 fill-current shrink-0" />
                      <span>Rate</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
    <BookingAttendance />
    <section className="mt-6"><div className="mb-3"><h2 className="text-xl font-extrabold text-slate-900">My submitted ratings</h2><p className="text-sm text-slate-500">All facility, sport and coach ratings you have submitted.</p></div>{reviews.length ? <SubmittedRatings reviews={reviews} /> : <Card><EmptyState title="No ratings submitted" description="Use the Rate button on a confirmed booking or rate from Explore." /></Card>}</section>
    <CitizenRatingDialog open={Boolean(ratingBooking)} onClose={() => setRatingBooking(null)} initialFacilityId={ratingBooking?.facilityId} initialSportId={ratingBooking?.sportId} initialCoachId={ratingBooking?.coachId} initialTarget="sport" onSaved={load} />
  </PageShell>;
}
