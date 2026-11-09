import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Building2,
  Clock3,
  Dumbbell,
  Gauge,
  MessageSquareWarning,
  Receipt,
  RotateCcw,
  Users,
  Wallet,
} from "lucide-react";
import { adminService } from "../../../services/admin/adminService";
import {
  DEMO_DISTRICTS,
  DEMO_FACILITIES,
  DEMO_MONTH_LABELS,
  DEMO_SPORTS,
  DEMO_TODAY,
  GRIEVANCE_STATUSES,
} from "../../../data/admin/adminDemoData";
import { useAdminQuery } from "../../../hooks/admin/useAdminQuery";
import { formatCurrency, formatNumber } from "../../../utils/admin/adminUtils";
import { BarChart, ChartCard, DonutChart, TrendChart } from "../Common/AdminCharts";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  PageHeader,
  PageShell,
  SectionHeader,
  StatusPill,
  TableSkeleton,
  selectClass,
} from "../Common/AdminUI";

const DATE_PRESETS = [
  { value: "180", label: "Last 6 months" },
  { value: "90", label: "Last 90 days" },
  { value: "30", label: "Last 30 days" },
  { value: "custom", label: "Custom range" },
  { value: "all", label: "All records" },
];

function shiftDate(days) {
  const date = new Date(`${DEMO_TODAY}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const EMPTY_FILTERS = {
  preset: "180",
  from: "",
  to: "",
  district: "",
  facilityId: "",
  sport: "",
  status: "",
};

function initialFilters(params) {
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  return {
    ...EMPTY_FILTERS,
    preset: from || to ? "custom" : EMPTY_FILTERS.preset,
    from,
    to,
    district: params.get("district") || "",
    facilityId: params.get("facility") || "",
    sport: params.get("sport") || "",
    status: params.get("status") || "",
  };
}

function queryFromFilters(filters) {
  let from = filters.from;
  let to = filters.to;
  if (filters.preset === "all") {
    from = "";
    to = "";
  } else if (filters.preset !== "custom") {
    from = shiftDate(Number(filters.preset));
    to = DEMO_TODAY;
  }
  return {
    from,
    to,
    district: filters.district,
    facilityId: filters.facilityId,
    sport: filters.sport,
    status: filters.status,
  };
}

export default function AdminInsights() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));

  const query = useMemo(() => queryFromFilters(filters), [filters]);
  const queryKey = JSON.stringify(query);
  const { data, loading, error, reload } = useAdminQuery(
    () => adminService.getDashboard(query),
    [queryKey]
  );

  const facilityOptions = useMemo(() => {
    return DEMO_FACILITIES.filter(
      (facility) => !filters.district || facility.district === filters.district
    );
  }, [filters.district]);

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
  }

  const linkParams = new URLSearchParams();
  if (query.district) linkParams.set("district", query.district);
  if (query.facilityId) linkParams.set("facility", query.facilityId);
  if (query.sport) linkParams.set("sport", query.sport);
  if (filters.preset === "custom") {
    if (query.from) linkParams.set("from", query.from);
    if (query.to) linkParams.set("to", query.to);
  }
  const linkSuffix = linkParams.toString() ? `?${linkParams.toString()}` : "";

  const grievanceLink = new URLSearchParams(linkParams);
  if (query.status) grievanceLink.set("status", query.status);
  const grievanceSuffix = grievanceLink.toString()
    ? `?${grievanceLink.toString()}`
    : "";

  const pendingLink = new URLSearchParams(linkParams);
  pendingLink.set("status", "Pending");

  const grantLink = new URLSearchParams(linkParams);
  grantLink.set("tab", "verification");

  const kpis = data?.kpis;
  const charts = data?.charts;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sports, Youth & Cultural Activities Department · Government of Gujarat"
        title="Admin dashboard & insights"
        description="Statewide view of facilities, athletes, grievances, grants and transactions. Filters apply to every KPI and chart on this page."
        actions={
          <>
            <Button as={Link} to="/explore" variant="secondary">
              <Activity className="h-4 w-4" /> Statewide GIS map
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Reset filters
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <SectionHeader
          title="Filters"
          description="Date range, district, facility, sport and grievance status are applied consistently."
          action={
            <span className="text-[11px] text-slate-400">
              {data ? `${data.facilities.length} facilities in scope` : "Loading scope…"}
            </span>
          }
        />
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 sm:px-5">
          <Field label="Date range" htmlFor="dash-preset">
            <select
              id="dash-preset"
              className={selectClass}
              value={filters.preset}
              onChange={(event) => update({ preset: event.target.value })}
            >
              {DATE_PRESETS.map((preset) => (
                <option key={preset.value} value={preset.value}>
                  {preset.label}
                </option>
              ))}
            </select>
          </Field>

          {filters.preset === "custom" ? (
            <>
              <Field label="From" htmlFor="dash-from">
                <input
                  id="dash-from"
                  type="date"
                  className={selectClass}
                  value={filters.from}
                  max={filters.to || DEMO_TODAY}
                  onChange={(event) => update({ from: event.target.value })}
                />
              </Field>
              <Field label="To" htmlFor="dash-to">
                <input
                  id="dash-to"
                  type="date"
                  className={selectClass}
                  value={filters.to}
                  min={filters.from}
                  max={DEMO_TODAY}
                  onChange={(event) => update({ to: event.target.value })}
                />
              </Field>
            </>
          ) : null}

          <Field label="District" htmlFor="dash-district">
            <select
              id="dash-district"
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

          <Field label="Sports complex" htmlFor="dash-facility">
            <select
              id="dash-facility"
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

          <Field label="Sport" htmlFor="dash-sport">
            <select
              id="dash-sport"
              className={selectClass}
              value={filters.sport}
              onChange={(event) => update({ sport: event.target.value })}
            >
              <option value="">All sports</option>
              {DEMO_SPORTS.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Grievance status" htmlFor="dash-status">
            <select
              id="dash-status"
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
        </div>
      </Card>

      {loading && !data ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 10 }).map((_, index) => (
              <div
                key={index}
                className="h-[104px] animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
          <Card>
            <TableSkeleton rows={8} columns={4} />
          </Card>
        </>
      ) : error ? (
        <Card>
          <ErrorState message={error.message} onRetry={reload} />
        </Card>
      ) : data && data.facilities.length === 0 ? (
        <Card>
          <EmptyState
            title="No facilities match these filters"
            description="Try a wider date range or clear the district, facility and sport filters."
            action={<Button onClick={reset}>Reset filters</Button>}
          />
        </Card>
      ) : data && kpis && charts ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              label="Sports facilities"
              value={formatNumber(kpis.facilities)}
              caption={`${charts.districtDistribution.length} districts in scope`}
              icon={Building2}
              tone="green"
              to="/admin"
            />
            <KpiCard
              label="Registered athletes"
              value={formatNumber(kpis.athletes)}
              caption="Athlete profiles in selected facilities"
              icon={Users}
              tone="blue"
            />
            <KpiCard
              label="Coaches"
              value={formatNumber(kpis.coaches)}
              caption="Instructor records at selected facilities"
              icon={Dumbbell}
              tone="violet"
            />
            <KpiCard
              label="Total grievances"
              value={formatNumber(kpis.grievances)}
              caption={`${formatNumber(kpis.grievances - kpis.pendingGrievances)} resolved`}
              icon={MessageSquareWarning}
              tone="slate"
              to={`/admin/insights/grievances${grievanceSuffix}`}
            />
            <KpiCard
              label="Pending grievances"
              value={formatNumber(kpis.pendingGrievances)}
              caption="Status = Pending in the existing model"
              icon={Clock3}
              tone="amber"
              to={`/admin/insights/grievances?${pendingLink.toString()}`}
            />
            <KpiCard
              label="Grants allocated"
              value={formatCurrency(kpis.grantsAllocated, { compact: true })}
              caption="Provisional grant records"
              icon={Wallet}
              tone="green"
              to={`/admin/insights/grants${linkSuffix}`}
            />
            <KpiCard
              label="Grant utilisation"
              value={`${kpis.grantUtilisationPct}%`}
              caption="Verified utilisation ÷ allocated"
              icon={Gauge}
              tone="amber"
              to={`/admin/insights/grants?${grantLink.toString()}`}
            />
            <KpiCard
              label="Transactions"
              value={formatNumber(kpis.transactions)}
              caption={`${formatCurrency(kpis.transactionVolume, { compact: true })} collected`}
              icon={Receipt}
              tone="blue"
              to={`/admin/insights/transactions${linkSuffix}`}
            />
            <KpiCard
              label="Facility utilisation"
              value={`${kpis.facilityUtilisationPct}%`}
              caption="Capacity-weighted daily utilisation"
              icon={Activity}
              tone="green"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Facility utilisation trend"
              description="Average daily capacity utilisation across facilities in scope."
            >
              <TrendChart
                categories={DEMO_MONTH_LABELS}
                series={[
                  { name: "Utilisation %", data: charts.utilisationTrend },
                ]}
                colors={["#10b981"]}
                formatValue={(value) => `${value}%`}
                height={250}
              />
            </ChartCard>

            <ChartCard
              title="Grievance status distribution"
              description="Only the two statuses supported by the current complaint model."
            >
              <DonutChart
                labels={["Pending", "Resolved"]}
                series={[
                  charts.grievanceStatus.Pending,
                  charts.grievanceStatus.Resolved,
                ]}
                colors={["#f59e0b", "#10b981"]}
                height={250}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>

            <ChartCard
              title="District-wise facility distribution"
              description="Number of mapped facilities per district in scope."
            >
              <BarChart
                horizontal
                categories={charts.districtDistribution.map((row) => row.district)}
                series={[
                  {
                    name: "Facilities",
                    data: charts.districtDistribution.map((row) => row.count),
                  },
                ]}
                colors={["#10b981"]}
                height={Math.max(240, charts.districtDistribution.length * 34)}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>

            <ChartCard
              title="Athlete registration trend"
              description="New athlete registrations."
            >
              <TrendChart
                area
                categories={DEMO_MONTH_LABELS}
                series={[
                  { name: "Registrations", data: charts.registrationTrend },
                ]}
                colors={["#0ea5e9"]}
                height={250}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>

            <ChartCard
              title="Sport-wise facility distribution"
              description="Facilities offering each sport in the current scope (top 8)."
            >
              <BarChart
                categories={charts.sportDistribution.map((row) => row.sport)}
                series={[
                  {
                    name: "Facilities",
                    data: charts.sportDistribution.map((row) => row.count),
                  },
                ]}
                colors={["#a78bfa"]}
                height={280}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>

            <ChartCard
              title="Grievance resolution trend"
              description="Grievances submitted and resolved per month."
            >
              <TrendChart
                categories={DEMO_MONTH_LABELS}
                series={[
                  { name: "Submitted", data: charts.createdTrend },
                  { name: "Resolved", data: charts.resolvedTrend },
                ]}
                colors={["#f59e0b", "#10b981"]}
                height={280}
              />
            </ChartCard>

            <ChartCard
              title="Grant allocation vs utilisation"
              description="Provisional grants: allocated, released and verified utilisation by month."
            >
              <BarChart
                categories={DEMO_MONTH_LABELS}
                series={[
                  { name: "Allocated", data: charts.grantAllocatedTrend },
                  { name: "Released", data: charts.grantReleasedTrend },
                  { name: "Utilised", data: charts.grantUtilisedTrend },
                ]}
                colors={["#007D40", "#38bdf8", "#f59e0b"]}
                height={280}
                formatValue={(value) => formatCurrency(value, { compact: true })}
              />
            </ChartCard>

            <ChartCard
              title="Transaction status summary"
              description={`${formatCurrency(kpis.transactionVolume, { compact: true })} collected from successful transactions.`}
            >
              <BarChart
                categories={charts.transactionStatus}
                series={[
                  { name: "Transactions", data: charts.transactionCounts },
                ]}
                colors={["#10b981", "#f59e0b", "#ef4444", "#a78bfa"]}
                height={280}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card>
              <SectionHeader
                title="Recent grievances"
                description="Latest submissions within the current filters."
                action={
                  <Link
                    to={`/admin/insights/grievances${grievanceSuffix}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-200"
                  >
                    Open grievances <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
              {data.recentGrievances.length === 0 ? (
                <EmptyState title="No grievances in this slice" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentGrievances.map((row) => (
                    <li key={row.id} className="px-4 py-3 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-brand-dark">
                            {row.subject}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {row.id} · {row.facilityName} · {row.district}
                          </p>
                        </div>
                        <StatusPill status={row.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <SectionHeader
                title="Grants needing attention"
                description="Verification or utilisation follow-up required."
                action={
                  <Link
                    to={`/admin/insights/grants?${grantLink.toString()}`}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-200"
                  >
                    Verification queue <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
              {data.attentionGrants.length === 0 ? (
                <EmptyState title="Nothing pending in this slice" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.attentionGrants.map((grant) => (
                    <li key={grant.id} className="px-4 py-3 sm:px-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-brand-dark">
                            {grant.facilityName}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {grant.id} · {formatCurrency(grant.pendingVerification, { compact: true })} awaiting verification
                          </p>
                        </div>
                        <StatusPill status={grant.status} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

        </div>
      ) : null}
    </PageShell>
  );
}
