import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Building2,
  Clock3,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
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
  Notice,
  PageHeader,
  PageShell,
  Pagination,
  StatusPill,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../Common/ManagerUI";

const EMPTY_FILTERS = { search: "", status: "", from: "", to: "" };

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    status: params.get("status") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export default function ManagerAssessmentList() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState(null);

  const { data, loading, error, reload } = useAdminQuery(
    () => managerService.listAssessments(),
    []
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const visibleRows = rows.filter(
    (row) =>
      (!filters.status || row.status === filters.status) &&
      (!filters.from || (row.date && row.date >= filters.from)) &&
      (!filters.to || (row.date && row.date <= filters.to)) &&
      (!filters.search ||
        `${row.id} ${row.facilityName} ${row.inspector}`
          .toLowerCase()
          .includes(filters.search.toLowerCase()))
  );

  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "date",
    sortDir: "desc",
  });

  const draftCount = visibleRows.filter((row) => row.status === "Draft").length;
  const verifiedCount = visibleRows.filter((row) => row.status === "Verified").length;
  const latestScored = visibleRows
    .filter((row) => row.score != null && row.date)
    .reduce(
      (latest, row) => (!latest || row.date > latest.date ? row : latest),
      null
    );

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
    setParams({}, { replace: true });
    setNotice(null);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Condition Assessment"
        title="Assessment history"
        description="Condition assessments for this facility. Draft assessments are local only until submitted."
        actions={
          <>
            <Button as={Link} to="/manager/assessment/new">
              <ShieldCheck className="h-4 w-4" /> New assessment
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Reset filters
            </Button>
          </>
        }
      />

      {notice ? (
        <Notice tone="info" title="Notice" onDismiss={() => setNotice(null)}>
          {notice}
        </Notice>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total assessments"
          value={formatNumber(visibleRows.length)}
          caption="Facility-scoped"
          icon={ShieldCheck}
          tone="slate"
        />
        <KpiCard
          label="Verified"
          value={formatNumber(verifiedCount)}
          caption="Score recorded"
          icon={ShieldCheck}
          tone="green"
        />
        <KpiCard
          label="Drafts"
          value={formatNumber(draftCount)}
          caption="Not yet submitted"
          icon={Clock3}
          tone="amber"
        />
        <KpiCard
          label="Latest score"
          value={
            latestScored?.score == null
              ? "—"
              : `${latestScored.score} / 100`
          }
          caption={latestScored?.grade || "No assessment yet"}
          icon={Building2}
          tone="green"
        />
      </div>

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
                placeholder="Assessment ID, facility or inspector"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Status" htmlFor="asmt-status">
            <select
              id="asmt-status"
              className={selectClass}
              value={filters.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              <option value="">All statuses</option>
              <option value="Draft">Draft</option>
              <option value="Analysed">Analysed</option>
              <option value="Submitted">Submitted</option>
              <option value="Verified">Verified</option>
            </select>
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
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Score</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Status</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/70">
                  {table.pageRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-[11px] font-bold text-slate-700">{row.id}</p>
                        <p className="text-[11px] text-slate-500">{row.facilityName}</p>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <span className={`font-mono text-[11px] font-bold ${
                          row.score == null ? "text-slate-500" : "text-brand-dark"
                        }`}>
                          {row.score == null ? "—" : `${row.score} / 100`}
                        </span>
                        {row.ai && row.ai.status === "completed" && row.ai.visualConditionIndex != null ? (
                          <p className="text-[10px] text-slate-500">Visual {row.ai.visualConditionIndex}</p>
                        ) : null}
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

