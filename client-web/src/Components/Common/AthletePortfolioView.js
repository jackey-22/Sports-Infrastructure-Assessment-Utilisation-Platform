import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Medal,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../../API/client";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  PageShell,
  SectionHeader,
} from "../Admin/Common/AdminUI";
import { BarChart, ChartCard } from "../Admin/Common/AdminCharts";

const formatDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

function initialsOf(name) {
  return (
    String(name || "A")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A"
  );
}

function verificationBadge(status) {
  if (status === "Verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Verified
      </span>
    );
  }
  if (status === "Rejected") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
      <Clock className="h-3 w-3" /> Pending
    </span>
  );
}

function PortfolioBody({ portfolio, isSelf, onRefresh }) {
  const [selectedSportId, setSelectedSportId] = useState("");
  const { exists, user, athlete, summary, sportBreakdown = [], evaluations = [], achievements = [] } = portfolio;

  useEffect(() => {
    if (!selectedSportId && sportBreakdown.length) {
      setSelectedSportId(sportBreakdown[0].sportId);
    }
  }, [sportBreakdown, selectedSportId]);

  const activeSport = useMemo(
    () => sportBreakdown.find((item) => item.sportId === selectedSportId) || sportBreakdown[0] || null,
    [sportBreakdown, selectedSportId]
  );

  const chartCategories = useMemo(
    () => sportBreakdown.map((item) => item.sportName),
    [sportBreakdown]
  );

  const chartSeries = useMemo(
    () => [
      { name: "Latest Score", data: sportBreakdown.map((item) => item.latestScore) },
      { name: "Average Score", data: sportBreakdown.map((item) => item.avgScore) },
    ],
    [sportBreakdown]
  );

  const verifiedAchievements = useMemo(
    () => achievements.filter((item) => item.verificationStatus === "Verified"),
    [achievements]
  );

  const medalsLabel = `${summary.medals?.gold || 0}G · ${summary.medals?.silver || 0}S · ${summary.medals?.bronze || 0}B`;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200/90">
        <div className="bg-gradient-to-r from-brand-dark via-emerald-950 to-emerald-900 p-6 text-white sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              {athlete?.baseUrl ? (
                <img
                  src={athlete.baseUrl}
                  alt={user.name}
                  className="h-16 w-16 shrink-0 rounded-2xl border-2 border-emerald-400/50 object-cover shadow-md sm:h-20 sm:w-20"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/40 bg-emerald-800/80 font-display text-2xl font-extrabold text-white shadow-md sm:h-20 sm:w-20">
                  {initialsOf(user.name)}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-emerald-200 ring-1 ring-emerald-400/30">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {exists ? "Registered Athlete" : "Citizen Account"}
                  </span>
                  {summary.stateRank ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-200 ring-1 ring-amber-400/30">
                      <Medal className="h-3.5 w-3.5" />
                      Rank #{summary.stateRank} of {summary.totalRankedAthletes} Statewide
                    </span>
                  ) : null}
                </div>

                <h2 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {user.name}
                </h2>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-emerald-100/85">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-300" />
                    {athlete?.complexName || "KhelGujarat Civic Portal"}
                  </span>
                  {athlete?.districtName ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-emerald-300" />
                      {athlete.districtName} District
                    </span>
                  ) : null}
                  {athlete?.joinedAt ? (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5 text-emerald-300" />
                      Active since {formatDate(athlete.joinedAt)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {isSelf ? (
                <Link
                  to="/citizen/performance"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2 text-xs font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25"
                >
                  <Trophy className="h-3.5 w-3.5" />
                  Submit Achievement
                </Link>
              ) : null}
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-emerald-50"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Portfolio
              </button>
              {onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
                  title="Refresh portfolio"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {sportBreakdown.length ? (
            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80">
                Active Sports:
              </span>
              {sportBreakdown.map((item) => (
                <span
                  key={item.sportId}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/15"
                >
                  {item.sportName}
                  {item.latestRecognition ? ` · ${item.latestRecognition}` : ""}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 text-xs text-slate-600 sm:grid-cols-3">
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400">Email</span>
            <p className="mt-0.5 truncate font-semibold text-slate-800">{user.email || "—"}</p>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400">Contact Number</span>
            <p className="mt-0.5 font-semibold text-slate-800 tabular-nums">{user.phone || "—"}</p>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider text-slate-400">Completed Sessions</span>
            <p className="mt-0.5 font-semibold text-slate-800 tabular-nums">
              {summary.attendedSessionsCount} of {summary.confirmedBookingsCount} confirmed
            </p>
          </div>
        </div>
      </Card>

      {!exists ? (
        <Card className="p-8">
          <EmptyState
            icon={UserRound}
            title="Athlete portfolio not activated yet"
            description="Your citizen account is active. Book a coaching session to receive coach evaluations, parameter scores, and leaderboard rankings."
            action={
              isSelf ? (
                <Button as={Link} to="/citizen/explore">
                  Explore Sports Facilities
                </Button>
              ) : null
            }
          />
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="State Rank"
          value={summary.stateRank ? `#${summary.stateRank}` : "—"}
          caption={summary.totalRankedAthletes ? `Out of ${summary.totalRankedAthletes} ranked athletes` : "Awaiting evaluations"}
          icon={Medal}
          tone="amber"
        />
        <KpiCard
          label="Total Points"
          value={summary.compositePoints}
          caption="Average score + verified achievement points"
          icon={Sparkles}
          tone="green"
        />
        <KpiCard
          label="Average Score"
          value={`${summary.avgEvaluationScore} / 100`}
          caption={
            summary.evaluationsCount
              ? `Best: ${summary.bestEvaluationScore}/100 · ${summary.evaluationsCount} evaluations`
              : "No coach evaluations yet"
          }
          icon={Award}
          tone="blue"
        />
        <KpiCard
          label="Verified Awards"
          value={summary.verifiedAchievementsCount}
          caption={`Medals: ${medalsLabel} · ${summary.pendingAchievementsCount} pending`}
          icon={Trophy}
          tone="violet"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {sportBreakdown.length ? (
            <ChartCard
              title="Sport Performance"
              description="Latest vs average evaluation score across sports (out of 100)."
            >
              <BarChart
                categories={chartCategories}
                series={chartSeries}
                colors={["#047857", "#6366f1"]}
                height={250}
                formatValue={(value) => `${value} pts`}
              />
            </ChartCard>
          ) : (
            <Card className="p-7">
              <EmptyState
                icon={Award}
                title="No sport evaluation chart yet"
                description="Sport comparison scores will appear here after your first coach evaluation."
              />
            </Card>
          )}

          <Card>
            <SectionHeader
              title="Parameter Scores"
              description="Score breakdown from the latest evaluation."
              action={
                sportBreakdown.length > 1 ? (
                  <select
                    value={activeSport?.sportId || ""}
                    onChange={(event) => setSelectedSportId(event.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-brand-primary"
                  >
                    {sportBreakdown.map((item) => (
                      <option key={item.sportId} value={item.sportId}>
                        {item.sportName}
                      </option>
                    ))}
                  </select>
                ) : null
              }
            />
            <div className="p-5">
              {activeSport?.latestParameters?.length ? (
                <div className="space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                        {activeSport.sportName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activeSport.latestRecognition || "Evaluated performance"} · {activeSport.evaluationsCount} sessions
                      </p>
                    </div>
                    <p className="font-display text-xl font-extrabold text-slate-900 tabular-nums">
                      {activeSport.latestScore} <span className="text-xs font-semibold text-slate-400">/ 100</span>
                    </p>
                  </div>
                  {activeSport.latestParameters.map((param, idx) => (
                    <div key={`${param.name}-${idx}`}>
                      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span>{param.name}</span>
                        <span className="tabular-nums text-slate-500">
                          {param.normalizedScore}/100 ({Number(param.weightedScore || 0).toFixed(1)} weighted)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-brand-primary transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, Number(param.normalizedScore || 0)))}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Sparkles}
                  title="No parameter scores recorded"
                  description="Parameter benchmarks appear here after a coach evaluation."
                />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-5 lg:col-span-5">
          <Card>
            <SectionHeader
              title="Achievements & Medals"
              description={`${verifiedAchievements.length} verified · ${summary.pendingAchievementsCount} pending review`}
            />
            <div className="p-5">
              {achievements.length ? (
                <div className="space-y-3">
                  {achievements.map((item) => (
                    <div
                      key={item._id}
                      className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">
                          {item.sport?.SportName || "Sport"} · {item.category}
                        </span>
                        {verificationBadge(item.verificationStatus)}
                      </div>
                      <p className="mt-2 font-bold text-slate-900">{item.title}</p>
                      {item.eventName ? (
                        <p className="mt-0.5 text-xs text-slate-600">
                          {item.eventName}
                          {item.rank ? ` (${item.rank})` : ""}
                        </p>
                      ) : null}
                      <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                        <span>{formatDate(item.achievementDate)}</span>
                        {item.verifiedBy?.Name ? (
                          <span className="font-semibold text-slate-600">
                            Verified by {item.verifiedBy.Name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Trophy}
                  title="No achievements logged"
                  description="Medals, championships, and personal records submitted for verification appear here."
                />
              )}
            </div>
          </Card>

          <Card>
            <SectionHeader title="Evaluation History" description="Scores and coach feedback." />
            <div className="divide-y divide-slate-100">
              {evaluations.length ? (
                evaluations.slice(0, 5).map((ev) => (
                  <div key={ev._id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{ev.sport?.SportName || "Sport"}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(ev.evaluationDate)} · Coach {ev.coach?.Name || "SAG Staff"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-lg font-extrabold text-brand-primary tabular-nums">
                          {ev.totalScore}
                        </span>
                        <span className="text-xs font-semibold text-slate-400"> / 100</span>
                        {ev.recognition?.label ? (
                          <div className="mt-0.5">
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                              {ev.recognition.label}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {ev.remarks ? (
                      <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        “{ev.remarks}”
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="p-5">
                  <EmptyState
                    icon={Award}
                    title="No evaluations yet"
                    description="Coach ratings and written feedback will display here."
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AthletePortfolioView({ athleteId = "", embedded = false }) {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isSelf = !athleteId;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = athleteId ? `/api/athlete-portfolio/${athleteId}` : "/api/athlete/portfolio";
      const response = await api.get(endpoint);
      setPortfolio(response.data);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [athleteId]);

  useEffect(() => {
    load();
  }, [load]);

  const content = loading ? (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
      <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
      <p className="mt-3 text-sm font-semibold text-slate-500">Loading athlete portfolio...</p>
    </div>
  ) : error ? (
    <Card>
      <ErrorState message={error.message || "Could not load athlete portfolio."} onRetry={load} />
    </Card>
  ) : portfolio ? (
    <PortfolioBody portfolio={portfolio} isSelf={isSelf} onRefresh={load} />
  ) : null;

  if (embedded) return content;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen & Athlete Account"
        title="Athlete Portfolio"
        description="Unified sports record combining statewide ranking, evaluation parameter mastery, and verified achievements."
      />
      {content}
    </PageShell>
  );
}

export function AthletePortfolioModal({ athleteId, onClose }) {
  useEffect(() => {
    if (!athleteId) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [athleteId, onClose]);

  if (!athleteId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-3 backdrop-blur-xs sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Athlete Portfolio"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
              Sports Authority of Gujarat · Official Record
            </p>
            <h2 className="font-display text-lg font-extrabold text-slate-900">Athlete Portfolio</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close portfolio"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <AthletePortfolioView athleteId={athleteId} embedded />
        </div>
      </div>
    </div>
  );
}
