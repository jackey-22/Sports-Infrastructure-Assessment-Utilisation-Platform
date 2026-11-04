import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Map as MapIcon,
  List,
  BarChart3,
  Search,
  Crosshair,
  SlidersHorizontal,
  X,
  ChevronDown,
  Zap,
} from "lucide-react";
import PublicNavbar from "./PublicNavbar";
import ExploreFilters from "./ExploreFilters";
import ExploreListCard from "./ExploreListCard";
import ExploreInsights from "./ExploreInsights";
import GujaratGisMap from "./GujaratGisMap";
import FacilityDetailPanel from "./FacilityDetailPanel";
import FacilityConditionAudit from "../Assessment/FacilityConditionAudit";
import InstitutionalBookingModal from "../Utilisation/InstitutionalBookingModal";
import CitizenBookingModal from "./CitizenBookingModal";
import {
  DEMO_USERS,
} from "../../data/gujaratSportsData";
import { getPublicFacilities } from "../../data/adminFacilityData";
import {
  CONDITION_OPTIONS,
  getFacilityType,
  sortFacilities,
} from "./exploreUtils";
import { useDispatch } from "react-redux";
import { UserActions } from "../../store/UserData";
import { useCookies } from "react-cookie";

const VIEW_OPTIONS = [
  { id: "map", label: "Map", full: "Map view", icon: MapIcon },
  { id: "list", label: "List", full: "List view", icon: List },
  { id: "insights", label: "Stats", full: "Stats", icon: BarChart3 },
];

