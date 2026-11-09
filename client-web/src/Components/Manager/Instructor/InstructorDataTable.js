import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  CalendarDays,
  Clock3,
  RotateCcw,
  Search,
  Trophy,
  Users,
} from "lucide-react";
import { InstructorService } from "./InstructorServices";
import { formatNumber } from "../../../utils/manager/managerUtils";
import { useAdminQuery, useTableState } from "../../../hooks/manager/useManagerQuery";
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
} from "../Common/ManagerUI";

const MAX_PREVIEW_SLOTS = 4;

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatSlot(slot) {
  return `${slot.from} – ${slot.to}`;
}

function normaliseInstructor(row) {
  const user = row.userId || {};
  const sports = (Array.isArray(row.sports) ? row.sports : [])
    .filter((entry) => entry && entry.sport)
    .map((entry) => ({
      name: entry.sport.SportName || "Sport",
      experience: Number(entry.experience) || 0,
      slots: (Array.isArray(entry.timeSlot) ? entry.timeSlot : []).filter(
        (slot) => slot && slot.from && slot.to
      ),
    }));

  return {
    id: String(row._id || user._id || user.Email || ""),
    name: user.Name || "Unnamed instructor",
    email: user.Email || "",
    contact: user.ContactNum || "",
    sports,
    sportNames: sports.map((sport) => sport.name).join(", "),
    slotCount: sports.reduce((total, sport) => total + sport.slots.length, 0),
    experience: sports.reduce(
      (highest, sport) => Math.max(highest, sport.experience),
      0
    ),
  };
}

export default function InstructorDataTable() {
  const { _id } = useSelector((state) => state.user.user);
  const [filters, setFilters] = useState({ search: "", sport: "" });

  const { data, loading, error, reload } = useAdminQuery(
    () => InstructorService.getCustomersXLarge(_id),
    [_id]
  );

  const rows = useMemo(
    () => (Array.isArray(data) ? data.map(normaliseInstructor) : []),
    [data]
  );

  const sportOptions = useMemo(
    () =>
      [...new Set(rows.flatMap((row) => row.sports.map((sport) => sport.name)))].sort(),
    [rows]
  );

  const visibleRows = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSport =
        !filters.sport || row.sports.some((sport) => sport.name === filters.sport);
      if (!matchesSport) return false;
      if (!query) return true;
      return `${row.name} ${row.email} ${row.contact} ${row.sportNames}`
        .toLowerCase()
        .includes(query);
    });
  }, [rows, filters]);

  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "name",
    sortDir: "asc",
  });

  const sportsCovered = useMemo(
    () => new Set(rows.flatMap((row) => row.sports.map((sport) => sport.name))).size,
    [rows]
  );
  const slotCount = useMemo(
    () => rows.reduce((total, row) => total + row.slotCount, 0),
    [rows]
  );
  const averageExperience = useMemo(() => {
    const withExperience = rows.filter((row) => row.experience > 0);
    if (!withExperience.length) return "—";
    const total = withExperience.reduce((sum, row) => sum + row.experience, 0);
    return `${Math.round((total / withExperience.length) * 10) / 10} yrs`;
  }, [rows]);

  const isFiltered = Boolean(filters.search || filters.sport);

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters({ search: "", sport: "" });
  }

  const columns = [
    {
      key: "name",
      header: "Instructor",
      sortKey: "name",
      render: (row) => (
        <div className="flex min-w-[210px] items-center gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-brand-soft text-xs font-extrabold text-brand-primary"
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
      key: "sports",
      header: "Sports & experience",
      render: (row) =>
        row.sports.length ? (
          <div className="flex max-w-[280px] flex-wrap gap-1.5">
            {row.sports.map((sport) => (
              <span
                key={sport.name}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800"
              >
                {sport.name}
                {sport.experience > 0 ? (
                  <span className="font-normal text-emerald-700">
                    · {sport.experience} yrs
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-slate-500">No sports assigned</span>
        ),
    },
    {
      key: "slots",
      header: "Weekly schedule",
      render: (row) => {
        const slots = row.sports.flatMap((sport) =>
          sport.slots.map((slot) => ({ ...slot, sport: sport.name }))
        );
        if (!slots.length) {
          return <span className="text-slate-500">No time slots</span>;
        }
        return (
          <div className="flex max-w-[320px] flex-wrap gap-1.5">
            {slots.slice(0, MAX_PREVIEW_SLOTS).map((slot) => (
              <span
                key={`${slot.sport}-${slot.from}-${slot.to}`}
                className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700"
                title={`${slot.sport}: ${formatSlot(slot)}`}
              >
                <Clock3 className="h-3 w-3 text-slate-500" aria-hidden="true" />
                {formatSlot(slot)}
              </span>
            ))}
            {slots.length > MAX_PREVIEW_SLOTS ? (
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                +{slots.length - MAX_PREVIEW_SLOTS} more
              </span>
            ) : null}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Instructors"
          value={formatNumber(rows.length)}
          caption="Assigned to this complex"
          icon={Users}
          tone="green"
        />
        <KpiCard
          label="Sports covered"
          value={formatNumber(sportsCovered)}
          caption="Across all instructors"
          icon={Trophy}
          tone="blue"
        />
        <KpiCard
          label="Weekly time slots"
          value={formatNumber(slotCount)}
          caption="Recurring coaching sessions"
          icon={CalendarDays}
          tone="amber"
        />
        <KpiCard
          label="Average experience"
          value={averageExperience}
          caption="Reported by instructors"
          icon={Clock3}
          tone="slate"
        />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <Field label="Search" htmlFor="instructor-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="instructor-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Instructor name, email, contact number or sport"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Sport" htmlFor="instructor-sport">
            <select
              id="instructor-sport"
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

          <div className="flex items-end">
            <Button variant="secondary" onClick={reset} disabled={!isFiltered}>
              <RotateCcw className="h-4 w-4" /> Reset filters
            </Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={6} columns={4} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            <DataTable
              caption="Instructors assigned to this sports complex"
              columns={columns}
              rows={table.pageRows}
              sort={table.sort}
              onSort={table.toggleSort}
              empty={
                isFiltered ? (
                  <EmptyState
                    title="No instructors match these filters"
                    description="Try a different name, sport or contact number."
                    action={<Button onClick={reset}>Reset filters</Button>}
                  />
                ) : (
                  <EmptyState
                    title="No instructors yet"
                    description="Add an instructor to assign sports and weekly coaching time slots to this complex."
                    action={
                      <Button as={Link} to="/manager/addinstructor">
                        Add instructor
                      </Button>
                    }
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
