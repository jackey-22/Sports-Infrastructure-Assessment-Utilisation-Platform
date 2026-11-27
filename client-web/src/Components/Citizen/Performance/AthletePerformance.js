import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Clock,
  Loader2,
  Medal,
  Plus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../../../API/client";
import {
  Button,
  Card,
  EmptyState,
  Field,
  KpiCard,
  PageHeader,
  PageShell,
  inputClass,
  selectClass,
} from "../Common/CitizenUI";

const CATEGORIES = [
  "Tournament Participation",
  "Gold Medal",
  "Silver Medal",
  "Bronze Medal",
  "Competition Winner",
  "Championship",
  "Personal Record",
  "Other",
];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function buildSportInference(items) {
  const latest = items[0];
  const previous = items[1] || null;
  const earliest = items[items.length - 1];
  const latestScore = Number(latest?.totalScore || 0);
  const scores = items.map((e) => Number(e.totalScore || 0));
  const avgScore = scores.reduce((sum, v) => sum + v, 0) / Math.max(1, scores.length);
  const bestScore = Math.max(...scores);

  let trendText = `Baseline score recorded on ${formatDate(latest?.evaluationDate)} (${latestScore.toFixed(1)}/100).`;
  let trendTone = "neutral";
  if (items.length >= 2 && previous) {
    const deltaLatest = Math.round((latestScore - Number(previous.totalScore || 0)) * 10) / 10;
    const deltaOverall = Math.round((latestScore - Number(earliest.totalScore || 0)) * 10) / 10;
    if (deltaLatest > 0) {
      trendTone = "up";
      trendText = `Up +${deltaLatest.toFixed(1)} pts from last session${
        items.length > 2 && deltaOverall > 0
          ? ` (+${deltaOverall.toFixed(1)} overall across ${items.length} evaluations)`
          : ""
      }. Keep building momentum!`;
    } else if (deltaLatest < 0) {
      trendTone = "down";
      trendText = `Down ${Math.abs(deltaLatest).toFixed(1)} pts vs previous evaluation (${Number(
        previous.totalScore || 0
      ).toFixed(1)} to ${latestScore.toFixed(1)}). Review focus areas below.`;
    } else {
      trendTone = "up";
      trendText = `Steady performance at ${latestScore.toFixed(1)} / 100 across your recent evaluations (avg ${avgScore.toFixed(1)}).`;
    }
  }

  const sortedDetails = [...(latest?.details || [])]
    .filter((d) => Number.isFinite(Number(d.normalizedScore)))
    .sort((a, b) => Number(b.normalizedScore) - Number(a.normalizedScore));

  const strengths = sortedDetails.filter((d) => Number(d.normalizedScore) >= 75).slice(0, 2);
  const focus = [...sortedDetails]
    .reverse()
    .filter((d) => Number(d.normalizedScore) < 85)
    .slice(0, 2);

  return {
    latest,
    avgScore,
    bestScore,
    trendText,
    trendTone,
    strengthsText: strengths.length
      ? strengths.map((d) => `${d.parameterName} (${Math.round(Number(d.normalizedScore))}%)`).join(", ")
      : sortedDetails[0]
      ? `${sortedDetails[0].parameterName} (${Math.round(Number(sortedDetails[0].normalizedScore))}%)`
      : "Evaluating core fundamentals",
    focusText: focus.length
      ? focus.map((d) => `${d.parameterName} (${Math.round(Number(d.normalizedScore))}%)`).join(", ")
      : sortedDetails.length
      ? "All skill parameters are scoring above 85%!"
      : "Complete more sessions for deeper drill insights",
  };
}

