import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Clock3,
  MessageSquareWarning,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { managerService } from "../../../services/manager/managerService";
import { MANAGER_TODAY } from "../../../data/manager/managerDemoData";
import { DEMO_MONTH_LABELS } from "../../../data/admin/adminDemoData";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  percentage,
  summariseManagerGrievances,
  summariseManagerGrants,
  summariseManagerTransactions,
} from "../../../utils/manager/managerUtils";
import {
  useAdminQuery,
} from "../../../hooks/manager/useManagerQuery";
import {
  BarChart,
  ChartCard,
  DonutChart,
  TrendChart,
} from "../Common/ManagerUI";
import {
  Button,
  Card,
  DemoBanner,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  PageHeader,
  PageShell,
  SectionHeader,
  StatusPill,
  TableSkeleton,
  ProgressBar,
  selectClass,
} from "../Common/ManagerUI";

function sportLoad(names) {
  return (names || []).slice(0, 6).map((name, index) => {
    const capacity = 18 + ((index * 7 + String(name).length) % 22);
    const enrolled = Math.max(8, Math.round(capacity * (0.58 + (index % 4) * 0.09)));
    return { name, capacity, enrolled };
  });
}

const DATE_PRESETS = [
  { value: "180", label: "Last 6 months" },
  { value: "90", label: "Last 90 days" },
  { value: "30", label: "Last 30 days" },
  { value: "all", label: "All records" },
];

