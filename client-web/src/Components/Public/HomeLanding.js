import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  CalendarCheck,
  Building2,
  Map,
  Trophy,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  School,
  ShieldCheck,
  Clock,
  Star,
} from "lucide-react";
import PublicNavbar from "./PublicNavbar";
import FacilityCard from "./FacilityCard";
import { applyPublicImageFallback, getPublicFacilities } from "../../services/public/publicFacilityService";
import { getAverageRating } from "./exploreUtils";

const POPULAR_SPORTS = ["Cricket", "Football", "Badminton", "Athletics & Track", "Swimming"];

const FEATURES = [
  { icon: MapPin, label: "33-District GIS Locator" },
  { icon: CalendarCheck, label: "Real-Time Slot Availability" },
  { icon: Trophy, label: "Multi-Sport Coaching & Camps" },
  { icon: ShieldCheck, label: "Verified Digital QR Pass" },
];

export default function HomeLanding() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getPublicFacilities({ signal: controller.signal, bookableOnly: true })
      .then(setFacilities)
      .catch((error) => {
        if (error.name !== "AbortError") console.error("Could not load public facilities", error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const liveDistrictCount = useMemo(
    () => new Set(facilities.map((facility) => facility.district).filter(Boolean)).size,
    [facilities]
  );

  const liveSportCount = useMemo(
    () => new Set(facilities.flatMap((facility) => (facility.sports || []).map((sport) => sport.name))).size,
    [facilities]
  );

  const featuredFacilities = useMemo(() => facilities.slice(0, 3), [facilities]);

  const handleSearch = (e) => {
    e?.preventDefault?.();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    navigate(`/explore${params.toString() ? `?${params}` : ""}`);
  };

  const handleSportChip = (sportName) => {
    navigate(`/explore?sport=${encodeURIComponent(sportName)}`);
  };

  const scrollCarousel = (dir) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      <PublicNavbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-emerald-50/70 via-white to-white">
        <div className="bg-subtle-grid pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left Copy & Search */}
            <div className="lg:col-span-6 animate-fade-up">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-brand-primary">
                <span className="h-2 w-2 rounded-full bg-brand-primary" />
                Sports Authority of Gujarat · Official Portal
              </div>

              <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.35rem] lg:leading-[1.08]">
                Discover, Book &amp; Play Across{" "}
                <span className="text-brand-primary">Gujarat.</span>
              </h1>

              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Find verified public sports complexes, check live court and coaching slots, and manage institutional tournaments across all 33 districts.
              </p>

              <form
                onSubmit={handleSearch}
                className="mt-7 flex max-w-xl items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 pl-4 shadow-sm transition focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/15"
              >
                <Search className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sports complex, district, or city..."
                  className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none"
                  aria-label="Search facilities"
                />
                <button
                  type="submit"
                  className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-dark"
                >
                  Explore
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold text-slate-500">Popular Sports:</span>
                {POPULAR_SPORTS.map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => handleSportChip(sport)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-primary/40 hover:bg-emerald-50 hover:text-brand-primary"
                  >
                    {sport.replace(" & Track", "")}
                  </button>
                ))}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 border-t border-slate-200/80 pt-6 sm:grid-cols-2">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 sm:text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-brand-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Showcase: Live Venues Panel */}
            <div className="lg:col-span-6 animate-fade-in">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-6">
                <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
                      Live State Directory
                    </p>
                    <h2 className="font-display text-lg font-extrabold text-slate-900">
                      Bookable Sports Complexes
                    </h2>
                  </div>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-brand-primary transition hover:bg-emerald-100"
                  >
                    <Map className="h-3.5 w-3.5" />
                    GIS Map
                  </Link>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((idx) => (
                      <div key={idx} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : featuredFacilities.length ? (
                  <div className="space-y-3">
                    {featuredFacilities.map((facility) => {
                      const { avg } = getAverageRating(facility);
                      return (
                        <Link
                          key={facility.id}
                          to={`/book/${facility.id}`}
                          className="group flex items-center gap-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 transition hover:border-brand-primary/40 hover:bg-white hover:shadow-sm"
                        >
                          <img
                            src={facility.picture}
                            onError={applyPublicImageFallback}
                            alt={facility.name}
                            className="h-16 w-20 shrink-0 rounded-xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-extrabold text-slate-900 group-hover:text-brand-primary">
                                {facility.name}
                              </p>
                              {avg != null ? (
                                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-amber-600">
                                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                  {avg.toFixed(1)}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="h-3 w-3 shrink-0 text-brand-primary" />
                              <span className="truncate">{facility.district}</span>
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {(facility.sports || []).slice(0, 3).map((sp, i) => (
                                <span
                                  key={i}
                                  className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200"
                                >
                                  {sp.name}
                                </span>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-primary" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
                    Open the GIS Explorer to browse available Gujarat facilities.
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs">
                  <span className="font-medium text-slate-500">
                    No sign-in required to browse schedules
                  </span>
                  <Link
                    to="/explore"
                    className="inline-flex items-center gap-1 font-bold text-brand-primary hover:underline"
                  >
                    View all venues <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Stats Band */}
      <section id="stats" className="relative z-10 -mt-10 px-4 sm:px-6 scroll-mt-24">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-md lg:grid-cols-4">
          <StatItem
            icon={Building2}
            value={loading ? "—" : String(facilities.length)}
            label="Bookable Facilities"
          />
          <StatItem
            icon={Map}
            value={loading ? "—" : String(liveDistrictCount)}
            label="Districts Live"
          />
          <StatItem
            icon={Trophy}
            value={loading ? "—" : String(liveSportCount)}
            label="Sports Supported"
          />
          <StatItem
            icon={Clock}
            value="Daily"
            label="Live Slot Reservations"
          />
        </div>
      </section>

      {/* Explore Carousel */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
              Public Access Venues
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Explore Sports Facilities
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Compare courts, sports configurations, ratings, and live availability across Gujarat.
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollCarousel(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollCarousel(1)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-label="Scroll right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Link
              to="/explore"
              className="ml-2 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-brand-primary/40 hover:text-brand-primary"
            >
              View All
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {facilities.map((facility) => (
            <div key={facility.id} className="snap-start">
              <FacilityCard facility={facility} />
            </div>
          ))}
        </div>

        <div className="mt-3 sm:hidden">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary"
          >
            View All Facilities
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Ecosystem Role Cards */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-5 md:grid-cols-3">
          <EcosystemCard
            icon={CalendarCheck}
            title="Citizens & Athletes"
            description="Browse facilities on the GIS map, book open-play or coached sessions online, track attendance, and submit achievements for verification."
            cta={{ to: "/signup", label: "Create Citizen Account" }}
          />
          <EcosystemCard
            icon={School}
            title="Schools & Institutions"
            description="Plan multi-day sports meets, inter-school tournaments, and athletic camps with multi-slot venue reservations and consolidated billing."
            cta={{ to: "/institution-signup", label: "Register Institution" }}
          />
          <EcosystemCard
            icon={ShieldCheck}
            title="SAG Staff & Coaches"
            description="Manage facility configurations, conduct condition assessments, verify athlete achievements, review grants, and scan QR entry passes."
            cta={{ to: "/login", label: "Staff Console Sign In" }}
          />
        </div>
      </section>

      {/* About */}
      <section id="about" className="mx-auto w-full max-w-7xl px-4 pb-16 pt-4 sm:px-6 scroll-mt-24">
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
                Government of Gujarat Initiative
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold text-slate-900">
                About the Gujarat Sports Infrastructure Portal
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-600 sm:text-base">
                Built for the Sports, Youth &amp; Cultural Activities Department and the Sports Authority of Gujarat (SAG), this platform unifies GIS discovery, slot scheduling, athlete performance evaluation, condition assessments, and institutional event management across all 33 districts.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                to="/explore"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-dark"
              >
                Open GIS Explorer
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Staff Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm md:flex-row">
          <div className="text-center md:text-left">
            <p className="font-display font-extrabold text-slate-900">
              Gujarat Sports Infrastructure Portal
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sports, Youth &amp; Cultural Activities Department · Sports Authority of Gujarat
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-slate-600">
            <Link to="/explore" className="hover:text-brand-primary">Explore</Link>
            <Link to="/signup" className="hover:text-brand-primary">Citizen Registration</Link>
            <Link to="/institution-signup" className="hover:text-brand-primary">Institution Events</Link>
            <Link to="/login" className="font-bold text-brand-primary hover:underline">
              Sign In &rarr;
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatItem({ icon: Icon, value, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-primary">
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <div className="text-xl font-extrabold leading-none text-slate-900 tabular-nums sm:text-2xl">
          {value}
        </div>
        <div className="mt-1 text-[11px] font-semibold text-slate-500 sm:text-xs">
          {label}
        </div>
      </div>
    </div>
  );
}

function EcosystemCard({ icon: Icon, title, description, cta }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-brand-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="mt-4 font-display text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
      <Link
        to={cta.to}
        className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-brand-primary hover:text-brand-dark"
      >
        {cta.label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
