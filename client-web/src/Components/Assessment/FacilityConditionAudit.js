import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Wrench,
  CheckCircle,
  FileText,
  Camera,
  Calendar,
  User,
  Activity,
  Layers,
  Zap,
  Droplets,
  Accessibility,
  Eye
} from "lucide-react";

export default function FacilityConditionAudit({
  facility,
  onClose = () => {},
  onSaveAudit = () => {}
}) {
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "new_audit"
  const [turfScore, setTurfScore] = useState(23);
  const [lightingScore, setLightingScore] = useState(18);
  const [sanitationScore, setSanitationScore] = useState(19);
  const [safetyScore, setSafetyScore] = useState(14);
  const [accessibilityScore, setAccessibilityScore] = useState(18);
  const [inspectorName, setInspectorName] = useState("DSO Quality Cell (SAG)");
  const [urgency, setUrgency] = useState("Normal / Routine");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!facility) return null;

  const totalCalculatedScore =
    turfScore + lightingScore + sanitationScore + safetyScore + accessibilityScore;

  const getGrade = (score) => {
    if (score >= 85) return "Grade A (Excellent)";
    if (score >= 70) return "Grade B (Good)";
    if (score >= 55) return "Grade C (Needs Maintenance)";
    return "Grade D (Critical Renovation)";
  };

  const handleAuditSubmit = (e) => {
    e.preventDefault();
    const newAudit = {
      score: totalCalculatedScore,
      grade: getGrade(totalCalculatedScore),
      inspector: inspectorName,
      date: new Date().toISOString().split("T")[0],
      maintenanceUrgency: urgency,
      notes: inspectionNotes || "Routine quarterly audit completed. Overall structure verified.",
      turfScore,
      lightingScore,
      sanitationScore,
      safetyScore,
      accessibilityScore,
    };
    onSaveAudit(facility.id, newAudit);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setActiveTab("overview");
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full text-xs font-semibold mb-2">
                <ShieldCheck className="w-3.5 h-3.5" />
                Sports Authority of Gujarat (SAG) &bull; Infrastructure Assessment Cell
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{facility.name}</h2>
              <p className="text-slate-300 text-sm mt-1">
                {facility.location} &bull; {facility.district} District ({facility.taluka} Taluka)
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl text-lg font-bold transition"
            >
              ✕
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-4 mt-6 border-b border-white/10">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-3 text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === "overview"
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-4 h-4" />
              Condition Scorecard & Audit Details
            </button>
            <button
              onClick={() => setActiveTab("new_audit")}
              className={`pb-3 text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === "new_audit"
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              Conduct New Inspection / Audit
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Score Highlight Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Facility Condition Index (FCI)
                  </span>
                  <div className="flex items-baseline gap-2 my-2">
                    <span className="text-4xl font-extrabold text-slate-800">
                      {facility.condition.score}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500">/ 100 max</span>
                  </div>
                  <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 w-fit">
                    {facility.condition.grade}
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Inspection Authority
                  </span>
                  <div className="my-2">
                    <p className="font-semibold text-slate-800 text-sm">{facility.condition.inspector}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Last Audited: {facility.condition.lastInspectionDate}
                    </p>
                  </div>
                  <span className="text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200 w-fit font-medium">
                    SAG Periodic Quality Audit
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Maintenance Urgency
                  </span>
                  <div className="my-2 flex items-center gap-2">
                    {facility.condition.maintenanceUrgency.includes("High") ||
                    facility.condition.maintenanceUrgency.includes("Critical") ? (
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    )}
                    <span className="font-bold text-slate-800 text-sm">
                      {facility.condition.maintenanceUrgency}
                    </span>
                  </div>
                  <span className="text-xs text-slate-600 bg-slate-200 px-2.5 py-1 rounded-md w-fit">
                    Status: Verified Active
                  </span>
                </div>
              </div>

              {/* Assessment Parameter Breakdown */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Key Infrastructure Component Assessment
                </h3>

                <div className="space-y-4">
                  {/* Turf & Court */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-emerald-600" />
                        Playing Surface & Turf Condition
                      </span>
                      <span>23 / 25 pts</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "92%" }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{facility.condition.turfStatus}</p>
                  </div>

                  {/* Lighting */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                        Arena Lighting & High-Lux Floodlights
                      </span>
                      <span>18 / 20 pts</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: "90%" }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{facility.condition.lightingStatus}</p>
                  </div>

                  {/* Sanitation & Amenities */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Droplets className="w-3.5 h-3.5 text-blue-500" />
                        Hygiene, Drinking Water & Locker Rooms
                      </span>
                      <span>19 / 20 pts</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: "95%" }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Sanitation Index: {facility.condition.sanitationScore}%. Clean filtered RO water available on-premise.
                    </p>
                  </div>

                  {/* Accessibility */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span className="flex items-center gap-1.5">
                        <Accessibility className="w-3.5 h-3.5 text-indigo-500" />
                        Para-Athlete / Divyangjan Barrier-Free Access
                      </span>
                      <span>18 / 20 pts</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: "90%" }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {facility.amenities.divyangjanFriendly
                        ? "Wheelchair ramps, dedicated tactile paths, and accessible restrooms compliant with Sugamya Bharat guidelines."
                        : "Ramps proposed in next district modernization cycle."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inspector Remarks */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  Inspector Assessment Notes
                </h4>
                <p className="text-sm text-slate-700 italic">
                  "{facility.condition.notes}"
                </p>
              </div>
            </div>
          )}

          {activeTab === "new_audit" && (
            <form onSubmit={handleAuditSubmit} className="space-y-6">
              {savedSuccess && (
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-4 rounded-xl text-sm font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  Assessment successfully logged and registered with the SAG Central Database!
                </div>
              )}

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-800">
                <strong>Government Standard Protocol:</strong> Ratings are calculated according to the Sports Authority of Gujarat Infrastructure Quality Framework (SIQF).
              </div>

              {/* Auditor Name & Role */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Auditor / Inspector Name & Designation
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. DSO Ahmedabad / SAG Quality Officer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Maintenance Urgency Classification
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="Normal / Routine">Normal / Routine Maintenance</option>
                    <option value="Minor Attention Required">Minor Attention Required (Repairs within 30 days)</option>
                    <option value="High Priority Repair">High Priority Repair (Schedule within 7 days)</option>
                    <option value="Critical Renovation">Critical Renovation / Unsafe for Play</option>
                  </select>
                </div>
              </div>

              {/* Sliders for Assessment Components */}
              <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Quantitative Component Scoring
                </h4>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>1. Surface / Turf Quality (Max: 25 pts)</span>
                    <span className="font-bold text-indigo-600">{turfScore} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    value={turfScore}
                    onChange={(e) => setTurfScore(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>2. Lighting & Floodlight Lux (Max: 20 pts)</span>
                    <span className="font-bold text-indigo-600">{lightingScore} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={lightingScore}
                    onChange={(e) => setLightingScore(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>3. Sanitation & Changing Rooms (Max: 20 pts)</span>
                    <span className="font-bold text-indigo-600">{sanitationScore} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={sanitationScore}
                    onChange={(e) => setSanitationScore(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>4. Structural Safety & Perimeter (Max: 15 pts)</span>
                    <span className="font-bold text-indigo-600">{safetyScore} / 15</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>5. Divyangjan / Accessibility (Max: 20 pts)</span>
                    <span className="font-bold text-indigo-600">{accessibilityScore} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={accessibilityScore}
                    onChange={(e) => setAccessibilityScore(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              {/* Live Preview Result */}
              <div className="flex justify-between items-center p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase">Calculated FCI Score</span>
                  <div className="text-2xl font-extrabold text-emerald-900">{totalCalculatedScore} / 100</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-800 uppercase">Condition Grade</span>
                  <div className="text-sm font-bold text-emerald-900">{getGrade(totalCalculatedScore)}</div>
                </div>
              </div>

              {/* Inspection Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Field Observations & Action Directives
                </label>
                <textarea
                  rows="3"
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Record observations regarding turf wear, drainage, lighting repairs, or safety recommendations..."
                  className="w-full p-3 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Submit Official Assessment
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

