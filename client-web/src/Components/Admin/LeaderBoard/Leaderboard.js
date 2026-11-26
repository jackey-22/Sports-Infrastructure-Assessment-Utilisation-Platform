import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Award,
  Download,
  ExternalLink,
  Medal,
  RefreshCw,
  Search,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "../../../API/client";
import { AthletePortfolioModal } from "../../Common/AthletePortfolioView";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  PageShell,
  SectionHeader,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../../Admin/Common/AdminUI";

const PODIUM_STYLES = {
  1: {
    ring: "border-amber-300 bg-gradient-to-b from-amber-50/90 to-white",
    badge: "bg-amber-400 text-slate-950",
    label: "1st Place",
  },
  2: {
    ring: "border-slate-300 bg-gradient-to-b from-slate-100/80 to-white",
    badge: "bg-slate-300 text-slate-900",
    label: "2nd Place",
  },
  3: {
    ring: "border-orange-200 bg-gradient-to-b from-orange-50/80 to-white",
    badge: "bg-orange-200 text-orange-950",
    label: "3rd Place",
  },
};

function initials(name) {
  return (
    String(name || "A")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "A"
  );
}

export default function Leaderboard() {
  const user = useSelector((state) => state.user?.user) || {};
  const canToggleScope = [2, 3, 4].includes(Number(user.Role));

  const [sports, setSports] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [sportId, setSportId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [scope, setScope] = useState("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portfolioAthleteId, setPortfolioAthleteId] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/getSports", { auth: false }).catch(() => ({ data: [] })),
      api.get("/getDistrict", { auth: false }).catch(() => ({ data: [] })),
    ]).then(([sportRes, districtRes]) => {
      setSports(sportRes.data || []);
      setDistricts(districtRes.data || []);
    });
  }, []);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (sportId) params.set("sportId", sportId);
      if (districtId) params.set("districtId", districtId);
      if (canToggleScope && scope === "my") params.set("scope", "my");
      const query = params.toString();
      const response = await api.get(`/api/leaderboard${query ? `?${query}` : ""}`);
      setRows(response.data || []);
      setSummary(response.summary || null);
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, [sportId, districtId, scope, canToggleScope]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.name,
        row.complexName,
        row.districtName,
        row.recognitionLabel,
        ...(row.sports || []).map((s) => s.name),
      ]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const topThree = useMemo(() => filteredRows.slice(0, 3), [filteredRows]);

  const exportExcel = () => {
    const sheetRows = filteredRows.map((row) => ({
      Rank: row.rank,
      Athlete: row.name,
      Complex: row.complexName,
      District: row.districtName,
      Sports: (row.sports || []).map((s) => s.name).join(", ") || "—",
      "Avg Evaluation (/100)": row.avgEvaluationScore,
      Evaluations: row.evaluationsCount,
      "Verified Achievements": row.verifiedAchievementsCount,
      "Gold Medals": row.medals?.gold || 0,
      "Silver Medals": row.medals?.silver || 0,
      "Bronze Medals": row.medals?.bronze || 0,
      "Composite Points": row.compositePoints,
    }));
    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leaderboard");
    XLSX.writeFile(workbook, "khelgujarat-leaderboard.xlsx");
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Athlete Performance Rankings"
        title="Sports Leaderboard"
        description="Live rankings calculated from published coach evaluation scores and verified athlete achievements."
        actions={
          <>
            <Button variant="secondary" onClick={loadLeaderboard} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="primary" onClick={exportExcel} disabled={!filteredRows.length}>
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-5">
          <ErrorState message={error.message || "Could not load leaderboard."} onRetry={loadLeaderboard} />
        </div>
      ) : null}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Ranked Athletes"
          value={summary?.totalAthletes ?? filteredRows.length}
          caption="Active athletes matching current filter"
          icon={Users}
          tone="blue"
        />
        <KpiCard
          label="Evaluated Athletes"
          value={summary?.evaluatedAthletes ?? 0}
          caption="With published coach scorecards"
          icon={Award}
          tone="green"
        />
        <KpiCard
          label="Average Points"
          value={summary?.avgPoints ?? 0}
          caption="Composite score + achievement bonus"
          icon={Sparkles}
          tone="amber"
        />
        <KpiCard
          label="Verified Awards"
          value={summary?.totalVerifiedAwards ?? 0}
          caption="Verified medals & titles counted"
          icon={Trophy}
          tone="violet"
        />
      </div>

      {!loading && topThree.length ? (
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          {topThree.map((athlete, idx) => {
            const position = idx + 1;
            const style = PODIUM_STYLES[position];
            return (
              <Card key={athlete.athleteId} className={`border p-5 ${style.ring}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${style.badge}`}>
                    <Medal className="h-3.5 w-3.5" />
                    #{athlete.rank} · {style.label}
                  </span>
                  <span className="font-display text-2xl font-extrabold text-slate-900 tabular-nums">
                    {athlete.compositePoints}
                    <span className="ml-1 text-xs font-semibold text-slate-500">pts</span>
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary font-display text-sm font-extrabold text-white">
                    {initials(athlete.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display text-base font-extrabold text-slate-900">
                        {athlete.name}
                      </p>
                      {athlete.isMe ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          You
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-slate-500">
                      {athlete.complexName} · {athlete.districtName}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-200/70 bg-white/80 p-3 text-center">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Eval Avg</p>
                    <p className="mt-0.5 text-sm font-extrabold text-slate-800 tabular-nums">
                      {athlete.avgEvaluationScore}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Awards</p>
                    <p className="mt-0.5 text-sm font-extrabold text-slate-800 tabular-nums">
                      {athlete.verifiedAchievementsCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gold/S/B</p>
                    <p className="mt-0.5 text-xs font-bold text-slate-700 tabular-nums">
                      {athlete.medals?.gold || 0}/{athlete.medals?.silver || 0}/{athlete.medals?.bronze || 0}
                    </p>
                  </div>
                </div>

                {athlete.canViewPortfolio ? (
                  <button
                    type="button"
                    onClick={() => setPortfolioAthleteId(athlete.athleteId)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-primary hover:text-brand-primary"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Athlete Portfolio
                  </button>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : null}

      <Card>
        <SectionHeader
          title="Athlete Rankings Directory"
          description="Filter by sport, district, or search athlete name and sports complex."
          action={
            canToggleScope ? (
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    scope === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Statewide
                </button>
                <button
                  type="button"
                  onClick={() => setScope("my")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    scope === "my" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {Number(user.Role) === 4 ? "My District" : "My Facility"}
                </button>
              </div>
            ) : null
          }
        />

        <div className="grid gap-3 border-b border-slate-100 bg-slate-50/50 p-4 sm:grid-cols-3">
          <div>
            <label htmlFor="lb-sport" className="mb-1 block text-xs font-bold text-slate-600">
              Sport
            </label>
            <select
              id="lb-sport"
              className={selectClass}
              value={sportId}
              onChange={(event) => setSportId(event.target.value)}
            >
              <option value="">All Sports</option>
              {sports.map((sport) => (
                <option key={sport._id} value={sport._id}>
                  {sport.SportName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lb-district" className="mb-1 block text-xs font-bold text-slate-600">
              District
            </label>
            <select
              id="lb-district"
              className={selectClass}
              value={districtId}
              onChange={(event) => setDistrictId(event.target.value)}
            >
              <option value="">All Gujarat Districts</option>
              {districts.map((dist) => (
                <option key={dist._id} value={dist._id}>
                  {dist.District}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="lb-search" className="mb-1 block text-xs font-bold text-slate-600">
              Search
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="lb-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Athlete, complex, sport..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : filteredRows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Rank</th>
                  <th className="px-5 py-3.5">Athlete</th>
                  <th className="px-5 py-3.5">Facility &amp; District</th>
                  <th className="px-5 py-3.5">Sports</th>
                  <th className="px-5 py-3.5 text-right">Eval Score</th>
                  <th className="px-5 py-3.5 text-right">Verified Medals</th>
                  <th className="px-5 py-3.5 text-right">Points</th>
                  <th className="px-5 py-3.5 text-right">Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr
                    key={row.athleteId}
                    className={`transition hover:bg-slate-50/90 ${row.isMe ? "bg-emerald-50/40" : ""}`}
                  >
                    <td className="px-5 py-3.5 font-display font-extrabold text-slate-800 tabular-nums">
                      <span
                        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-2 text-xs ${
                          row.rank === 1
                            ? "bg-amber-100 text-amber-800"
                            : row.rank === 2
                              ? "bg-slate-200 text-slate-800"
                              : row.rank === 3
                                ? "bg-orange-100 text-orange-800"
                                : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        #{row.rank}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-display text-xs font-extrabold text-brand-primary ring-1 ring-emerald-200/70">
                          {initials(row.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-900">{row.name}</p>
                            {row.isMe ? (
                              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                You
                              </span>
                            ) : null}
                          </div>
                          {row.recognitionLabel ? (
                            <p className="text-xs text-slate-500">{row.recognitionLabel}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{row.complexName}</p>
                      <p className="text-xs text-slate-500">{row.districtName}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {row.sports?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {row.sports.slice(0, 2).map((s) => (
                            <span
                              key={s.id}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                            >
                              {s.name}
                            </span>
                          ))}
                          {row.sports.length > 2 ? (
                            <span className="text-[11px] font-semibold text-slate-400">
                              +{row.sports.length - 2}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span className="font-bold text-slate-900">{row.avgEvaluationScore}</span>
                      <span className="text-xs text-slate-400"> / 100</span>
                      <p className="text-[11px] text-slate-400">{row.evaluationsCount} evals</p>
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      <span className="font-bold text-slate-800">{row.verifiedAchievementsCount}</span>
                      <p className="text-[11px] text-slate-400">
                        {row.medals?.gold || 0}G · {row.medals?.silver || 0}S · {row.medals?.bronze || 0}B
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-display text-base font-extrabold text-brand-primary tabular-nums">
                        {row.compositePoints}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {row.canViewPortfolio ? (
                        <button
                          type="button"
                          onClick={() => setPortfolioAthleteId(row.athleteId)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-primary hover:text-brand-primary"
                        >
                          View
                        </button>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Restricted</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No ranked athletes match this filter"
            description="Adjust the sport, district, or scope filter to inspect statewide or facility athlete rankings."
          />
        )}
      </Card>

      <AthletePortfolioModal
        athleteId={portfolioAthleteId}
        onClose={() => setPortfolioAthleteId("")}
      />
    </PageShell>
  );
}
