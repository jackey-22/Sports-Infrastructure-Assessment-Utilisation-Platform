import React, { useMemo } from "react";
import {
  Building2,
  MapPinned,
  Trophy,
  Activity,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import {
  getConditionMeta,
  getFacilityType,
  FACILITY_TYPE_OPTIONS,
  getAverageRating,
} from "./exploreUtils";
import { GUJARAT_DISTRICTS, SPORTS_LIST } from "../../data/gujaratSportsData";

export default function ExploreInsights({ facilities = [] }) {
  const stats = useMemo(() => {
    const n = facilities.length;
    const avgUtil =
      n === 0
        ? 0
        : Math.round(
            facilities.reduce(
              (a, f) => a + (f.utilisation?.utilizationRate || 0),
              0
            ) / n
          );
    const avgFci =
      n === 0
        ? 0
        : Math.round(
            facilities.reduce((a, f) => a + (f.condition?.score || 0), 0) / n
          );
    const conditionBuckets = { Excellent: 0, Good: 0, "Needs Maintenance": 0, Critical: 0 };
    facilities.forEach((f) => {
      const label = getConditionMeta(f).label;
      if (conditionBuckets[label] != null) conditionBuckets[label] += 1;
    });
    const typeBuckets = Object.fromEntries(FACILITY_TYPE_OPTIONS.map((t) => [t, 0]));
    facilities.forEach((f) => {
      const t = getFacilityType(f);
      if (typeBuckets[t] != null) typeBuckets[t] += 1;
    });
    const districtsCovered = new Set(facilities.map((f) => f.district)).size;
    const sportsPresent = new Set(
      facilities.flatMap((f) => (f.sports || []).map((s) => s.name))
    ).size;
    const topRated = [...facilities]
      .map((f) => ({ f, rating: getAverageRating(f).avg || 0 }))
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    return {
      n,
      avgUtil,
      avgFci,
      conditionBuckets,
      typeBuckets,
      districtsCovered,
      sportsPresent,
      topRated,
    };
  }, [facilities]);

  if (facilities.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
        No facilities match the current filters. Adjust filters to see insights.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Building2} label="Facilities" value={stats.n} />
        <StatCard
          icon={MapPinned}
          label="Districts Covered"
          value={`${stats.districtsCovered} / ${GUJARAT_DISTRICTS.length}`}
        />
        <StatCard
          icon={Trophy}
          label="Sports Present"
          value={`${stats.sportsPresent} / ${SPORTS_LIST.length}`}
        />
        <StatCard icon={Activity} label="Avg. Utilisation" value={`${stats.avgUtil}%`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-extrabold text-brand-dark">Condition Mix</h3>
            <span className="ml-auto text-xs font-semibold text-slate-400">
              Avg FCI {stats.avgFci}%
            </span>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.conditionBuckets).map(([label, count]) => (
              <BarRow
                key={label}
                label={label}
                count={count}
                total={stats.n}
                color={
                  label === "Excellent"
                    ? "bg-emerald-500"
                    : label === "Good"
                    ? "bg-teal-500"
                    : label === "Needs Maintenance"
                    ? "bg-amber-400"
                    : "bg-red-500"
                }
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-brand-primary" />
            <h3 className="text-sm font-extrabold text-brand-dark">Facility Types</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(stats.typeBuckets).map(([label, count]) => (
              <BarRow
                key={label}
                label={label}
                count={count}
                total={stats.n}
                color="bg-brand-primary"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-4 h-4 text-brand-primary" />
          <h3 className="text-sm font-extrabold text-brand-dark">Top Rated (filtered set)</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {stats.topRated.map(({ f, rating }, idx) => (
            <div
              key={f.id}
              className="py-3 flex items-center justify-between gap-3 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-full bg-brand-soft text-brand-primary text-xs font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-brand-dark truncate">{f.name}</div>
                  <div className="text-xs text-slate-500">
                    {f.district} · FCI {f.condition.score}%
                  </div>
                </div>
              </div>
              <div className="font-extrabold text-brand-primary">{rating.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
      <span className="w-10 h-10 rounded-full bg-brand-soft text-brand-primary flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <div className="text-xl font-extrabold text-brand-dark leading-none">{value}</div>
        <div className="text-[11px] font-semibold text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  );
}

function BarRow({ label, count, total, color }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
        <span>{label}</span>
        <span>
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
