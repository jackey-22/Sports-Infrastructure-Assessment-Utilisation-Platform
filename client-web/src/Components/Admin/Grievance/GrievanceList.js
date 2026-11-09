import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageSquareWarning,
  RotateCcw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { adminService } from "../../../services/admin/adminService";
import {
  COMPLAINT_CATEGORIES,
  DEMO_DISTRICTS,
  DEMO_FACILITIES,
  DEMO_TODAY,
  GRIEVANCE_STATUSES,
  LEVEL_LABELS,
} from "../../../data/admin/adminDemoData";
import { useAdminQuery, useTableState } from "../../../hooks/admin/useAdminQuery";
import {
  filterGrievances,
  formatDate,
  formatNumber,
  summariseGrievances,
} from "../../../utils/admin/adminUtils";
import {
  Button,
  Card,
  ConfirmDialog,
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
  SectionHeader,
  StatusPill,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../Common/AdminUI";
import GrievanceDetail from "./GrievanceDetail";

const EMPTY_FILTERS = {
  search: "",
  status: "",
  district: "",
  facilityId: "",
  category: "",
  level: "",
  from: "",
  to: "",
};

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    status: params.get("status") || "",
    district: params.get("district") || "",
    facilityId: params.get("facility") || "",
    category: params.get("category") || "",
    level: params.get("level") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export default function GrievanceList() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [live, setLive] = useState({ loading: true, error: null, rows: [] });
  const [liveReloadKey, setLiveReloadKey] = useState(0);

  const query = useMemo(
    () => ({
      status: filters.status,
      district: filters.district,
      facilityId: filters.facilityId,
      category: filters.category,
      level: filters.level,
      from: filters.from,
      to: filters.to,
    }),
    [filters]
  );
  const queryKey = JSON.stringify(query);

  const { data, loading, error, reload } = useAdminQuery(
    () => adminService.listGrievances(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  useEffect(() => {
    let active = true;
    setLive((current) => ({ ...current, loading: true, error: null }));
    adminService
      .listLiveComplaints()
      .then((liveRows) => {
        if (active) setLive({ loading: false, error: null, rows: liveRows });
      })
      .catch((liveError) => {
        if (active) setLive({ loading: false, error: liveError, rows: [] });
      });
    return () => {
      active = false;
    };
  }, [liveReloadKey]);

  const facilityOptions = useMemo(
    () =>
      DEMO_FACILITIES.filter(
        (facility) => !filters.district || facility.district === filters.district
      ),
    [filters.district]
  );

  const visibleRows = useMemo(() => {
    // Re-apply the structured filters client-side so a demo status change cannot
    // leave a row visible under a filter it no longer matches.
    return filterGrievances(rows, filters);
  }, [rows, filters]);

  const summary = useMemo(() => summariseGrievances(visibleRows), [visibleRows]);
  const table = useTableState(visibleRows, { pageSize: 10, sortKey: "submittedAt", sortDir: "desc" });

  const selectedRow = selected
    ? rows.find((row) => row.id === selected) || null
    : null;

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
    setParams({}, { replace: true });
    setNotice(null);
  }

  async function applyStatus(nextStatus) {
    if (!confirm) return;
    const target = confirm;
    setBusy(true);
    try {
      await adminService.updateGrievanceStatus({
        id: target.id,
        status: nextStatus,
        remark: "Status changed from the Admin console.",
      });
      reload();
      setNotice(
        `${target.id} is now “${nextStatus}”. The Facility Manager grievance view shows the same status.`
      );
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  const columns = [
    {
      key: "id",
      header: "Reference",
      sortKey: "id",
      render: (row) => (
        <span className="font-mono text-[11px] font-bold text-slate-700">{row.id}</span>
      ),
    },
    {
      key: "subject",
      header: "Subject & category",
      sortKey: "subject",
      render: (row) => (
        <div className="min-w-[220px]">
          <p className="font-bold text-brand-dark">{row.subject}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">{row.category}</p>
        </div>
      ),
    },
    {
      key: "citizen",
      header: "Submitted by",
      render: (row) => (
        <div>
          <p className="text-slate-700">{row.citizen.name}</p>
          <p className="text-[11px] text-slate-500">{row.citizen.role}</p>
        </div>
      ),
    },
    {
      key: "facility",
      header: "Facility & district",
      sortKey: "district",
      render: (row) => (
        <div className="min-w-[170px]">
          <p className="text-slate-700">{row.facilityName}</p>
          <p className="text-[11px] text-slate-500">{row.district}</p>
        </div>
      ),
    },
    {
      key: "level",
      header: "Level",
      render: (row) => (
        <span className="whitespace-nowrap text-[11px] text-slate-600">{row.levelLabel}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "submittedAt",
      header: "Submitted",
      sortKey: "submittedAt",
      render: (row) => (
        <span className="whitespace-nowrap text-[11px] text-slate-600">
          {formatDate(row.submittedAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: () => (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
          View <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ),
    },
  ];

  const liveColumns = [
    {
      key: "citizen",
      header: "Citizen",
      render: (row) => (
        <div className="min-w-[140px]">
          <p className="font-bold text-brand-dark">{row.citizenName}</p>
          <p className="text-[11px] text-slate-500">{row.category}</p>
        </div>
      ),
    },
    {
      key: "description",
      header: "Complaint",
      render: (row) => (
        <p className="min-w-[220px] max-w-[360px] text-[11px] text-slate-600">
          {row.description || "—"}
        </p>
      ),
    },
    {
      key: "facility",
      header: "Facility & district",
      render: (row) => (
        <div className="min-w-[160px]">
          <p className="text-slate-700">{row.facilityName}</p>
          <p className="text-[11px] text-slate-500">{row.district || "—"}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "submittedAt",
      header: "Submitted",
      render: (row) => (
        <span className="whitespace-nowrap text-[11px] text-slate-600">
          {formatDate(row.submittedAt)}
        </span>
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin · Grievance management"
        title="Grievances"
        description="Review citizen complaints raised across mapped facilities. Status, level and categories mirror the existing complaint model."
        actions={
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset filters
          </Button>
        }
      />

      <DemoBanner>
        Grievance records are fictional and live in the shared demo store, so a
        status change here is visible to the Facility Manager. Live citizen
        complaints are read from the backend in the panel below.
      </DemoBanner>

      {notice ? (
        <Notice tone="success" title="Grievance status updated" onDismiss={() => setNotice(null)}>
          {notice}
        </Notice>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Grievances in view"
          value={formatNumber(summary.total)}
          caption="After search and filters"
          icon={MessageSquareWarning}
          tone="slate"
        />
        <KpiCard
          label="Pending"
          value={formatNumber(summary.pending)}
          caption="Status = Pending"
          icon={Clock3}
          tone="amber"
        />
        <KpiCard
          label="Resolved"
          value={formatNumber(summary.resolved)}
          caption="Status = Resolved"
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          label="At Authority / Admin"
          value={formatNumber(summary.atAuthorityOrAdmin)}
          caption="Level 2 and level 3 records"
          icon={ShieldCheck}
          tone="violet"
        />
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <Field label="Search" htmlFor="grv-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="grv-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Reference, subject, citizen, facility or district"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Status" htmlFor="grv-status">
            <select
              id="grv-status"
              className={selectClass}
              value={filters.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              <option value="">All statuses</option>
              {GRIEVANCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category" htmlFor="grv-category">
            <select
              id="grv-category"
              className={selectClass}
              value={filters.category}
              onChange={(event) => update({ category: event.target.value })}
            >
              <option value="">All categories</option>
              {COMPLAINT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </Field>

          <Field label="District" htmlFor="grv-district">
            <select
              id="grv-district"
              className={selectClass}
              value={filters.district}
              onChange={(event) =>
                update({ district: event.target.value, facilityId: "" })
              }
            >
              <option value="">All districts</option>
              {DEMO_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Facility" htmlFor="grv-facility">
            <select
              id="grv-facility"
              className={selectClass}
              value={filters.facilityId}
              onChange={(event) => update({ facilityId: event.target.value })}
            >
              <option value="">All facilities</option>
              {facilityOptions.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Level" htmlFor="grv-level" hint="Level as stored on the complaint">
            <select
              id="grv-level"
              className={selectClass}
              value={filters.level}
              onChange={(event) => update({ level: event.target.value })}
            >
              <option value="">All levels</option>
              {Object.entries(LEVEL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Submitted from" htmlFor="grv-from">
            <input
              id="grv-from"
              type="date"
              className={selectClass}
              value={filters.from}
              max={filters.to || DEMO_TODAY}
              onChange={(event) => update({ from: event.target.value })}
            />
          </Field>

          <Field label="Submitted to" htmlFor="grv-to">
            <input
              id="grv-to"
              type="date"
              className={selectClass}
              value={filters.to}
              min={filters.from}
              max={DEMO_TODAY}
              onChange={(event) => update({ to: event.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={8} columns={6} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            <DataTable
              caption="Grievance records"
              columns={columns}
              rows={table.pageRows}
              sort={table.sort}
              onSort={table.toggleSort}
              onRowClick={(row) => setSelected(row.id)}
              empty={
                <EmptyState
                  title="No grievances match these filters"
                  description="Clear the search box or widen the date range and district filters."
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

      <Card className="mt-4 overflow-hidden">
        <SectionHeader
          title="Live citizen complaints"
          description="Citizen complaints submitted for sports complexes."
        />
        {live.loading ? (
          <TableSkeleton rows={3} columns={5} />
        ) : live.error ? (
          <ErrorState
            message={live.error.message}
            onRetry={() => setLiveReloadKey((key) => key + 1)}
          />
        ) : (
          <DataTable
            caption="Live citizen complaints"
            columns={liveColumns}
            rows={live.rows}
            empty={
              <EmptyState
                title="No live complaints"
                description="Citizen complaints submitted through the app appear here."
              />
            }
          />
        )}
      </Card>

      <GrievanceDetail
        grievance={selectedRow}
        busy={busy}
        onClose={() => setSelected(null)}
        onRequestStatus={(nextStatus) =>
          setConfirm({ ...selectedRow, nextStatus })
        }
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={
          confirm && confirm.nextStatus === "Resolved"
            ? "Mark this grievance as resolved?"
            : "Reopen this grievance?"
        }
        description={
          confirm
            ? `${confirm.id} will show “${confirm.nextStatus}”, visible to the Facility Manager.`
            : ""
        }
        confirmLabel={confirm && confirm.nextStatus === "Resolved" ? "Mark resolved" : "Reopen"}
        busy={busy}
        onConfirm={() => applyStatus(confirm.nextStatus)}
        onCancel={() => setConfirm(null)}
      />
    </PageShell>
  );
}