function shiftDate(days) {
  const date = new Date(`${MANAGER_TODAY}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const EMPTY_FILTERS = { preset: "180", from: "", to: "" };

function initialFilters(params) {
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  return {
    ...EMPTY_FILTERS,
    preset: from || to ? "custom" : EMPTY_FILTERS.preset,
    from,
    to,
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
    to = MANAGER_TODAY;
  }
  return { from, to };
}

export default function ManagerDashboard() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));

  const query = queryFromFilters(filters);
  const queryKey = JSON.stringify(query);
  const { data, loading, error, reload } = useAdminQuery(
    () => managerService.getDashboard(),
    [queryKey]
  );

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
  }

  const facility = data?.facility;
  const sports = sportLoad(facility?.sports);
  const grievances = data?.grievances;
  const transactions = data?.transactions;
  const grants = data?.grants;
  const latestAssessment = data?.latestAssessment;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sports Authority of Gujarat · Facility Manager Console"
        title={`${facility ? facility.name : "Facility"} — Overview`}
        description={`Facility-level operational status for ${
          facility ? facility.district : ""
        }.`}
        actions={
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset filters
          </Button>
        }
      />

      {loading && !data ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 11 }).map((_, index) => (
              <div key={index} className="h-[104px] animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
          <Card>
            <TableSkeleton rows={6} columns={4} />
          </Card>
        </>
      ) : error ? (
        <Card>
          <ErrorState message={error.message} onRetry={reload} />
        </Card>
      ) : data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total grievances"
              value={formatNumber(grievances.total)}
              caption={`${formatNumber(grievances.resolved)} resolved`}
              icon={MessageSquareWarning}
              tone="slate"
            />
            <KpiCard
              label="Pending grievances"
              value={formatNumber(grievances.pending)}
              caption="Awaiting manager action"
              icon={Clock3}
              tone="amber"
            />
            <KpiCard
              label="Transactions"
              value={formatNumber(transactions.count)}
              caption={`${formatCurrency(transactions.volume, { compact: true })} collected`}
              icon={Receipt}
              tone="blue"
            />
            <KpiCard
              label="Successful"
              value={formatNumber(transactions.byStatus.Success)}
              caption={`${formatNumber(transactions.byStatus.Pending + transactions.byStatus.Failed)} pending / failed`}
              icon={ShieldCheck}
              tone="green"
            />
            <KpiCard
              label="Grants allocated"
              value={formatCurrency(grants.allocated, { compact: true })}
              caption={`${formatCurrency(grants.released, { compact: true })} released`}
              icon={Wallet}
              tone="green"
            />
            <KpiCard
              label="Grant utilisation"
              value={`${percentage(grants.utilised, grants.allocated)}%`}
              caption={`${formatCurrency(grants.pendingVerification, { compact: true })} awaiting verification`}
              icon={Users}
              tone="amber"
            />
            <KpiCard
              label="Daily utilisation"
              value={`${facility.utilisation || 0}%`}
              caption={`${formatNumber(facility.capacity || 0)} daily capacity`}
              icon={Activity}
              tone="green"
            />
            <KpiCard
              label="Athletes on record"
              value={formatNumber(facility.athletes || 0)}
              caption={`${formatNumber(facility.coaches || 0)} coaches`}
              icon={Users}
              tone="blue"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              className="lg:col-span-2"
              title="Facility utilisation trend"
              description="Share of daily capacity used at this complex."
            >
              <TrendChart
                area
                categories={DEMO_MONTH_LABELS}
                series={[
                  { name: "Utilisation %", data: facility.utilisationTrend || [] },
                ]}
                colors={["#007D40"]}
                height={280}
                formatValue={(value) => `${value}%`}
              />
            </ChartCard>

            <ChartCard
              title="Grievance status distribution"
              description="Facility-level complaints, Pending vs Resolved."
            >
              <DonutChart
                labels={["Pending", "Resolved"]}
                series={[grievances.pending, grievances.resolved]}
                colors={["#f59e0b", "#10b981"]}
                height={260}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>

            <ChartCard
              title="Transaction summary"
              description="Successful vs pending vs failed transactions at this facility."
            >
              <DonutChart
                labels={["Success", "Pending", "Failed", "Refunded"]}
                series={[
                  transactions.byStatus.Success,
                  transactions.byStatus.Pending,
                  transactions.byStatus.Failed,
                  transactions.byStatus.Refunded,
                ]}
                colors={["#10b981", "#f59e0b", "#ef4444", "#a78bfa"]}
                height={260}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>

            <ChartCard
              title="Grant allocation vs utilisation"
              description="Allocated, released and verified utilisation at this facility."
            >
              <BarChart
                categories={["Allocated", "Released", "Utilised"]}
                series={[
                  {
                    name: "Amount (INR)",
                    data: [grants.allocated, grants.released, grants.utilised],
                  },
                ]}
                colors={["#007D40", "#38bdf8", "#f59e0b"]}
                height={260}
                formatValue={(value) => formatCurrency(value, { compact: true })}
              />
            </ChartCard>

            <ChartCard
              className="lg:col-span-2"
              title="Court capacity and enrolment"
              description="Places available against athletes enrolled in each sport."
            >
              <BarChart
                categories={sports.map((row) => row.name)}
                series={[
                  { name: "Capacity", data: sports.map((row) => row.capacity) },
                  { name: "Enrolled", data: sports.map((row) => row.enrolled) },
                ]}
                colors={["#007D40", "#f59e0b"]}
                height={280}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>

            <Card>
              <SectionHeader
                title="Latest condition assessment"
                description={`Assessed ${formatDate(latestAssessment.date)} by ${latestAssessment.inspector}.`}
                action={
                  <Link
                    to="/manager/assessment"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-brand-dark"
                  >
                    Assessment history <ArrowRight className="h-3 w-3" />
                  </Link>
                }
              />
              <div className="px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Condition score
                    </p>
                    <p className="text-2xl font-extrabold text-brand-dark">
                      {latestAssessment.score == null ? "Draft" : latestAssessment.score}
                    </p>
                  </div>
                  <StatusPill status={latestAssessment.status} />
                </div>
                <ProgressBar
                  label={latestAssessment.grade || "Not yet scored"}
                  value={latestAssessment.score == null ? 0 : latestAssessment.score}
                  max={100}
                  tone="green"
                />
                <p className="mt-2 text-xs text-slate-400">
                  {latestAssessment.summary}
                </p>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card>
              <SectionHeader
                title="Quick actions"
                description="Facility-scoped shortcuts."
              />
              <div className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <Button
                  as={Link}
                  to="/manager/allcomplaint"
                  className="w-full text-left"
                >
                  <MessageSquareWarning className="h-4 w-4 mr-2" /> Unresolved grievances
                </Button>
                <Button
                  as={Link}
                  to="/manager/grants"
                  className="w-full text-left"
                >
                  <Wallet className="h-4 w-4 mr-2" /> Pending grant proofs
                </Button>
                <Button
                  as={Link}
                  to="/manager/assessment/new"
                  className="w-full text-left"
                >
                  <ShieldCheck className="h-4 w-4 mr-2" /> New condition assessment
                </Button>
              </div>
            </Card>
          </div>

        </div>
      ) : null}
    </PageShell>
  );
}

