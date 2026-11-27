import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Clock3, IndianRupee, Receipt, Search, Users } from "lucide-react";
import { api } from "../../API/client";
import {
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  PageShell,
  StatusPill,
  TableSkeleton,
} from "../Admin/Common/AdminUI";

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10";
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const displayDate = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "—";
const todayStr = () => new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function BookingPaymentReport({ role }) {
  const isCoach = role === "coach";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleScope, setScheduleScope] = useState("all");
  const [coachScope, setCoachScope] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/booking-payments/report");
      setData(response.data);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isCoach]);

  const rows = useMemo(() => {
    const today = todayStr();
    const list = (data?.rows || []).filter((row) => {
      if (isCoach && coachScope === "upcoming") {
        return String(row.date || "") >= today;
      }
      if (!isCoach && scheduleScope === "today") {
        return String(row.date || "") === today;
      }
      if (!isCoach && scheduleScope === "upcoming") {
        return String(row.date || "") >= today;
      }
      return true;
    });
    const needle = search.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((row) => [
      row.bookingReference, row.paymentReference, row.athlete, row.facility,
      row.sport, row.coach, row.email, row.phone,
    ].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [data, search, isCoach, coachScope]);

  const title = role === "admin" ? "Platform bookings & payments" : role === "manager" ? "Facility bookings & payments" : "My coaching bookings";
  const description = role === "admin"
    ? "Overall Razorpay collections with facility-wise attribution, while funds settle into the single platform account."
    : role === "manager"
      ? "Bookings and payments attributed only to your assigned facility."
      : "Confirmed coaching bookings assigned to your coaching slots.";
  const summary = data?.summary;

  return <PageShell>
    <PageHeader eyebrow={`${role} reporting`} title={title} description={description} />
    {summary ? (isCoach ? (
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <KpiCard
          label="Confirmed Coaching Bookings"
          value={summary.bookings}
          caption="Confirmed sessions under you"
          icon={CalendarCheck}
          tone="green"
          onClick={() => setCoachScope("all")}
        />
        <KpiCard
          label="Upcoming Sessions"
          value={summary.upcomingBookings ?? 0}
          caption={`${summary.todayBookings ?? 0} scheduled today`}
          icon={Clock3}
          tone="amber"
          onClick={() => setCoachScope("upcoming")}
        />
        <KpiCard
          label="Athletes"
          value={summary.athletes}
          caption="Confirmed athletes under you"
          icon={Users}
          tone="violet"
          to="/coach/athletes"
        />
      </div>
    ) : (
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <KpiCard label="Bookings" value={summary.bookings} caption="Server-verified bookings" icon={CalendarCheck} tone="blue" />
        <KpiCard label="Collected" value={money(summary.totalCollected)} caption={role === "admin" ? `Across ${summary.facilities} ${summary.facilities === 1 ? "facility" : "facilities"}` : "Attributed to this scope"} icon={IndianRupee} tone="green" />
        <KpiCard label="Athletes" value={summary.athletes} caption="Unique booking contacts" icon={Users} tone="violet" />
      </div>
    )) : null}

    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className={`${inputClass} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isCoach ? "Booking reference, athlete, sport or facility" : "Booking, athlete, sport, facility or payment ID"} /></div>
        {isCoach ? (
          <select className={`${inputClass} sm:w-48`} value={coachScope} onChange={(event) => setCoachScope(event.target.value)}>
            <option value="all">All confirmed bookings</option>
            <option value="upcoming">Upcoming sessions only</option>
          </select>
        ) : (
          <select aria-label="Filter bookings by schedule" className={`${inputClass} sm:w-48`} value={scheduleScope} onChange={(event) => setScheduleScope(event.target.value)}>
            <option value="all">All bookings</option>
            <option value="today">Today's sessions</option>
            <option value="upcoming">Upcoming sessions</option>
          </select>
        )}
      </div>
      {loading && !data ? <div className="p-5"><TableSkeleton rows={6} columns={isCoach ? 5 : 7} /></div> : error ? <div className="p-5"><ErrorState message={error.message} onRetry={load} /></div> : rows.length === 0 ? <EmptyState title="No bookings found" description={isCoach ? "Confirmed coaching bookings assigned to your slots will appear here." : "Confirmed and paid bookings will appear here."} /> : <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Athlete</th>
              <th className="px-4 py-3">Facility &amp; sport</th>
              {!isCoach ? <th className="px-4 py-3">Coach</th> : null}
              <th className="px-4 py-3">Schedule</th>
              <th className="px-4 py-3">Members</th>
              {!isCoach ? <th className="px-4 py-3">Payment</th> : null}
              {!isCoach ? <th className="px-4 py-3 text-right">Amount</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="align-top hover:bg-slate-50/70">
            <td className="px-4 py-3"><p className="font-mono text-xs font-bold text-slate-800">{row.bookingReference}</p><p className="mt-1 text-[11px] text-slate-400">{displayDate(row.createdAt)}</p></td>
            <td className="px-4 py-3"><p className="font-bold text-slate-800">{row.athlete}</p><p className="text-xs text-slate-500">{row.email || row.phone}</p></td>
            <td className="px-4 py-3"><p className="font-bold text-slate-700">{row.facility}</p><p className="text-xs text-slate-500">{row.sport}</p></td>
            {!isCoach ? <td className="px-4 py-3 text-slate-600">{row.coach}</td> : null}
            <td className="px-4 py-3"><p className="font-semibold text-slate-700">{row.date || "—"}</p><p className="text-xs text-slate-500">{row.time?.from || "—"}–{row.time?.to || "—"}</p></td>
            <td className="px-4 py-3 font-bold text-slate-700">{row.members}</td>
            {!isCoach ? <td className="px-4 py-3"><StatusPill status={row.paymentStatus === "Created" ? "Pending" : row.paymentStatus} /><p className="mt-1 max-w-40 truncate font-mono text-[10px] text-slate-400" title={row.paymentReference}>{row.paymentReference}</p></td> : null}
            {!isCoach ? <td className="px-4 py-3 text-right font-extrabold text-slate-800">{money(row.amount)}</td> : null}
          </tr>)}</tbody>
        </table>
      </div>}
    </Card>
  </PageShell>;
}
