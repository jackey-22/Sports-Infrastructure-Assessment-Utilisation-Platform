import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  RotateCcw,
  Search,
  Timer,
  Trophy,
} from "lucide-react";
import { SlotServices } from "./SlotTableServices";
import { formatDate, formatNumber } from "../../utils/manager/managerUtils";
import { useAdminQuery, useTableState } from "../../hooks/manager/useManagerQuery";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  Pagination,
  TableSkeleton,
  inputClass,
  selectClass,
} from "./Common/ManagerUI";

const PERIOD_TONES = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Upcoming: "border-sky-200 bg-sky-50 text-sky-800",
  Finished: "border-slate-200 bg-slate-100 text-slate-600",
};

const TODAY = new Date().toISOString().slice(0, 10);

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function dateOnly(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function periodState(start, end) {
  if (!start) return "—";
  if (TODAY < start) return "Upcoming";
  if (TODAY > (end || start)) return "Finished";
  return "Active";
}

function formatSlot(row) {
  if (!row.from && !row.to) return "—";
  return `${row.from || "—"} – ${row.to || "—"}`;
}

function normaliseSlot(row) {
  const start = dateOnly(row.Startdate) || dateOnly(row.createdAt);
  const end = dateOnly(row.Enddate) || dateOnly(row.updatedAt);
  return {
    id: String(row._id || `${row.Email || row.Name}-${start}-${row.from || ""}`),
    name: row.Name || "Unnamed guest",
    email: row.Email || "",
    contact: row.ContactNum || "",
    sport: (row.sport && row.sport.SportName) || "Not specified",
    from: (row.timeslot && row.timeslot.from) || "",
    to: (row.timeslot && row.timeslot.to) || "",
    duration: Number(row.duration) || 0,
    start,
    end,
    state: periodState(start, end),
  };
}

export default function SlotDataTable() {
  const [filters, setFilters] = useState({ search: "", sport: "", state: "" });

  const { data, loading, error, reload } = useAdminQuery(
    () => SlotServices.getCustomersXLarge(),
    []
  );

  const rows = useMemo(
    () => (Array.isArray(data) ? data.map(normaliseSlot) : []),
    [data]
  );

  const sportOptions = useMemo(
    () => [...new Set(rows.map((row) => row.sport))].sort(),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return rows.filter((row) => {
      if (filters.sport && row.sport !== filters.sport) return false;
      if (filters.state && row.state !== filters.state) return false;
      if (!query) return true;
      return `${row.name} ${row.email} ${row.contact} ${row.sport}`
        .toLowerCase()
        .includes(query);
    });
  }, [rows, filters]);

  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "name",
    sortDir: "asc",
  });

  const activeCount = rows.filter((row) => row.state === "Active").length;
  const sportsBooked = new Set(rows.map((row) => row.sport)).size;
  const averageDuration = useMemo(() => {
    const withDuration = rows.filter((row) => row.duration > 0);
    if (!withDuration.length) return "—";
    const total = withDuration.reduce((sum, row) => sum + row.duration, 0);
    return `${Math.round((total / withDuration.length) * 10) / 10} days`;
  }, [rows]);

  const isFiltered = Boolean(filters.search || filters.sport || filters.state);

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters({ search: "", sport: "", state: "" });
  }

  const columns = [
    {
      key: "name",
      header: "Guest",
      sortKey: "name",
      render: (row) => (
        <div className="flex min-w-[210px] items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-xs font-extrabold text-sky-700"
            aria-hidden="true"
          >
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-800">{row.name}</p>
            <p className="truncate text-[11px] text-slate-500">
              {row.email || "Email not recorded"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact number",
      render: (row) => (
        <span className="whitespace-nowrap text-slate-700">
          {row.contact || "—"}
        </span>
      ),
    },
    {
      key: "sport",
      header: "Sport",
      sortKey: "sport",
      render: (row) => (
        <span className="inline-flex whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
          {row.sport}
        </span>
      ),
    },
    {
      key: "timeslot",
      header: "Time slot",
      render: (row) => (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
          <Clock3 className="h-3 w-3 text-slate-500" aria-hidden="true" />
          {formatSlot(row)}
        </span>
      ),
    },
    {
      key: "duration",
      header: "Duration",
      sortKey: "duration",
      render: (row) => (
        <span className="whitespace-nowrap text-slate-700">
          {row.duration > 0
            ? `${formatNumber(row.duration)} ${row.duration === 1 ? "day" : "days"}`
            : "—"}
        </span>
      ),
    },
    {
      key: "period",
      header: "Period",
      sortKey: "start",
      render: (row) => (
        <div className="min-w-[150px]">
          <p className="whitespace-nowrap text-slate-700">
            {formatDate(row.start)}
            {row.end && row.end !== row.start ? ` – ${formatDate(row.end)}` : ""}
          </p>
          <span
            className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
              PERIOD_TONES[row.state] || PERIOD_TONES.Finished
            }`}
          >
            {row.state}
          </span>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Guest bookings"
          value={formatNumber(rows.length)}
          caption="Booked at this complex"
          icon={CalendarDays}
          tone="green"
        />
        <KpiCard
          label="Active now"
          value={formatNumber(activeCount)}
          caption="Within the booked period"
          icon={Clock3}
          tone="blue"
        />
        <KpiCard
          label="Sports booked"
          value={formatNumber(sportsBooked)}
          caption="Across all guest slots"
          icon={Trophy}
          tone="amber"
        />
        <KpiCard
          label="Average duration"
          value={averageDuration}
          caption="Per guest booking"
          icon={Timer}
          tone="slate"
        />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <Field label="Search" htmlFor="slot-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="slot-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Guest name, email, contact number or sport"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Sport" htmlFor="slot-sport">
            <select
              id="slot-sport"
              className={selectClass}
              value={filters.sport}
              onChange={(event) => update({ sport: event.target.value })}
            >
              <option value="">All sports</option>
              {sportOptions.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Period" htmlFor="slot-state">
            <select
              id="slot-state"
              className={selectClass}
              value={filters.state}
              onChange={(event) => update({ state: event.target.value })}
            >
              <option value="">All periods</option>
              <option value="Active">Active</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Finished">Finished</option>
            </select>
          </Field>
        </div>
        <div className="flex justify-end border-t border-slate-100 px-4 py-3 sm:px-5">
          <Button variant="secondary" onClick={reset} disabled={!isFiltered}>
            <RotateCcw className="h-4 w-4" /> Reset filters
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={6} columns={6} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            <DataTable
              caption="Guest bookings and time slots at this sports complex"
              columns={columns}
              rows={table.pageRows}
              sort={table.sort}
              onSort={table.toggleSort}
              empty={
                isFiltered ? (
                  <EmptyState
                    title="No guest bookings match these filters"
                    description="Try a different guest name, sport or period."
                    action={<Button onClick={reset}>Reset filters</Button>}
                  />
                ) : (
                  <EmptyState
                    title="No guest time slots yet"
                    description="Guest bookings made against the courts at this complex will appear here."
                  />
                )
              }
            />
            {table.total > 0 ? (
              <Pagination
                page={table.page}
                pageCount={table.pageCount}
                pageSize={table.pageSize}
                total={table.total}
                setPage={table.setPage}
                setPageSize={table.setPageSize}
              />
            ) : null}
          </>
        )}
      </Card>
    </>
  );
}
