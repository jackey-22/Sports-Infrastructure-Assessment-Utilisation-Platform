import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  MapPin,
  CalendarCheck,
  ClipboardCheck,
  Ticket,
  Building2,
  Map,
  Trophy,
  Users,
  ArrowRight,
  ChevronRight
} from "lucide-react";
import PublicNavbar from "./PublicNavbar";
import FacilityCard from "./FacilityCard";
import gujMapHero from "../../Assets/guj-map-hero-image.png";
import {
  GUJARAT_FACILITIES,
  GUJARAT_DISTRICTS,
  SPORTS_LIST
} from "../../data/gujaratSportsData";

const POPULAR_SPORTS = ["Cricket", "Football", "Badminton", "Athletics & Track", "Swimming"];

const FEATURES = [
  { icon: MapPin, label: "Find Facilities near you" },
  { icon: CalendarCheck, label: "Check Availability" },
  { icon: ClipboardCheck, label: "View Facility Condition" },
  { icon: Ticket, label: "Book & Utilise" }
];

export default function HomeLanding() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const carouselRef = useRef(null);

  const handleSearch = (e) => {
    e?.preventDefault?.();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    navigate(`/explore${params.toString() ? `?${params}` : ""}`);
  };

  const handleSportChip = (sportName) => {
    const short =
      sportName === "Athletics & Track" ? "Athletics & Track" : sportName;
    navigate(`/explore?sport=${encodeURIComponent(short)}`);
  };

  const scrollCarousel = (dir) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-brand-mint font-sans text-slate-800 flex flex-col">
      <PublicNavbar />

      {/* Hero */}
      <section className="relative overflow-hidden hero-landmark-silhouette">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-soft via-brand-mint to-white pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-light/60 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-brand-mint to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-20 sm:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
            <div className="animate-fade-up">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-brand-dark tracking-tight leading-[1.1]">
                Discover. Access.{" "}
                <span className="text-brand-primary">Play.</span>
              </h1>
              <p className="mt-4 text-slate-600 text-base sm:text-lg max-w-lg leading-relaxed">
                A unified platform to map, assess and utilise sports facilities across Gujarat.
              </p>

              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-3">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                    <span className="w-8 h-8 rounded-full bg-white border border-brand-light flex items-center justify-center text-brand-primary shadow-sm">
                      <Icon className="w-4 h-4" />
                    </span>
                    {label}
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleSearch}
                className="mt-8 flex items-center gap-2 bg-white rounded-full shadow-md border border-slate-100 p-1.5 pl-4 max-w-xl animate-fade-up-delay"
              >
                <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sports facilities, districts..."
                  className="flex-1 min-w-0 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                  aria-label="Search facilities"
                />
                <button
                  type="submit"
                  className="w-11 h-11 rounded-full bg-brand-primary text-white flex items-center justify-center hover:bg-brand-dark transition flex-shrink-0 shadow-sm"
                  aria-label="Search"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>

              <div className="mt-4 flex flex-wrap items-center gap-2 animate-fade-up-delay-2">
                <span className="text-xs font-semibold text-slate-500 mr-1">Popular Searches:</span>
                {POPULAR_SPORTS.map((sport) => (
                  <button
                    key={sport}
                    type="button"
                    onClick={() => handleSportChip(sport)}
                    className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-soft text-brand-primary hover:bg-brand-light transition"
                  >
                    {sport.replace(" & Track", "")}
                  </button>
                ))}
              </div>
            </div>

            {/* Gujarat map hero asset */}
            <div className="relative flex justify-center lg:justify-end animate-fade-in">
              <div className="relative w-full max-w-[640px]">
                <img
                  src={gujMapHero}
                  alt="Gujarat sports facilities map collage"
                  className="w-full h-auto drop-shadow-xl select-none pointer-events-none"
                  style={{ mixBlendMode: "screen" }}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="relative z-10 -mt-10 sm:-mt-14 px-4 sm:px-6 scroll-mt-24">
        <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-lg border border-slate-100 px-4 sm:px-8 py-6 sm:py-7 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <StatItem
            icon={Building2}
            value="12,846"
            label="Total Facilities"
          />
          <StatItem
            icon={Map}
            value={String(GUJARAT_DISTRICTS.length)}
            label="Districts Covered"
          />
          <StatItem
            icon={Trophy}
            value={`${SPORTS_LIST.length}+`}
            label="Sports Supported"
          />
          <StatItem
            icon={Users}
            value="78%"
            label="Publicly Accessible"
          />
        </div>
      </section>

      {/* Explore carousel */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-14 sm:pt-16 pb-8">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-dark tracking-tight">
              Explore Sports Facilities
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Find and access sports infrastructure across Gujarat.
            </p>
          </div>
          <Link
            to="/explore"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-bold text-brand-primary hover:text-brand-dark transition"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="relative">
          <div
            ref={carouselRef}
            className="flex gap-5 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {GUJARAT_FACILITIES.map((facility) => (
              <div key={facility.id} className="snap-start">
                <FacilityCard facility={facility} />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => scrollCarousel(1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 sm:translate-x-3 w-11 h-11 rounded-full bg-white border border-slate-200 shadow-md text-brand-primary hover:bg-brand-soft transition hidden sm:flex items-center justify-center"
            aria-label="Next facilities"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="sm:hidden mt-2">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1 text-sm font-bold text-brand-primary"
          >
            View All
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* About */}
      <section id="about" className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-16 scroll-mt-24">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm px-6 sm:px-10 py-10 sm:py-12">
          <h2 className="text-2xl font-extrabold text-brand-dark">About the Portal</h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed max-w-3xl">
            The Gujarat Sports Infrastructure Portal helps citizens, athletes, schools, and sports
            officers discover venues, review facility condition, and book utilisation slots across
            all 33 districts. Built for the Sports, Youth &amp; Cultural Activities Department and
            the Sports Authority of Gujarat (SAG) under problem statement PS000012.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-primary text-white text-sm font-bold hover:bg-brand-dark transition"
            >
              Open GIS Explorer
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-brand-primary/30 text-brand-primary text-sm font-bold hover:bg-brand-soft transition"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </section>

      <footer className="mt-auto bg-brand-soft border-t border-brand-light py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className="text-center md:text-left">
            <div className="font-extrabold text-brand-dark">
              Gujarat Sports Infrastructure Portal
            </div>
            <div className="text-slate-500 text-xs mt-1">
              Sports, Youth &amp; Cultural Activities Department • Government of Gujarat • PS000012
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-600 text-xs">
            <span>nsc-sag@gujrat.gov.in</span>
            <Link to="/login" className="font-bold text-brand-primary hover:underline">
              Staff Portal →
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
      <span className="w-11 h-11 rounded-full bg-brand-soft text-brand-primary flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      <div>
        <div className="text-xl sm:text-2xl font-extrabold text-brand-dark leading-none">{value}</div>
        <div className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-1">{label}</div>
      </div>
    </div>
  );
}
