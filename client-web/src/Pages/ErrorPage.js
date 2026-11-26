import React from "react";
import { Link, useNavigate, useRouteError } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Compass, Home } from "lucide-react";
import symbolImg from "../Assets/symbol.png";

export default function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const status = error?.status || 404;
  const title =
    status === 404
      ? "Page not found"
      : status === 401 || status === 403
      ? "Access restricted"
      : "Something went wrong";
  const detail =
    error?.statusText ||
    error?.message ||
    "The page you requested could not be found or is temporarily unavailable.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 text-center font-sans text-slate-900">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 p-2.5">
          <img src={symbolImg} alt="KhelGujarat emblem" className="h-full w-full object-contain" />
        </div>

        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5" />
          Error {status}
        </div>

        <h1 className="mt-3 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{detail}</p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-brand-dark"
          >
            <Home className="h-4 w-4" />
            Portal Home
          </Link>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-brand-primary transition hover:bg-emerald-100"
          >
            <Compass className="h-4 w-4" />
            Explore Venues
          </Link>
        </div>
      </div>
    </div>
  );
}