export default function AthletePerformance() {
  const [sports, setSports] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [sportKey, setSportKey] = useState("");
  const [expandedSports, setExpandedSports] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    sportId: "",
    title: "",
    description: "",
    category: CATEGORIES[0],
    eventName: "",
    achievementDate: "",
    rank: "",
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [sportResult, evaluationResult, achievementResult] = await Promise.all([
        api.get("/getSports"),
        api.get("/api/athlete/evaluations"),
        api.get("/api/athlete/achievements"),
      ]);
      setSports(sportResult.data || []);
      setEvaluations(evaluationResult.data || []);
      setAchievements(achievementResult.data || []);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Deduplicate sports dropdown for Achievement submission
  const uniqueSports = useMemo(() => {
    const seen = new Map();
    sports.forEach((sp) => {
      const key = String(sp?.SportName || "").trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, sp);
    });
    return [...seen.values()];
  }, [sports]);

  // Distinct evaluated sports for filter chips
  const filterSports = useMemo(() => {
    const byName = new Map();
    evaluations.forEach((ev) => {
      const name = String(ev.sport?.SportName || "Sport").trim();
      const key = name.toLowerCase();
      if (!byName.has(key)) byName.set(key, { key, SportName: name });
    });
    return [...byName.values()];
  }, [evaluations]);

  // Consolidate multiple evaluations of the same sport into a single Sport Performance + Inference card
  const sportGroups = useMemo(() => {
    const map = new Map();
    evaluations.forEach((ev) => {
      const name = String(ev.sport?.SportName || "Sport").trim();
      const key = name.toLowerCase();
      if (sportKey && key !== sportKey) return;
      const existing = map.get(key) || {
        key,
        sportId: String(ev.sport?._id || ev.sport || key),
        sportName: name,
        items: [],
      };
      existing.items.push(ev);
      map.set(key, existing);
    });
    return [...map.values()].map((group) => {
      group.items.sort(
        (a, b) =>
          new Date(b.evaluationDate || b.createdAt || 0) -
          new Date(a.evaluationDate || a.createdAt || 0)
      );
      return {
        ...group,
        ...buildSportInference(group.items),
      };
    });
  }, [evaluations, sportKey]);

  const overallStats = useMemo(() => {
    const scored = evaluations.filter((item) => Number.isFinite(Number(item.totalScore)));
    const avg = scored.length
      ? Math.round((scored.reduce((sum, item) => sum + Number(item.totalScore), 0) / scored.length) * 10) / 10
      : null;
    const best = scored.length
      ? scored.reduce((top, cur) => (Number(cur.totalScore) > Number(top.totalScore) ? cur : top), scored[0])
      : null;
    const distinctSports = new Set(
      evaluations.map((ev) => String(ev.sport?.SportName || ev.sport || "").trim().toLowerCase()).filter(Boolean)
    ).size;
    const verifiedAwards = achievements.filter((a) => a.verificationStatus === "Verified").length;
    return {
      avg,
      evalCount: evaluations.length,
      distinctSports,
      bestScore: best ? Number(best.totalScore) : null,
      bestSport: best?.sport?.SportName || "—",
      verifiedAwards,
      totalAwards: achievements.length,
    };
  }, [evaluations, achievements]);

  const submitAchievement = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/athlete/achievements", {
        ...form,
        sportId: form.sportId || uniqueSports[0]?._id || "",
      });
      setForm({
        sportId: form.sportId,
        title: "",
        description: "",
        category: CATEGORIES[0],
        eventName: "",
        achievementDate: "",
        rank: "",
      });
      setShowAddForm(false);
      setNotice("Achievement submitted for verification.");
      await load();
    } catch (error) {
      setNotice(error.message);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Athlete performance"
        title="Skills & Performance"
        description="Consolidated sport-wise evaluations, performance inference, session history, and verified achievements."
      />

      {notice ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
        </div>
      ) : (
        <>
          {/* Overall Performance KPI Grid (aligned with mobile app) */}
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Overall Performance"
              value={overallStats.avg == null ? "—" : `${overallStats.avg.toFixed(1)} / 100`}
              caption={
                overallStats.evalCount
                  ? `Avg across ${overallStats.evalCount} evaluation${overallStats.evalCount === 1 ? "" : "s"}`
                  : "No evaluations yet"
              }
              icon={Activity}
              tone="green"
            />
            <KpiCard
              label="Evaluations Count"
              value={String(overallStats.evalCount)}
              caption={`Across ${overallStats.distinctSports} sport${overallStats.distinctSports === 1 ? "" : "s"}`}
              icon={ClipboardCheck}
              tone="slate"
            />
            <KpiCard
              label="Best Score"
              value={overallStats.bestScore == null ? "—" : `${overallStats.bestScore.toFixed(1)} / 100`}
              caption={overallStats.bestSport}
              icon={Award}
              tone="amber"
            />
            <KpiCard
              label="Verified Awards"
              value={String(overallStats.verifiedAwards)}
              caption={`of ${overallStats.totalAwards} submitted`}
              icon={Trophy}
              tone="violet"
            />
          </div>

          {/* Sport Filter Chips */}
          {filterSports.length > 1 ? (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSportKey("")}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                  !sportKey
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                All sports
              </button>
              {filterSports.map((sp) => (
                <button
                  key={sp.key}
                  type="button"
                  onClick={() => setSportKey(sp.key)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${
                    sportKey === sp.key
                      ? "bg-emerald-700 text-white shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {sp.SportName}
                </button>
              ))}
            </div>
          ) : null}

          {/* Consolidated Sport Performance + Inference Cards */}
          {sportGroups.length ? (
            <div className="mb-8 grid gap-5 lg:grid-cols-2">
              {sportGroups.map((group) => {
                const { latest, avgScore, bestScore, trendText, trendTone, strengthsText, focusText, items } = group;
                const isExpanded = Boolean(expandedSports[group.key]);
                return (
                  <Card key={group.key} className="flex flex-col justify-between p-5 sm:p-6">
                    <div>
                      {/* Card Header */}
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-emerald-800 border border-emerald-200/70">
                              {group.sportName}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                              {items.length} evaluation{items.length === 1 ? "" : "s"}
                            </span>
                            {latest.recognition?.label ? (
                              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200/70">
                                {latest.recognition.label}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex items-baseline gap-2">
                            <h2 className="text-3xl font-extrabold text-slate-900 tabular-nums">
                              {Number(latest.totalScore || 0).toFixed(1)}
                            </h2>
                            <span className="text-sm font-bold text-slate-400">/ 100 latest</span>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            Avg <strong className="text-slate-700">{avgScore.toFixed(1)}</strong> · Best{" "}
                            <strong className="text-slate-700">{bestScore.toFixed(1)}</strong> · Last assessed{" "}
                            {formatDate(latest.evaluationDate)} · Coach {latest.coach?.Name || "—"}
                          </p>
                        </div>
                        <Award className="h-8 w-8 shrink-0 text-amber-500" />
                      </div>

                      {/* Performance Inference Box */}
                      <div className="mt-4 space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                        <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-700">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                          Performance Inference
                        </div>
                        <div
                          className={`flex items-start gap-2 text-xs font-semibold ${
                            trendTone === "up"
                              ? "text-emerald-700"
                              : trendTone === "down"
                              ? "text-rose-700"
                              : "text-slate-600"
                          }`}
                        >
                          {trendTone === "down" ? (
                            <TrendingDown className="mt-0.5 h-4 w-4 shrink-0" />
                          ) : (
                            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" />
                          )}
                          <span>{trendText}</span>
                        </div>
                        <div className="grid gap-2 pt-1 sm:grid-cols-2">
                          <div className="rounded-xl bg-white p-2.5 border border-slate-200/60">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                              Strengths
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-700">{strengthsText}</p>
                          </div>
                          <div className="rounded-xl bg-white p-2.5 border border-slate-200/60">
                            <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                              <Target className="h-3 w-3" /> Focus Areas
                            </p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-700">{focusText}</p>
                          </div>
                        </div>
                      </div>

                      {/* Latest Skill Parameter Breakdown */}
                      {latest.details?.length ? (
                        <div className="mt-4 space-y-2.5">
                          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                            Latest skill breakdown (v{latest.templateVersion})
                          </p>
                          {latest.details.map((detail) => (
                            <div key={String(detail.parameterId)}>
                              <div className="flex justify-between text-xs font-semibold text-slate-600">
                                <span>{detail.parameterName}</span>
                                <span className="tabular-nums">
                                  {Math.round(Number(detail.normalizedScore || 0))}/100 ·{" "}
                                  {Number(detail.weightedScore || 0).toFixed(2)} weighted
                                </span>
                              </div>
                              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-emerald-600 transition-all"
                                  style={{ width: `${Math.min(100, Number(detail.normalizedScore || 0))}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {latest.remarks ? (
                        <p className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
                          <span className="font-bold text-slate-700">Coach remarks: </span>
                          {latest.remarks}
                        </p>
                      ) : null}
                    </div>

                    {/* Collapsible Session History */}
                    {items.length > 1 ? (
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSports((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                          }
                          className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50/70"
                        >
                          <span>
                            {isExpanded ? "Hide" : "View"} session history ({items.length})
                          </span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {isExpanded ? (
                          <div className="mt-2 space-y-2">
                            {items.map((ev, idx) => (
                              <div
                                key={ev._id}
                                className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 px-3.5 py-2.5 text-xs"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="font-bold text-slate-800">
                                      {formatDate(ev.evaluationDate)}
                                    </span>
                                    {idx === 0 ? (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                                        Latest
                                      </span>
                                    ) : null}
                                    {ev.recognition?.label ? (
                                      <span className="text-slate-500">· {ev.recognition.label}</span>
                                    ) : null}
                                  </div>
                                  <p className="mt-0.5 text-slate-500">Coach {ev.coach?.Name || "—"}</p>
                                  {ev.remarks ? (
                                    <p className="mt-1 text-slate-600">{ev.remarks}</p>
                                  ) : null}
                                </div>
                                <span className="shrink-0 font-extrabold text-slate-900 tabular-nums">
                                  {Number(ev.totalScore || 0).toFixed(1)} / 100
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="mb-6 p-8">
              <EmptyState
                title="No evaluations yet"
                description="Published coach evaluations will appear here grouped by sport with performance trends."
              />
            </Card>
          )}

          {/* Achievements Section */}
          <div className="mb-4 mt-8 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-amber-500" />
                <h2 className="text-xl font-extrabold text-slate-900">Achievements</h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Record your sports achievements, tournament wins, and medals for verification.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setShowAddForm((v) => !v)}
              className={
                showAddForm ? "bg-slate-200 text-slate-700 hover:bg-slate-300 shadow-none border-0" : ""
              }
            >
              {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAddForm ? "Close Form" : "Submit achievement"}
            </Button>
          </div>

          {showAddForm ? (
            <Card className="mb-6 border-2 border-emerald-500/20 p-5 shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-extrabold text-slate-900">Submit an achievement</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={submitAchievement} className="grid gap-4 md:grid-cols-2">
                <Field label="Sport">
                  <select
                    required
                    className={selectClass}
                    value={form.sportId}
                    onChange={(event) => setForm({ ...form, sportId: event.target.value })}
                  >
                    <option value="">Select sport</option>
                    {uniqueSports.map((sport) => (
                      <option key={sport._id} value={sport._id}>
                        {sport.SportName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Category">
                  <select
                    className={selectClass}
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Title">
                  <input
                    required
                    placeholder="e.g. State Championship Gold Medal"
                    className={inputClass}
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                  />
                </Field>
                <Field label="Achievement date">
                  <input
                    required
                    type="date"
                    className={inputClass}
                    value={form.achievementDate}
                    onChange={(event) => setForm({ ...form, achievementDate: event.target.value })}
                  />
                </Field>
                <Field label="Event / competition">
                  <input
                    placeholder="e.g. Gujarat State Athletics Meet 2026"
                    className={inputClass}
                    value={form.eventName}
                    onChange={(event) => setForm({ ...form, eventName: event.target.value })}
                  />
                </Field>
                <Field label="Rank / position">
                  <input
                    placeholder="e.g. 1st Place / Winner"
                    className={inputClass}
                    value={form.rank}
                    onChange={(event) => setForm({ ...form, rank: event.target.value })}
                  />
                </Field>
                <Field label="Description" className="md:col-span-2">
                  <textarea
                    rows={3}
                    placeholder="Provide details about the achievement, match score, personal records, etc."
                    className={inputClass}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                  />
                </Field>
                <div className="flex items-center gap-3 md:col-span-2">
                  <Button type="submit">
                    <Plus className="h-4 w-4" />
                    Submit achievement
                  </Button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </Card>
          ) : null}

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900">Submitted achievements</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {achievements.length} recorded
              </span>
            </div>
            {achievements.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {achievements.map((item) => (
                  <div
                    key={item._id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm hover:border-slate-300"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200/60">
                          {item.sport?.SportName || "Sport"} · {item.category}
                        </span>
                        {item.verificationStatus === "Verified" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verified
                          </span>
                        ) : item.verificationStatus === "Rejected" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                            <XCircle className="h-3.5 w-3.5 text-rose-600" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                            <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending
                          </span>
                        )}
                      </div>
                      <h4 className="mt-2.5 font-bold text-slate-900">{item.title}</h4>
                      {item.eventName ? (
                        <p className="mt-0.5 text-xs font-medium text-slate-600">
                          Event: {item.eventName}
                          {item.rank ? ` (${item.rank})` : ""}
                        </p>
                      ) : null}
                      {item.description ? (
                        <p className="mt-2 text-xs text-slate-500 line-clamp-3">{item.description}</p>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-2.5 text-[11px] text-slate-400">
                      <span>
                        {item.achievementDate ? new Date(item.achievementDate).toLocaleDateString() : ""}
                      </span>
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
                title="No achievements submitted"
                description="Click '+ Submit achievement' above to record tournament wins, medals, and milestone records."
              />
            )}
          </Card>
        </>
      )}
    </PageShell>
  );
}
