import React from "react";
import {
  AlertTriangle,
  Image as ImageIcon,
  ShieldAlert,
} from "lucide-react";

// Simulated AI review panel. Every value here is clearly simulated demo data.
//
// Critical honesty requirement: there is no real AI service in this phase. This
// component never calls an external AI API, never claims images were analysed by a
// real model, and labels every finding as simulated. Real AI condition review
// requires a future backend/service integration.
export default function ManagerAIDeview({
  assessment,
  photos,
  open = false,
  onClose,
}) {
  if (!open || !assessment) return null;

  // Simulated findings derived only from the demo score/grade, presented as an
  // illustrative preview — never as verified facility defects.
  const simulatedFindings = simulatedFindingsForScore(assessment.score, assessment.grade);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-review-title"
      className="fixed inset-0 z-[1600] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close score notes"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          aria-label="Close review"
        >
          <span className="sr-only">Close</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-start gap-2 mb-1">
          <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0" aria-hidden="true" />
          <h2 id="ai-review-title" className="text-base font-extrabold text-brand-dark">
            Questionnaire notes
          </h2>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          These notes come from the questionnaire score. They are not a photograph analysis.
        </p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              Submitted images
            </p>
            {photos.length === 0 ? (
              <p className="text-xs text-slate-500">No photos attached to this assessment.</p>
            ) : (
              <ul className="space-y-1">
                {photos.map((photo) => (
                  <li key={typeof photo === "string" ? photo : photo.filename} className="text-xs text-slate-700">
                    {typeof photo === "string" ? photo : photo.filename}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Facility</p>
              <p className="text-sm font-bold text-brand-dark">{assessment.facilityName}</p>
              <p className="text-[11px] text-slate-500">{assessment.district}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Review status</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border-amber-500/30 bg-amber-500/10">
                Simulated
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Detected visible issues
            </p>
            <ul className="space-y-1">
              {simulatedFindings.issues.map((issue, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-slate-600">
                  <AlertTriangle className="mt-0.5 h-3 w-3 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Suggested maintenance actions
            </p>
            <ul className="space-y-1">
              {simulatedFindings.actions.map((action, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="mt-0.5 h-3 w-3 text-brand-primary shrink-0">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                Severity
              </p>
              <p className="text-sm font-bold text-brand-dark">{simulatedFindings.severity}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Confidence</p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-brand-dark">{simulatedFindings.confidence}%</span>
                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: `${simulatedFindings.confidence}%` }} />
                </div>
              </div>
              <p className="mt-1 text-[10px] text-slate-500">From the questionnaire score.</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Overall assessment summary
            </p>
            <p className="text-xs text-slate-600">{simulatedFindings.summary}</p>
          </div>

        </div>
      </div>
    </div>
  );
}

function simulatedFindingsForScore(score, grade) {
  const issues = [];
  const actions = [];
  let severity = "Low";
  let confidence = 62;
  let summary = "No significant issues detected from the questionnaire score.";

  if (score == null || score < 55) {
    severity = "High";
    confidence = 40;
    issues.push("Multiple components below acceptable threshold");
    issues.push("Structural or safety element may require attention");
    actions.push("Arrange a detailed site inspection within 7 days");
    actions.push("Escalate to the district authority for renovation planning");
    summary = "The questionnaire score indicates several components below standard; a high-priority inspection is recommended.";
  } else if (score < 70) {
    severity = "Medium";
    confidence = 55;
    issues.push("Playing surface shows minor wear");
    actions.push("Schedule routine surface maintenance within 30 days");
    actions.push("Re-inspect at the next quarterly cycle");
    summary = "The questionnaire score indicates minor wear; routine maintenance is recommended.";
  } else {
    severity = "Low";
    confidence = 78;
    issues.push("No significant defects detected");
    actions.push("Continue routine maintenance schedule");
    actions.push("Next assessment recommended in 6 months");
    summary = "The questionnaire score indicates the facility is in acceptable condition.";
  }

  return { issues, actions, severity, confidence, summary };
}

