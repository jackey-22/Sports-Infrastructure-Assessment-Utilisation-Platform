import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { managerService } from "../../../services/manager/managerService";
import { useAdminQuery } from "../../../hooks/manager/useManagerQuery";
import { formatDate } from "../../../utils/manager/managerUtils";
import ManagerAIDeview from "./ManagerAIDeview";
import VisionFindings from "../../Assessment/VisionFindings";
import {
  Button,
  Card,
  DemoBanner,
  EmptyState,
  ErrorState,
  KpiCard,
  Notice,
  PageHeader,
  PageShell,
  ProgressBar,
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
      <dd className="min-w-0 flex-1 text-xs text-slate-200">{children}</dd>
    </div>
  );
}

export default function ManagerAssessmentDetail() {
  const { assessmentId } = useParams();
  const { data, loading, error, reload } = useAdminQuery(
    () => managerService.getAssessment(assessmentId),
    [assessmentId]
  );
  const [assessment, setAssessment] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    if (data) setAssessment(data);
  }, [data]);

  if (loading && !assessment) {
    return (
      <PageShell>
        <Card>
          <TableSkeleton rows={8} columns={4} />
        </Card>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <Card>
          <ErrorState message={error.message} onRetry={reload} />
        </Card>
      </PageShell>
    );
  }

  if (!assessment) {
    return (
      <PageShell>
        <Card>
          <EmptyState
            title="Assessment not found"
            description={`No assessment matches ${assessmentId}.`}
            action={
              <Button as={Link} to="/manager/assessment">
                <ArrowLeft className="h-3 w-3" /> Back to history
              </Button>
            }
          />
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Condition Assessment"
        title={assessment.id}
        description={`${assessment.facilityName} · ${assessment.district} · Assessed ${formatDate(assessment.date)}`}
        actions={
          <>
            <Button as={Link} to="/manager/assessment" variant="secondary">
              <ArrowLeft className="h-3 w-3" /> History
            </Button>
            {assessment.ai && assessment.ai.status === "completed" ? null : assessment.source !== "database" && assessment.status !== "Draft" ? (
              <Button variant="secondary" onClick={() => setAiOpen(true)}>
                <ShieldAlert className="h-3 w-3 mr-1" /> Questionnaire notes
              </Button>
            ) : null}
          </>
        }
      />

      {assessment.source === "database" ? (
        <Notice tone="info" title="Saved assessment">
          Questionnaire score and manager notes are separate from any AI image analysis.
          {assessment.ai && assessment.ai.status === "completed"
            ? " The visual findings below came from the photographs sent to the vision provider."
            : " No vision model analysed photographs for this record."}
        </Notice>
      ) : (
        <DemoBanner>
          This history row is sample data in this browser. The score-based notes are not a photograph analysis.
        </DemoBanner>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill status={assessment.status} />
        <span className="text-[11px] text-slate-400">
          Inspector: {assessment.inspector} · Urgency: {assessment.maintenanceUrgency}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Questionnaire score"
          value={assessment.score == null ? "Draft" : `${assessment.score} / 100`}
          caption={assessment.grade || "Not yet scored"}
          icon={Building2}
          tone="green"
        />
        <KpiCard
          label="Assessed on"
          value={formatDate(assessment.date)}
          caption={assessment.status}
          icon={Calendar}
          tone="slate"
        />
        <KpiCard
          label="Photos"
          value={assessment.photos ? assessment.photos.length : 0}
          caption="Supporting evidence (names only)"
          icon={FileText}
          tone="blue"
        />
        <KpiCard
          label="Status"
          value={assessment.status}
          caption="Draft, submitted or verified"
          icon={ShieldCheck}
          tone="amber"
        />
      </div>

      <Card>
        <SectionHeader title="Assessment information" />
        <dl className="divide-y divide-slate-200 px-4 pb-3 sm:px-5">
          <DetailRow label="Facility">{assessment.facilityName}</DetailRow>
          <DetailRow label="District">{assessment.district}</DetailRow>
          <DetailRow label="Assessment date">{formatDate(assessment.date)}</DetailRow>
          <DetailRow label="Inspector">{assessment.inspector}</DetailRow>
          <DetailRow label="Maintenance urgency">{assessment.maintenanceUrgency}</DetailRow>
        </dl>
      </Card>

      <Card className="mb-4">
        <SectionHeader title="Questionnaire score" description="Sum of the manager-entered component ratings. Not an AI result." />
        <div className="px-4 py-4 sm:px-5">
          <ProgressBar
            label={assessment.grade || "Not yet scored"}
            value={assessment.score == null ? 0 : assessment.score}
            max={100}
            tone="green"
          />
          <p className="mt-2 text-xs text-slate-600">
            {assessment.score == null
              ? "This assessment is a draft and has no score yet."
              : `Scored ${assessment.score} of 100 — ${assessment.grade}.`}
          </p>
        </div>
      </Card>

      {assessment.ai && assessment.ai.status === "completed" ? (
        <Card>
          <SectionHeader title="AI image analysis" description="Findings from the photographs. Separate from the questionnaire score." />
          <div className="px-4 py-4 sm:px-5">
            <VisionFindings analysis={assessment.ai} />
          </div>
        </Card>
      ) : null}

      {assessment.photos && assessment.photos.length > 0 ? (
        <Card>
          <SectionHeader title="Photograph names" description="Image bytes are not kept on the server. Names identify which files were analysed." />
          <ul className="space-y-1 px-4 py-4 sm:px-5">
            {assessment.photos.map((photo) => (
              <li key={typeof photo === "string" ? photo : photo.filename} className="text-xs text-slate-700">
                {typeof photo === "string" ? photo : photo.filename}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card>
        <SectionHeader title="Manager-entered observations" />
        <p className="px-4 py-4 text-xs text-slate-700 sm:px-5">
          {assessment.summary || "No notes recorded."}
        </p>
      </Card>

      <ManagerAIDeview
        assessment={assessment}
        photos={assessment.photos}
        open={aiOpen}
        onClose={() => setAiOpen(false)}
      />
    </PageShell>
  );
}

