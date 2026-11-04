import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, Star, ArrowRight } from "lucide-react";
import { getConditionMeta, getAverageRating } from "./exploreUtils";

export function getConditionBadge(facility) {
  return getConditionMeta(facility);
}

export { getAverageRating };

export default function FacilityCard({ facility, className = "" }) {
  const [favorited, setFavorited] = useState(false);
  const badge = getConditionMeta(facility);
  const { avg, count } = getAverageRating(facility);
  const sports = (facility.sports || []).slice(0, 2);

  return (
    <article
      className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col w-[280px] sm:w-[300px] h-[380px] flex-shrink-0 group hover:shadow-md transition ${className}`}
    >
      <div className="relative h-44 flex-shrink-0 overflow-hidden">
        <img
          src={facility.picture}
          alt={facility.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          loading="lazy"
        />
        <button
          type="button"
          onClick={() => setFavorited((f) => !f)}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition"
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`w-4 h-4 ${favorited ? "fill-rose-500 text-rose-500" : "text-slate-500"}`}
          />
        </button>
        <span
          className={`absolute top-3 right-3 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="p-4 flex min-h-0 flex-1 flex-col gap-2">
        <h3 className="font-extrabold text-brand-dark text-base leading-snug line-clamp-2">
          {facility.name}
        </h3>
        <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
          <MapPin className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
          <span className="truncate">{facility.district}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {sports.map((sp, idx) => (
            <span
              key={idx}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-brand-primary"
            >
              {sp.name}
            </span>
          ))}
        </div>
        <div className="mt-auto pt-3 flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
            {avg != null ? (
              <>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>{avg.toFixed(1)}</span>
                <span className="text-slate-400 font-medium text-xs">({count})</span>
              </>
            ) : (
              <span className="text-slate-400 text-xs font-medium">No ratings</span>
            )}
          </div>
          <Link
            to={`/explore?q=${encodeURIComponent(facility.name)}`}
            className="w-9 h-9 rounded-full bg-brand-primary text-white flex items-center justify-center hover:bg-brand-dark transition shadow-sm"
            aria-label={`View ${facility.name}`}
          >
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
