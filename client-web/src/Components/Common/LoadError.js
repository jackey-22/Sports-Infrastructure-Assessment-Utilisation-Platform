import React from "react";

// Visible failure state for list screens. Keeps the table usable while
// telling the user the data could not be loaded.
export default function LoadError({ onRetry }) {
  return (
    <div
      role="alert"
      className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
    >
      <span>Could not load this list. Please check the connection and try again.</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="font-semibold text-red-800 underline hover:text-red-900"
        >
          Retry
        </button>
      )}
    </div>
  );
}
