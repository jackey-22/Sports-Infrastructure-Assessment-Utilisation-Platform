import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Building2,
  CalendarClock,
  Clock3,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { api } from "../../../API/client";
import { managerService } from "../../../services/manager/managerService";
import { formatDate, formatNumber } from "../../../utils/manager/managerUtils";
import { useAdminQuery, useTableState } from "../../../hooks/manager/useManagerQuery";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  PageHeader,
  PageShell,
  Pagination,
  StatusPill,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../Common/ManagerUI";

const EMPTY_FILTERS = { search: "", from: "", to: "" };

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export default function ManagerAssessmentList() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));

  const { data, loading, error, reload } = useAdminQuery(
    () => managerService.listAssessments(),
    []
  );

  const { data: maintenanceSchedules } = useAdminQuery(
    async () => {
      const res = await api.get("/api/manager/maintenance-due");
      return res.data || [];
    },
    []
  );

  const visibleRows = (data || []).filter(
    (row) =>
      (!filters.from || (row.date && row.date >= filters.from)) &&
      (!filters.to || (row.date && row.date <= filters.to)) &&
      (!filters.search ||
        `${row.facilityName || ""} ${row.sportName || ""} ${row.inspector || ""}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()))
  );

  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "date",
    sortDir: "desc",
  });

  const analysedCount = visibleRows.filter((row) => row.ai?.status === "completed").length;
  const latestScored = visibleRows
    .filter((row) => row.ai?.visualConditionIndex != null && row.date)
    .reduce((latest, row) => (!latest || row.date > latest.date ? row : latest), null);

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
        eyebrow="Facility Manager · Condition Assessment"
        title="Assessment history"
        description="View condition assessments saved for this facility."
        actions={
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset filters
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Total assessments"
          value={formatNumber(visibleRows.length)}
          caption="Facility-scoped"
          icon={ShieldCheck}
          tone="slate"
        />
        <KpiCard
          label="AI analyses"
          value={formatNumber(analysedCount)}
          caption="Photo analysis completed"
          icon={Clock3}
          tone="green"
        />
        <KpiCard
          label="Latest visual index"
          value={latestScored ? `${latestScored.ai.visualConditionIndex} / 100` : "?"}
          caption={latestScored?.sportName || "Visual condition"}
          icon={Building2}
          tone="green"
        />
      </div>

      {maintenanceSchedules?.length ? (
        <Card className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-brand-primary" />
              <h2 className="font-display text-sm font-extrabold text-slate-900">
                Scheduled Maintenance &amp; Condition Assessment Cycles
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              Configured per sport by Admin · {maintenanceSchedules.filter((s) => s.needsAction).length} due/overdue
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {maintenanceSchedules.map((item) => (
              <div
                key={item.configId}
                className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 ${
                  item.isOverdue ? "bg-rose-50/40" : item.isDueSoon ? "bg-amber-50/40" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">{item.sportName}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                      Every {item.frequencyDays} days · {item.priority}
                    </span>
                    {item.isOverdue ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-extrabold text-rose-700">
                        <AlertTriangle className="h-3 w-3" /> Overdue by {Math.abs(item.daysUntilDue)}d
                      </span>
                    ) : item.isDueSoon ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800">
                        <Bell className="h-3 w-3" /> Due in {item.daysUntilDue}d
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                        On track
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-700">{item.title}</p>
                  {item.notes ? <p className="mt-0.5 text-xs text-slate-500">{item.notes}</p> : null}
                </div>
                <div className="text-right text-xs">
                  <p className="font-bold text-slate-800">Next due: {formatDate(item.nextDueDate)}</p>
                  <p className="mt-0.5 text-slate-500">
                    Last review: {item.lastAssessmentDate ? formatDate(item.lastAssessmentDate) : "None yet"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <Field label="Search" htmlFor="asmt-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="asmt-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Sport, facility or inspector"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="From" htmlFor="asmt-from">
            <input
              id="asmt-from"
              type="date"
              className={selectClass}
              value={filters.from}
              max={filters.to}
              onChange={(event) => update({ from: event.target.value })}
            />
          </Field>

          <Field label="To" htmlFor="asmt-to">
            <input
              id="asmt-to"
              type="date"
              className={selectClass}
              value={filters.to}
              min={filters.from}
              onChange={(event) => update({ to: event.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={6} columns={5} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : visibleRows.length === 0 ? (
          <EmptyState
            title="No assessments match these filters"
            action={<Button onClick={reset}>Reset filters</Button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-bold">Assessment</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Date</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Visual index</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {table.pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-bold text-slate-800">{row.sportName || "Facility assessment"}</p>
                        <p className="text-[11px] text-slate-500">{row.facilityName}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-mono text-[11px] font-bold text-brand-dark">
                          {row.ai?.visualConditionIndex == null ? "?" : `${row.ai.visualConditionIndex} / 100`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button as={Link} to={`/manager/assessment/${row.id}`} size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

