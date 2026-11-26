import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Activity,
  Building2,
  Map,
} from "lucide-react";
import { GUJARAT_FACILITIES } from "../data/gujaratSportsData";
import { AssessmentRecords } from "../Components/Admin/Assessment/AdminAssessmentList";
import {
  Button,
  KpiCard,
  PageHeader,
  PageShell,
  SectionHeader,
} from "../Components/Admin/Common/AdminUI";

const mean = (values) =>
  values.length ? Math.round(values.reduce((total, v) => total + v, 0) / values.length) : 0;

export default function AuthorityDashboard() {
  const user = useSelector((state) => state.user.user) || {};
  const districtName = user.District || "Ahmedabad District";

  const districtFacilities = useMemo(() => {
    const key = districtName.toLowerCase().split(" ")[0];
    const matched = GUJARAT_FACILITIES.filter((facility) =>
      facility.district.toLowerCase().includes(key)
    );
    return matched.length ? matched : GUJARAT_FACILITIES;
  }, [districtName]);

  const avgUtilisation = mean(districtFacilities.map((f) => f.utilisation.utilizationRate));

  return (
    <PageShell>
      <PageHeader
        eyebrow="Office of the District Sports Officer (DSO) · Sports Authority of Gujarat"
        title={`${districtName} · Sports Infrastructure`}
        description="District facilities, utilisation and saved condition assessments."
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

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard
          label="District complexes"
          value={districtFacilities.length}
          caption="Under DSO supervision"
          icon={Building2}
          tone="blue"
        />
        <KpiCard
          label="Average utilisation"
          value={`${avgUtilisation}%`}
          caption="Across district facilities"
          icon={Activity}
          tone="violet"
        />
      </div>

      <SectionHeader title="District condition assessment records" />
      <AssessmentRecords endpoint="/api/authority/assessments" />
    </PageShell>
  );
}
