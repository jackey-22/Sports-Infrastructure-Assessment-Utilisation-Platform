import React, { useEffect, useMemo, useState } from "react";
import { CalendarCheck, IndianRupee, Receipt, Search, Users } from "lucide-react";
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

export default function BookingPaymentReport({ role }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await api.get(`/api/booking-payments/report${query}`);
      setData(response.data);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [status]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data?.rows || [];
    return (data?.rows || []).filter((row) => [
      row.bookingReference, row.paymentReference, row.athlete, row.facility,
      row.sport, row.coach, row.email, row.phone,
    ].some((value) => String(value || "").toLowerCase().includes(needle)));
  }, [data, search]);

  const title = role === "admin" ? "Platform bookings & payments" : role === "manager" ? "Facility bookings & payments" : "My coaching bookings";
  const description = role === "admin"
    ? "Overall Razorpay collections with facility-wise attribution, while funds settle into the single platform account."
    : role === "manager"
      ? "Bookings and payments attributed only to your assigned facility."
      : "Athletes who booked coaching slots assigned to you, including payment status.";
  const summary = data?.summary;

  return <PageShell>
    <PageHeader eyebrow={`${role} reporting`} title={title} description={description} />
    {summary ? <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Bookings" value={summary.bookings} caption={`${summary.pendingBookings} awaiting payment`} icon={CalendarCheck} tone="blue" />
      <KpiCard label="Paid bookings" value={summary.paidBookings} caption="Server-verified Razorpay payments" icon={Receipt} tone="green" />
      <KpiCard label="Collected" value={money(summary.totalCollected)} caption={role === "admin" ? `Across ${summary.facilities} facilities` : "Attributed to this scope"} icon={IndianRupee} tone="green" />
      <KpiCard label="Athletes / bookers" value={summary.athletes} caption={role === "coach" ? "Booked under this coach" : "Unique booking contacts"} icon={Users} tone="violet" />
    </div> : null}

    <Card>
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input className={`${inputClass} pl-9`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Booking, athlete, sport, facility or payment ID" /></div>
        <select className={`${inputClass} sm:w-48`} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All payment statuses</option><option value="Paid">Paid</option><option value="Created">Pending payment</option><option value="Failed">Failed</option><option value="Refunded">Refunded</option></select>
      </div>
      {loading && !data ? <div className="p-5"><TableSkeleton rows={6} columns={7} /></div> : error ? <div className="p-5"><ErrorState message={error.message} onRetry={load} /></div> : rows.length === 0 ? <EmptyState title="No bookings in this scope" description="Completed and pending Razorpay bookings will appear here." /> : <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Athlete</th><th className="px-4 py-3">Facility & sport</th>{role !== "coach" ? <th className="px-4 py-3">Coach</th> : null}<th className="px-4 py-3">Schedule</th><th className="px-4 py-3">Members</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} className="align-top hover:bg-slate-50/70">
            <td className="px-4 py-3"><p className="font-mono text-xs font-bold text-slate-800">{row.bookingReference}</p><p className="mt-1 text-[11px] text-slate-400">{displayDate(row.createdAt)}</p></td>
            <td className="px-4 py-3"><p className="font-bold text-slate-800">{row.athlete}</p><p className="text-xs text-slate-500">{row.phone}</p></td>
            <td className="px-4 py-3"><p className="font-bold text-slate-700">{row.facility}</p><p className="text-xs text-slate-500">{row.sport}</p></td>
            {role !== "coach" ? <td className="px-4 py-3 text-slate-600">{row.coach}</td> : null}
            <td className="px-4 py-3"><p className="font-semibold text-slate-700">{row.date || "—"}</p><p className="text-xs text-slate-500">{row.time?.from || "—"}–{row.time?.to || "—"}</p></td>
            <td className="px-4 py-3 font-bold text-slate-700">{row.members}</td>
            <td className="px-4 py-3"><StatusPill status={row.paymentStatus === "Created" ? "Pending" : row.paymentStatus} /><p className="mt-1 max-w-40 truncate font-mono text-[10px] text-slate-400" title={row.paymentReference}>{row.paymentReference}</p></td>
            <td className="px-4 py-3 text-right font-extrabold text-slate-800">{money(row.amount)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </Card>
  </PageShell>;
}
