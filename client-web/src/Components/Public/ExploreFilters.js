import React, { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  FACILITY_TYPE_OPTIONS,
  CONDITION_OPTIONS,
  PRIMARY_SPORTS,
  countByFacilityType,
} from "./exploreUtils";
import { GUJARAT_DISTRICTS, SPORTS_LIST } from "../../data/gujaratSportsData";

const SPORT_ICONS = {
  Cricket: "🏏",
  Football: "⚽",
  Basketball: "🏀",
  Badminton: "🏸",
  "Athletics & Track": "🏃",
  Swimming: "🏊",
};

export default function ExploreFilters({
  selectedDistrict,
  onDistrictChange,
  selectedSports,
  onToggleSport,
  onClearSports,
  selectedTypes,
  onToggleType,
  selectedConditions,
  onToggleCondition,
  onClearAll,
  typeCountFacilities = [],
  variant = "sidebar",
  onClose,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const typeCounts = countByFacilityType(typeCountFacilities);
  const extraSports = SPORTS_LIST.filter(
    (s) => !PRIMARY_SPORTS.includes(s.name)
  ).map((s) => s.name);

  const shellClass =
    variant === "sheet"
      ? "bg-white rounded-t-3xl border border-slate-200 shadow-2xl p-5 max-h-[85vh] overflow-y-auto"
      : "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 h-full overflow-y-auto";

  return (
    <aside className={shellClass}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-extrabold text-brand-dark tracking-tight">Filters</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-bold text-brand-primary hover:underline"
          >
            Clear all
          </button>
          {variant === "sheet" && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              aria-label="Close filters"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* District — primary */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-slate-600 mb-1.5">District</label>
        <select
          value={selectedDistrict}
          onChange={(e) => onDistrictChange(e.target.value)}
          className="w-full py-2.5 px-3 text-sm rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary cursor-pointer"
        >
          <option value="All Districts">All Districts</option>
          {GUJARAT_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* Primary sports */}
      <div className="mb-5">
        <div className="text-xs font-bold text-slate-600 mb-2">Sport</div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onClearSports}
            className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition ${
              selectedSports.length === 0
                ? "bg-brand-primary text-white border-brand-primary"
                : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
            }`}
          >
            All
          </button>
          {PRIMARY_SPORTS.map((sport) => {
            const active = selectedSports.includes(sport);
            return (
              <button
                key={sport}
                type="button"
                onClick={() => onToggleSport(sport)}
                className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition inline-flex items-center gap-1 ${
                  active
                    ? "bg-brand-soft text-brand-primary border-brand-primary/40"
                    : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
                }`}
              >
                <span aria-hidden>{SPORT_ICONS[sport] || "🏅"}</span>
                {sport.replace(" & Track", "")}
              </button>
            );
          })}
        </div>
      </div>

      {/* Condition — primary */}
      <div className="mb-4">
        <div className="text-xs font-bold text-slate-600 mb-2">Condition</div>
        <div className="space-y-2">
          {CONDITION_OPTIONS.map((opt) => (
            <label
              key={opt.id}
              className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedConditions.includes(opt.id)}
                onChange={() => onToggleCondition(opt.id)}
                className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
              />
              <span className={`w-2 h-2 rounded-full ${opt.color}`} />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {/* More filters */}
      <button
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-600 py-2 border-t border-slate-100"
      >
        More filters
        <ChevronDown className={`w-4 h-4 transition ${moreOpen ? "rotate-180" : ""}`} />
      </button>

      {moreOpen && (
        <div className="pt-3 space-y-5">
          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">More sports</div>
            <div className="flex flex-wrap gap-1.5">
              {extraSports.map((sport) => {
                const active = selectedSports.includes(sport);
                const meta = SPORTS_LIST.find((s) => s.name === sport);
                return (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => onToggleSport(sport)}
                    className={`px-2.5 py-1.5 rounded-full text-[11px] font-bold border transition inline-flex items-center gap-1 ${
                      active
                        ? "bg-brand-soft text-brand-primary border-brand-primary/40"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
                    }`}
                  >
                    <span aria-hidden>{meta?.icon || "🏅"}</span>
                    {sport}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">Facility type</div>
            <div className="space-y-2">
              {FACILITY_TYPE_OPTIONS.map((type) => (
                <label
                  key={type}
                  className="flex items-center justify-between gap-2 text-sm text-slate-700 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => onToggleType(type)}
                      className="rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                    />
                    {type}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {typeCounts[type] || 0}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {variant === "sheet" && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:bg-brand-dark transition"
        >
          Show results
        </button>
      )}
    </aside>
  );
}
