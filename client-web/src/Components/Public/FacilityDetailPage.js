import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import PublicNavbar from "./PublicNavbar";
import CitizenRatingDialog from "../Citizen/Ratings/CitizenRatingDialog";
import {
  applyPublicImageFallback,
  getPublicFacilities,
} from "../../services/public/publicFacilityService";
import { getAverageRating, getFacilityType } from "./exploreUtils";

const AMENITY_LABELS = {
  floodlights: "Floodlights",
  drinkingWater: "Drinking Water",
  changingRooms: "Changing Rooms",
  firstAid: "First Aid",
  parking: "Parking",
  gym: "Fitness Gym",
  divyangjanFriendly: "Divyangjan Friendly",
  canteen: "Canteen",
};

export default function FacilityDetailPage({ embedded = false }) {
  const { facilityId } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state) => state.user?.user);

  const [facility, setFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoCategory, setPhotoCategory] = useState("all");
  const [photoIndex, setPhotoIndex] = useState(0);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [toast, setToast] = useState("");

  const backPath =
    user?.Role === 7
      ? "/institute/explore"
      : user?.Role === 0 || embedded
        ? "/citizen/explore"
        : "/explore";

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const rows = await getPublicFacilities({ signal });
      const found = rows.find((item) => String(item.id) === String(facilityId));
      if (!found) throw new Error("Facility not found or no longer active.");
      setFacility(found);
      setPhotoIndex(0);
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const photos = useMemo(() => {
    if (!facility) return [];
    const seen = new Set();
    const list = [];
    const push = (url, label, category) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      list.push({ url, label, category });
    };
    push(facility.picture, "Main Venue", "facility");
    (facility.gallery || []).forEach((url, i) =>
      push(url, `Facility Photo ${i + 1}`, "facility")
    );
    (facility.sports || []).forEach((sp) => {
      const imgs = sp.images?.length ? sp.images : sp.image ? [sp.image] : [];
      imgs.forEach((url, idx) =>
        push(url, `${sp.name} · Photo ${idx + 1}`, "sports")
      );
    });
    (facility.conditionPhotos || []).forEach((cp, idx) =>
      push(
        cp.url,
        `Condition · ${cp.sportName || "Assessment"}${cp.score != null ? ` (${cp.score}/100)` : ""} #${idx + 1}`,
        "condition"
      )
    );
    return list;
  }, [facility]);

  const visiblePhotos = useMemo(() => {
    if (photoCategory === "all") return photos;
    return photos.filter((p) => p.category === photoCategory);
  }, [photos, photoCategory]);

  useEffect(() => {
    setPhotoIndex(0);
  }, [photoCategory]);

  const activePhoto = visiblePhotos[photoIndex] || visiblePhotos[0] || null;
  const { avg, count } = facility ? getAverageRating(facility) : { avg: null, count: 0 };

  const openBooking = () => {
    if (!facility?.bookingAvailable) {
      setToast("Online booking slots are not configured for this facility yet.");
      return;
    }
    navigate(
      user?.Role === 7
        ? `/institute/new?facilityId=${facility.id}`
        : user?.Role === 0 || embedded
          ? `/citizen/book/${facility.id}`
          : `/book/${facility.id}`
    );
  };

  const openRating = () => {
    if (!window.localStorage.getItem("token")) {
      navigate("/login");
      return;
    }
    setRatingOpen(true);
  };

  return (
    <div className={embedded ? "w-full font-sans text-slate-800" : "min-h-screen bg-[#F7FBF8] font-sans text-slate-800"}>
      {!embedded && <PublicNavbar />}

      <main className="mx-auto max-w-[1380px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-2xs transition hover:border-brand-primary hover:text-brand-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Explore
          </button>
          {facility ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openRating}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100"
              >
                <Star className="h-4 w-4 fill-current" />
                Rate facility, sport or coach
              </button>
              <button
                type="button"
                onClick={openBooking}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-brand-dark"
              >
                <Ticket className="h-4 w-4" />
                {user?.Role === 7 ? "Plan institution event" : "Book slot / plan"}
              </button>
            </div>
          ) : null}
        </div>

        {toast ? (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
            {toast}
          </div>
        ) : null}

        {loading ? (
          <div className="flex justify-center rounded-3xl border border-slate-200 bg-white py-24">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-bold text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => load()}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
            >
              Retry
            </button>
          </div>
        ) : facility ? (
          <div className="space-y-6">
            {/* Multi-Photo Gallery & Venue Header */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="relative h-72 sm:h-96 bg-slate-100">
                  {activePhoto ? (
                    <img
                      src={activePhoto.url}
                      onError={applyPublicImageFallback}
                      alt={activePhoto.label}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  {visiblePhotos.length > 1 ? (
                    <>
                      <button
                        type="button"
                        aria-label="Previous photo"
                        onClick={() =>
                          setPhotoIndex((i) => (i + visiblePhotos.length - 1) % visiblePhotos.length)
                        }
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next photo"
                        onClick={() => setPhotoIndex((i) => (i + 1) % visiblePhotos.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  ) : null}
                  {activePhoto ? (
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-black/65 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                        {activePhoto.label}
                      </span>
                      <span className="rounded-full bg-black/65 px-3 py-1 text-xs font-bold text-white">
                        {photoIndex + 1} / {visiblePhotos.length}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-slate-100 p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {[
                      { id: "all", label: `All (${photos.length})` },
                      { id: "facility", label: `Facility (${photos.filter((p) => p.category === "facility").length})` },
                      { id: "sports", label: `Sports (${photos.filter((p) => p.category === "sports").length})` },
                      { id: "condition", label: `Condition (${photos.filter((p) => p.category === "condition").length})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPhotoCategory(tab.id)}
                        className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                          photoCategory === tab.id
                            ? "bg-brand-primary text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {visiblePhotos.length ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {visiblePhotos.map((item, idx) => (
                        <button
                          key={`${item.url}-${idx}`}
                          type="button"
                          onClick={() => setPhotoIndex(idx)}
                          className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                            idx === photoIndex ? "border-brand-primary ring-2 ring-brand-primary/20" : "border-slate-200 opacity-75 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={item.url}
                            onError={applyPublicImageFallback}
                            alt={item.label}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">No photos in this category yet.</p>
                  )}
                </div>
              </div>

              {/* Venue Overview & Condition */}
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-brand-primary">
                      {getFacilityType(facility)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                      <Star className={`h-3.5 w-3.5 ${avg != null ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                      {avg != null ? `${avg.toFixed(1)} (${count})` : "No ratings yet"}
                    </span>
                  </div>

                  <h1 className="mt-3 font-display text-2xl font-extrabold text-brand-dark sm:text-3xl">
                    {facility.name}
                  </h1>
                  <p className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                    <span>
                      {facility.location} · {facility.district}
                      {facility.taluka ? ` (${facility.taluka})` : ""}
                    </span>
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
                    <InfoChip icon={Clock} label="Timings" value={`${facility.timings?.openingTime || "06:00 AM"} – ${facility.timings?.closingTime || "09:00 PM"}`} />
                    <InfoChip icon={Users} label="Capacity / Busy" value={`${facility.utilisation?.utilizationRate || 0}% full`} />
                    <InfoChip icon={Phone} label="Phone" value={facility.contactPhone || "Not specified"} />
                    <InfoChip icon={Mail} label="Email" value={facility.contactEmail || "Not specified"} />
                    <InfoChip icon={Users} label="Manager" value={facility.contactPerson || "Not specified"} />
                    <InfoChip icon={CalendarDays} label="Since" value={facility.operationalSince || "Not specified"} />
                  </div>
                </div>

                {/* Condition Inspection Card */}
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                        Assessed Facility Condition
                      </p>
                      <p className="mt-1 text-lg font-extrabold text-slate-900">
                        {facility.condition?.score == null
                          ? "Assessment pending"
                          : `${facility.condition.grade} · ${facility.condition.score}/100`}
                      </p>
                    </div>
                    <Activity className="h-6 w-6 text-emerald-700" />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700">
                    {facility.condition?.notes || "No submitted condition assessment yet."}
                  </p>
                  {facility.condition?.score != null ? (
                    <>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                        <div
                          className="h-full rounded-full bg-emerald-600"
                          style={{ width: `${Math.min(100, Math.max(0, facility.condition.score))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-[11px] font-medium text-slate-600">
                        Assessed across {facility.condition.assessedSports} of {facility.condition.totalSports} sports ·{" "}
                        {facility.condition.lastInspectionDate || "Date not recorded"}
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Amenities */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-extrabold text-brand-dark">Amenities &amp; Infrastructure</h2>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {Object.entries(AMENITY_LABELS).map(([key, label]) => {
                  const available = Boolean(facility.amenities?.[key]);
                  return (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                        available
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-slate-50 text-slate-400 line-through"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {label}
                    </span>
                  );
                })}
              </div>
            </section>

            {/* Configured Sports & Subscription Plans */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-extrabold text-brand-dark">
                    Available Sports, Pricing &amp; Subscription Plans
                  </h2>
                  <p className="text-xs text-slate-500">
                    Slot rates, bulk session bookings, and facility-configured monthly/yearly passes.
                  </p>
                </div>
                {facility.hasSubscriptions ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    Monthly / Yearly Plans Available
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {(facility.sports || []).map((sp) => (
                  <div
                    key={sp.id || sp.name}
                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <div className="flex gap-4">
                      {sp.image ? (
                        <img
                          src={sp.image}
                          onError={applyPublicImageFallback}
                          alt={sp.name}
                          className="h-20 w-24 shrink-0 rounded-xl object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">{sp.name}</h3>
                            <p className="text-xs text-slate-500">
                              {sp.category} · {sp.type} · {sp.courts || 0} {sp.unitLabel || "units"}
                            </p>
                          </div>
                          {sp.feePerHour ? (
                            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-extrabold text-brand-primary shadow-2xs">
                              {sp.feePerHour}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-xs text-slate-600">{sp.surface}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold">
                          {sp.condition ? (
                            <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-emerald-800">
                              Condition: {sp.condition.score}/100
                            </span>
                          ) : null}
                          {typeof sp.rating === "number" ? (
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-amber-800">
                              ★ {sp.rating.toFixed(1)}
                            </span>
                          ) : null}
                          {(sp.purposes || []).map((purpose) => (
                            <span key={purpose} className="rounded-md bg-white px-2 py-0.5 capitalize text-slate-600 border border-slate-200">
                              {purpose}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {sp.images?.length > 1 ? (
                      <div className="mt-3 flex gap-2 overflow-x-auto">
                        {sp.images.map((imgUrl, i) => (
                          <img
                            key={`${imgUrl}-${i}`}
                            src={imgUrl}
                            alt={`${sp.name} ${i + 1}`}
                            className="h-12 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                          />
                        ))}
                      </div>
                    ) : null}

                    {sp.subscriptionPlans?.length ? (
                      <div className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
                        <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                          <ShieldCheck className="h-3.5 w-3.5" /> Subscription Passes
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sp.subscriptionPlans.map((plan) => (
                            <div
                              key={plan._id || plan.name}
                              className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs"
                            >
                              <span className="font-bold text-slate-800">{plan.name}</span>{" "}
                              <span className="font-extrabold text-emerald-700">
                                ₹{plan.price}/{plan.durationType === "yearly" ? "year" : "month"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </main>

      {facility ? (
        <CitizenRatingDialog
          open={ratingOpen}
          onClose={() => setRatingOpen(false)}
          initialFacilityId={facility.id}
          initialTarget="facility"
          onSaved={() => {
            setToast("Rating submitted successfully.");
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-0.5 truncate text-xs font-bold text-brand-dark">{value}</div>
    </div>
  );
}
