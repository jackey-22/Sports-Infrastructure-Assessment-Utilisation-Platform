import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ClipboardCheck,
  Landmark,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { adminService } from "../../../services/admin/adminService";
import {
  DEMO_DISTRICTS,
  DEMO_FACILITIES,
  DEMO_GRANT_PURPOSES,
  DEMO_MONTH_KEYS,
  DEMO_MONTH_LABELS,
  DEMO_TODAY,
  GRANT_STATUSES,
} from "../../../data/admin/adminDemoData";
import { useAdminQuery, useTableState } from "../../../hooks/admin/useAdminQuery";
import {
  filterGrants,
  formatCurrency,
  formatDate,
  formatNumber,
  summariseGrants,
  sumBy,
  utilisationQueue,
} from "../../../utils/admin/adminUtils";
import { BarChart, ChartCard } from "../Common/AdminCharts";
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
} from "../Common/AdminUI";
import VerificationReview from "./VerificationReview";

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
  { id: "verification", label: "Verification" },
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

function initialTab(params) {
  const tab = params.get("tab");
  return TABS.some((item) => item.id === tab) ? tab : "overview";
}

export default function GrantList() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => initialTab(params));
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);
  const [proofStatus, setProofStatus] = useState("Submitted");
  const [reviewId, setReviewId] = useState(null);
  const [busy, setBusy] = useState(false);
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
    () => adminService.listGrants(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const facilityOptions = useMemo(
    () =>
      DEMO_FACILITIES.filter(
        (facility) => !filters.district || facility.district === filters.district
      ),
    [filters.district]
  );

  const visibleGrants = useMemo(
    () => filterGrants(rows, { search: filters.search }),
    [rows, filters.search]
  );

  const totals = useMemo(() => summariseGrants(visibleGrants), [visibleGrants]);
  const utilisationPct = totals.allocated
    ? Math.round((totals.utilised / totals.allocated) * 100)
    : 0;

  const districtDistribution = useMemo(() => {
    const map = new Map();
    visibleGrants.forEach((grant) => {
      map.set(grant.district, (map.get(grant.district) || 0) + grant.allocated);
    });
    return Array.from(map.entries())
      .map(([district, allocated]) => ({ district, allocated }))
      .sort((a, b) => b.allocated - a.allocated);
  }, [visibleGrants]);

  const monthlyTrend = useMemo(
    () =>
      DEMO_MONTH_KEYS.map((key, index) => ({
        month: DEMO_MONTH_LABELS[index],
        allocated: sumBy(
          visibleGrants.filter((grant) => grant.applicationDate.startsWith(key)),
          (grant) => grant.allocated
        ),
        released: sumBy(
          visibleGrants.flatMap((grant) =>
            grant.releases.filter((release) => release.date.startsWith(key))
          ),
          (release) => release.amount
        ),
        utilised: sumBy(
          visibleGrants.flatMap((grant) =>
            grant.proofs.filter(
              (proof) => proof.status === "Verified" && proof.submittedAt.startsWith(key)
            )
          ),
          (proof) => proof.claimed
        ),
      })),
    [visibleGrants]
  );

  const queue = useMemo(() => {
    const merged = utilisationQueue(visibleGrants);
    return proofStatus
      ? merged.filter((proof) => proof.status === proofStatus)
      : merged;
  }, [visibleGrants, proofStatus]);

  const grantTable = useTableState(visibleGrants, {
    pageSize: 10,
    sortKey: "applicationDate",
    sortDir: "desc",
  });
  const queueTable = useTableState(queue, {
    pageSize: 10,
    sortKey: "submittedAt",
    sortDir: "desc",
  });

  const pendingProofCount = useMemo(
    () =>
      utilisationQueue(visibleGrants).filter(
        (proof) => proof.status === "Submitted"
      ).length,
    [visibleGrants]
  );

  const proofInReview = reviewId
    ? queue.find((proof) => proof.id === reviewId) ||
      utilisationQueue(visibleGrants).find((proof) => proof.id === reviewId) ||
      null
    : null;

  function changeTab(nextTab) {
    setTab(nextTab);
    const next = new URLSearchParams(params);
    next.set("tab", nextTab);
    setParams(next, { replace: true });
  }

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

  async function applyDecision(decision, note) {
    if (!proofInReview) return;
    setBusy(true);
    try {
      await adminService.reviewUtilisationProof({
        grantId: proofInReview.grantId,
        proofId: proofInReview.id,
        decision,
        note,
      });
      reload();
      setNotice(
        `${proofInReview.id} was marked “${decision}”. The Facility Manager grant view shows the same status.`
      );
    } finally {
      setBusy(false);
      setReviewId(null);
    }
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

  const proofColumns = [
    {
      key: "id",
      header: "Proof",
      sortKey: "id",
      render: (row) => (
        <div className="min-w-[150px]">
          <p className="font-mono text-[11px] font-bold text-slate-700">{row.id}</p>
          <p className="text-[11px] text-slate-500">{row.proofFile}</p>
        </div>
      ),
    },
    {
      key: "grant",
      header: "Grant & facility",
      render: (row) => (
        <div className="min-w-[180px]">
          <Link
            to={`/admin/insights/grants/${row.grantId}`}
            className="font-mono text-[11px] font-bold text-emerald-700 hover:text-emerald-200"
          >
            {row.grantId}
          </Link>
          <p className="text-[11px] text-slate-400">{row.facilityName}</p>
        </div>
      ),
    },
    {
      key: "district",
      header: "District",
      sortKey: "district",
      render: (row) => <span className="text-[11px]">{row.district}</span>,
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
      key: "claimed",
      header: "Claimed",
      align: "right",
      sortKey: "claimed",
      render: (row) => (
        <span className="whitespace-nowrap font-bold text-brand-dark">{formatCurrency(row.claimed)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (row) =>
        row.status === "Submitted" ? (
          <Button size="sm" onClick={() => setReviewId(row.id)}>
            Review
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled>
            Reviewed
          </Button>
        ),
    },
  ];

  const tabList = TABS.map((item) => ({
    ...item,
    count:
      item.id === "grants"
        ? visibleGrants.length
        : item.id === "verification"
        ? pendingProofCount
        : undefined,
  }));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin · Grants"
        title="Grants"
        description="Provisional grant allocation, release and utilisation tracking. Statuses are a documented frontend model, not a government policy."
        actions={
          <>
            <Button as={Link} to="/admin/insights/grants/allocate">
              <Wallet className="h-4 w-4" /> Allocate grant
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Reset filters
            </Button>
          </>
        }
      />

      <DemoBanner>
        Grants, releases and utilisation proofs are fictional and live in the shared
        demo store. Approve/reject decisions and new allocations are visible to the
        Facility Manager, but the backend grant workflow does not exist yet, so
        nothing is saved to a server.
      </DemoBanner>

      {notice ? (
        <Notice tone="success" title="Utilisation decision recorded" onDismiss={() => setNotice(null)}>
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
              label="Allocated"
              value={formatCurrency(totals.allocated, { compact: true })}
              caption={`${formatNumber(visibleGrants.length)} grants in view`}
              icon={Landmark}
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
              label="Pending verification"
              value={formatCurrency(totals.pendingVerification, { compact: true })}
              caption={`${formatNumber(pendingProofCount)} proof(s) awaiting review`}
              icon={ClipboardCheck}
              tone="amber"
              onClick={() => changeTab("verification")}
            />
            <KpiCard
              label="Verified utilisation"
              value={formatCurrency(totals.utilised, { compact: true })}
              caption="Only approved proofs counted"
              icon={ShieldCheck}
              tone="green"
            />
            <KpiCard
              label="Utilisation"
              value={`${utilisationPct}%`}
              caption="Verified utilisation ÷ allocated"
              icon={Wallet}
              tone="violet"
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
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartCard
                title="Grant distribution by district"
                description="Allocated amount per district in the current filter scope."
              >
                <BarChart
                  horizontal
                  categories={districtDistribution.map((row) => row.district)}
                  series={[
                    {
                      name: "Allocated",
                      data: districtDistribution.map((row) => row.allocated),
                    },
                  ]}
                  colors={["#007D40"]}
                  height={Math.max(260, districtDistribution.length * 38)}
                  formatValue={(value) => formatCurrency(value, { compact: true })}
                />
              </ChartCard>

              <ChartCard
                title="Allocation vs release vs utilisation"
                description="Utilisation counts verified proofs only."
              >
                <BarChart
                  categories={monthlyTrend.map((row) => row.month)}
                  series={[
                    { name: "Allocated", data: monthlyTrend.map((row) => row.allocated) },
                    { name: "Released", data: monthlyTrend.map((row) => row.released) },
                    { name: "Utilised", data: monthlyTrend.map((row) => row.utilised) },
                  ]}
                  colors={["#007D40", "#38bdf8", "#f59e0b"]}
                  height={300}
                  formatValue={(value) => formatCurrency(value, { compact: true })}
                />
              </ChartCard>
            </div>
          )}
        </div>
      ) : tab === "grants" ? (
        <Card className="overflow-hidden">
          <DataTable
            caption="Grant records"
            columns={grantColumns}
            rows={grantTable.pageRows}
            sort={grantTable.sort}
            onSort={grantTable.toggleSort}
            onRowClick={(row) => navigate(`/admin/insights/grants/${row.id}`)}
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
      ) : (
        <Card className="overflow-hidden">
          <SectionHeader
            title="Utilisation verification queue"
            description="Flat list of submitted proofs across the filtered grants."
            action={
              <label className="flex items-center gap-2 text-[11px] text-slate-400">
                Proof status
                <select
                  value={proofStatus}
                  onChange={(event) => setProofStatus(event.target.value)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:border-brand-primary focus:outline-none"
                >
                  <option value="Submitted">Submitted</option>
                  <option value="Verified">Verified</option>
                  <option value="Rejected">Rejected</option>
                  <option value="">All proofs</option>
                </select>
              </label>
            }
          />
          <DataTable
            caption="Utilisation proofs"
            columns={proofColumns}
            rows={queueTable.pageRows}
            sort={queueTable.sort}
            onSort={queueTable.toggleSort}
            empty={
              <EmptyState
                title={
                  proofStatus === "Submitted"
                    ? "Nothing awaiting verification"
                    : "No proofs match this view"
                }
                description="Change the proof status filter or widen the grant filters."
              />
            }
          />
          {queueTable.total > 0 ? (
            <Pagination
              page={queueTable.page}
              pageCount={queueTable.pageCount}
              pageSize={queueTable.pageSize}
              total={queueTable.total}
              setPage={queueTable.setPage}
              setPageSize={queueTable.setPageSize}
            />
          ) : null}
        </Card>
      )}

      <VerificationReview
        key={proofInReview ? proofInReview.id : "closed"}
        proof={proofInReview}
        busy={busy}
        onClose={() => setReviewId(null)}
        onDecision={applyDecision}
      />
    </PageShell>
  );
}
