import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Clock3,
  FileText,
  RotateCcw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { coachService } from "../../../services/coach/coachService";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  averageRating,
  ratingStars,
} from "../../../utils/coach/coachUtils";
import { useAdminQuery } from "../../../hooks/coach/useCoachQuery";
import {
  Button,
  Card,
  DemoBanner,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  Notice,
  PageHeader,
  PageShell,
  ProgressBar,
  SectionHeader,
  StatusPill,
  TableSkeleton,
  selectClass,
} from "../Common/CoachUI";

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-48 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-xs text-slate-700">{children}</dd>
    </div>
  );
}

export default function CoachAthleteProfile() {
  const { athleteId } = useParams();
  const { data, loading, error, reload } = useAdminQuery(
    () => coachService.getAthlete(athleteId),
    [athleteId]
  );
  const [athlete, setAthlete] = useState(null);

  useEffect(() => {
    if (data) setAthlete(data);
  }, [data]);

  if (loading && !athlete) {
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

  if (!athlete) {
    return (
      <PageShell>
        <Card>
          <EmptyState
            title="Athlete not found"
            description={`No athlete matches ${athleteId}.`}
            action={
              <Button as={Link} to="/coach/athletes">
                <ArrowLeft className="h-3 w-3" /> Back to athletes
              </Button>
            }
          />
        </Card>
      </PageShell>
    );
  }

  const rating = athlete.rating;
  const stars = rating ? ratingStars(rating) : null;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Coach Console · Athlete Profile"
        title={athlete.name}
        description={`${athlete.sport} · ${athlete.ageGroup} · ${athlete.facilityName}`}
        actions={
          <>
            <Button as={Link} to="/coach/athletes" variant="secondary">
              <ArrowLeft className="h-3 w-3" /> Back to athletes
            </Button>
            {athlete.ratingStatus === "Pending" ? (
              <Button
                as={Link}
                to={`/coach/rate/${athlete.id}`}
                className="ml-2"
              >
                <ShieldCheck className="h-3 w-3 mr-1" /> Submit rating
              </Button>
            ) : (
              <Button
                as={Link}
                to={`/coach/rate/${athlete.id}`}
                variant="secondary"
              >
                <FileText className="h-3 w-3 mr-1" /> Update rating
              </Button>
            )}
          </>
        }
      />

      <DemoBanner>
        Athlete profile is fictional and scoped to this coach's facility. Ratings
        shown are demo data; no backend persistence exists.
      </DemoBanner>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusPill status={athlete.status} />
        <StatusPill status={athlete.ratingStatus} />
        <span className="text-[11px] text-slate-400">
          Joined {formatDate(athlete.joinedAt)} · Last session {formatDate(athlete.lastSessionAt)}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Attendance"
          value={`${athlete.attendancePct}%`}
          caption="Session attendance rate"
          icon={Clock3}
          tone="green"
        />
        <KpiCard
          label="Coach rating"
          value={rating == null ? "Pending" : `${rating} / 5`}
          caption={rating == null ? "Not yet rated" : "Last coach rating"}
          icon={Wallet}
          tone="blue"
        />
      </div>

      <Card className="mb-4">
        <SectionHeader title="Athlete information" />
        <dl className="divide-y divide-slate-100/70 px-4 pb-3 sm:px-5">
          <DetailRow label="Athlete ID">{athlete.id}</DetailRow>
          <DetailRow label="Name">{athlete.name}</DetailRow>
          <DetailRow label="Sport">{athlete.sport}</DetailRow>
          <DetailRow label="Age group">{athlete.ageGroup}</DetailRow>
          <DetailRow label="Status">{athlete.status}</DetailRow>
          <DetailRow label="Facility">{athlete.facilityName}</DetailRow>
          <DetailRow label="District">{athlete.district}</DetailRow>
          <DetailRow label="Assigned coach">{athlete.coachName}</DetailRow>
          <DetailRow label="Joined">{formatDate(athlete.joinedAt)}</DetailRow>
        </dl>
      </Card>

      <Card className="mb-4">
        <SectionHeader title="Progress indicators" />
        <div className="px-4 py-4 sm:px-5 space-y-3">
          <ProgressBar label="Attendance" value={athlete.attendancePct} max={100} tone="green" />
          <ProgressBar
            label="Progress trend (latest)"
            value={athlete.progressTrend[athlete.progressTrend.length - 1] || 0}
            max={100}
            tone="blue"
          />
        </div>
      </Card>

      {rating != null ? (
        <Card>
          <SectionHeader title="Previous coach rating" />
          <div className="px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="text-2xl font-bold text-amber-400">
                {"★".repeat(stars.full)}
                {stars.half ? "½" : ""}
                {"☆".repeat(stars.empty)}
              </div>
              <span className="text-xs font-bold text-brand-dark">{rating} / 5</span>
            </div>
            <p className="text-xs text-slate-600">{athlete.remarks || "No remarks recorded."}</p>
            <p className="mt-2 text-[11px] text-slate-500">
              Rated {formatDate(athlete.ratedAt)}
            </p>
          </div>
        </Card>
      ) : null}

    </PageShell>
  );
}

