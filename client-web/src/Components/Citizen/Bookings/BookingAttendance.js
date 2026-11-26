import React, { useEffect, useState } from "react";
import { api } from "../../../API/client";
import { RotateCw, Clock } from "lucide-react";

const formatTime = (value) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
};

export default function BookingAttendance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.get("/api/citizen/booking-attendance");
      setRows(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Facility attendance
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Entry and exit recorded from your booking QR passes.
          </p>
        </div>
        <button
          onClick={load}
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : !rows.length ? (
        <p className="mt-4 text-sm text-slate-500">
          No gate attendance recorded yet.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          {rows.map((row) => (
            <article
              key={row.id}
              className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="font-bold text-slate-800 text-sm truncate">
                  {row.facilityName}
                </p>
                <p className="text-xs text-slate-500 font-medium">
                  {row.sport} · {row.date}
                  {row.durationMinutes ? ` · ${row.durationMinutes} mins` : ""}
                </p>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end sm:text-right shrink-0">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                    row.status === "Completed"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {row.status}
                </span>
                <p className="font-mono text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                  <span>
                    In: {formatTime(row.entry)}
                    {row.exit ? ` · Out: ${formatTime(row.exit)}` : ""}
                  </span>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
