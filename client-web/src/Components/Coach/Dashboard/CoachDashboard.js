import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Clock3,
  Users,
  Wallet,
  RotateCcw,
  ShieldCheck,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { coachService } from "../../../services/coach/coachService";
import { formatNumber } from "../../../utils/coach/coachUtils";
import { useAdminQuery } from "../../../hooks/coach/useCoachQuery";
import {
  ChartCard,
  DonutChart,
} from "../Common/CoachUI";
import {
  Button,
  Card,
  DemoBanner,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  PageShell,
  SectionHeader,
  StatusPill,
  TableSkeleton,
} from "../Common/CoachUI";

const COACH_TODAY = "2026-10-31";

function shiftDate(days) {
  const date = new Date(`${COACH_TODAY}T00:00:00Z`);
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
    to = COACH_TODAY;
  }
  return { from, to };
}

export default function CoachDashboard() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));

  const query = queryFromFilters(filters);
  const queryKey = JSON.stringify(query);
  const { data, loading, error, reload } = useAdminQuery(
    () => coachService.getDashboard(),
    [queryKey]
  );

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
  }

  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  if (data?.recentRatings) {
    data.recentRatings.forEach((r) => {
      ratingCounts[r.rating] = (ratingCounts[r.rating] || 0) + 1;
    });
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sports Authority of Gujarat · Coach Console"
        title={
          data?.facility
            ? `${data.facility.name} — Coach Dashboard`
            : "Coach Dashboard"
        }
        description={`Coach-scoped view for ${
          data?.facility ? data.facility.district : ""
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
              label="Assigned athletes"
              value={formatNumber(data.totalAthletes)}
              caption={`${formatNumber(data.activeAthletes)} active`}
              icon={Users}
              tone="green"
            />
            <KpiCard
              label="Pending ratings"
              value={formatNumber(data.pendingRatings)}
              caption="Athletes not yet rated"
              icon={Clock3}
              tone="amber"
            />
            <KpiCard
              label="Rated athletes"
              value={formatNumber(data.ratedAthletes)}
              caption={`${data.totalRatings} rating(s) recorded`}
              icon={ShieldCheck}
              tone="green"
            />
            <KpiCard
              label="Average rating"
              value={
                data.averageRating == null ? "—" : `${data.averageRating} / 5`
              }
              caption="Across submitted ratings"
              icon={Wallet}
              tone="blue"
            />
            <KpiCard
              label="Facility utilisation"
              value={`${data.facilityUtilisation}%`}
              caption="Capacity-weighted daily utilisation"
              icon={BarChart3}
              tone="green"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Rating distribution"
              description="Distribution of coach-submitted athlete ratings (1–5)."
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
                title="Recent ratings"
                description="Most recent coach-submitted ratings."
              />
              <div className="px-4 py-4 sm:px-5">
                {data.recentRatings.length === 0 ? (
                  <EmptyState title="No ratings yet" />
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {data.recentRatings.map((r) => (
                      <li key={r.id} className="px-4 py-3 sm:px-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-brand-dark">
                              {r.athleteName}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-400">
                              {r.sport} · {r.facilityName}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-brand-dark">
                              {r.rating} / 5
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {r.createdAt}
                            </p>
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
                description="Coach-scoped shortcuts."
              />
              <div className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-2 sm:px-5">
                <Button
                  as={Link}
                  to="/coach/athletes"
                  className="w-full text-left"
                >
                  <Users className="h-4 w-4 mr-2" /> View assigned athletes
                </Button>
                <Button
                  as={Link}
                  to="/coach/rating-history"
                  className="w-full text-left"
                >
                  <ClipboardList className="h-4 w-4 mr-2" /> Rating history
                </Button>
              </div>
            </Card>
          </div>

        </div>
      ) : null}
    </PageShell>
  );
}

