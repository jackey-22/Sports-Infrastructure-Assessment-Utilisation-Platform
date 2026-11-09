import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ChevronRight,
  Clock3,
  FileText,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { coachService } from "../../../services/coach/coachService";
import {
  filterRatingHistory,
  formatDate,
  formatNumber,
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
  rating: "",
};

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    sport: params.get("sport") || "",
    rating: params.get("rating") || "",
  };
}

export default function CoachRatingHistory() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);

  const query = useMemo(
    () => ({
      sport: filters.sport,
      rating: filters.rating,
    }),
    [filters]
  );
  const queryKey = JSON.stringify(query);

  const { data, loading, error, reload } = useAdminQuery(
    () => coachService.listRatingHistory(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const visibleRows = useMemo(
    () => filterRatingHistory(rows, { search: filters.search }),
    [rows, filters.search]
  );

  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "createdAt",
    sortDir: "desc",
  });
  const sportOptions = useMemo(
    () => [...new Set(rows.map((row) => row.sport))].sort(),
    [rows]
  );

  const totalRatings = visibleRows.length;
  const averageRating =
    totalRatings > 0
      ? Math.round(
          (visibleRows.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
            totalRatings) *
            10
        ) / 10
      : 0;

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
        eyebrow="Coach Console · Rating History"
        title="Rating history"
        description="All coach-submitted athlete ratings. Search, filter, sort and paginate."
        actions={
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset filters
          </Button>
        }
      />

      <DemoBanner>
        Ratings recorded for athletes at this facility.
      </DemoBanner>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total ratings"
          value={formatNumber(totalRatings)}
          caption="Coach-submitted"
          icon={Users}
          tone="green"
        />
        <KpiCard
          label="Average rating"
          value={averageRating == null ? "—" : `${averageRating} / 5`}
          caption="Across all ratings"
          icon={ShieldCheck}
          tone="blue"
        />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <Field label="Search" htmlFor="rating-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="rating-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Athlete name, sport or remarks"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Sport" htmlFor="rating-sport">
            <select
              id="rating-sport"
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

          <Field label="Rating" htmlFor="rating-value">
            <select
              id="rating-value"
              className={selectClass}
              value={filters.rating}
              onChange={(event) => update({ rating: event.target.value })}
            >
              <option value="">All ratings</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={String(value)}>
                  {value} star{value > 1 ? "s" : ""}
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
            title="No ratings match these filters"
            action={<Button onClick={reset}>Reset filters</Button>}
          />
        ) : (
          <>
            <DataTable
              caption="Coach rating history"
              columns={[
                {
                  key: "id",
                  header: "Rating ID",
                  sortKey: "id",
                  render: (row) => (
                    <span className="font-mono text-[11px] font-bold text-slate-700">{row.id}</span>
                  ),
                },
                {
                  key: "athlete",
                  header: "Athlete",
                  render: (row) => (
                    <div className="min-w-[150px]">
                      <p className="font-bold text-brand-dark">{row.athleteName}</p>
                      <p className="text-[11px] text-slate-500">{row.facilityName}</p>
                    </div>
                  ),
                },
                {
                  key: "sport",
                  header: "Sport",
                  sortKey: "sport",
                  render: (row) => <span className="text-[11px] text-slate-600">{row.sport}</span>,
                },
                {
                  key: "rating",
                  header: "Rating",
                  sortKey: "rating",
                  align: "right",
                  render: (row) => (
                    <span className="font-bold text-amber-700">{row.rating} / 5</span>
                  ),
                },
                {
                  key: "date",
                  header: "Submitted",
                  sortKey: "createdAt",
                  render: (row) => (
                    <span className="whitespace-nowrap text-[11px] text-slate-600">
                      {formatDate(row.createdAt)}
                    </span>
                  ),
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
              onRowClick={(row) => navigate(`/coach/athletes/${row.athleteId}`)}
              empty={
                <EmptyState
                  title="No ratings match these filters"
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

