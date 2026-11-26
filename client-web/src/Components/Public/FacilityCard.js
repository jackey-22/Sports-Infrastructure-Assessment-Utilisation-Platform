import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, ArrowRight } from "lucide-react";
import { getAverageRating, getFacilityType } from "./exploreUtils";
import { applyPublicImageFallback } from "../../services/public/publicFacilityService";

export { getAverageRating };

export default function FacilityCard({ facility, className = "" }) {
  const { avg, count } = getAverageRating(facility);
  const sports = (facility.sports || []).slice(0, 2);
  const extraCount = Math.max(0, (facility.sports || []).length - 2);
  const typeLabel = getFacilityType(facility);

  return (
    <article
      className={`group flex h-[380px] w-[285px] shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-brand-primary/40 hover:shadow-md sm:w-[305px] ${className}`}
    >
      <div className="relative h-44 shrink-0 overflow-hidden bg-slate-100">
        <img
          src={facility.picture}
          onError={applyPublicImageFallback}
          alt={facility.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <span className="absolute left-3 top-3 rounded-lg bg-slate-900/75 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
          {typeLabel}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-display text-base font-extrabold leading-snug text-slate-900">
          {facility.name}
        </h3>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
          <span className="truncate">{facility.district}</span>
        </div>

        <div className="mt-1 flex flex-wrap gap-1.5">
          {sports.map((sp, idx) => (
            <span
              key={idx}
              className="rounded-lg border border-emerald-200/70 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-brand-primary"
            >
              {sp.name}
            </span>
          ))}
          {extraCount > 0 ? (
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              +{extraCount} more
            </span>
          ) : null}
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
            {avg != null ? (
              <>
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span className="tabular-nums">{avg.toFixed(1)}</span>
                <span className="text-xs font-medium text-slate-400">({count})</span>
              </>
            ) : (
              <span className="text-xs font-medium text-slate-400">Newly listed</span>
            )}
          </div>
          <Link
            to={`/book/${facility.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-dark"
          >
            Book Slot
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
