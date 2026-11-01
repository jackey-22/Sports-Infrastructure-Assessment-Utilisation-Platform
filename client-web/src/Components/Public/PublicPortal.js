import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Search,
  School,
  Mail,
  Compass,
  Sparkles,
  Lock,
  RotateCcw,
  Zap
} from "lucide-react";
import GujaratGisMap from "./GujaratGisMap";
import FacilityConditionAudit from "../Assessment/FacilityConditionAudit";
import InstitutionalBookingModal from "../Utilisation/InstitutionalBookingModal";
import CitizenBookingModal from "./CitizenBookingModal";
import {
  GUJARAT_DISTRICTS,
  SPORTS_LIST,
  GUJARAT_FACILITIES,
  DEMO_USERS
} from "../../data/gujaratSportsData";
import { useDispatch } from "react-redux";
import { UserActions } from "../../store/UserData";
import { useCookies } from "react-cookie";

export default function PublicPortal() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [, setCookies] = useCookies(["token"]);

  // State
  const [facilities, setFacilities] = useState(GUJARAT_FACILITIES);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedTag, setSelectedTag] = useState("all");
  const [viewMode, setViewMode] = useState("split"); // "split" | "map" | "grid"
  const [activeFacility, setActiveFacility] = useState(GUJARAT_FACILITIES[0]);

  // Modals
  const [auditModalFacility, setAuditModalFacility] = useState(null);
  const [institutionalModalFacility, setInstitutionalModalFacility] = useState(null);
  const [citizenBookingFacility, setCitizenBookingFacility] = useState(null);

  // Near Me state
  const [isLocating, setIsLocating] = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);

  // Filtered facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter((fac) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        fac.name.toLowerCase().includes(q) ||
        fac.district.toLowerCase().includes(q) ||
        fac.taluka.toLowerCase().includes(q) ||
        fac.location.toLowerCase().includes(q);

      const matchesDistrict =
        selectedDistrict === "All Districts" || fac.district === selectedDistrict;

      const matchesSport =
        selectedSport === "All Sports" ||
        fac.sports.some((s) => s.name.toLowerCase() === selectedSport.toLowerCase());

      const matchesCondition =
        selectedCondition === "All Conditions" ||
        fac.condition.grade.includes(selectedCondition);

      const matchesCategory =
        selectedCategory === "All Categories" ||
        fac.category === selectedCategory;

      let matchesTag = true;
      if (selectedTag === "floodlit") matchesTag = fac.amenities.floodlights;
      else if (selectedTag === "divyangjan") matchesTag = fac.amenities.divyangjanFriendly;
      else if (selectedTag === "gradeA") matchesTag = fac.condition.score >= 85;
      else if (selectedTag === "offpeak") matchesTag = fac.utilisation.offPeakDiscountAvailable;

      return (
        matchesSearch &&
        matchesDistrict &&
        matchesSport &&
        matchesCondition &&
        matchesCategory &&
        matchesTag
      );
    });
  }, [
    facilities,
    searchQuery,
    selectedDistrict,
    selectedSport,
    selectedCondition,
    selectedCategory,
    selectedTag
  ]);

  // Near Me Geo-location handler
  const handleFindNearMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        setNearMeActive(true);
        const { latitude, longitude } = pos.coords;

        const sorted = [...facilities].sort((a, b) => {
          const distA = Math.hypot(a.latitude - latitude, a.longitude - longitude);
          const distB = Math.hypot(b.latitude - latitude, b.longitude - longitude);
          return distA - distB;
        });

        setFacilities(sorted);
        if (sorted.length > 0) {
          setActiveFacility(sorted[0]);
        }
      },
      () => {
        setIsLocating(false);
        alert("Location access denied. Displaying statewide facilities.");
      }
    );
  };

  // Quick Demo Login Handler
  const handleDemoLogin = (user) => {
    const mockUser = {
      _id: "demo_" + user.roleId,
      Email: user.email,
      Name: user.name,
      Role: user.roleId,
      District: user.district,
    };
    const mockToken = "mock_jwt_token_role_" + user.roleId;

    dispatch(UserActions.getuserdata(mockUser));
    setCookies("token", mockToken, { maxAge: 86400, path: "/" });
    localStorage.setItem("token", mockToken);

    if (user.roleId === 5) navigate("/admin");
    else if (user.roleId === 4) navigate("/authority");
    else if (user.roleId === 3) navigate("/manager");
    else navigate("/");
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedDistrict("All Districts");
    setSelectedSport("All Sports");
    setSelectedCondition("All Conditions");
    setSelectedCategory("All Categories");
    setSelectedTag("all");
    setNearMeActive(false);
    setFacilities(GUJARAT_FACILITIES);
  };

  // Handle Assessment Update
  const handleSaveAudit = (facilityId, newAudit) => {
    setFacilities((prev) =>
      prev.map((f) => {
        if (f.id === facilityId) {
          return {
            ...f,
            condition: {
              ...f.condition,
              score: newAudit.score,
              grade: newAudit.grade,
              inspector: newAudit.inspector,
              lastInspectionDate: newAudit.date,
              maintenanceUrgency: newAudit.maintenanceUrgency,
              notes: newAudit.notes,
            },
          };
        }
        return f;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* 1. Official Government Header (High Contrast Navy & Tricolor) */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-[1200] shadow-md">
        {/* Tricolor Ribbon */}
        <div className="flex h-1.5 w-full">
          <div className="bg-[#FF9933] w-1/3"></div>
          <div className="bg-white w-1/3"></div>
          <div className="bg-[#128807] w-1/3"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap justify-between items-center gap-3">
          {/* Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-amber-400 text-lg shadow-inner">
              🏛️
            </div>
            <div>
              <div className="font-extrabold text-white uppercase text-xs tracking-wider flex items-center gap-2">
                <span>Sports, Youth & Cultural Activities Department</span>
                <span className="hidden sm:inline text-slate-500">•</span>
                <span className="hidden sm:inline text-amber-400 font-bold">Govt. of Gujarat</span>
              </div>
              <div className="text-slate-300 text-[11px] font-medium flex items-center gap-2 mt-0.5">
                <span>Sports Authority of Gujarat (SAG)</span>
                <span className="text-slate-500">•</span>
                <span className="text-emerald-400 font-semibold">State Infrastructure GIS Registry</span>
              </div>
            </div>
          </div>

          {/* Contact & Official Login */}
          <div className="flex items-center gap-4 text-xs">
            <div className="hidden lg:flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              GIS Network: Active
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-slate-300 text-[11px]">
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>nsc-sag@gujrat.gov.in</span>
            </div>

            <Link
              to="/login"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition shadow-sm text-xs border border-blue-500"
            >
              <Lock className="w-3.5 h-3.5" />
              Official Login
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Professional Hero Section (Clean Light Background with Dark Charcoal Text) */}
      <section className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Problem ID: PS000012 • State Sports Infrastructure Census
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
              KhelGujarat <span className="text-blue-700">GIS Portal</span>
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed font-normal">
              Unified digital platform for spatial mapping, condition assessment, and optimal utilisation of sports facilities across Gujarat. Supporting athletes, educational institutions, coaches, and sports administrators.
            </p>
          </div>

          {/* Macro KPI Cards (Clean White Tiles with High-Contrast Navy Text) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center shadow-xs">
              <div className="text-2xl font-black text-slate-900">33</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Districts</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center shadow-xs">
              <div className="text-2xl font-black text-blue-700">{facilities.length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Complexes</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center shadow-xs">
              <div className="text-2xl font-black text-emerald-700">81.4%</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Avg FCI</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center shadow-xs">
              <div className="text-2xl font-black text-indigo-700">18.4k</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">Footfall</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Reviewer & Evaluator Persona Switcher (Clean, Cohesive Segmented Design) */}
      <section className="bg-slate-100/80 border-b border-slate-200 py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700 text-xs">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>Reviewer 1-Click Persona Testing:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {DEMO_USERS.map((user, idx) => (
              <button
                key={idx}
                onClick={() => handleDemoLogin(user)}
                className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-slate-400 px-3 py-1.5 rounded-xl font-bold shadow-xs transition text-xs flex items-center gap-1.5"
                title={user.description}
              >
                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                <span>{user.roleName.split(" ")[0]} ({user.roleName.split("(")[1]?.replace(")", "") || user.roleName})</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Filter & Search Control Center (Clean White Inputs with Dark Text) */}
      <section className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-5 pb-3">
        <div className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm space-y-3.5">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Gujarat facilities by complex name, taluka, city, or district..."
                className="w-full pl-10 pr-8 py-2.5 text-sm bg-white border border-slate-300 rounded-2xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* District Dropdown (Dark text, 100% visible) */}
            <div className="w-full md:w-56">
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-white border border-slate-300 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium cursor-pointer"
              >
                <option value="All Districts">📍 All 33 Districts</option>
                {GUJARAT_DISTRICTS.map((dist, idx) => (
                  <option key={idx} value={dist}>
                    {dist}
                  </option>
                ))}
              </select>
            </div>

            {/* Sport Dropdown */}
            <div className="w-full md:w-48">
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-white border border-slate-300 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium cursor-pointer"
              >
                <option value="All Sports">🏅 All Sports</option>
                {SPORTS_LIST.map((sp, idx) => (
                  <option key={idx} value={sp.name}>
                    {sp.icon} {sp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition Dropdown */}
            <div className="w-full md:w-52">
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-white border border-slate-300 rounded-2xl text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium cursor-pointer"
              >
                <option value="All Conditions">🛡️ Condition Grade</option>
                <option value="Grade A">🟢 Grade A (&gt;85% Excellent)</option>
                <option value="Grade B">🔵 Grade B (70-84% Good)</option>
                <option value="Grade C">🟠 Grade C (Needs Repair)</option>
                <option value="Grade D">🔴 Grade D (Critical Renovation)</option>
              </select>
            </div>
          </div>

          {/* Quick Filter Tag Pills & View Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-semibold mr-1">Quick Filters:</span>
              <button
                onClick={() => setSelectedTag("all")}
                className={`px-3 py-1 rounded-xl font-bold transition text-xs ${
                  selectedTag === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All Venues
              </button>
              <button
                onClick={() => setSelectedTag("gradeA")}
                className={`px-3 py-1 rounded-xl font-bold transition text-xs border ${
                  selectedTag === "gradeA"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                    : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                Grade A Standard
              </button>
              <button
                onClick={() => setSelectedTag("floodlit")}
                className={`px-3 py-1 rounded-xl font-bold transition text-xs border ${
                  selectedTag === "floodlit"
                    ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                }`}
              >
                💡 Night Floodlights
              </button>
              <button
                onClick={() => setSelectedTag("divyangjan")}
                className={`px-3 py-1 rounded-xl font-bold transition text-xs border ${
                  selectedTag === "divyangjan"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100"
                }`}
              >
                ♿ Divyangjan Accessible
              </button>
              <button
                onClick={() => setSelectedTag("offpeak")}
                className={`px-3 py-1 rounded-xl font-bold transition text-xs border ${
                  selectedTag === "offpeak"
                    ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                    : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                }`}
              >
                ⚡ 30% Off-Peak Discount
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleFindNearMe}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition border ${
                  nearMeActive
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                }`}
              >
                <Compass className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`} />
                {isLocating ? "Locating..." : nearMeActive ? "Near Me Active" : "Find Near Me"}
              </button>

              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
                <button
                  onClick={() => setViewMode("split")}
                  className={`px-3 py-1 rounded-xl font-bold transition ${
                    viewMode === "split"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Split View
                </button>
                <button
                  onClick={() => setViewMode("map")}
                  className={`px-3 py-1 rounded-xl font-bold transition ${
                    viewMode === "map"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Full Map
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1 rounded-xl font-bold transition ${
                    viewMode === "grid"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Cards
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Main Spatial Section (Map + Cards) */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-3 flex-1">
        {viewMode === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* GIS Map Column */}
            <div className="lg:col-span-7 h-[690px] sticky top-20 rounded-3xl overflow-hidden shadow-sm border border-slate-200">
              <GujaratGisMap
                facilities={filteredFacilities}
                selectedFacility={activeFacility}
                onSelectFacility={(fac) => setActiveFacility(fac)}
                onOpenBooking={(fac) => setCitizenBookingFacility(fac)}
                onOpenAssessment={(fac) => setAuditModalFacility(fac)}
              />
            </div>

            {/* Facility Cards Column */}
            <div className="lg:col-span-5 space-y-4 max-h-[690px] overflow-y-auto pr-1">
              <div className="text-xs font-bold text-slate-500 px-1 flex justify-between items-center">
                <span>Found {filteredFacilities.length} Facilities</span>
                {(selectedDistrict !== "All Districts" || selectedSport !== "All Sports" || searchQuery) && (
                  <button
                    onClick={handleResetFilters}
                    className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Filters
                  </button>
                )}
              </div>

              {filteredFacilities.map((facility) => {
                const isSelected = activeFacility?.id === facility.id;
                return (
                  <div
                    key={facility.id}
                    onClick={() => setActiveFacility(facility)}
                    className={`bg-white rounded-3xl border transition-all p-4.5 shadow-xs cursor-pointer group ${
                      isSelected
                        ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/20"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className="relative w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden shadow-xs border border-slate-100">
                        <img
                          src={facility.picture}
                          alt={facility.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                          {facility.district}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {facility.taluka} Taluka
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              facility.condition.score >= 85
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : facility.condition.score >= 70
                                ? "bg-blue-50 text-blue-800 border-blue-200"
                                : facility.condition.score >= 55
                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}
                          >
                            FCI {facility.condition.score}%
                          </span>
                        </div>

                        <h3 className="font-extrabold text-slate-900 text-base mt-1.5 truncate group-hover:text-blue-700 transition">
                          {facility.name}
                        </h3>
                        <p className="text-slate-500 text-xs truncate mt-0.5 font-normal">
                          {facility.location}
                        </p>

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {facility.sports.slice(0, 3).map((sp, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium"
                            >
                              {sp.name} • {sp.feePerHour}
                            </span>
                          ))}
                          {facility.sports.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-bold self-center">
                              +{facility.sports.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Capacity & Amenities Strip */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs">Utilisation:</span>
                        <div className="w-20 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className={`h-2 rounded-full ${
                              facility.utilisation.utilizationRate > 80
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${facility.utilisation.utilizationRate}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-slate-700 text-xs">
                          {facility.utilisation.utilizationRate}%
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-slate-500 text-xs">
                        {facility.amenities.floodlights && <span title="Night Floodlights">💡</span>}
                        {facility.amenities.divyangjanFriendly && <span title="Divyangjan Accessible">♿</span>}
                        {facility.amenities.parking && <span title="Parking Available">🅿️</span>}
                        {facility.amenities.gym && <span title="Gymnasium">🏋️</span>}
                      </div>
                    </div>

                    {/* Action Directives */}
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAuditModalFacility(facility);
                        }}
                        className="text-xs font-bold py-2 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition text-center"
                      >
                        FCI Audit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInstitutionalModalFacility(facility);
                        }}
                        className="text-xs font-bold py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition text-center border border-emerald-200"
                      >
                        School Book
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCitizenBookingFacility(facility);
                        }}
                        className="text-xs font-bold py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition text-center"
                      >
                        Book Slot
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredFacilities.length === 0 && (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8">
                  <div className="text-3xl mb-2">🔍</div>
                  <h4 className="font-bold text-slate-900 text-base">No Matching Sports Facilities</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Try adjusting your filters or search keywords to view all venues across Gujarat.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === "map" && (
          <div className="h-[760px] w-full rounded-3xl overflow-hidden shadow-sm border border-slate-200">
            <GujaratGisMap
              facilities={filteredFacilities}
              selectedFacility={activeFacility}
              onSelectFacility={(fac) => setActiveFacility(fac)}
              onOpenBooking={(fac) => setCitizenBookingFacility(fac)}
              onOpenAssessment={(fac) => setAuditModalFacility(fac)}
            />
          </div>
        )}

        {viewMode === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFacilities.map((facility) => (
              <div
                key={facility.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-slate-300 transition"
              >
                <div>
                  <div className="relative h-48">
                    <img
                      src={facility.picture}
                      alt={facility.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-3 py-1 rounded-xl">
                      {facility.district} • {facility.taluka}
                    </div>
                    <div
                      className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-xl shadow-xs ${
                        facility.condition.score >= 85
                          ? "bg-emerald-600 text-white"
                          : facility.condition.score >= 70
                          ? "bg-blue-600 text-white"
                          : "bg-amber-600 text-white"
                      }`}
                    >
                      FCI {facility.condition.score}%
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="font-extrabold text-slate-900 text-lg">{facility.name}</h3>
                    <p className="text-slate-500 text-xs mt-1">{facility.location}</p>

                    <div className="mt-4 flex items-center justify-between text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Category</span>
                        <p className="font-bold text-slate-800 mt-0.5">{facility.category}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] uppercase font-bold">Utilisation</span>
                        <p className="font-bold text-blue-700 mt-0.5">{facility.utilisation.utilizationRate}% Rate</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Available Sports:
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {facility.sports.map((sp, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl font-medium"
                          >
                            {sp.name} ({sp.feePerHour})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setAuditModalFacility(facility)}
                    className="text-xs font-bold py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition text-center"
                  >
                    FCI Audit
                  </button>
                  <button
                    onClick={() => setInstitutionalModalFacility(facility)}
                    className="text-xs font-bold py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl transition text-center border border-emerald-200"
                  >
                    Institution
                  </button>
                  <button
                    onClick={() => setCitizenBookingFacility(facility)}
                    className="text-xs font-bold py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition text-center"
                  >
                    Book Slot
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 6. Institutional Tournament & Educational Banner */}
      <section className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white mt-12 py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-bold">
              <School className="w-3.5 h-3.5" />
              Educational Institutions, Universities & Schools Booking Desk
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Host School Sports Days, Zonal Trials & Khel Mahakumbh Events
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
              All Gujarat Government, GSEB, CBSE, and University athletic associations can reserve state sports facilities at subsidized government rates. Verified calendar clearances guaranteed within 48 hours by District Sports Officers.
            </p>
          </div>
          <button
            onClick={() => setInstitutionalModalFacility(facilities[0])}
            className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-6 py-3.5 rounded-2xl font-black text-sm shadow-xl transition flex items-center gap-2 flex-shrink-0"
          >
            <School className="w-4 h-4 text-slate-950" />
            Apply For Institutional Booking
          </button>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 px-4 sm:px-6 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <div className="font-extrabold text-white text-sm flex items-center gap-2">
              <span>🏛️</span> KhelGujarat GIS • Sports Infrastructure Assessment & Utilisation Platform
            </div>
            <div className="text-slate-400 text-xs mt-1">
              Developed for Sports, Youth & Cultural Activities Department, Government of Gujarat • Problem ID: PS000012
            </div>
          </div>
          <div className="flex items-center gap-6 text-slate-300">
            <span>Official Email: <strong className="text-white">nsc-sag@gujrat.gov.in</strong></span>
            <Link to="/login" className="hover:text-white transition font-semibold text-blue-400">
              Staff & DSO Portal &rarr;
            </Link>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {auditModalFacility && (
        <FacilityConditionAudit
          facility={auditModalFacility}
          onClose={() => setAuditModalFacility(null)}
          onSaveAudit={handleSaveAudit}
        />
      )}

      {institutionalModalFacility && (
        <InstitutionalBookingModal
          facility={institutionalModalFacility}
          onClose={() => setInstitutionalModalFacility(null)}
          onSubmitBooking={(request) => {
            console.log("Institutional booking logged:", request);
          }}
        />
      )}

      {citizenBookingFacility && (
        <CitizenBookingModal
          facility={citizenBookingFacility}
          onClose={() => setCitizenBookingFacility(null)}
          onConfirm={(pass) => {
            console.log("Citizen booking confirmed:", pass);
          }}
        />
      )}
    </div>
  );
}
