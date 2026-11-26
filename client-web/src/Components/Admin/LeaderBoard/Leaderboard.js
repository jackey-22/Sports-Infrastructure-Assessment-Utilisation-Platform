import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Download, RefreshCw, Search, Trophy } from "lucide-react";
import * as XLSX from "xlsx";
import { api } from "../../../API/client";
import { AthletePortfolioModal } from "../../Common/AthletePortfolioView";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../../Admin/Common/AdminUI";

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

function rankBadge(rank) {
  if (rank === 1) return "border-amber-300 bg-amber-50 text-amber-800";
  if (rank === 2) return "border-slate-300 bg-slate-100 text-slate-800";
  if (rank === 3) return "border-orange-200 bg-orange-50 text-orange-800";
  return "border-slate-200 bg-white text-slate-600";
}

export default function Leaderboard() {
  const user = useSelector((state) => state.user?.user) || {};
  const canToggleScope = [2, 3].includes(Number(user.Role));

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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Top Athletes");
    XLSX.writeFile(workbook, "khelgujarat-top-athletes.xlsx");
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sports Authority of Gujarat · Talent Selection"
        title="Top Athletes &amp; Talent Selection"
        description="Identify top-performing athletes by sport and district for coaching support, scholarships, and higher-level team selection — ranked by coach evaluations and verified achievements."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={loadLeaderboard} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={exportExcel} disabled={!filteredRows.length}>
              <Download className="h-3.5 w-3.5" />
              Export Excel
            </Button>
          </>
        }
      />

      {error ? (
        <div className="mb-5">
          <ErrorState message={error.message || "Could not load top athletes list."} onRetry={loadLeaderboard} />
        </div>
      ) : null}

      <Card className="mb-5 overflow-hidden">
        <div className="grid grid-cols-2 divide-y divide-slate-200/80 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <StatCell label="Shortlisted Athletes" value={summary?.totalAthletes ?? filteredRows.length} />
          <StatCell label="Evaluated Athletes" value={summary?.evaluatedAthletes ?? 0} />
          <StatCell label="Average Points" value={`${summary?.avgPoints ?? 0} pts`} />
          <StatCell label="Verified Awards" value={summary?.totalVerifiedAwards ?? 0} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200/80 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="grid flex-1 gap-2.5 sm:grid-cols-3">
            <select
              aria-label="Filter by sport"
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

            <select
              aria-label="Filter by district"
              className={selectClass}
              value={districtId}
              onChange={(event) => setDistrictId(event.target.value)}
            >
              <option value="">All Districts</option>
              {districts.map((dist) => (
                <option key={dist._id} value={dist._id}>
                  {dist.District}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search top athletes"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search athlete, complex, sport..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {canToggleScope ? (
            <div className="inline-flex shrink-0 self-start rounded-xl border border-slate-200 bg-white p-1 lg:self-auto">
              <button
                type="button"
                onClick={() => setScope("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  scope === "all" ? "bg-brand-primary text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Statewide
              </button>
              <button
                type="button"
                onClick={() => setScope("my")}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  scope === "my" ? "bg-brand-primary text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Complex
              </button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <TableSkeleton rows={6} columns={7} />
        ) : filteredRows.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-white text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="w-20 px-5 py-3.5">Rank</th>
                    <th className="px-5 py-3.5">Athlete</th>
                    <th className="px-5 py-3.5">Complex &amp; District</th>
                    <th className="px-5 py-3.5">Sport</th>
                    <th className="px-5 py-3.5 text-right">Eval Score</th>
                    <th className="px-5 py-3.5 text-right">Awards</th>
                    <th className="px-5 py-3.5 text-right">Total Points</th>
                    <th className="px-5 py-3.5 text-right">Portfolio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredRows.map((row) => {
                    const medalParts = [];
                    if (row.medals?.gold) medalParts.push(`${row.medals.gold}G`);
                    if (row.medals?.silver) medalParts.push(`${row.medals.silver}S`);
                    if (row.medals?.bronze) medalParts.push(`${row.medals.bronze}B`);

                    return (
                      <tr
                        key={row.athleteId}
                        className={`transition hover:bg-slate-50 ${row.isMe ? "bg-emerald-50/40" : ""}`}
                      >
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex h-7 min-w-8 items-center justify-center rounded-lg border px-2 font-display text-xs font-extrabold tabular-nums ${rankBadge(
                              row.rank
                            )}`}
                          >
                            {row.rank}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-display text-xs font-extrabold text-slate-700">
                              {initials(row.name)}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-semibold text-slate-900">{row.name}</span>
                                {row.isMe ? (
                                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                    YOU
                                  </span>
                                ) : null}
                              </div>
                              {row.recognitionLabel ? (
                                <p className="text-[11px] font-medium text-emerald-700">
                                  {row.recognitionLabel}
                                </p>
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
                            <span className="text-xs font-semibold text-slate-700">
                              {row.sports.map((s) => s.name).join(", ")}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          <span className="font-bold text-slate-900">{row.avgEvaluationScore}</span>
                          <span className="text-xs text-slate-400"> / 100</span>
                          <p className="text-[11px] text-slate-400">
                            {row.evaluationsCount} {row.evaluationsCount === 1 ? "session" : "sessions"}
                          </p>
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          {row.verifiedAchievementsCount ? (
                            <div>
                              <span className="font-bold text-slate-800">{row.verifiedAchievementsCount}</span>
                              {medalParts.length ? (
                                <p className="text-[11px] font-semibold text-amber-700">{medalParts.join(" · ")}</p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <span className="font-display text-sm font-extrabold text-brand-primary tabular-nums">
                            {row.compositePoints}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {row.canViewPortfolio ? (
                            <button
                              type="button"
                              onClick={() => setPortfolioAthleteId(row.athleteId)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-primary hover:text-brand-primary"
                            >
                              Portfolio
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-[11px] text-slate-500">
              <span>Showing {filteredRows.length} shortlisted athletes with evaluations or verified awards.</span>
              <span>Points = Average Score (0–100) + Verified Achievement Points.</span>
            </div>
          </>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No top athletes match this filter"
            description="Athletes appear here for selection and support once a coach submits a session evaluation or an achievement is verified."
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

function StatCell({ label, value }) {
  return (
    <div className="px-5 py-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-display text-xl font-extrabold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}
