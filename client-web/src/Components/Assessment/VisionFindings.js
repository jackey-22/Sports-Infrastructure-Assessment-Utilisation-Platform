import React from "react";

const SEVERITY_CLASS = {
  none: "bg-emerald-50 text-emerald-800",
  low: "bg-lime-50 text-lime-800",
  moderate: "bg-amber-50 text-amber-800",
  high: "bg-red-50 text-red-800",
  unknown: "bg-slate-100 text-slate-600",
};

function Severity({ value }) {
  const label = value || "unknown";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_CLASS[label] || SEVERITY_CLASS.unknown}`}>
      {label}
    </span>
  );
}

export default function VisionFindings({ analysis }) {
  if (!analysis || analysis.status !== "completed") return null;
  const categories = analysis.categories || [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
          AI image analysis
        </p>
        <p className="mt-1 text-sm font-semibold text-slate-800">{analysis.overallSummary}</p>
        <p className="mt-2 text-[11px] text-slate-600">
          {analysis.provider} · {analysis.model}
          {analysis.analysedAt ? ` · ${analysis.analysedAt}` : ""}
          {analysis.priority ? ` · Priority ${analysis.priority}` : ""}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{analysis.transmissionNote}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-700">{analysis.disclaimer}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Visual condition index
        </p>
        <p className="mt-1 text-2xl font-extrabold text-brand-dark">
          {analysis.visualConditionIndex == null ? "Not calculated" : analysis.visualConditionIndex}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">{analysis.scoreMethod}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {categories.map((category) => (
          <article key={category.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-bold text-brand-dark">{category.label}</h3>
              <Severity value={category.severity} />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-700">{category.condition}</p>
            {category.observable ? (
              <>
                {category.evidence && category.evidence.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-600">
                    {category.evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
                {category.defects && category.defects.length ? (
                  <ul className="mt-2 space-y-1">
                    {category.defects.map((defect) => (
                      <li key={defect.description} className="text-[11px] text-slate-700">
                        Defect: {defect.description} ({defect.severity})
                      </li>
                    ))}
                  </ul>
                ) : null}
                {category.maintenance ? (
                  <p className="mt-2 text-[11px] text-slate-700">
                    Maintenance: {category.maintenance}
                  </p>
                ) : null}
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  From photograph · confidence {Math.round((category.confidence || 0) * 100)}%
                </p>
              </>
            ) : (
              <p className="mt-2 text-[11px] font-semibold text-slate-500">
                Not observable in the photographs.
              </p>
            )}
          </article>
        ))}
      </div>

      {analysis.imageFindings && analysis.imageFindings.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Image-specific findings
          </p>
          <ul className="mt-2 space-y-2">
            {analysis.imageFindings.map((finding) => (
              <li key={`${finding.imageIndex}-${finding.filename}`} className="text-xs text-slate-700">
                <span className="font-semibold">{finding.filename || `Photo ${finding.imageIndex + 1}`}: </span>
                {finding.observations}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {analysis.uncertain && analysis.uncertain.length ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            Uncertain or not visible
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
            {analysis.uncertain.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {analysis.managerClaimsNotVerified && analysis.managerClaimsNotVerified.length ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Manager notes not confirmed by photographs
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
            {analysis.managerClaimsNotVerified.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
