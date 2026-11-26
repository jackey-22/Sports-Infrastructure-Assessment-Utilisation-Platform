import React from "react";

export default function VisionFindings({ analysis }) {
  if (analysis?.status !== "completed") return null;

  return (
    <section aria-label="AI analysis" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center sm:p-5">
      <div className="rounded-xl bg-brand-soft p-4 text-brand-dark">
        <p className="text-xs font-bold">Visual condition score</p>
        {analysis.visualConditionIndex == null ? (
          <p className="mt-1 text-lg font-extrabold">Not scored</p>
        ) : (
          <p className="mt-1 font-display text-4xl font-extrabold tabular-nums">
            {analysis.visualConditionIndex} <span className="text-sm font-semibold">/ 100</span>
          </p>
        )}
      </div>
      <div>
        <h3 className="text-sm font-extrabold text-slate-900">Summary</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">{analysis.overallSummary}</p>
      </div>
    </section>
  );
}
