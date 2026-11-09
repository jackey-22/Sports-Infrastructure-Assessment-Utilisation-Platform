import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calendar,
  Activity,
  Layers,
  Zap,
  Droplets,
  Accessibility,
  X,
} from "lucide-react";

export default function FacilityConditionAudit({
  facility,
  onClose = () => {},
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
  const [calculated, setCalculated] = useState(false);

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
    // The score is calculated locally. There is no assessment API yet, so the
    // audit object below is intentionally not sent anywhere.
    // shortcut: no condition-audit persistence; POST `newAudit` when the API exists.
    setCalculated(true);
  };

  const tabClass = (tab) =>
    `-mb-px inline-flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-semibold transition ${
      activeTab === tab
        ? "border-brand-primary text-brand-primary"
        : "border-transparent text-slate-500 hover:text-slate-800"
    }`;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-6 w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="relative border-b border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Sports Authority of Gujarat (SAG) · Infrastructure Assessment Cell
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-brand-dark">
                {facility.name}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {facility.location} · {facility.district} District ({facility.taluka} Taluka)
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close assessment"
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Selector */}
          <div className="mt-6 flex gap-4 border-b border-slate-200">
            <button type="button" onClick={() => setActiveTab("overview")} className={tabClass("overview")}>
              <Activity className="h-4 w-4" />
              Condition scorecard & audit details
            </button>
            <button type="button" onClick={() => setActiveTab("new_audit")} className={tabClass("new_audit")}>
              <FileText className="h-4 w-4" />
              Conduct new inspection / audit
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="max-h-[75vh] overflow-y-auto p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Score Highlight Grid */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Facility Condition Index (FCI)
                  </span>
                  <div className="my-2 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-brand-dark">
                      {facility.condition.score}%
                    </span>
                    <span className="text-xs font-semibold text-slate-500">/ 100 max</span>
                  </div>
                  <span className="inline-block w-fit rounded-md border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    {facility.condition.grade}
                  </span>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Inspection authority
                  </span>
                  <div className="my-2">
                    <p className="text-sm font-semibold text-brand-dark">{facility.condition.inspector}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" /> Last audited: {facility.condition.lastInspectionDate}
                    </p>
                  </div>
                  <span className="w-fit rounded-md border border-emerald-200 bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand-primary">
                    SAG periodic quality audit
                  </span>
                </div>

                <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Maintenance urgency
                  </span>
                  <div className="my-2 flex items-center gap-2">
                    {facility.condition.maintenanceUrgency.includes("High") ||
                    facility.condition.maintenanceUrgency.includes("Critical") ? (
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    ) : (
                      <CheckCircle className="h-6 w-6 text-emerald-500" />
                    )}
                    <span className="text-sm font-bold text-brand-dark">
                      {facility.condition.maintenanceUrgency}
                    </span>
                  </div>
                  <span className="w-fit rounded-md bg-slate-200 px-2.5 py-1 text-xs text-slate-600">
                    Status: Verified active
                  </span>
                </div>
              </div>

              {/* Assessment Parameter Breakdown */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-brand-dark">
                  <Layers className="h-4 w-4 text-brand-primary" />
                  Key infrastructure component assessment
                </h3>

                <div className="space-y-4">
                  {/* Turf & Court */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Layers className="h-3.5 w-3.5 text-emerald-600" />
                        Playing surface & turf condition
                      </span>
                      <span>23 / 25 pts</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: "92%" }}></div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{facility.condition.turfStatus}</p>
                  </div>

                  {/* Lighting */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        Arena lighting & high-lux floodlights
                      </span>
                      <span>18 / 20 pts</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-amber-500" style={{ width: "90%" }}></div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{facility.condition.lightingStatus}</p>
                  </div>

                  {/* Sanitation & Amenities */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Droplets className="h-3.5 w-3.5 text-sky-500" />
                        Hygiene, drinking water & locker rooms
                      </span>
                      <span>19 / 20 pts</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-sky-500" style={{ width: "95%" }}></div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Sanitation index: {facility.condition.sanitationScore}%. Clean filtered RO water available on-premise.
                    </p>
                  </div>

                  {/* Accessibility */}
                  <div>
                    <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Accessibility className="h-3.5 w-3.5 text-violet-500" />
                        Para-athlete / divyangjan barrier-free access
                      </span>
                      <span>18 / 20 pts</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-violet-500" style={{ width: "90%" }}></div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {facility.amenities.divyangjanFriendly
                        ? "Wheelchair ramps, dedicated tactile paths, and accessible restrooms compliant with Sugamya Bharat guidelines."
                        : "Ramps proposed in next district modernization cycle."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Inspector Remarks */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                  <FileText className="h-3.5 w-3.5 text-brand-primary" />
                  Inspector assessment notes
                </h4>
                <p className="text-sm italic text-slate-700">
                  "{facility.condition.notes}"
                </p>
              </div>
            </div>
          )}

          {activeTab === "new_audit" && (
            <form onSubmit={handleAuditSubmit} className="space-y-6">
              <div
                role="status"
                className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <strong>Saving is not connected yet.</strong>{" "}
                    {calculated
                      ? `Assessment calculated: ${totalCalculatedScore}/100 (${getGrade(
                          totalCalculatedScore
                        )}). It has not been stored in the SAG database — record it in the offline register until the assessment API is available.`
                      : "This form calculates the condition score in the browser only. No record is sent to the SAG database."}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-brand-soft p-4 text-xs text-brand-dark">
                <strong>Government standard protocol:</strong> Ratings are calculated according to the Sports Authority of Gujarat Infrastructure Quality Framework (SIQF).
              </div>

              {/* Auditor Name & Role */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Auditor / inspector name & designation
                  </label>
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30"
                    placeholder="e.g. DSO Ahmedabad / SAG Quality Officer"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Maintenance urgency classification
                  </label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30"
                  >
                    <option value="Normal / Routine">Normal / Routine Maintenance</option>
                    <option value="Minor Attention Required">Minor Attention Required (Repairs within 30 days)</option>
                    <option value="High Priority Repair">High Priority Repair (Schedule within 7 days)</option>
                    <option value="Critical Renovation">Critical Renovation / Unsafe for Play</option>
                  </select>
                </div>
              </div>

              {/* Sliders for Assessment Components */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Quantitative component scoring
                </h4>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                    <span>1. Surface / turf quality (max: 25 pts)</span>
                    <span className="font-bold text-brand-primary">{turfScore} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="25"
                    value={turfScore}
                    onChange={(e) => setTurfScore(parseInt(e.target.value))}
                    className="w-full accent-brand-primary"
                  />
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                    <span>2. Lighting & floodlight lux (max: 20 pts)</span>
                    <span className="font-bold text-brand-primary">{lightingScore} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={lightingScore}
                    onChange={(e) => setLightingScore(parseInt(e.target.value))}
                    className="w-full accent-brand-primary"
                  />
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                    <span>3. Sanitation & changing rooms (max: 20 pts)</span>
                    <span className="font-bold text-brand-primary">{sanitationScore} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="20"
                    value={sanitationScore}
                    onChange={(e) => setSanitationScore(parseInt(e.target.value))}
                    className="w-full accent-brand-primary"
                  />
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                    <span>4. Structural safety & perimeter (max: 15 pts)</span>
                    <span className="font-bold text-brand-primary">{safetyScore} / 15</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(parseInt(e.target.value))}
                    className="w-full accent-brand-primary"
                  />
                </div>

                <div>
                  <div className="mb-1 flex justify-between text-xs font-semibold text-slate-700">
                    <span>5. Divyangjan / accessibility (max: 20 pts)</span>
                    <span className="font-bold text-brand-primary">{accessibilityScore} / 20</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={accessibilityScore}
                    onChange={(e) => setAccessibilityScore(parseInt(e.target.value))}
                    className="w-full accent-brand-primary"
                  />
                </div>
              </div>

              {/* Live Preview Result */}
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div>
                  <span className="text-xs font-bold uppercase text-emerald-800">Calculated FCI score</span>
                  <div className="text-2xl font-extrabold text-emerald-900">{totalCalculatedScore} / 100</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase text-emerald-800">Condition grade</span>
                  <div className="text-sm font-bold text-emerald-900">{getGrade(totalCalculatedScore)}</div>
                </div>
              </div>

              {/* Inspection Notes */}
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Field observations & action directives
                </label>
                <textarea
                  rows="3"
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  placeholder="Record observations regarding turf wear, drainage, lighting repairs, or safety recommendations..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab("overview")}
                  className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#006634] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Calculate assessment
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
