import React from "react";

export default function VisionFindings({ analysis }) {
  if (analysis?.status !== "completed") return null;

  return (
    <section aria-label="AI analysis" className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
        <div className="rounded-xl bg-brand-soft p-4 text-brand-dark">
          <p className="text-xs font-bold">Visual condition score</p>
          {analysis.visualConditionIndex == null ? (
            <p className="mt-1 text-lg font-extrabold">Not scored</p>
          ) : (
            <p className="mt-1 font-display text-4xl font-extrabold tabular-nums">
              {analysis.visualConditionIndex} <span className="text-sm font-semibold">/ 100</span>
            </p>
          )}
          <p className="mt-2 text-xs font-semibold capitalize">Priority · {analysis.priority || "unknown"}</p>
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Summary</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{analysis.overallSummary}</p>
        </div>
      </div>
      {!!analysis.categories?.length && (
        <div>
          <h3 className="mb-3 text-sm font-extrabold text-slate-900">Category findings</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.categories.map((category) => (
              <article key={category.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-extrabold text-slate-800">{category.label}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">{category.observable ? category.severity : "Not visible"}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{category.condition}</p>
                {!!category.defects?.length && <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-rose-700">{category.defects.map((defect, index) => <li key={`${defect.description}-${index}`}>{defect.description}</li>)}</ul>}
                {category.maintenance && <p className="mt-2 text-xs font-semibold text-brand-dark">Action: {category.maintenance}</p>}
              </article>
            ))}
          </div>
        </div>
      )}
      {!!analysis.imageFindings?.length && (
        <div>
          <h3 className="mb-2 text-sm font-extrabold text-slate-900">Photo-by-photo observations</h3>
          <div className="space-y-2">{analysis.imageFindings.map((finding) => <p key={`${finding.imageIndex}-${finding.filename}`} className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700"><b>Photo {finding.imageIndex + 1}:</b> {finding.observations}</p>)}</div>
        </div>
      )}
      <p className="border-t border-slate-100 pt-3 text-[11px] leading-relaxed text-slate-500">{analysis.disclaimer}</p>
    </section>
  );
}
