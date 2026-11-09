import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Building2,
  ClipboardCheck,
  Map,
  ShieldCheck,
  Users,
} from "lucide-react";
import { GUJARAT_FACILITIES } from "../data/gujaratSportsData";
import FacilityConditionAudit from "../Components/Assessment/FacilityConditionAudit";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  KpiCard,
  PageHeader,
  PageShell,
  SectionHeader,
} from "../Components/Admin/Common/AdminUI";

const mean = (values) =>
  values.length ? Math.round(values.reduce((total, v) => total + v, 0) / values.length) : 0;

const gradeTone = (score) => {
  if (score >= 85) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (score >= 70) return "border-sky-200 bg-sky-50 text-sky-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
};

export default function AuthorityDashboard() {
  const user = useSelector((state) => state.user.user) || {};
  const districtName = user.District || "Ahmedabad District";
  const [auditFacility, setAuditFacility] = useState(null);

  const districtFacilities = useMemo(() => {
    const key = districtName.toLowerCase().split(" ")[0];
    const matched = GUJARAT_FACILITIES.filter((facility) =>
      facility.district.toLowerCase().includes(key)
    );
    return matched.length ? matched : GUJARAT_FACILITIES;
  }, [districtName]);

  const avgCondition = mean(districtFacilities.map((f) => f.condition.score));
  const avgUtilisation = mean(districtFacilities.map((f) => f.utilisation.utilizationRate));
  const needAttention = districtFacilities.filter((f) =>
    /high|critical/i.test(f.condition.maintenanceUrgency)
  ).length;

  const rows = districtFacilities.map((facility) => ({
    id: facility.id,
    source: facility,
    name: facility.name,
    taluka: facility.taluka,
    score: facility.condition.score,
    grade: facility.condition.grade,
    inspected: facility.condition.lastInspectionDate,
    urgency: facility.condition.maintenanceUrgency,
  }));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Office of the District Sports Officer (DSO) · Sports Authority of Gujarat"
        title={`${districtName} · Sports Infrastructure`}
        description="Facility quality inspection, condition grading and grassroots tournament coordination."
        actions={
          <>
            <Button as={Link} to="/explore" variant="primary">
              <Map className="h-4 w-4" /> District GIS map
            </Button>
            <Button as={Link} to="/authority/allsportscomplex" variant="secondary">
              <Building2 className="h-4 w-4" /> Manage complexes
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="District complexes"
          value={districtFacilities.length}
          caption="Under DSO supervision"
          icon={Building2}
          tone="blue"
        />
        <KpiCard
          label="Condition index"
          value={`${avgCondition}%`}
          caption="Average facility condition score"
          icon={ShieldCheck}
          tone="green"
        />
        <KpiCard
          label="Average utilisation"
          value={`${avgUtilisation}%`}
          caption="Across district facilities"
          icon={Activity}
          tone="violet"
        />
        <KpiCard
          label="Needs attention"
          value={needAttention}
          caption="High or critical maintenance urgency"
          icon={AlertTriangle}
          tone="amber"
        />
      </div>

      <Card className="overflow-hidden">
        <SectionHeader
          title="Facility condition assessments & quality audits"
          description='Click "Conduct audit" to record turf wear, lighting lux, or submit maintenance tenders.'
          action={
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
              <Users className="h-3 w-3" /> {districtFacilities.length} facilities
            </span>
          }
        />
        <DataTable
          caption="District facility condition assessments"
          columns={[
            { key: "name", header: "Complex name" },
            { key: "taluka", header: "Taluka" },
            {
              key: "grade",
              header: "Condition grade",
              render: (row) => (
                <span
                  className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${gradeTone(
                    row.score
                  )}`}
                >
                  {row.grade}
                </span>
              ),
            },
            { key: "score", header: "Score", align: "right", render: (row) => `${row.score}%` },
            { key: "inspected", header: "Last inspected" },
            { key: "urgency", header: "Urgency" },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (row) => (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAuditFacility(row.source)}
                >
                  <ClipboardCheck className="h-3.5 w-3.5" /> Conduct audit
                </Button>
              ),
            },
          ]}
          rows={rows}
          empty={
            <EmptyState
              title="No facilities in this district"
              description="Facilities added by the Sports Authority will appear here."
            />
          }
        />
      </Card>

      {auditFacility ? (
        <FacilityConditionAudit
          facility={auditFacility}
          onClose={() => setAuditFacility(null)}
        />
      ) : null}
    </PageShell>
  );
}
