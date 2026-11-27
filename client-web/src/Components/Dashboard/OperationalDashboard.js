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
  Gauge,
  RefreshCw,
  Star,
  Users,
  WalletCards,
} from "lucide-react";
import { api } from "../../API/client";
import { BarChart, DonutChart, TrendChart } from "../Admin/Common/AdminCharts";
import { KpiCard, PageHeader, PageShell } from "../Admin/Common/AdminUI";

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

function UtilisationBarChart({ rows, labelKey }) {
  if (!rows?.length) return <Empty>No configured capacity for this period.</Empty>;
  const slice = rows.slice(0, 8);
  const categories = slice.map((row) => row[labelKey]);
  return (
    <div className="p-3 sm:p-4">
      <BarChart
        series={[
          { name: "Booked", data: slice.map((row) => row.used || 0) },
          { name: "Capacity", data: slice.map((row) => row.capacity || 0) },
        ]}
        categories={categories}
        colors={["#007D40", "#CBD5E1"]}
        height={250}
        formatValue={(val) => number.format(Math.round(val))}
      />
    </div>
  );
}

function UtilisationTrendChart({ rows }) {
  const [mode, setMode] = useState("pct");
  if (!rows?.length) return <Empty>No utilization trend data for this period.</Empty>;
  const categories = rows.map((row) => row.label);
  return (
    <div className="p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-end gap-1.5 px-2">
        {[
          { id: "pct", label: "Utilization %" },
          { id: "spots", label: "Booked vs Capacity" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMode(tab.id)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              mode === tab.id
                ? "bg-brand-primary text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <TrendChart
        area
        categories={categories}
        series={
          mode === "pct"
            ? [{ name: "Utilization %", data: rows.map((row) => row.utilisationPct || 0) }]
            : [
                { name: "Booked", data: rows.map((row) => row.used || 0) },
                { name: "Capacity", data: rows.map((row) => row.capacity || 0) },
              ]
        }
        colors={mode === "pct" ? ["#007D40"] : ["#007D40", "#94A3B8"]}
        height={250}
        formatValue={(val) =>
          mode === "pct" ? `${val}%` : number.format(Math.round(val))
        }
      />
    </div>
  );
}

function BookingAttendanceChart({ bySport, trend }) {
  const [view, setView] = useState("sport");
  const slice = (bySport || []).slice(0, 8);
  const hasTrend = (trend || []).length > 0;
  if (!slice.length && !hasTrend) return <Empty>No booking or attendance data for this period.</Empty>;
  return (
    <div className="p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-end gap-1.5 px-2">
        {[
          { id: "sport", label: "By sport" },
          { id: "trend", label: "Daily trend" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              view === tab.id
                ? "bg-brand-primary text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {view === "sport" ? (
        <BarChart
          categories={slice.map((row) => row.sport)}
          series={[
            { name: "Booked", data: slice.map((row) => row.used || 0) },
            { name: "Attended", data: slice.map((row) => row.attended || 0) },
          ]}
          colors={["#007D40", "#3B82F6"]}
          height={240}
          formatValue={(val) => number.format(Math.round(val))}
        />
      ) : (
        <TrendChart
          area
          categories={(trend || []).map((row) => row.label)}
          series={[
            { name: "Booked", data: (trend || []).map((row) => row.used || 0) },
            { name: "Attended", data: (trend || []).map((row) => row.attended || 0) },
          ]}
          colors={["#007D40", "#3B82F6"]}
          height={240}
          formatValue={(val) => number.format(Math.round(val))}
        />
      )}
    </div>
  );
}

function Trend({ rows }) {
  const [metric, setMetric] = useState("bookings");
  const categories = (rows || []).map((row) => row.label);
  const series = [
    {
      name: metric === "bookings" ? "Bookings" : "Revenue",
      data: (rows || []).map((row) => (metric === "bookings" ? row.bookings || 0 : row.revenue || 0)),
    },
  ];

  return (
    <div className="p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-end gap-1.5 px-2">
        {[
          { id: "bookings", label: "Bookings" },
          { id: "revenue", label: "Revenue (₹)" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setMetric(tab.id)}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              metric === tab.id
                ? "bg-brand-primary text-white shadow-2xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <BarChart
        series={series}
        categories={categories}
        colors={[metric === "bookings" ? "#007D40" : "#D97706"]}
        height={240}
        formatValue={(val) =>
          metric === "bookings" ? `${Math.round(val)}` : money.format(val)
        }
      />
    </div>
  );
}

const DAY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

function DayRangeSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
      {DAY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
            value === opt.value
              ? "bg-brand-primary text-white shadow-sm"
              : "text-slate-500 hover:bg-slate-200"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function OperationalDashboard({ role }) {
  const isAdmin = role === "admin";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const load = useCallback(async (windowDays = 30) => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/dashboard/${role}?days=${windowDays}`);
      setData(response.data);
    } catch (requestError) {
      setError(requestError.message || "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => { load(days); }, [load, days]);

  const links = useMemo(() => isAdmin ? {
    bookings: "/admin/insights/bookings",
    grievances: "/admin/insights/grievances",
    grants: "/admin/insights/grants",
    configuration: "/admin",
    athletes: "/admin/insights/leaderboard",
    assessments: "/admin/insights/assessments",
    utilisation: "/admin/insights/utilisation",
  } : {
    bookings: "/manager/transactions",
    grievances: "/manager/allcomplaint",
    grants: "/manager/grants",
    configuration: "/manager/sports-configuration",
    athletes: "/manager/leaderboard",
    assessments: "/manager/assessment",
    utilisation: "/manager/utilisation",
  }, [isAdmin]);

  if (loading && !data) {
    return (
      <PageShell>
        <div className="mb-6 h-20 animate-pulse rounded-2xl bg-slate-200" />
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}</div>
        <div className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </PageShell>
    );
  }

  if (error && !data) {
    return (
      <PageShell>
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
          <h1 className="mt-3 text-xl font-extrabold text-slate-900">Dashboard unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button type="button" onClick={() => load(days)} className="mt-5 rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white">Try again</button>
        </div>
      </PageShell>
    );
  }

  const { kpis, alerts } = data;
  const utilisation = data.utilisation || { overall: { utilisationPct: 0, used: 0, capacity: 0 }, bySport: [], byFacility: [], insights: [], period: {} };
  const rating = kpis.ratings;

  const slotTooltip = [
    `📊 How this is calculated:`,
    ``,
    `Spots booked (${number.format(utilisation.overall.used)}): Total member/court-spots from confirmed bookings in the last 30 days. Each booking counts its member count (or 1 for whole-court).`,
    ``,
    `Total capacity (${number.format(utilisation.overall.capacity)}): Each active slot's daily capacity × number of days it has been configured in the 30-day window. A slot configured 10 days ago with 40 places = 400 capacity spots.`,
    ``,
    `Usage % = Spots booked ÷ Total capacity × 100.`,
    ``,
    `A low % is normal when slots are newly configured — capacity accumulates every day even without bookings.`,
  ].join("\n");

  const cards = isAdmin ? [
    { label: "Facilities", value: number.format(kpis.facilities), caption: `${kpis.bookingReadyFacilities} ready for online booking`, icon: Building2, to: links.configuration },
    { label: "Active sports", value: number.format(kpis.activeSports), caption: "Available in master directory", icon: Dumbbell, to: links.configuration },
    { label: "Active coaches", value: number.format(kpis.activeCoaches), caption: "Across all facilities", icon: Users, tone: "violet", to: links.configuration },
    { label: "Athletes", value: number.format(kpis.citizens), caption: "Registered athletes", icon: Users, to: links.athletes },
    { label: "Confirmed bookings", value: number.format(kpis.bookings), caption: `${kpis.todayBookings} today · ${kpis.upcomingBookings} upcoming`, icon: CalendarCheck, to: links.bookings },
    { label: "Revenue collected", value: money.format(kpis.revenue), caption: `${kpis.paidPayments} paid transactions`, icon: IndianRupee, tone: "amber", to: links.bookings },
    { label: "Open grievances", value: number.format(kpis.openGrievances), caption: `${kpis.escalatedGrievances} escalated · ${kpis.overdueGrievances} overdue`, icon: ClipboardList, tone: kpis.escalatedGrievances ? "amber" : "slate", to: links.grievances },
    { label: "Grant allocation", value: money.format(kpis.grants.allocated), caption: `${money.format(kpis.grants.utilised)} verified usage`, icon: WalletCards, tone: "violet", to: links.grants },
    { label: `${days}-day slot usage`, value: `${utilisation.overall.utilisationPct}%`, caption: `${number.format(utilisation.overall.used)} of ${number.format(utilisation.overall.capacity)} spots booked`, icon: Gauge, tone: utilisation.overall.utilisationPct >= 80 ? "amber" : "green", to: links.utilisation, tooltip: slotTooltip },
  ] : [
    { label: "Confirmed bookings", value: number.format(kpis.bookings), caption: `${kpis.todayBookings} today`, icon: CalendarCheck, to: links.bookings },
    { label: "Upcoming", value: number.format(kpis.upcomingBookings), caption: `${kpis.todayBookings} bookings today`, icon: Clock3, to: links.bookings },
    { label: "Revenue collected", value: money.format(kpis.revenue), caption: `${kpis.paidPayments} paid transactions`, icon: IndianRupee, tone: "amber", to: links.bookings },
    { label: "Configured sports", value: number.format(kpis.activeSports), caption: `${data.configuration.reduce((sum, row) => sum + row.slots, 0)} bookable slots`, icon: Dumbbell, to: links.configuration },
    { label: "Athletes", value: number.format(kpis.citizens), caption: "Athletes with bookings here", icon: Users, tone: "violet", to: links.athletes },
    { label: "Active coaches", value: number.format(kpis.activeCoaches), caption: "Assigned to this facility", icon: Users, to: links.configuration },
    { label: "Open grievances", value: number.format(kpis.openGrievances), caption: `${kpis.escalatedGrievances} escalated · ${kpis.overdueGrievances} overdue`, icon: ClipboardList, tone: kpis.overdueGrievances ? "amber" : "slate", to: links.grievances },
    { label: "Grant allocation", value: money.format(kpis.grants.allocated), caption: `${money.format(kpis.grants.utilised)} verified usage`, icon: WalletCards, tone: "violet", to: links.grants },
    { label: `${days}-day slot usage`, value: `${utilisation.overall.utilisationPct}%`, caption: `${number.format(utilisation.overall.used)} of ${number.format(utilisation.overall.capacity)} spots booked`, icon: Gauge, tone: utilisation.overall.utilisationPct >= 80 ? "amber" : "green", to: links.utilisation, tooltip: slotTooltip },
  ];

  const alertItems = [
    isAdmin && alerts.facilitiesNotReady > 0 && { value: alerts.facilitiesNotReady, label: "facilities need booking configuration", to: links.configuration },
    alerts.maintenanceDueCount > 0 && { value: alerts.maintenanceDueCount, label: isAdmin ? "facility-sport condition assessments due" : "sport condition assessments due for maintenance review", to: links.assessments },
    alerts.escalatedGrievances > 0 && { value: alerts.escalatedGrievances, label: "grievances are escalated", to: links.grievances },
    alerts.overdueGrievances > 0 && { value: alerts.overdueGrievances, label: "grievances are past their response deadline", to: links.grievances },
    alerts.pendingGrantProofs > 0 && { value: alerts.pendingGrantProofs, label: "grant proofs await verification", to: links.grants },
    alerts.grantQueries > 0 && { value: alerts.grantQueries, label: "grant submissions have open queries", to: links.grants },
    !isAdmin && !data.configuration.length && { value: "!", label: "Online booking is not configured", to: links.configuration },
  ].filter(Boolean);

  return (
    <PageShell>
      <PageHeader
        eyebrow={isAdmin ? "Platform Operations" : "Facility Operational Overview"}
        title={isAdmin ? "Platform Dashboard" : data.facility.name}
        description={
          isAdmin
            ? "Bookings, collections, facilities, and service delivery across Gujarat."
            : `${data.facility.location}${data.facility.district ? ` · ${data.facility.district}` : ""}`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => load(days)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link
              to={links.bookings}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-brand-dark"
            >
              Bookings &amp; Payments
            </Link>
          </div>
        }
      />

      <div className="space-y-5">
        {error && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Could not refresh: {error}. Showing the last loaded figures.</div>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <KpiCard key={card.label} {...card} />)}</div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Bookings and collections" description="Actual activity for the latest six calendar months.">
          <Trend rows={data.trend} />
        </Panel>
        <Panel
          title={`Booking & attendance utilization · last ${days} days`}
          description="Booked spots vs verified gate check-in attendance."
          action={<DayRangeSelector value={days} onChange={setDays} />}
        >
          <BookingAttendanceChart bySport={utilisation.bySport} trend={utilisation.trend} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Sport-wise revenue &amp; bookings" description="Confirmed paid bookings and revenue collected per sport.">
          {data.topSports?.length ? (
            <div className="p-3 sm:p-4">
              <BarChart
                categories={data.topSports.slice(0, 6).map((row) => row.sport)}
                series={[
                  { name: "Revenue (₹)", data: data.topSports.slice(0, 6).map((row) => row.revenue || 0) },
                ]}
                colors={["#007D40"]}
                height={230}
                formatValue={(val) => money.format(val)}
              />
            </div>
          ) : <Empty>No paid bookings recorded yet.</Empty>}
        </Panel>

        <Panel
          title={isAdmin ? "Facility booking readiness" : "Grievance resolution status"}
          description={isAdmin ? "Share of facilities configured for online bookings vs setup pending." : "Open vs resolved grievances for your facility."}
        >
          <div className="p-3 sm:p-4">
            {isAdmin ? (
              <DonutChart
                labels={["Booking Ready", "Setup Needed"]}
                series={[kpis.bookingReadyFacilities || 0, Math.max(0, (kpis.facilities || 0) - (kpis.bookingReadyFacilities || 0))]}
                colors={["#007D40", "#F59E0B"]}
                height={230}
                formatValue={(val) => `${Math.round(val)}`}
              />
            ) : (
              <DonutChart
                labels={["Open", "Resolved"]}
                series={[kpis.openGrievances || 0, kpis.resolvedGrievances || 0]}
                colors={["#F59E0B", "#007D40"]}
                height={230}
                formatValue={(val) => `${Math.round(val)}`}
              />
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel
          title={`Slot utilization trend · last ${days} days`}
          description={`Daily booked vs capacity · ${formatDate(utilisation.period.startDate)} to ${formatDate(utilisation.period.endDate)}`}
          action={<DayRangeSelector value={days} onChange={setDays} />}
        >
          <UtilisationTrendChart rows={utilisation.trend} />
        </Panel>

        <Panel
          title={`Sports slot usage · last ${days} days`}
          description={`Booked vs total capacity per sport · ${formatDate(utilisation.period.startDate)} to ${formatDate(utilisation.period.endDate)}`}
          action={<DayRangeSelector value={days} onChange={setDays} />}
        >
          <UtilisationBarChart rows={utilisation.bySport} labelKey="sport" />
        </Panel>
      </div>

      <div className={`grid grid-cols-1 gap-5 ${isAdmin ? "xl:grid-cols-2" : ""}`}>
        {isAdmin && (
          <Panel
            title={`Facility-wise slot usage · last ${days} days`}
            description="Booked vs total slot capacity across facilities."
            action={<DayRangeSelector value={days} onChange={setDays} />}
          >
            <UtilisationBarChart rows={utilisation.byFacility} labelKey="facility" />
          </Panel>
        )}

        <Panel title={isAdmin ? "Operational insights" : "Facility insights"} description={`Summary observations calculated from the latest ${days} days.`}>
          <div className="space-y-3 p-5">
            {utilisation.insights?.length ? utilisation.insights.map((insight, index) => <div key={`${insight}-${index}`} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"><Gauge className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><p className="text-sm text-slate-700">{insight}</p></div>) : <p className="text-sm text-slate-400">More booking data is needed for insights.</p>}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="Popular sports" description="Ranked using real booking payments and collected revenue." action={<Link to={links.bookings} className="text-xs font-bold text-emerald-700">View bookings</Link>}>
          {data.topSports.length ? (
            <div className="divide-y divide-slate-100">
              {data.topSports.slice(0, 6).map((row, index) => (
                <div key={`${row.sport}-${index}`} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-5 py-3.5">
                  <span className="text-sm font-extrabold text-slate-300">{String(index + 1).padStart(2, "0")}</span>
                  <div><p className="text-sm font-bold text-slate-800">{row.sport}</p><p className="text-xs text-slate-400">{row.paidBookings} confirmed booking{row.paidBookings === 1 ? "" : "s"}</p></div>
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
      </div>
    </PageShell>
  );
}
