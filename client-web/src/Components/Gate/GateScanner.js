import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLoaderData } from "react-router-dom";
import {
  Camera,
  CheckCircle2,
  Clock,
  LogOut,
  MessageSquareWarning,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { api } from "../../API/client";
import symbolImg from "../../Assets/symbol.png";

function CameraReader({ onRead, onError }) {
  const video = useRef(null);
  const callbacks = useRef({ onRead, onError });
  callbacks.current = { onRead, onError };

  useEffect(() => {
    let alive = true;
    let controls;
    let found = false;
    import("@zxing/browser")
      .then(async ({ BrowserQRCodeReader }) => {
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromVideoDevice(undefined, video.current, (result) => {
          if (alive && result && !found) {
            found = true;
            callbacks.current.onRead(result.getText());
          }
        });
        if (!alive) controls.stop();
      })
      .catch((error) => {
        if (alive) callbacks.current.onError(error.message || "Camera could not start");
      });
    return () => {
      alive = false;
      controls?.stop();
    };
  }, []);

  return <video ref={video} autoPlay muted playsInline className="max-h-80 w-full rounded-2xl bg-slate-950 object-cover" />;
}

export default function GateScanner({ embedded = false }) {
  const navigate = useNavigate();
  const user = useLoaderData();
  const [camera, setCamera] = useState(false);
  const [raw, setRaw] = useState("");
  const [pass, setPass] = useState(null);
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loadingRows, setLoadingRows] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const token = useRef("");
  const lock = useRef(false);

  const load = async () => {
    setLoadingRows(true);
    try {
      const result = await api.get("/api/gate/attendance");
      setRows(result.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRows(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const scan = async (value) => {
    if (lock.current) return;
    setCamera(false);
    setError("");
    setMessage("");
    setPass(null);
    try {
      const payload = JSON.parse(value);
      if (payload.type !== "KHELGUJARAT_BOOKING_PASS" || typeof payload.token !== "string") {
        throw new Error("Invalid QR code. Please scan an official KhelGujarat booking QR pass.");
      }
      lock.current = true;
      setBusy(true);
      const result = await api.post("/api/booking-passes/verify", { token: payload.token });
      token.current = payload.token;
      setPass(result.data);
    } catch (err) {
      setError(err instanceof SyntaxError ? "Invalid QR payload format." : err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const record = async (action) => {
    if (lock.current || !pass) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.post("/api/gate/attendance", { token: token.current, action });
      setMessage(`${result.msg}: ${pass.userName}`);
      setPass(null);
      setRaw("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <div className={embedded ? "bg-slate-50/50" : "min-h-screen bg-slate-50 font-sans text-slate-900"}>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div className="flex items-center gap-3.5">
            {!embedded ? (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 p-1.5">
                <img src={symbolImg} alt="KhelGujarat emblem" className="h-full w-full object-contain" />
              </div>
            ) : null}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
                KhelGujarat · Facility Gate Desk
              </p>
              <h1 className="mt-0.5 font-display text-2xl font-extrabold text-slate-900">
                QR Entry &amp; Attendance Scanner
              </h1>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                Operator: {user?.Name || "Gate Desk"}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!embedded ? (
              <button
                type="button"
                onClick={() => navigate("/gate/grievances")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <MessageSquareWarning className="h-4 w-4 text-brand-primary" />
                Grievances
              </button>
            ) : null}
            {!embedded ? (
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("token");
                  navigate("/login", { replace: true });
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            ) : null}
          </div>
        </header>

        {error ? (
          <div role="alert" className="flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            <XCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {message ? (
          <div role="status" className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Scanner + Verified Pass */}
          <div className="space-y-6 lg:col-span-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ScanLine className="h-5 w-5 text-brand-primary" />
                  <h2 className="font-display text-lg font-extrabold text-slate-900">
                    Scan Booking QR Pass
                  </h2>
                </div>
                {camera ? (
                  <button
                    type="button"
                    onClick={() => setCamera(false)}
                    className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Stop Camera
                  </button>
                ) : null}
              </div>

              {camera ? (
                <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200">
                  <CameraReader
                    onRead={scan}
                    onError={(msg) => {
                      setCamera(false);
                      setError(msg);
                    }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setCamera(true);
                  }}
                  className="mb-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-brand-dark disabled:opacity-50"
                >
                  <Camera className="h-4 w-4" />
                  Open Camera Scanner
                </button>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  scan(raw);
                }}
                className="space-y-3 border-t border-slate-100 pt-4"
              >
                <label className="block text-xs font-bold text-slate-600">
                  USB Handheld Scanner / Paste QR Payload
                  <textarea
                    aria-label="Scanned QR content"
                    placeholder='{"type":"KHELGUJARAT_BOOKING_PASS","token":"..."}'
                    value={raw}
                    onChange={(event) => setRaw(event.target.value)}
                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-800 outline-none focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20"
                    rows={3}
                  />
                </label>
                <button
                  disabled={busy || !raw.trim()}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-brand-primary transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <QrCode className="h-4 w-4" />
                  {busy ? "Verifying pass..." : "Verify QR Pass"}
                </button>
              </form>
            </section>

            {pass ? (
              <section className="rounded-2xl border-2 border-emerald-300 bg-white p-5 shadow-md sm:p-6">
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">
                      Verified Pass Holder
                    </p>
                    <h2 className="mt-0.5 font-display text-xl font-extrabold text-slate-900">
                      {pass.userName}
                    </h2>
                    <p className="text-xs font-semibold text-slate-600">{pass.facilityName}</p>
                  </div>
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    {pass.status}
                  </span>
                </div>

                <div className="mt-4 space-y-1.5 text-sm text-slate-700">
                  <p className="font-bold">
                    {pass.sport} · {pass.date} · {pass.session}
                  </p>
                  <p className="font-mono text-xs text-slate-500">Pass ID: {pass.passId}</p>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={busy || pass.status !== "Active"}
                    onClick={() => record("entry")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-xs transition hover:bg-brand-dark disabled:opacity-50"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Record Entry
                  </button>
                  <button
                    type="button"
                    disabled={busy || pass.status !== "Active"}
                    onClick={() => record("exit")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Record Exit
                  </button>
                </div>
              </section>
            ) : null}
          </div>

          {/* Right: Today's Attendance Log */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-6">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-display text-lg font-extrabold text-slate-900">
                  Today&apos;s Gate Attendance
                </h2>
                <p className="text-xs text-slate-500">Live entry and checkout log for this facility.</p>
              </div>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingRows ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {!rows.length ? (
              <div className="py-12 text-center">
                <Clock className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">No entries recorded today</p>
                <p className="mt-1 text-xs text-slate-500">
                  Scan an athlete or citizen&apos;s QR pass on the left to log check-in.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <article key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                    <div>
                      <p className="font-bold text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">
                        {row.sport} · <span className="font-mono">{row.reference}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                          row.status === "Completed"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-800"
                        }`}
                      >
                        {row.status}
                      </span>
                      <p className="mt-1 font-mono text-xs text-slate-500 tabular-nums">
                        In: {new Date(row.entry).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                        {row.exit
                          ? ` · Out: ${new Date(row.exit).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`
                          : ""}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