export default function PublicExplore() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [, setCookies] = useCookies(["token"]);
  const [searchParams] = useSearchParams();
  const listScrollRef = useRef(null);
  const suppressAutoSelectRef = useRef(false);

  const [facilities, setFacilities] = useState(getPublicFacilities);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedSports, setSelectedSports] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState("map");
  const [activeFacility, setActiveFacility] = useState(null);
  const [detailFacility, setDetailFacility] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [nearMeActive, setNearMeActive] = useState(false);

  const [auditModalFacility, setAuditModalFacility] = useState(null);
  const [institutionalModalFacility, setInstitutionalModalFacility] = useState(null);
  const [citizenBookingFacility, setCitizenBookingFacility] = useState(null);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    const q = searchParams.get("q");
    const sport = searchParams.get("sport");
    if (q) setSearchQuery(q);
    if (sport) setSelectedSports([sport]);
  }, [searchParams]);

  const baseFiltered = useMemo(() => {
    return facilities.filter((fac) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        fac.name.toLowerCase().includes(q) ||
        fac.district.toLowerCase().includes(q) ||
        fac.taluka.toLowerCase().includes(q) ||
        fac.location.toLowerCase().includes(q);

      const matchesDistrict =
        selectedDistrict === "All Districts" || fac.district === selectedDistrict;

      const matchesSport =
        selectedSports.length === 0 ||
        selectedSports.some((sp) =>
          fac.sports.some((s) => s.name.toLowerCase() === sp.toLowerCase())
        );

      const matchesCondition =
        selectedConditions.length === 0 ||
        selectedConditions.some((id) => {
          const opt = CONDITION_OPTIONS.find((c) => c.id === id);
          return opt ? opt.match(fac.condition?.score || 0) : false;
        });

      return matchesSearch && matchesDistrict && matchesSport && matchesCondition;
    });
  }, [
    facilities,
    searchQuery,
    selectedDistrict,
    selectedSports,
    selectedConditions,
  ]);

  const filteredFacilities = useMemo(() => {
    const list = baseFiltered.filter((fac) => {
      const matchesType =
        selectedTypes.length === 0 ||
        selectedTypes.includes(getFacilityType(fac));
      return matchesType;
    });
    return sortFacilities(list, sortBy);
  }, [baseFiltered, selectedTypes, sortBy]);

  // Soft selection: only pick first result if current selection dropped out — don't yank on every filter tweak when still valid
  useEffect(() => {
    if (suppressAutoSelectRef.current) {
      suppressAutoSelectRef.current = false;
      return;
    }
    if (
      activeFacility &&
      !filteredFacilities.find((f) => f.id === activeFacility.id)
    ) {
      setActiveFacility(filteredFacilities[0] || null);
    } else if (!activeFacility && filteredFacilities.length) {
      setActiveFacility(filteredFacilities[0]);
    }
  }, [filteredFacilities, activeFacility]);

  // Scroll list card into view when map selects
  useEffect(() => {
    if (!activeFacility || !listScrollRef.current) return;
    const el = listScrollRef.current.querySelector(
      `[data-facility-id="${activeFacility.id}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeFacility]);

  const activeFilterCount =
    (searchQuery.trim() ? 1 : 0) +
    (selectedDistrict !== "All Districts" ? 1 : 0) +
    selectedSports.length +
    selectedTypes.length +
    selectedConditions.length +
    (nearMeActive ? 1 : 0);

  const handleClearAll = () => {
    setSearchQuery("");
    setSelectedDistrict("All Districts");
    setSelectedSports([]);
    setSelectedTypes([]);
    setSelectedConditions([]);
    setSortBy("relevance");
    setNearMeActive(false);
    setFacilities(getPublicFacilities());
  };

  const toggleInList = (list, value, setter) => {
    setter(
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  };

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported on this device.", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const sorted = [...getPublicFacilities()].sort((a, b) => {
          const distA = Math.hypot(a.latitude - latitude, a.longitude - longitude);
          const distB = Math.hypot(b.latitude - latitude, b.longitude - longitude);
          return distA - distB;
        });
        setFacilities(sorted);
        setNearMeActive(true);
        setActiveFacility(sorted[0] || null);
        setViewMode("map");
        showToast("Location on — sorted nearest first.", "ok");
      },
      () => {
        showToast("Couldn't get location — try again or pick a district.", "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

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

  const handleSaveAudit = (facilityId, newAudit) => {
    setFacilities((prev) =>
      prev.map((f) => {
        if (f.id !== facilityId) return f;
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
      })
    );
  };

  const filterProps = {
    selectedDistrict,
    onDistrictChange: setSelectedDistrict,
    selectedSports,
    onToggleSport: (sport) => toggleInList(selectedSports, sport, setSelectedSports),
    onClearSports: () => setSelectedSports([]),
    selectedTypes,
    onToggleType: (type) => toggleInList(selectedTypes, type, setSelectedTypes),
    selectedConditions,
    onToggleCondition: (id) =>
      toggleInList(selectedConditions, id, setSelectedConditions),
    onClearAll: handleClearAll,
    typeCountFacilities: baseFiltered,
  };

  const chips = [];
  if (searchQuery.trim()) {
    chips.push({
      key: "q",
      label: `"${searchQuery.trim()}"`,
      onRemove: () => setSearchQuery(""),
    });
  }
  if (selectedDistrict !== "All Districts") {
    chips.push({
      key: "district",
      label: selectedDistrict,
      onRemove: () => setSelectedDistrict("All Districts"),
    });
  }
  selectedSports.forEach((sp) =>
    chips.push({
      key: `sport-${sp}`,
      label: sp.replace(" & Track", ""),
      onRemove: () =>
        setSelectedSports((prev) => prev.filter((s) => s !== sp)),
    })
  );
  selectedTypes.forEach((t) =>
    chips.push({
      key: `type-${t}`,
      label: t,
      onRemove: () => setSelectedTypes((prev) => prev.filter((x) => x !== t)),
    })
  );
  selectedConditions.forEach((id) => {
    const opt = CONDITION_OPTIONS.find((c) => c.id === id);
    chips.push({
      key: `cond-${id}`,
      label: opt?.label || id,
      onRemove: () =>
        setSelectedConditions((prev) => prev.filter((c) => c !== id)),
    });
  });
  if (nearMeActive) {
    chips.push({
      key: "near",
      label: "Near me",
      onRemove: () => {
        setNearMeActive(false);
        setFacilities(getPublicFacilities());
      },
    });
  }

  const renderList = (opts = {}) => {
    const { compact = viewMode === "list", peek = false } = opts;
    const items = peek ? filteredFacilities.slice(0, 3) : filteredFacilities;
    return (
      <div className="flex flex-col h-full min-h-0">
        {!peek && (
          <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
            <p className="text-xs font-bold text-slate-500">
              <span className="text-brand-dark text-sm font-extrabold">
                {filteredFacilities.length}
              </span>{" "}
              facilities found
            </p>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              Sort:
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-bold text-brand-dark bg-transparent border-none focus:ring-0 cursor-pointer pr-1"
              >
                <option value="relevance">Best match</option>
                <option value="rating">Rating</option>
                <option value="condition">Condition</option>
              </select>
            </label>
          </div>
        )}

        <div
          ref={listScrollRef}
          className={
            compact && !peek
              ? "flex-1 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"
              : "flex-1 overflow-y-auto space-y-3 pr-1"
          }
        >
          {items.map((facility) => (
            <ExploreListCard
              key={facility.id}
              facility={facility}
              selected={activeFacility?.id === facility.id}
              compact={compact}
              onSelect={setActiveFacility}
              onViewDetails={setDetailFacility}
              onBook={setCitizenBookingFacility}
            />
          ))}

          {!peek && filteredFacilities.length === 0 && (
            <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="font-bold text-brand-dark">No matching facilities</p>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing filters or changing your search.
              </p>
              <button
                type="button"
                onClick={handleClearAll}
                className="mt-3 text-xs font-bold text-brand-primary hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7FBF8] font-sans text-slate-800 flex flex-col">
      <PublicNavbar />

      {toast && (
        <div
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-[2500] px-4 py-2.5 rounded-full text-sm font-bold shadow-lg ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : toast.type === "ok"
              ? "bg-brand-primary text-white"
              : "bg-slate-900 text-white"
          }`}
          role="status"
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 pt-5 pb-3 flex flex-col gap-3 flex-1">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-dark tracking-tight">
              Explore Sports Facilities
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Find a venue, check condition, and book a slot across Gujarat
            </p>
          </div>

          <div className="inline-flex bg-white border border-slate-200 rounded-full p-1 shadow-sm self-start">
            {VIEW_OPTIONS.map(({ id, label, full, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setViewMode(id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs sm:text-sm font-bold transition ${
                  viewMode === id
                    ? "bg-brand-soft text-brand-primary"
                    : "text-slate-600 hover:text-brand-dark"
                }`}
                title={full}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sticky citizen toolbar */}
        <div className="sticky top-[4.5rem] z-[1100] bg-[#F7FBF8]/95 backdrop-blur-md py-2 -mx-1 px-1">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by facility name or location..."
                className="w-full pl-10 pr-3 py-2.5 text-sm rounded-full border border-slate-200 bg-white text-slate-800 placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleNearMe}
                className={`inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold border shadow-sm transition ${
                  nearMeActive
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-white text-brand-primary border-slate-200 hover:bg-brand-soft"
                }`}
              >
                <Crosshair className="w-3.5 h-3.5" />
                Near me
              </button>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-sm"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 min-w-[1.25rem] h-5 px-1 rounded-full bg-brand-primary text-white text-[10px] flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-soft text-brand-primary text-[11px] font-bold border border-brand-light hover:bg-brand-light transition"
                >
                  {chip.label}
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-bold text-slate-500 hover:text-brand-primary px-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Main content */}
        <div
          className={`grid gap-4 flex-1 min-h-0 ${
            viewMode === "map"
              ? "lg:grid-cols-[250px_minmax(260px,340px)_1fr]"
              : "lg:grid-cols-[260px_1fr]"
          }`}
        >
          {/* Desktop filters sidebar */}
          <div className="hidden lg:block lg:sticky lg:top-36 lg:self-start lg:max-h-[calc(100vh-10rem)]">
            <ExploreFilters {...filterProps} variant="sidebar" />
          </div>

          {viewMode === "insights" && (
            <div className="min-h-0 overflow-y-auto pb-6">
              <ExploreInsights facilities={filteredFacilities} />
            </div>
          )}

          {viewMode === "list" && (
            <div className="min-h-[60vh]">{renderList({ compact: true })}</div>
          )}

          {viewMode === "map" && (
            <>
              {/* Desktop list column */}
              <div className="hidden lg:flex lg:max-h-[calc(100vh-10rem)] lg:overflow-hidden flex-col">
                {renderList({ compact: false })}
              </div>

              {/* Map — primary on mobile */}
              <div className="relative min-h-[55vh] lg:min-h-0 lg:h-[calc(100vh-10rem)] lg:sticky lg:top-36 flex flex-col gap-2">
                <div className="flex-1 min-h-[50vh] lg:min-h-0">
                  <GujaratGisMap
                    facilities={filteredFacilities}
                    selectedFacility={activeFacility}
                    onSelectFacility={(f) => {
                      suppressAutoSelectRef.current = true;
                      setActiveFacility(f);
                    }}
                    onOpenBooking={setCitizenBookingFacility}
                    onOpenAssessment={setAuditModalFacility}
                    onViewDetails={setDetailFacility}
                    onLocateResult={(r) =>
                      showToast(r.message, r.ok ? "ok" : "error")
                    }
                    onClearFilters={handleClearAll}
                    openPopupOnSelect={false}
                  />
                </div>

                {/* Mobile peek sheet of top results */}
                <div className="lg:hidden bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-600">
                      Top matches ({Math.min(3, filteredFacilities.length)})
                    </p>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className="text-[11px] font-bold text-brand-primary"
                    >
                      See all
                    </button>
                  </div>
                  {renderList({ compact: false, peek: true })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Collapsed reviewer tools */}
        <div className="mt-auto pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setDemoOpen((o) => !o)}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-brand-primary"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Reviewer tools
            <ChevronDown className={`w-3.5 h-3.5 transition ${demoOpen ? "rotate-180" : ""}`} />
          </button>
          {demoOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {DEMO_USERS.map((user, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDemoLogin(user)}
                  className="px-2.5 py-1 rounded-full border border-slate-200 bg-white hover:border-brand-primary/40 text-[11px] font-bold text-slate-700"
                  title={user.description}
                >
                  {user.roleName.split(" ")[0]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {filtersOpen && (
        <div className="fixed inset-0 z-[2000] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[90vh]">
            <ExploreFilters
              {...filterProps}
              variant="sheet"
              onClose={() => setFiltersOpen(false)}
            />
          </div>
        </div>
      )}

      {detailFacility && (
        <FacilityDetailPanel
          facility={detailFacility}
          onClose={() => setDetailFacility(null)}
          onOpenAudit={(f) => {
            setDetailFacility(null);
            setAuditModalFacility(f);
          }}
          onOpenSchoolBook={(f) => {
            setDetailFacility(null);
            setInstitutionalModalFacility(f);
          }}
          onOpenBooking={(f) => {
            setDetailFacility(null);
            setCitizenBookingFacility(f);
          }}
        />
      )}

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
            showToast("School booking request submitted.", "ok");
          }}
        />
      )}

      {citizenBookingFacility && (
        <CitizenBookingModal
          facility={citizenBookingFacility}
          onClose={() => setCitizenBookingFacility(null)}
          onConfirm={(pass) => {
            console.log("Citizen booking confirmed:", pass);
            showToast("Pass ready — show your QR at the venue.", "ok");
          }}
        />
      )}
    </div>
  );
}
