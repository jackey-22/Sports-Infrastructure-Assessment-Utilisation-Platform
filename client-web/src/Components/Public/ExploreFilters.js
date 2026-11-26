import React, { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import {
  FACILITY_TYPE_OPTIONS,
  PRIMARY_SPORTS,
  countByFacilityType,
} from "./exploreUtils";

const SPORT_ICONS = {
  Cricket: "🏏",
  Football: "⚽",
  Basketball: "🏀",
  Badminton: "🏸",
  "Athletics & Track": "🏃",
  Swimming: "🏊",
};

const AMENITY_FILTER_OPTIONS = [
  { key: "floodlights", label: "Floodlights" },
  { key: "divyangjanFriendly", label: "Divyangjan Friendly" },
  { key: "changingRooms", label: "Changing Rooms" },
  { key: "drinkingWater", label: "Drinking Water" },
  { key: "parking", label: "Parking" },
  { key: "firstAid", label: "First Aid" },
  { key: "gym", label: "Gym" },
];

export default function ExploreFilters({
  selectedDistrict,
  onDistrictChange,
  selectedSports,
  onToggleSport,
  onClearSports,
  selectedTypes,
  onToggleType,
  selectedPurpose = "",
  onPurposeChange = () => {},
  selectedAudience = "",
  onAudienceChange = () => {},
  maxPrice = "",
  onMaxPriceChange = () => {},
  selectedAmenities = [],
  onToggleAmenity = () => {},
  subscriptionOnly = false,
  onToggleSubscriptionOnly = () => {},
  minRatingOnly = false,
  onToggleMinRatingOnly = () => {},
  gradeAOnly = false,
  onToggleGradeAOnly = () => {},
  onClearAll,
  typeCountFacilities = [],
  variant = "sidebar",
  onClose,
  districtOptions = [],
  sportOptions = [],
}) {
  const [moreOpen, setMoreOpen] = useState(true);
  const typeCounts = countByFacilityType(typeCountFacilities);
  const availableFacilityTypes = FACILITY_TYPE_OPTIONS.filter((type) => typeCounts[type] > 0);
  const visibleSports = [...new Set(sportOptions)].sort((a, b) => {
    const aPrimary = PRIMARY_SPORTS.includes(a) ? 0 : 1;
    const bPrimary = PRIMARY_SPORTS.includes(b) ? 0 : 1;
    return aPrimary - bPrimary || a.localeCompare(b);
  });

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
          {districtOptions.map((d) => (
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
          {visibleSports.map((sport) => {
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

      {/* Advance filters */}
      <button
        type="button"
        onClick={() => setMoreOpen((o) => !o)}
        className="w-full flex items-center justify-between text-xs font-bold text-slate-600 py-2 border-t border-slate-100"
      >
        Advance filters
        <ChevronDown className={`w-4 h-4 transition ${moreOpen ? "rotate-180" : ""}`} />
      </button>

      {moreOpen && (
        <div className="pt-3 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Session purpose</label>
            <select
              value={selectedPurpose}
              onChange={(e) => onPurposeChange(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium"
            >
              <option value="">All purposes</option>
              <option value="coaching">Coaching</option>
              <option value="open-play">Open play</option>
              <option value="competition">Competition</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Batch / audience</label>
            <select
              value={selectedAudience}
              onChange={(e) => onAudienceChange(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium"
            >
              <option value="">Any batch</option>
              <option value="mixed">Mixed</option>
              <option value="women">Women only</option>
              <option value="children">Children / Junior</option>
              <option value="members">Members</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5">Slot budget</label>
            <select
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium"
            >
              <option value="">Any price</option>
              <option value="150">Up to ₹150</option>
              <option value="300">Up to ₹300</option>
              <option value="500">Up to ₹500</option>
            </select>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">Plans &amp; quality</div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={subscriptionOnly} onChange={onToggleSubscriptionOnly} className="rounded border-slate-300 text-brand-primary" />
                Monthly / Yearly plans available
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={minRatingOnly} onChange={onToggleMinRatingOnly} className="rounded border-slate-300 text-brand-primary" />
                Top rated (4.0★ &amp; above)
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={gradeAOnly} onChange={onToggleGradeAOnly} className="rounded border-slate-300 text-brand-primary" />
                Excellent condition (Grade A)
              </label>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">Amenities</div>
            <div className="flex flex-wrap gap-1.5">
              {AMENITY_FILTER_OPTIONS.map((item) => {
                const active = selectedAmenities.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onToggleAmenity(item.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                      active
                        ? "bg-brand-soft text-brand-primary border-brand-primary/40"
                        : "bg-white text-slate-600 border-slate-200 hover:border-brand-primary/40"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-slate-600 mb-2">Facility type</div>
            <div className="space-y-2">
              {availableFacilityTypes.map((type) => (
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
