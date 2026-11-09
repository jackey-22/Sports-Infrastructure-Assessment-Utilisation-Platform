import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Clock3,
  Users,
  Wallet,
  RotateCcw,
  ShieldCheck,
  BarChart3,
  ClipboardList,
  MessageCircle,
  FileText,
} from "lucide-react";
import { citizenService } from "../../../services/citizen/citizenService";
import {
  formatNumber,
  averageFeedbackRating,
  summariseCitizenAttendance,
} from "../../../utils/citizen/citizenUtils";
import { useAdminQuery } from "../../../hooks/citizen/useCitizenQuery";
import {
  BarChart,
  ChartCard,
  DonutChart,
} from "../Common/CitizenUI";
import {
  Button,
  Card,
  DemoBanner,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  PageShell,
  ProgressBar,
  SectionHeader,
  StatusPill,
  TableSkeleton,
} from "../Common/CitizenUI";

const CITIZEN_TODAY = new Date().toISOString().slice(0, 10);

function shiftDate(days) {
  const date = new Date(`${CITIZEN_TODAY}T00:00:00Z`);
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
    to = CITIZEN_TODAY;
  }
  return { from, to };
}

export default function CitizenDashboard() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));

  const query = queryFromFilters(filters);
  const queryKey = JSON.stringify(query);
  const { data, loading, error, reload } = useAdminQuery(
    () => citizenService.getDashboard(),
    [queryKey]
  );

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
  }

  const attendance = data?.attendance;
  const feedback = data?.feedback;
  const complaints = data?.complaints;
  const facility = data?.facility;

  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const allFeedback = [
    ...(data?.recentFeedback || []),
  ];
  allFeedback.forEach((f) => {
    ratingCounts[f.rating] = (ratingCounts[f.rating] || 0) + 1;
  });

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sports Authority of Gujarat · Citizen Console"
        title={
          facility ? `${facility.name} — Citizen Dashboard` : "Citizen Dashboard"
        }
        description="Attendance, feedback and complaints for your facility."
        actions={
          <Button variant="ghost" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset filters
          </Button>
        }
      />

      {loading && !data ? (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="h-[104px] animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              label="Assigned facility"
              value={facility ? facility.name : "—"}
              caption={facility ? facility.district : ""}
              icon={Building2}
              tone="green"
              to="/citizen/profile"
            />
            <KpiCard
              label="Attendance sessions"
              value={formatNumber(attendance?.totalSessions || 0)}
              caption={`${formatNumber(attendance?.completedSessions || 0)} completed`}
              icon={Clock3}
              tone="blue"
            />
            <KpiCard
              label="Feedback submitted"
              value={formatNumber(feedback?.total || 0)}
              caption={
                feedback?.averageRating == null
                  ? "No ratings yet"
                  : `${feedback.averageRating} / 5 avg`
              }
              icon={MessageCircle}
              tone="green"
            />
            <KpiCard
              label="Complaints"
              value={formatNumber(complaints?.total || 0)}
              caption={`${formatNumber(
                complaints?.resolved || 0
              )} resolved`}
              icon={FileText}
              tone="amber"
            />
            <KpiCard
              label="Attendance hours"
              value={
                attendance?.totalHours == null
                  ? "—"
                  : `${attendance.totalHours} h`
              }
              caption="Total session duration"
              icon={Wallet}
              tone="violet"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Feedback rating distribution"
              description="Distribution of your submitted ratings (1–5)."
            >
              <DonutChart
                labels={["1", "2", "3", "4", "5"]}
                series={[
                  ratingCounts[1],
                  ratingCounts[2],
                  ratingCounts[3],
                  ratingCounts[4],
                  ratingCounts[5],
                ]}
                colors={["#ef4444", "#f59e0b", "#a78bfa", "#38bdf8", "#10b981"]}
                height={260}
                formatValue={(value) => formatNumber(value)}
              />
            </ChartCard>

            <Card>
              <SectionHeader
                title="Recent attendance"
                description="Your latest check-in/check-out sessions."
              />
              <div className="px-4 py-4 sm:px-5">
                {data.recentAttendance.length === 0 ? (
                  <EmptyState title="No attendance sessions" />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.recentAttendance.map((s) => (
                      <li key={s.id} className="px-4 py-3 sm:px-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-brand-dark">
                              {s.facilityName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {s.date} · {s.status}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-brand-dark">
                              {s.durationMinutes != null
                                ? `${s.durationMinutes} min`
                                : "—"}
                            </p>
                            <p className="text-[11px] text-slate-500">Duration</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Card>
              <SectionHeader
                title="Quick actions"
                description="Citizen-scoped shortcuts."
              />
              <div className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <Button
                  as={Link}
                  to="/citizen/attendance"
                  className="w-full text-left"
                >
                  <ClipboardList className="h-4 w-4 mr-2" /> Attendance &amp; QR
                </Button>
                <Button
                  as={Link}
                  to="/citizen/feedback"
                  className="w-full text-left"
                >
                  <MessageCircle className="h-4 w-4 mr-2" /> Submit feedback
                </Button>
                <Button
                  as={Link}
                  to="/citizen/complaints"
                  className="w-full text-left"
                >
                  <FileText className="h-4 w-4 mr-2" /> File / track complaint
                </Button>
              </div>
            </Card>
          </div>

          <p className="pb-2 text-center text-[11px] text-slate-500">
            Live server data as of {CITIZEN_TODAY} · Facility:{" "}
            {facility ? facility.name : "—"}.
          </p>
        </div>
      ) : null}
    </PageShell>
  );
}



