import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Gauge,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../../API/client";
import {
  Card,
  EmptyState,
  KpiCard,
  PageHeader,
  PageShell,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../Admin/Common/AdminUI";

const number = new Intl.NumberFormat("en-IN");
const DAY_OPTIONS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

function StatusBadge({ status }) {
  if (status === "over") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-700">
        <TrendingUp className="h-3 w-3" /> Over-utilized
      </span>
    );
  }
  if (status === "under") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
        <TrendingDown className="h-3 w-3" /> Under-utilized
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Optimal
    </span>
  );
}

function recommendationFor(row) {
  if (row.utilisationPct >= 80) {
    return "High demand — consider adding more time slots or expanding court/lane units.";
  }
  if (row.utilisationPct < 25) {
    return "Low utilization — review slot timings, pricing, or run athlete outreach.";
  }
  return "Healthy utilization — capacity and demand are well balanced.";
}

export default function SlotUtilisationReport({ role = "admin" }) {
  const isAdmin = role === "admin";
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [sportFilter, setSportFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("pct_desc");

  const load = useCallback(
    async (windowDays = days) => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(`/api/dashboard/${role}?days=${windowDays}`);
        setData(res.data);
      } catch (err) {
        setError(err.message || "Could not load utilization report.");
      } finally {
        setLoading(false);
      }
    },
    [role, days]
  );

  useEffect(() => {
    load(days);
  }, [load, days]);

  const utilisation = data?.utilisation || {
    overall: { utilisationPct: 0, used: 0, capacity: 0 },
    byFacilitySport: [],
    period: {},
  };

  const rows = utilisation.byFacilitySport || [];

  const facilityOptions = useMemo(
    () =>
      [...new Map(rows.map((r) => [r.facilityId, r.facility])).entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rows]
  );

  const sportOptions = useMemo(
    () =>
      [...new Map(rows.map((r) => [r.sportId, r.sport])).entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rows]
  );

  const counts = useMemo(() => {
    let over = 0;
    let optimal = 0;
    let under = 0;
    rows.forEach((r) => {
      if (r.utilisationPct >= 80) over += 1;
      else if (r.utilisationPct < 25) under += 1;
      else optimal += 1;
    });
    return { over, optimal, under };
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (isAdmin && facilityFilter && r.facilityId !== facilityFilter) return false;
      if (sportFilter && r.sportId !== sportFilter) return false;
      if (statusFilter === "over" && r.utilisationPct < 80) return false;
      if (statusFilter === "optimal" && (r.utilisationPct >= 80 || r.utilisationPct < 25)) return false;
      if (statusFilter === "under" && r.utilisationPct >= 25) return false;
      if (q && !`${r.facility} ${r.sport}`.toLowerCase().includes(q)) return false;
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === "pct_asc") return a.utilisationPct - b.utilisationPct || a.used - b.used;
      if (sortBy === "booked_desc") return b.used - a.used;
      if (sortBy === "capacity_desc") return b.capacity - a.capacity;
      return b.utilisationPct - a.utilisationPct || b.used - a.used;
    });
  }, [rows, isAdmin, facilityFilter, sportFilter, statusFilter, search, sortBy]);

  return (
    <PageShell>
      <PageHeader
        eyebrow={isAdmin ? "Platform Insights · Capacity & Demand" : "Facility Insights · Capacity & Demand"}
        title="Slot Utilization Report"
        description="Identify over-utilized (≥80%) and under-utilized (<25%) facility-sport slots across Gujarat."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-2xs">
              {DAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDays(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    days === opt.value
                      ? "bg-brand-primary text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => load(days)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <Link
              to={isAdmin ? "/admin/insights" : "/manager"}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
            </Link>
          </div>
        }
      />

      {error ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {error}
        </div>
      ) : null}

      {/* KPI Strip (clickable to filter status) */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`${days}-day overall usage`}
          value={`${utilisation.overall.utilisationPct}%`}
          caption={`${number.format(utilisation.overall.used)} of ${number.format(utilisation.overall.capacity)} spots booked`}
          icon={Gauge}
          tone="green"
          onClick={() => setStatusFilter("all")}
        />
        <KpiCard
          label="Over-utilized (≥80%)"
          value={number.format(counts.over)}
          caption="Click to filter high-demand slots"
          icon={TrendingUp}
          tone="amber"
          onClick={() => setStatusFilter((s) => (s === "over" ? "all" : "over"))}
        />
        <KpiCard
          label="Optimal (25–79%)"
          value={number.format(counts.optimal)}
          caption="Click to filter balanced slots"
          icon={CheckCircle2}
          tone="green"
          onClick={() => setStatusFilter((s) => (s === "optimal" ? "all" : "optimal"))}
        />
        <KpiCard
          label="Under-utilized (<25%)"
          value={number.format(counts.under)}
          caption="Click to filter low-demand slots"
          icon={TrendingDown}
          tone="slate"
          onClick={() => setStatusFilter((s) => (s === "under" ? "all" : "under"))}
        />
      </div>

      {/* Filters & Search */}
      <Card className="mb-5 p-4">
        <div className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${isAdmin ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isAdmin ? "Search facility or sport..." : "Search sport..."}
              className={`${inputClass} pl-9`}
            />
          </div>

          {isAdmin ? (
            <select
              aria-label="Filter by facility"
              value={facilityFilter}
              onChange={(e) => setFacilityFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">All facilities</option>
              {facilityOptions.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          ) : null}

          <select
            aria-label="Filter by sport"
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className={selectClass}
          >
            <option value="">All sports</option>
            {sportOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by utilization status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={selectClass}
          >
            <option value="all">All statuses</option>
            <option value="over">Over-utilized (≥80%)</option>
            <option value="optimal">Optimal (25–79%)</option>
            <option value="under">Under-utilized (&lt;25%)</option>
          </select>

          <select
            aria-label="Sort utilization rows"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={selectClass}
          >
            <option value="pct_desc">Highest usage %</option>
            <option value="pct_asc">Lowest usage %</option>
            <option value="booked_desc">Most spots booked</option>
            <option value="capacity_desc">Highest capacity</option>
          </select>
        </div>
      </Card>

      {/* Utilization Table */}
      <Card>
        {loading && !data ? (
          <div className="p-4">
            <TableSkeleton rows={6} columns={isAdmin ? 7 : 6} />
          </div>
        ) : filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  {isAdmin ? <th className="px-5 py-3.5">Facility</th> : null}
                  <th className="px-5 py-3.5">Sport</th>
                  <th className="px-5 py-3.5 text-right">Booked</th>
                  <th className="px-5 py-3.5 text-right">Capacity</th>
                  <th className="px-5 py-3.5 text-right">Attended</th>
                  <th className="px-5 py-3.5 w-48">Utilization %</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Actionable Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const pct = Math.min(100, row.utilisationPct || 0);
                  const barTone =
                    row.utilisationPct >= 80
                      ? "bg-rose-500"
                      : row.utilisationPct < 25
                      ? "bg-amber-400"
                      : "bg-emerald-600";
                  return (
                    <tr key={`${row.facilityId}-${row.sportId}`} className="hover:bg-slate-50/80">
                      {isAdmin ? (
                        <td className="px-5 py-3.5 font-bold text-slate-800">{row.facility}</td>
                      ) : null}
                      <td className="px-5 py-3.5 font-bold text-slate-800">{row.sport}</td>
                      <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-slate-700">
                        {number.format(row.used)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-500">
                        {number.format(row.capacity)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">
                        {number.format(row.attended || 0)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div className={`h-full rounded-full ${barTone}`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-12 text-right font-extrabold tabular-nums text-slate-800">
                            {row.utilisationPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{recommendationFor(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              title="No matching utilization records"
              description="Try clearing your search or status filter."
            />
          </div>
        )}
      </Card>
    </PageShell>
  );
}
