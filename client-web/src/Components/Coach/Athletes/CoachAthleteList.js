import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Clock3,
  RotateCcw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react";
import { coachService } from "../../../services/coach/coachService";
import {
  filterAthletes,
  formatDate,
  formatNumber,
  summariseCoachAthletes,
} from "../../../utils/coach/coachUtils";
import { useAdminQuery, useTableState } from "../../../hooks/coach/useCoachQuery";
import {
  Button,
  Card,
  DataTable,
  DemoBanner,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  Notice,
  PageHeader,
  PageShell,
  Pagination,
  StatusPill,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../Common/CoachUI";

const EMPTY_FILTERS = {
  search: "",
  sport: "",
  ageGroup: "",
  status: "",
  ratingStatus: "",
};

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    sport: params.get("sport") || "",
    ageGroup: params.get("ageGroup") || "",
    status: params.get("status") || "",
    ratingStatus: params.get("ratingStatus") || "",
  };
}

export default function CoachAthleteList() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);

  const query = useMemo(
    () => ({
      sport: filters.sport,
      ageGroup: filters.ageGroup,
      status: filters.status,
      ratingStatus: filters.ratingStatus,
    }),
    [filters]
  );
  const queryKey = JSON.stringify(query);

  const { data, loading, error, reload } = useAdminQuery(
    () => coachService.listAthletes(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const visibleRows = useMemo(
    () => filterAthletes(rows, { search: filters.search }),
    [rows, filters.search]
  );

  const summary = useMemo(() => summariseCoachAthletes(visibleRows), [visibleRows]);
  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "name",
    sortDir: "asc",
  });
  const sportOptions = useMemo(
    () => [...new Set(rows.map((row) => row.sport))].sort(),
    [rows]
  );

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
    setParams({}, { replace: true });
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Coach Console · Assigned Athletes"
        title="Assigned athletes"
        description="Athletes assigned to this coach at the facility. Filter, sort and paginate; click a row to view the profile."
        actions={
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset filters
          </Button>
        }
      />

      <DemoBanner>
        Athletes assigned at this facility. No athlete data
        is sent to the server.
      </DemoBanner>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Assigned athletes"
          value={formatNumber(summary.total)}
          caption="At this facility"
          icon={Users}
          tone="green"
        />
        <KpiCard
          label="Active"
          value={formatNumber(summary.active)}
          caption="Status = Active"
          icon={ShieldAlert}
          tone="green"
        />
        <KpiCard
          label="Pending rating"
          value={formatNumber(summary.pending)}
          caption="Not yet rated by coach"
          icon={Clock3}
          tone="amber"
        />
        <KpiCard
          label="Rated"
          value={formatNumber(summary.rated)}
          caption="Coach rating submitted"
          icon={ShieldAlert}
          tone="green"
        />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <Field label="Search" htmlFor="athlete-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="athlete-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Athlete name or sport"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Sport" htmlFor="athlete-sport">
            <select
              id="athlete-sport"
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

          <Field label="Age group" htmlFor="athlete-age-group">
            <select
              id="athlete-age-group"
              className={selectClass}
              value={filters.ageGroup}
              onChange={(event) => update({ ageGroup: event.target.value })}
            >
              <option value="">All age groups</option>
              {["Under 14", "Under 17", "Under 19", "Open"].map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status" htmlFor="athlete-status">
            <select
              id="athlete-status"
              className={selectClass}
              value={filters.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              <option value="">All statuses</option>
              {["Active", "Inactive", "On Leave"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Rating status" htmlFor="athlete-rating-status">
            <select
              id="athlete-rating-status"
              className={selectClass}
              value={filters.ratingStatus}
              onChange={(event) => update({ ratingStatus: event.target.value })}
            >
              <option value="">All rating statuses</option>
              {["Rated", "Pending"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={8} columns={6} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : visibleRows.length === 0 ? (
          <EmptyState
            title="No athletes match these filters"
            action={<Button onClick={reset}>Reset filters</Button>}
          />
        ) : (
          <>
            <DataTable
              caption="Assigned athlete records"
              columns={[
                {
                  key: "id",
                  header: "Athlete ID",
                  sortKey: "id",
                  render: (row) => (
                    <span className="font-mono text-[11px] font-bold text-slate-700">{row.id}</span>
                  ),
                },
                {
                  key: "name",
                  header: "Name",
                  sortKey: "name",
                  render: (row) => <span className="font-bold text-brand-dark">{row.name}</span>,
                },
                {
                  key: "sport",
                  header: "Sport",
                  sortKey: "sport",
                  render: (row) => <span className="text-[11px] text-slate-600">{row.sport}</span>,
                },
                {
                  key: "ageGroup",
                  header: "Age group",
                  render: (row) => <span className="text-[11px] text-slate-600">{row.ageGroup}</span>,
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusPill status={row.status} />,
                },
                {
                  key: "ratingStatus",
                  header: "Rating",
                  render: (row) => <StatusPill status={row.ratingStatus} />,
                },
                {
                  key: "actions",
                  header: "",
                  align: "right",
                  render: () => (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
                  ),
                },
              ]}
              rows={table.pageRows}
              sort={table.sort}
              onSort={table.toggleSort}
              onRowClick={(row) => navigate(`/coach/athletes/${row.id}`)}
              empty={
                <EmptyState
                  title="No athletes match these filters"
                  action={<Button onClick={reset}>Reset filters</Button>}
                />
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
    </PageShell>
  );
}

