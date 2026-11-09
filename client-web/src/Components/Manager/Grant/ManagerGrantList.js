import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Landmark,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { managerService } from "../../../services/manager/managerService";
import {
  DEMO_DISTRICTS,
  DEMO_FACILITIES,
  DEMO_GRANT_PURPOSES,
  DEMO_MONTH_LABELS,
  DEMO_TODAY,
  GRANT_STATUSES,
} from "../../../data/admin/adminDemoData";
import {
  filterGrants,
  formatCurrency,
  formatDate,
  formatNumber,
  summariseManagerGrants,
} from "../../../utils/manager/managerUtils";
import { useAdminQuery, useTableState } from "../../../hooks/manager/useManagerQuery";
import {
  BarChart,
  ChartCard,
} from "../Common/ManagerUI";
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
  SectionHeader,
  StatusPill,
  TableSkeleton,
  Tabs,
  inputClass,
  selectClass,
} from "../Common/ManagerUI";

const EMPTY_FILTERS = {
  search: "",
  status: "",
  district: "",
  facilityId: "",
  purpose: "",
  from: "",
  to: "",
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "grants", label: "Grants" },
];

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    status: params.get("status") || "",
    district: params.get("district") || "",
    facilityId: params.get("facility") || "",
    purpose: params.get("purpose") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export default function ManagerGrantList() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState(null);

  const query = useMemo(
    () => ({
      status: filters.status,
      district: filters.district,
      facilityId: filters.facilityId,
      purpose: filters.purpose,
      from: filters.from,
      to: filters.to,
    }),
    [filters]
  );
  const queryKey = JSON.stringify(query);

  const { data, loading, error, reload } = useAdminQuery(
    () => managerService.listGrants(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const facilityOptions = DEMO_FACILITIES.filter(
    (facility) => !filters.district || facility.district === filters.district
  );

  const visibleGrants = useMemo(
    () => filterGrants(rows, { search: filters.search }),
    [rows, filters.search]
  );

  const totals = useMemo(() => summariseManagerGrants(visibleGrants), [visibleGrants]);
  const utilisationPct = totals.allocated
    ? Math.round((totals.utilised / totals.allocated) * 100)
    : 0;

  const changeTab = (nextTab) => {
    setTab(nextTab);
    const next = new URLSearchParams(params);
    next.set("tab", nextTab);
    setParams(next, { replace: true });
  };

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
    setNotice(null);
    const next = new URLSearchParams();
    next.set("tab", tab);
    setParams(next, { replace: true });
  }

  const grantColumns = [
    {
      key: "id",
      header: "Grant reference",
      sortKey: "id",
      render: (row) => (
        <span className="font-mono text-[11px] font-bold text-slate-700">{row.id}</span>
      ),
    },
    {
      key: "facility",
      header: "Recipient & district",
      sortKey: "district",
      render: (row) => (
        <div className="min-w-[180px]">
          <p className="font-bold text-brand-dark">{row.facilityName}</p>
          <p className="text-[11px] text-slate-500">{row.district}</p>
        </div>
      ),
    },
    {
      key: "purpose",
      header: "Purpose",
      sortKey: "purpose",
      render: (row) => <span className="text-[11px] text-slate-600">{row.purpose}</span>,
    },
    {
      key: "allocated",
      header: "Allocated",
      align: "right",
      sortKey: "allocated",
      render: (row) => (
        <span className="whitespace-nowrap font-bold text-brand-dark">
          {formatCurrency(row.allocated, { compact: true })}
        </span>
      ),
    },
    {
      key: "released",
      header: "Released",
      align: "right",
      sortKey: "released",
      render: (row) => (
        <span className="whitespace-nowrap text-slate-600">
          {formatCurrency(row.released, { compact: true })}
        </span>
      ),
    },
    {
      key: "utilised",
      header: "Utilised",
      align: "right",
      sortKey: "utilised",
      render: (row) => (
        <span className="whitespace-nowrap text-slate-600">
          {formatCurrency(row.utilised, { compact: true })}
        </span>
      ),
    },
    {
      key: "remaining",
      header: "Remaining",
      align: "right",
      sortKey: "remaining",
      render: (row) => (
        <span className="whitespace-nowrap text-slate-600">
          {formatCurrency(row.remaining, { compact: true })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "applicationDate",
      header: "Applied",
      sortKey: "applicationDate",
      render: (row) => (
        <span className="whitespace-nowrap text-[11px] text-slate-400">
          {formatDate(row.applicationDate)}
        </span>
      ),
    },
  ];

  const grantTable = useTableState(visibleGrants, {
    pageSize: 10,
    sortKey: "applicationDate",
    sortDir: "desc",
  });

  const tabList = TABS.map((item) => ({
    ...item,
    count: item.id === "grants" ? visibleGrants.length : undefined,
  }));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Grants"
        title="Grants"
        description="View grants assigned to this facility and track utilisation. Allocation and approval are Admin powers."
        actions={
          <>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Reset filters
            </Button>
          </>
        }
      />

      <DemoBanner>
        Grants are fictional and scoped to this facility. A Manager can view grants
        and submit utilisation proofs, but cannot allocate or approve grants.
      </DemoBanner>

      {notice ? (
        <Notice tone="info" title="Notice" onDismiss={() => setNotice(null)}>
          {notice}
        </Notice>
      ) : null}

      <Card className="mb-4">
        <Tabs tabs={tabList} active={tab} onChange={changeTab} label="Grant sections" />
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <Field label="Search" htmlFor="grant-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="grant-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Grant reference, facility, district or purpose"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Status" htmlFor="grant-status">
            <select
              id="grant-status"
              className={selectClass}
              value={filters.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              <option value="">All statuses</option>
              {GRANT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="District" htmlFor="grant-district">
            <select
              id="grant-district"
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

          <Field label="Facility" htmlFor="grant-facility-filter">
            <select
              id="grant-facility-filter"
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

          <Field label="Purpose" htmlFor="grant-purpose-filter">
            <select
              id="grant-purpose-filter"
              className={selectClass}
              value={filters.purpose}
              onChange={(event) => update({ purpose: event.target.value })}
            >
              <option value="">All purposes</option>
              {DEMO_GRANT_PURPOSES.map((purpose) => (
                <option key={purpose} value={purpose}>
                  {purpose}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Applied from" htmlFor="grant-from">
            <input
              id="grant-from"
              type="date"
              className={selectClass}
              value={filters.from}
              max={filters.to || DEMO_TODAY}
              onChange={(event) => update({ from: event.target.value })}
            />
          </Field>

          <Field label="Applied to" htmlFor="grant-to">
            <input
              id="grant-to"
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

      {loading && !data ? (
        <Card>
          <TableSkeleton rows={8} columns={6} />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState message={error.message} onRetry={reload} />
        </Card>
      ) : tab === "overview" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Total grants"
              value={formatNumber(totals.count)}
              caption="Assigned to this facility"
              icon={Landmark}
              tone="green"
            />
            <KpiCard
              label="Allocated"
              value={formatCurrency(totals.allocated, { compact: true })}
              caption="Provisional allocation"
              icon={Wallet}
              tone="green"
            />
            <KpiCard
              label="Released"
              value={formatCurrency(totals.released, { compact: true })}
              caption="Recorded instalments"
              icon={ReceiptText}
              tone="blue"
            />
            <KpiCard
              label="Utilised"
              value={formatCurrency(totals.utilised, { compact: true })}
              caption="Verified utilisation"
              icon={ShieldCheck}
              tone="green"
            />
            <KpiCard
              label="Remaining"
              value={formatCurrency(totals.remaining, { compact: true })}
              caption="Allocated minus released"
              icon={Wallet}
              tone="slate"
            />
          </div>

          {visibleGrants.length === 0 ? (
            <Card>
              <EmptyState
                title="No grants match these filters"
                action={<Button onClick={reset}>Reset filters</Button>}
              />
            </Card>
          ) : (
            <ChartCard
              title="Grant allocation vs utilisation"
              description="Allocated, released and verified utilisation by grant."
            >
              <BarChart
                categories={visibleGrants.slice(0, 8).map((row) => row.id)}
                series={[
                  { name: "Allocated", data: visibleGrants.slice(0, 8).map((row) => row.allocated) },
                  { name: "Released", data: visibleGrants.slice(0, 8).map((row) => row.released) },
                  { name: "Utilised", data: visibleGrants.slice(0, 8).map((row) => row.utilised) },
                ]}
                colors={["#007D40", "#38bdf8", "#f59e0b"]}
                height={300}
                formatValue={(value) => formatCurrency(value, { compact: true })}
              />
            </ChartCard>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <DataTable
            caption="Grant records"
            columns={grantColumns}
            rows={grantTable.pageRows}
            sort={grantTable.sort}
            onSort={grantTable.toggleSort}
            onRowClick={(row) => navigate(`/manager/grants/${row.id}`)}
            empty={
              <EmptyState
                title="No grants match these filters"
                action={<Button onClick={reset}>Reset filters</Button>}
              />
            }
          />
          {grantTable.total > 0 ? (
            <Pagination
              page={grantTable.page}
              pageCount={grantTable.pageCount}
              pageSize={grantTable.pageSize}
              total={grantTable.total}
              setPage={grantTable.setPage}
              setPageSize={grantTable.setPageSize}
            />
          ) : null}
        </Card>
      )}
    </PageShell>
  );
}

