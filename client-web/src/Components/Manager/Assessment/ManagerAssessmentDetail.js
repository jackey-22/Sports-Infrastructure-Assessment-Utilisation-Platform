import React from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { managerService } from "../../../services/manager/managerService";
import { useAdminQuery } from "../../../hooks/manager/useManagerQuery";
import { formatDate } from "../../../utils/manager/managerUtils";
import VisionFindings from "../../Assessment/VisionFindings";
import AssessmentEvidence from "../../Assessment/AssessmentEvidence";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  SectionHeader,
  StatusPill,
  TableSkeleton,
} from "../Common/ManagerUI";

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-xs text-slate-800">{children}</dd>
    </div>
  );
}

export default function ManagerAssessmentDetail() {
  const { assessmentId } = useParams();
  const { data: assessment, loading, error, reload } = useAdminQuery(
    () => managerService.getAssessment(assessmentId),
    [assessmentId]
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Condition Assessment"
        title={assessment?.sportName ? `${assessment.sportName} assessment` : "Facility assessment"}
        description={assessment?.facilityName}
        actions={
          <Button as={Link} to="/manager/assessment" variant="secondary">
            <ArrowLeft className="h-3 w-3" /> History
          </Button>
        }
      />

      {loading ? (
        <Card><TableSkeleton rows={5} columns={4} /></Card>
      ) : error ? (
        <ErrorState message={error.message} onRetry={reload} />
      ) : !assessment ? (
        <EmptyState title="Assessment not found" />
      ) : (
        <>
          <Card className="mb-4">
            <SectionHeader title="Assessment information" />
            <dl className="divide-y divide-slate-200 px-4 pb-3 sm:px-5">
              {assessment.sportName && <DetailRow label="Sport">{assessment.sportName}</DetailRow>}
              <DetailRow label="Facility">{assessment.facilityName}</DetailRow>
              <DetailRow label="District">{assessment.district}</DetailRow>
              <DetailRow label="Assessment date">{formatDate(assessment.date)}</DetailRow>
              {assessment.inspector && <DetailRow label="Inspector">{assessment.inspector}</DetailRow>}
              <DetailRow label="Status"><StatusPill status={assessment.status} /></DetailRow>
              {assessment.score != null && (
                <DetailRow label="Recorded score">{assessment.score} / 100 · {assessment.grade}</DetailRow>
              )}
              {assessment.maintenanceUrgency && (
                <DetailRow label="Maintenance urgency">{assessment.maintenanceUrgency}</DetailRow>
              )}
              {assessment.summary && <DetailRow label="Manager observations">{assessment.summary}</DetailRow>}
            </dl>
          </Card>
          <div className="mb-4"><AssessmentEvidence photos={assessment.photos} /></div>
          {assessment.ai?.status === "completed" && <VisionFindings analysis={assessment.ai} />}
        </>
      )}
    </PageShell>
  );
}
