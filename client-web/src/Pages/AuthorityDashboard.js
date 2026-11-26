import React, { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Activity, Building2, Map, Trophy } from "lucide-react";
import { api } from "../API/client";
import { getPublicFacilities } from "../services/public/publicFacilityService";
import { AssessmentRecords } from "../Components/Admin/Assessment/AdminAssessmentList";
import { Button, KpiCard, PageHeader, PageShell, SectionHeader } from "../Components/Admin/Common/AdminUI";

export default function AuthorityDashboard() {
  const user = useSelector((state) => state.user.user) || {};
  const districtName = user.District || "Assigned District";
  const [facilities, setFacilities] = useState([]);
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    getPublicFacilities()
      .then((rows) => setFacilities(rows || []))
      .catch(() => setFacilities([]));
    api
      .get("/api/authority/assessments")
      .then((res) => setAssessments(res.assessments || []))
      .catch(() => setAssessments([]));
  }, []);

  const districtFacilities = useMemo(() => {
    const key = districtName.toLowerCase().split(" ")[0];
    const matched = facilities.filter((facility) =>
      String(facility.district || "").toLowerCase().includes(key)
    );
    return matched.length ? matched : facilities;
  }, [facilities, districtName]);

  const scoredAssessments = useMemo(
    () => assessments.filter((a) => a.score != null || a.ai?.visualConditionIndex != null),
    [assessments]
  );

  const avgCondition = useMemo(() => {
    if (!scoredAssessments.length) return "—";
    const total = scoredAssessments.reduce(
      (sum, item) => sum + Number(item.ai?.visualConditionIndex ?? item.score ?? 0),
      0
    );
    return `${Math.round(total / scoredAssessments.length)} / 100`;
  }, [scoredAssessments]);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Office of the District Sports Officer (DSO) · Sports Authority of Gujarat"
        title={`${districtName} · Sports Infrastructure`}
        description="District sports complexes, infrastructure condition index, and saved inspection records."
        actions={
          <>
            <Button as={Link} to="/explore" variant="primary">
              <Map className="h-4 w-4" /> District GIS Map
            </Button>
            <Button as={Link} to="/authority/allsportscomplex" variant="secondary">
              <Building2 className="h-4 w-4" /> Manage Complexes
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="District Complexes"
          value={districtFacilities.length}
          caption="Active infrastructure inventory"
          icon={Building2}
          tone="blue"
          to="/authority/allsportscomplex"
        />
        <KpiCard
          label="Condition Assessments"
          value={assessments.length}
          caption="Saved facility audit reports"
          icon={Activity}
          tone="green"
        />
        <KpiCard
          label="Avg Condition Index"
          value={avgCondition}
          caption="Based on recorded inspections"
          icon={Trophy}
          tone="amber"
        />
      </div>

      <SectionHeader title="District Condition Assessment Records" />
      <AssessmentRecords endpoint="/api/authority/assessments" />
    </PageShell>
  );
}
