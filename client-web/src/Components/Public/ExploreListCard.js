import React, { useEffect, useState } from "react";
import { Heart, MapPin, Star, Ticket } from "lucide-react";
import { getConditionMeta, getAverageRating } from "./exploreUtils";

const FAV_KEY = "sag_explore_favourites";

function readFavs() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function ExploreListCard({
  facility,
  selected = false,
  onSelect = () => {},
  onViewDetails = () => {},
  onBook = () => {},
  compact = false,
  cardRef,
}) {
  const [favorited, setFavorited] = useState(false);
  const [savedHint, setSavedHint] = useState(false);
  const badge = getConditionMeta(facility);
  const { avg, count } = getAverageRating(facility);
  const sports = (facility.sports || []).slice(0, 3);

  useEffect(() => {
    setFavorited(readFavs().includes(facility.id));
  }, [facility.id]);

  const toggleFav = (e) => {
    e.stopPropagation();
    const next = !favorited;
    setFavorited(next);
    const list = readFavs().filter((id) => id !== facility.id);
    if (next) list.push(facility.id);
    localStorage.setItem(FAV_KEY, JSON.stringify(list));
    if (next) {
      setSavedHint(true);
      setTimeout(() => setSavedHint(false), 1600);
    }
  };

  const openDetails = () => {
    onSelect(facility);
    onViewDetails(facility);
  };

  return (
    <article
      ref={cardRef}
      data-facility-id={facility.id}
      role="button"
      tabIndex={0}
      onClick={openDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetails();
        }
      }}
      className={`bg-white rounded-2xl border transition-all cursor-pointer group overflow-hidden flex relative ${
        compact ? "flex-col" : "flex-row"
      } ${
        selected
          ? "border-brand-primary ring-2 ring-brand-primary/20 shadow-md"
          : "border-slate-200 hover:border-brand-primary/40 hover:shadow-sm"
      }`}
    >
      {savedHint && (
        <div className="absolute top-2 right-2 z-10 text-[10px] font-bold bg-brand-dark text-white px-2 py-1 rounded-full shadow">
          Saved on this device
        </div>
      )}

      <div
        className={`relative flex-shrink-0 overflow-hidden ${
          compact ? "h-40 w-full" : "w-28 sm:w-32 h-28 sm:h-auto self-stretch min-h-[7rem]"
        }`}
      >
        <img
          src={facility.picture}
          alt={facility.name}
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          loading="lazy"
        />
        <button
          type="button"
          onClick={toggleFav}
          className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-sm"
          aria-label={favorited ? "Unfavourite" : "Favourite"}
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              favorited ? "fill-rose-500 text-rose-500" : "text-slate-500"
            }`}
          />
        </button>
      </div>

      <div className="flex-1 min-w-0 p-3.5 flex flex-col gap-1.5">
        <h3 className="font-extrabold text-brand-dark text-sm sm:text-[15px] leading-snug line-clamp-2">
          {facility.name}
        </h3>

        <div className="flex items-center gap-1 text-slate-500 text-xs font-medium">
          <MapPin className="w-3.5 h-3.5 text-brand-primary flex-shrink-0" />
          <span className="truncate">
            {facility.district}
            {facility.taluka ? `, ${facility.taluka}` : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
          {avg != null && (
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-slate-700">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {avg.toFixed(1)}
              <span className="text-slate-400 font-medium">({count})</span>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1 mt-0.5">
          {sports.map((sp) => (
            <span
              key={sp.name}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-soft text-brand-primary"
            >
              {sp.name}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(facility);
              onBook(facility);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-primary text-white text-xs font-bold hover:bg-brand-dark transition shadow-sm"
          >
            <Ticket className="w-3.5 h-3.5" />
            Book
          </button>
        </div>
      </div>
    </article>
  );
}
