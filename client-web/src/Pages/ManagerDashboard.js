import React from "react";
import { Link } from "react-router-dom";
import { Activity, Calendar, ClipboardCheck, FileCheck, FileText, Users } from "lucide-react";
import { GUJARAT_FACILITIES } from "../data/gujaratSportsData";
import {
  MANAGER_ASSESSMENTS,
  MANAGER_GRANTS,
  MANAGER_GRIEVANCES,
  managerProofQueue,
} from "../data/manager/managerDemoData";
import {
  formatCurrency,
  formatDate,
  summariseManagerGrants,
} from "../utils/manager/managerUtils";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  KpiCard,
  PageHeader,
  PageShell,
  SectionHeader,
  StatusPill,
} from "../Components/Manager/Common/ManagerUI";

const SUGGESTED_ACTIONS = [
  {
    to: "/manager/allcomplaint",
    label: "Unresolved grievances",
    description: "Pending and open complaints at this facility",
    icon: FileText,
    tone: "amber",
  },
  {
    to: "/manager/grants",
    label: "Grant utilisation proofs",
    description: "Submit or track proof of grant expenditure",
    icon: FileCheck,
    tone: "blue",
  },
  {
    to: "/manager/assessment/new",
    label: "New condition assessment",
    description: "Schedule an on-site inspection and audit",
    icon: ClipboardCheck,
    tone: "green",
  },
  {
    to: "/manager/facilitydetails",
    label: "Manage facilities",
    description: "Courts, slots and daily capacity configuration",
    icon: Calendar,
    tone: "slate",
  },
  {
    to: "/manager/allathelte",
    label: "Athletes & instructors",
    description: "Coach roster and athlete records",
    icon: Users,
    tone: "slate",
  },
  {
    to: "/manager/analysis",
    label: "Utilisation analysis",
    description: "Court load, attendance and monthly trends",
    icon: Activity,
    tone: "violet",
  },
];

const TONE_CLASSES = {
  green: "bg-brand-soft text-brand-primary",
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
  slate: "bg-slate-100 text-slate-600",
};

const courtCount = (sport) =>
  sport.courts || sport.lanes || sport.tables || sport.pools || sport.mats || 1;

export default function ManagerDashboard() {
  // GUJARAT_FACILITIES[0] is the same complex as MANAGER_FACILITY_ID and carries
  // the display fields (location, condition, utilisation, per-sport detail).
  const facility = GUJARAT_FACILITIES[0];
  const grants = summariseManagerGrants(MANAGER_GRANTS || []);
  const pendingProofs = managerProofQueue().filter((p) => p.status === "Submitted").length;
  const openGrievances = (MANAGER_GRIEVANCES || []).filter((g) => g.status === "Pending").length;

  const sportRows = (facility.sports || []).map((sport, index) => ({
    id: `${facility.id}-${index}`,
    name: sport.name,
    courts: courtCount(sport),
    surface: sport.surface || "—",
    feePerHour: sport.feePerHour || "—",
    rating: sport.rating != null ? `${sport.rating} ★` : "—",
  }));

  const assessmentRows = (MANAGER_ASSESSMENTS || []).map((a) => ({
    id: a.id,
    date: formatDate(a.date),
    score: a.score != null ? `${a.score}%` : "Draft",
    grade: a.grade || "—",
    status: a.status || "Draft",
    inspector: a.inspector || "—",
  }));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sports Authority of Gujarat · Facility Manager Console"
        title={facility.name}
        description={`${facility.location} · Operational since ${facility.operationalSince} · ${facility.areaAcres} acres`}
        actions={
          <>
            <Button as={Link} to="/manager/assessment/new" variant="primary">
              <ClipboardCheck className="h-4 w-4" /> New assessment
            </Button>
            <Button as={Link} to="/manager/allcomplaint" variant="secondary">
              <FileText className="h-4 w-4" /> Grievances
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Daily footfall"
          value={facility.utilisation?.currentDailyFootfall || 0}
          caption={`of ${facility.utilisation?.capacityDaily || 0} daily capacity`}
          icon={Users}
          tone="green"
        />
        <KpiCard
          label="Facility condition"
          value={`${facility.condition?.score || 0}%`}
          caption={facility.condition?.grade || "Not graded"}
          icon={ClipboardCheck}
          tone="amber"
        />
        <KpiCard
          label="Utilisation rate"
          value={`${facility.utilisation?.utilizationRate || 0}%`}
          caption="Peak: 6–9 AM, 5–8 PM"
          icon={Activity}
          tone="blue"
        />
        <KpiCard
          label="Open grievances"
          value={openGrievances}
          caption="Pending at this facility"
          icon={FileText}
          tone="violet"
        />
        <KpiCard
          label="Pending proofs"
          value={pendingProofs}
          caption="Awaiting admin review"
          icon={FileCheck}
          tone="slate"
        />
        <KpiCard
          label="Grants utilised"
          value={formatCurrency(grants.utilised, { compact: true })}
          caption={`of ${formatCurrency(grants.allocated, { compact: true })} allocated`}
          icon={Calendar}
          tone="green"
        />
      </div>

      <Card className="mb-5">
        <SectionHeader title="Quick actions" description="Most-used facility operations." />
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3 sm:px-5">
          {SUGGESTED_ACTIONS.map(({ to, label, description, icon: Icon, tone }) => (
            <Link
              key={to}
              to={to}
              className="group block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-brand-primary/40 hover:bg-brand-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <div className="flex items-start gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TONE_CLASSES[tone] || TONE_CLASSES.green}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold text-brand-dark">{label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="mb-5 overflow-hidden">
        <SectionHeader
          title="Courts & pitches"
          description="Capacity, surfaces and hourly rates for this facility."
          action={
            <Link
              to="/manager/facilitydetails"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-brand-dark"
            >
              Manage courts <Activity className="h-3 w-3" />
            </Link>
          }
        />
        <DataTable
          caption="Courts and pitches at this facility"
          columns={[
            { key: "name", header: "Sport" },
            { key: "courts", header: "Courts", align: "right" },
            { key: "surface", header: "Surface" },
            { key: "feePerHour", header: "Rate / hour", align: "right" },
            { key: "rating", header: "Rating", align: "right" },
          ]}
          rows={sportRows}
          empty={
            <EmptyState
              title="No courts configured"
              description="Configure sports, courts and pricing in Facility details."
            />
          }
        />
      </Card>

      <Card className="mb-5 overflow-hidden">
        <SectionHeader
          title="Condition assessment history"
          description="Periodic inspections and audit scores for this facility."
          action={
            <Link
              to="/manager/assessment"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-brand-dark"
            >
              View all <Activity className="h-3 w-3" />
            </Link>
          }
        />
        <DataTable
          caption="Assessment records"
          columns={[
            { key: "date", header: "Assessed" },
            { key: "score", header: "Score", align: "right" },
            { key: "grade", header: "Grade" },
            { key: "status", header: "Status", render: (row) => <StatusPill status={row.status} /> },
            { key: "inspector", header: "Inspector" },
          ]}
          rows={assessmentRows}
          empty={
            <EmptyState
              title="No assessments yet"
              description="Conduct your first condition audit from New assessment."
            />
          }
        />
      </Card>
    </PageShell>
  );
}
