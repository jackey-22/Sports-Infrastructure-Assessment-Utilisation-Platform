import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  ChevronRight,
  IndianRupee,
  ClipboardList,
  Clock3,
  Dumbbell,
  RefreshCw,
  Star,
  Users,
  WalletCards,
} from "lucide-react";
import { api } from "../../API/client";

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("en-IN");

function formatDate(value) {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Kpi({ label, value, caption, icon: Icon, tone = "green" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold text-slate-900">{value}</p>
        </div>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone] || tones.green}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{caption}</p>
    </div>
  );
}

function Panel({ title, description, action, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-extrabold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-400">{children}</div>;
}

function Status({ value }) {
  const success = value === "Paid" || value === "Confirmed";
  const failed = value === "Failed" || value === "Cancelled" || value === "Refunded";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
      success ? "bg-emerald-50 text-emerald-700" : failed ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"
    }`}>
      {value || "Pending"}
    </span>
  );
}

function Trend({ rows }) {
  const maximum = Math.max(1, ...rows.map((row) => Math.max(row.bookings, row.revenue / 100)));
  return (
    <div className="p-5">
      <div className="flex h-52 items-end gap-3 sm:gap-5" aria-label="Six month booking and revenue trend">
        {rows.map((row) => {
          const bookingHeight = Math.max(row.bookings ? 10 : 2, (row.bookings / maximum) * 150);
          const revenueHeight = Math.max(row.revenue ? 10 : 2, ((row.revenue / 100) / maximum) * 150);
          return (
            <div key={row.key} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="flex h-40 w-full items-end justify-center gap-1">
                <div className="w-2/5 max-w-8 rounded-t-md bg-emerald-600" style={{ height: bookingHeight }} title={`${row.bookings} bookings`} />
                <div className="w-2/5 max-w-8 rounded-t-md bg-amber-400" style={{ height: revenueHeight }} title={`${money.format(row.revenue)} revenue`} />
              </div>
              <span className="mt-2 text-[10px] font-bold text-slate-500 sm:text-xs">{row.label}</span>
              <span className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">{row.bookings} booked</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />Bookings</span>
        <span className="flex items-center gap-2"><i className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Revenue (scaled)</span>
      </div>
    </div>
  );
}

export default function OperationalDashboard({ role }) {
  const isAdmin = role === "admin";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/dashboard/${role}`);
      setData(response.data);
    } catch (requestError) {
      setError(requestError.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { load(); }, [load]);

  const links = useMemo(() => isAdmin ? {
    bookings: "/admin/insights/bookings",
    grievances: "/admin/insights/grievances",
    grants: "/admin/insights/grants",
    configuration: "/admin",
  } : {
    bookings: "/manager/transactions",
    grievances: "/manager/allcomplaint",
    grants: "/manager/grants",
    configuration: "/manager/sports-configuration",
  }, [isAdmin]);

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
        <div className="h-28 animate-pulse rounded-3xl bg-emerald-950" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div>
        <div className="h-80 animate-pulse rounded-2xl bg-white" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
        <h1 className="mt-3 text-xl font-extrabold text-slate-900">Dashboard unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button type="button" onClick={load} className="mt-5 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white">Try again</button>
      </div>
    );
  }

  const { kpis, alerts } = data;
  const rating = kpis.ratings;
  const cards = isAdmin ? [
    { label: "Facilities", value: number.format(kpis.facilities), caption: `${kpis.bookingReadyFacilities} ready for online booking`, icon: Building2 },
    { label: "Active sports", value: number.format(kpis.activeSports), caption: "Available in the global directory", icon: Dumbbell },
    { label: "Active coaches", value: number.format(kpis.activeCoaches), caption: "Across all facilities", icon: Users, tone: "violet" },
    { label: "Citizen accounts", value: number.format(kpis.citizens), caption: "Registered athletes and citizens", icon: Users },
    { label: "Total bookings", value: number.format(kpis.bookings), caption: `${kpis.confirmedBookings} confirmed`, icon: CalendarCheck },
    { label: "Revenue collected", value: money.format(kpis.revenue), caption: `${kpis.paidPayments} successful payments`, icon: IndianRupee, tone: "amber" },
    { label: "Open grievances", value: number.format(kpis.openGrievances), caption: `${kpis.escalatedGrievances} escalated · ${kpis.overdueGrievances} overdue`, icon: ClipboardList, tone: kpis.escalatedGrievances ? "amber" : "slate" },
    { label: "Grant allocation", value: money.format(kpis.grants.allocated), caption: `${money.format(kpis.grants.utilised)} verified usage`, icon: WalletCards, tone: "violet" },
  ] : [
    { label: "Total bookings", value: number.format(kpis.bookings), caption: `${kpis.confirmedBookings} confirmed`, icon: CalendarCheck },
    { label: "Upcoming", value: number.format(kpis.upcomingBookings), caption: `${kpis.todayBookings} bookings today`, icon: Clock3 },
    { label: "Revenue collected", value: money.format(kpis.revenue), caption: `${kpis.paidPayments} successful payments`, icon: IndianRupee, tone: "amber" },
    { label: "Configured sports", value: number.format(kpis.activeSports), caption: `${data.configuration.reduce((sum, row) => sum + row.slots, 0)} bookable slots`, icon: Dumbbell },
    { label: "Unique citizens", value: number.format(kpis.citizens), caption: "Citizens with bookings here", icon: Users, tone: "violet" },
    { label: "Active coaches", value: number.format(kpis.activeCoaches), caption: "Assigned to this facility", icon: Users },
    { label: "Open grievances", value: number.format(kpis.openGrievances), caption: `${kpis.escalatedGrievances} escalated · ${kpis.overdueGrievances} overdue`, icon: ClipboardList, tone: kpis.overdueGrievances ? "amber" : "slate" },
    { label: "Grant allocation", value: money.format(kpis.grants.allocated), caption: `${money.format(kpis.grants.utilised)} verified usage`, icon: WalletCards, tone: "violet" },
  ];

  const alertItems = [
    isAdmin && alerts.facilitiesNotReady > 0 && { value: alerts.facilitiesNotReady, label: "facilities need booking configuration", to: links.configuration },
    alerts.escalatedGrievances > 0 && { value: alerts.escalatedGrievances, label: "grievances are escalated", to: links.grievances },
    alerts.overdueGrievances > 0 && { value: alerts.overdueGrievances, label: "grievances are past their response deadline", to: links.grievances },
    kpis.pendingPayments > 0 && { value: kpis.pendingPayments, label: "bookings still have pending payment", to: links.bookings },
    alerts.pendingGrantProofs > 0 && { value: alerts.pendingGrantProofs, label: "grant proofs await verification", to: links.grants },
    alerts.grantQueries > 0 && { value: alerts.grantQueries, label: "grant submissions have open queries", to: links.grants },
    !isAdmin && !data.configuration.length && { value: "!", label: "Online booking is not configured", to: links.configuration },
  ].filter(Boolean);

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6 lg:p-8">
      <header className="overflow-hidden rounded-3xl bg-emerald-950 px-6 py-6 text-white shadow-lg sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300">Live operational overview</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{isAdmin ? "Platform dashboard" : data.facility.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-emerald-100/80">
              {isAdmin ? "Bookings, collections, facilities and service delivery across the platform." : `${data.facility.location}${data.facility.district ? ` · ${data.facility.district}` : ""}`}
            </p>
          </div>
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold transition hover:bg-white/20 disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </header>

      {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Could not refresh: {error}. Showing the last loaded figures.</div>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Kpi key={card.label} {...card} />)}</div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Panel title="Bookings and collections" description="Actual activity for the latest six calendar months." className="xl:col-span-2">
          <Trend rows={data.trend} />
        </Panel>
        <Panel title="Needs attention" description="Operational items that may require action.">
          {alertItems.length ? (
            <div className="divide-y divide-slate-100">
              {alertItems.map((item, index) => (
                <Link key={`${item.label}-${index}`} to={item.to} className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50">
                  <span className="flex h-9 min-w-9 items-center justify-center rounded-xl bg-amber-50 px-2 text-sm font-extrabold text-amber-700">{item.value}</span>
                  <span className="flex-1 text-sm font-semibold text-slate-700">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              ))}
            </div>
          ) : <Empty>Nothing needs immediate attention.</Empty>}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Popular sports" description="Ranked using real booking payments and collected revenue." action={<Link to={links.bookings} className="text-xs font-bold text-emerald-700">View bookings</Link>}>
          {data.topSports.length ? (
            <div className="divide-y divide-slate-100">
              {data.topSports.slice(0, 6).map((row, index) => (
                <div key={`${row.sport}-${index}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-5 py-3.5">
                  <span className="text-sm font-extrabold text-slate-300">{String(index + 1).padStart(2, "0")}</span>
                  <div><p className="text-sm font-bold text-slate-800">{row.sport}</p><p className="text-xs text-slate-400">{row.bookings} payment attempts · {row.paidBookings} paid</p></div>
                  <span className="text-sm font-extrabold text-slate-700">{money.format(row.revenue)}</span>
                </div>
              ))}
            </div>
          ) : <Empty>No booking activity yet.</Empty>}
        </Panel>

        <Panel title="Rating overview" description="Ratings submitted by citizens for facilities, sports and coaches.">
          {rating.count ? (
            <div className="p-5">
              <div className="mb-5 flex items-center gap-4 rounded-xl bg-amber-50 p-4">
                <Star className="h-9 w-9 fill-amber-400 text-amber-400" />
                <div><p className="text-2xl font-extrabold text-slate-900">{rating.average.toFixed(1)} <span className="text-sm text-slate-400">/ 5</span></p><p className="text-xs text-slate-500">Across {rating.count} ratings</p></div>
              </div>
              <div className="space-y-3">{Object.entries(rating.byType).map(([type, item]) => (
                <div key={type} className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3">
                  <span className="text-sm font-bold capitalize text-slate-600">{type}</span>
                  <span className="text-sm font-extrabold text-slate-800">{item.count ? `${item.average.toFixed(1)} ★` : "No ratings"} <small className="ml-1 font-medium text-slate-400">({item.count})</small></span>
                </div>
              ))}</div>
            </div>
          ) : <Empty>No citizen ratings have been submitted yet.</Empty>}
        </Panel>
      </div>

      <Panel title="Recent bookings" description="Latest citizen booking and payment activity." action={<Link to={links.bookings} className="text-xs font-bold text-emerald-700">Open full report</Link>}>
        {data.recentBookings.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Reference</th>{isAdmin && <th className="px-5 py-3">Facility</th>}<th className="px-5 py-3">Citizen / sport</th><th className="px-5 py-3">Date</th><th className="px-5 py-3 text-right">Amount</th><th className="px-5 py-3">Booking</th><th className="px-5 py-3">Payment</th></tr></thead>
              <tbody className="divide-y divide-slate-100">{data.recentBookings.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-3 font-bold text-slate-700">{row.reference || row.id.slice(-8).toUpperCase()}</td>{isAdmin && <td className="px-5 py-3 text-slate-600">{row.facility}</td>}<td className="px-5 py-3"><p className="font-bold text-slate-700">{row.citizen}</p><p className="text-xs text-slate-400">{row.sport}</p></td><td className="px-5 py-3 text-slate-600">{formatDate(row.date)}</td><td className="px-5 py-3 text-right font-bold text-slate-700">{money.format(row.amount)}</td><td className="px-5 py-3"><Status value={row.bookingStatus} /></td><td className="px-5 py-3"><Status value={row.paymentStatus} /></td></tr>)}</tbody>
            </table>
          </div>
        ) : <Empty>No bookings have been created yet.</Empty>}
      </Panel>

      {isAdmin ? (
        <Panel title="Facility booking readiness" description="A facility is ready once it has at least one active sport configuration." action={<Link to="/admin" className="text-xs font-bold text-emerald-700">Manage facilities</Link>}>
          <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">{data.facilityReadiness.map((row) => <div key={row.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><span className={`h-3 w-3 shrink-0 rounded-full ${row.ready ? "bg-emerald-500" : "bg-amber-400"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{row.name}</p><p className="text-xs text-slate-400">{row.district || "District not assigned"} · {row.sports} configured sports</p></div><span className={`text-[10px] font-extrabold uppercase ${row.ready ? "text-emerald-700" : "text-amber-700"}`}>{row.ready ? "Ready" : "Setup needed"}</span></div>)}</div>
        </Panel>
      ) : (
        <Panel title="Sports and slot configuration" description="Current booking inventory, capacity and pricing." action={<Link to={links.configuration} className="text-xs font-bold text-emerald-700">Manage configuration</Link>}>
          {data.configuration.length ? <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400"><tr><th className="px-5 py-3">Sport</th><th className="px-5 py-3">Booking model</th><th className="px-5 py-3 text-right">Units</th><th className="px-5 py-3 text-right">Bookable slots</th><th className="px-5 py-3 text-right">Capacity</th><th className="px-5 py-3 text-right">Base price</th></tr></thead><tbody className="divide-y divide-slate-100">{data.configuration.map((row) => <tr key={row.id}><td className="px-5 py-3 font-bold text-slate-800">{row.sport}</td><td className="px-5 py-3 capitalize text-slate-500">{row.bookingMode}</td><td className="px-5 py-3 text-right">{row.units}</td><td className="px-5 py-3 text-right">{row.slots}</td><td className="px-5 py-3 text-right">{row.capacity}</td><td className="px-5 py-3 text-right font-bold">{money.format(row.price)}</td></tr>)}</tbody></table></div> : <Empty>No sports are configured for this facility.</Empty>}
        </Panel>
      )}
    </main>
  );
}
