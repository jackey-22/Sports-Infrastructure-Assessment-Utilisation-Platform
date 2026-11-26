import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { CalendarDays, Download, Loader2, QrCode, UserCheck, X } from "lucide-react";
import { api } from "../../API/client";

const formatPassDate = (value) => {
  if (!value) return "—";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function BookingPassCard({ pass, onClose = null }) {
  const [image, setImage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setImage("");
    setError("");
    if (pass?.qrPayload) {
      QRCode.toDataURL(pass.qrPayload, {
        width: 320,
        margin: 3,
        errorCorrectionLevel: "M",
        color: { dark: "#0B3D2E", light: "#FFFFFF" },
      })
        .then((value) => {
          if (active) setImage(value);
        })
        .catch(() => {
          if (active) setError("Could not generate QR pass. Please reload.");
        });
    }
    return () => {
      active = false;
    };
  }, [pass?.qrPayload]);

  if (!pass) return null;

  const isActive = pass.status === "Active" || pass.status === "Confirmed";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-lg">
      <header className="flex items-center justify-between gap-3 bg-brand-dark px-5 py-4 text-white">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            Digital Entry Pass
          </p>
          <h3 className="mt-0.5 flex items-center gap-2 font-display text-base font-extrabold">
            <QrCode className="h-4 w-4 text-emerald-300" />
            KhelGujarat Gate Pass
          </h3>
        </div>
        <div className="flex items-center gap-2.5">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              isActive
                ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/30"
                : "bg-white/10 text-slate-200 border border-white/20"
            }`}
          >
            {pass.status}
          </span>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close pass"
              className="rounded-lg border border-white/20 bg-white/10 p-1.5 text-white transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </header>

      <div className="grid items-center gap-6 p-5 sm:grid-cols-[200px_1fr] sm:p-6">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {image ? (
            <img
              src={image}
              alt={`Booking QR pass ${pass.passId}`}
              className="h-44 w-44 rounded-lg object-contain"
            />
          ) : pass.qrPayload ? (
            error ? (
              <p role="alert" className="p-4 text-center text-xs font-semibold text-rose-600">
                {error}
              </p>
            ) : (
              <div className="flex h-44 w-44 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
              </div>
            )
          ) : (
            <p className="p-4 text-center text-xs font-medium text-slate-500">
              This booking session has ended.
            </p>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div>
            <h4 className="font-display text-lg font-extrabold text-slate-900">
              {pass.facilityName}
            </h4>
            <p className="mt-0.5 text-sm font-bold text-brand-primary">{pass.sport}</p>
          </div>

          <div className="space-y-1.5 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="flex items-center gap-2 font-semibold text-slate-800">
              <CalendarDays className="h-4 w-4 shrink-0 text-brand-primary" />
              <span>
                {formatPassDate(pass.date)} · {pass.session}
              </span>
            </p>
            <p className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 shrink-0 text-slate-400" />
              <span>Beneficiary: <strong className="text-slate-800">{pass.userName}</strong></span>
            </p>
            <p className="font-mono text-[11px] text-slate-500">Pass ID: {pass.passId}</p>
            {pass.validTill ? (
              <p className="text-[11px] text-slate-500">Valid until {pass.validTill}</p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-slate-500">
              Present at gate scanner for check-in &amp; checkout.
            </p>
            {image ? (
              <a
                href={image}
                download={`${pass.passId}-qr.png`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-brand-dark"
              >
                <Download className="h-3.5 w-3.5" />
                Download Pass
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

export function LatestBookingPass() {
  const [pass, setPass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = () => {
      setLoading(true);
      setError("");
      api
        .get("/api/citizen/booking-pass/latest")
        .then((result) => {
          if (active) setPass(result.data);
        })
        .catch((err) => {
          if (active) setError(err.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    load();
    window.addEventListener("focus", load);
    window.addEventListener("booking-confirmed", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
      window.removeEventListener("booking-confirmed", load);
    };
  }, []);

  if (loading) {
    return (
      <div className="mb-5 h-44 animate-pulse rounded-2xl border border-slate-200 bg-white p-5" />
    );
  }

  return (
    <div className="mb-5">
      {error ? (
        <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : pass ? (
        <BookingPassCard pass={pass} />
      ) : null}
    </div>
  );
}
