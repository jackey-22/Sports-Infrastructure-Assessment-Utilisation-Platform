import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, CreditCard, Loader2, Plus, School, Trash2, Users } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../API/client";
import { getPublicFacilities } from "../../services/public/publicFacilityService";

const field = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const today = () => new Date().toLocaleDateString("en-CA");
const keyFor = (item) => `${item.configId}:${item.slotId}:${item.date}`;
const dateValue = (value) => new Date(`${value}T00:00:00`);
const displayDate = (value, options = {}) => dateValue(value).toLocaleDateString("en-IN", options);

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", () => reject(new Error("Could not load Razorpay Checkout.")), { once: true }); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

function estimate(config, slot, participantCount, units) {
  const base = Number(config.price?.amount) || 0;
  const perMember = Number(config.price?.perMemberAmount) || 0;
  const billableUnits = slot?.bookingPolicy?.inventoryMode === "exclusive-unit" ? units : 1;
  if (config.price?.calculation === "per-member") return (perMember || base) * participantCount;
  if (config.price?.calculation === "base-plus-member") return (base * billableUnits) + (perMember * participantCount);
  return base * billableUnits;
}

function calendarDays(month) {
  if (!month) return [];
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const last = new Date(year, monthNumber, 0);
  const result = Array(first.getDay()).fill(null);
  for (let day = 1; day <= last.getDate(); day += 1) result.push(`${year}-${String(monthNumber).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  return result;
}

function changeMonth(month, delta) {
  const [year, value] = month.split("-").map(Number);
  const next = new Date(year, value - 1 + delta, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

export default function InstitutionEvents({ createMode = false }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rows, setRows] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [selections, setSelections] = useState([]);
  const [activeDate, setActiveDate] = useState("");
  const [month, setMonth] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ facilityId: searchParams.get("facilityId") || "", eventName: "", eventType: "Annual Sports Meet", purpose: "", requirements: "" });
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const loadRows = () => api.get("/api/institute/events").then((response) => setRows(response.data || [])).catch((err) => setError(err.message));

  useEffect(() => { if (!createMode) loadRows(); }, [createMode]);
  useEffect(() => { if (createMode) getPublicFacilities({ bookableOnly: true }).then(setFacilities).catch((err) => setError(err.message)); }, [createMode]);
  useEffect(() => {
    if (!form.facilityId || !createMode) { setCatalog([]); return; }
    let active = true;
    setLoadingCalendar(true); setSelections([]); setError("");
    api.get(`/api/public/sport-configs?facilityId=${encodeURIComponent(form.facilityId)}`, { auth: false })
      .then(async (response) => {
        const configs = response.data?.configs || [];
        const available = await Promise.all(configs.map(async (config) => {
          const result = await api.get(`/api/public/sport-configs/${config.id}/availability`, { auth: false });
          return { config, availability: result.data };
        }));
        if (!active) return;
        setCatalog(available);
        const first = available.flatMap((item) => item.availability?.dates || []).find((item) => item.slots?.some((slot) => slot.remaining > 0));
        if (first) { setActiveDate(first.date); setMonth(first.date.slice(0, 7)); }
      })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoadingCalendar(false); });
    return () => { active = false; };
  }, [createMode, form.facilityId]);

  const dateCatalog = useMemo(() => {
    const map = new Map();
    catalog.forEach(({ config, availability }) => (availability?.dates || []).forEach((entry) => {
      if (!map.has(entry.date)) map.set(entry.date, []);
      map.get(entry.date).push({ config, ...entry });
    }));
    return map;
  }, [catalog]);
  const allDates = useMemo(() => [...dateCatalog.keys()].sort(), [dateCatalog]);
  const windowStart = allDates[0] || today();
  const windowEnd = allDates.at(-1) || today();
  const selectedKeys = useMemo(() => new Set(selections.map(keyFor)), [selections]);
  const estimatedTotal = useMemo(() => selections.reduce((sum, item) => sum + estimate(item.config, item.slot, item.participantCount, item.requestedUnits), 0), [selections]);

  const addSelection = (config, slot, date) => {
    const item = { configId: config.id, slotId: String(slot.id), date, participantCount: 1, requestedUnits: 1, config, slot };
    if (selectedKeys.has(keyFor(item))) return;
    setSelections((current) => [...current, item]);
  };
  const removeSelection = (key) => setSelections((current) => current.filter((item) => keyFor(item) !== key));
  const setUnits = (key, units) => setSelections((current) => current.map((item) => keyFor(item) === key ? { ...item, requestedUnits: Math.max(1, Math.min(Number(item.slot.remaining) || 1, Number(units) || 1)) } : item));
  const setParticipants = (key, participants) => setSelections((current) => current.map((item) => {
    if (keyFor(item) !== key) return item;
    const exclusive = item.slot.bookingPolicy?.inventoryMode === "exclusive-unit";
    const maximum = exclusive ? 10000 : Math.max(1, Number(item.slot.remaining) || 1);
    return { ...item, participantCount: Math.max(1, Math.min(maximum, Math.floor(Number(participants) || 1))) };
  }));

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    if (!selections.length) { setBusy(false); return setError("Select at least one sport, slot and date from the calendar."); }
    try {
      await api.post("/api/institute/events", { ...form, selections: selections.map(({ configId, slotId, date, participantCount, requestedUnits }) => ({ configId, slotId, date, participantCount, requestedUnits })) });
      navigate("/institute");
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  const pay = async (row) => {
    setBusy(true); setError("");
    try {
      await loadRazorpay();
      const response = await api.post(`/api/institute/events/${row.id}/payment-order`, {});
      const payment = response.data;
      const checkout = new window.Razorpay({ key: payment.keyId, amount: payment.amount, currency: payment.currency, order_id: payment.orderId, name: "KhelGujarat", description: payment.description, prefill: payment.prefill, theme: { color: "#007D40" }, handler: async (gateway) => { try { await api.post(`/api/institute/events/${row.id}/payment/verify`, gateway); await loadRows(); } catch (err) { setError(err.message); } finally { setBusy(false); } }, modal: { ondismiss: () => { setError("Payment was not completed."); setBusy(false); } } });
      checkout.on("payment.failed", (failure) => { setError(failure.error?.description || "Payment failed."); setBusy(false); });
      checkout.open();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  if (createMode) {
    const dayOptions = dateCatalog.get(activeDate) || [];
    return <div className="mx-auto max-w-7xl p-5 sm:p-8"><header><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Bulk event booking</p><h1 className="mt-2 text-3xl font-extrabold text-slate-900">Build a multi-sport event schedule</h1><p className="mt-2 text-sm text-slate-600">Select multiple sports and slots on any available days. Prices shown are estimates; the facility manager issues the final quotation.</p></header>
      <form onSubmit={submit} className="mt-6 space-y-6">
        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 lg:grid-cols-3"><Field label="Facility"><select className={field} value={form.facilityId} onChange={(e) => update("facilityId", e.target.value)} required><option value="">Select facility</option>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.district}</option>)}</select></Field><Field label="Event name"><input className={field} value={form.eventName} onChange={(e) => update("eventName", e.target.value)} required /></Field><Field label="Event type"><select className={field} value={form.eventType} onChange={(e) => update("eventType", e.target.value)}><option>Annual Sports Meet</option><option>Tournament</option><option>Training Camp</option><option>Trials</option><option>Other</option></select></Field><Field label="Purpose"><textarea rows="2" className={field} value={form.purpose} onChange={(e) => update("purpose", e.target.value)} required /></Field><Field label="Requirements"><textarea rows="2" className={field} placeholder="Equipment, seating, officials…" value={form.requirements} onChange={(e) => update("requirements", e.target.value)} /></Field></section>

        {loadingCalendar ? <div className="flex justify-center rounded-3xl border bg-white py-20"><Loader2 className="h-8 w-8 animate-spin text-emerald-700" /></div> : form.facilityId && catalog.length ? <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
          <div className="space-y-5"><div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><button type="button" disabled={month <= windowStart.slice(0, 7)} onClick={() => setMonth(changeMonth(month, -1))} className="rounded-xl border p-2 disabled:opacity-30" aria-label="Previous month"><ChevronLeft /></button><h2 className="text-lg font-extrabold">{month ? new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "Availability"}</h2><button type="button" disabled={month >= windowEnd.slice(0, 7)} onClick={() => setMonth(changeMonth(month, 1))} className="rounded-xl border p-2 disabled:opacity-30" aria-label="Next month"><ChevronRight /></button></div><div className="mt-4 grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-slate-400">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div><div className="mt-2 grid grid-cols-7 gap-1">{calendarDays(month).map((date, index) => { if (!date) return <span key={`blank-${index}`} />; const options = dateCatalog.get(date) || []; const count = selections.filter((item) => item.date === date).length; const enabled = date >= windowStart && date <= windowEnd && options.some((item) => item.slots.some((slot) => slot.remaining > 0)); return <button type="button" key={date} disabled={!enabled} onClick={() => setActiveDate(date)} className={`relative min-h-16 rounded-xl border p-1 text-left transition ${activeDate === date ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20" : enabled ? "border-slate-200 hover:border-emerald-300" : "border-transparent bg-slate-50 text-slate-300"}`}><span className="text-xs font-bold">{Number(date.slice(-2))}</span>{enabled ? <span className="mt-1 block text-[9px] font-semibold text-emerald-700">{options.reduce((sum, item) => sum + item.slots.filter((slot) => slot.remaining > 0).length, 0)} slots</span> : null}{count ? <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-700 px-1 text-[9px] font-bold text-white">{count}</span> : null}</button>; })}</div><p className="mt-3 text-xs text-slate-500">Available from {displayDate(windowStart)} to {displayDate(windowEnd)}. Select a date to see every sport and slot.</p></div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-extrabold">{activeDate ? displayDate(activeDate, { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Select a date"}</h2><div className="mt-4 space-y-4">{dayOptions.map(({ config, slots }) => <div key={config.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><h3 className="font-extrabold text-slate-900">{config.sport?.SportName}</h3><p className="text-xs text-slate-500">{config.bookingPolicy?.inventoryMode === "exclusive-unit" ? `${config.unitCount} ${config.unitLabel}` : "Shared participant capacity"} · {config.price?.calculation?.replaceAll("-", " ")}</p></div><span className="text-sm font-extrabold text-emerald-700">from {money.format(config.price?.amount || 0)}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{slots.map((slot) => { const item = { configId: config.id, slotId: String(slot.id), date: activeDate }; const selected = selectedKeys.has(keyFor(item)); const enough = slot.remaining > 0; return <button key={slot.id} type="button" disabled={!enough} onClick={() => selected ? removeSelection(keyFor(item)) : addSelection(config, slot, activeDate)} className={`rounded-xl border p-3 text-left ${selected ? "border-emerald-600 bg-emerald-50" : enough ? "border-slate-200 hover:border-emerald-300" : "cursor-not-allowed bg-slate-50 opacity-50"}`}><div className="flex justify-between gap-2"><span className="text-sm font-bold">{slot.label}</span>{selected ? <Check className="h-4 w-4 text-emerald-700" /> : <Plus className="h-4 w-4 text-slate-400" />}</div><p className="mt-1 text-xs text-slate-500">{slot.startTime}–{slot.endTime} · {slot.remaining} {slot.inventoryLabel} left</p></button>; })}</div></div>)}{activeDate && !dayOptions.length ? <p className="py-8 text-center text-sm text-slate-500">No configured slots on this date.</p> : null}</div></div></div>

          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Event schedule</p><h2 className="mt-1 text-xl font-extrabold">{selections.length} selected slot{selections.length === 1 ? "" : "s"}</h2></div><CalendarDays className="h-7 w-7 text-emerald-700" /></div><div className="mt-4 max-h-[480px] space-y-3 overflow-y-auto pr-1">{selections.length ? [...selections].sort((a, b) => a.date.localeCompare(b.date) || a.slot.startTime.localeCompare(b.slot.startTime)).map((item) => { const exclusive = item.slot.bookingPolicy?.inventoryMode === "exclusive-unit"; const key = keyFor(item); return <div key={key} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold text-emerald-700">{displayDate(item.date, { day: "numeric", month: "short", weekday: "short" })}</p><p className="font-extrabold">{item.config.sport?.SportName}</p><p className="text-xs text-slate-500">{item.slot.label} · {item.slot.startTime}–{item.slot.endTime}</p></div><button type="button" onClick={() => removeSelection(key)} className="h-fit rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Remove selection"><Trash2 className="h-4 w-4" /></button></div><div className="mt-3 grid grid-cols-2 gap-2"><label className="text-xs font-bold text-slate-600">Participants<input type="number" min="1" max={exclusive ? undefined : item.slot.remaining} className="mt-1 w-full rounded-lg border px-2 py-1.5" value={item.participantCount} onChange={(e) => setParticipants(key, e.target.value)} /></label>{exclusive ? <label className="text-xs font-bold text-slate-600">{item.config.unitLabel || "Units"}<select className="mt-1 w-full rounded-lg border px-2 py-1.5" value={item.requestedUnits} onChange={(e) => setUnits(key, e.target.value)}>{Array.from({ length: Math.max(1, Number(item.slot.remaining) || 1) }, (_, index) => index + 1).map((value) => <option key={value}>{value}</option>)}</select></label> : <div className="rounded-lg bg-slate-50 p-2 text-xs text-slate-500"><strong className="block text-slate-700">Capacity booked</strong>{item.participantCount} of {item.slot.remaining} places</div>}</div><p className="mt-2 text-right text-sm font-extrabold">Est. {money.format(estimate(item.config, item.slot, item.participantCount, item.requestedUnits))}</p></div>; }) : <div className="rounded-xl border border-dashed p-6 text-center text-sm text-slate-500">Choose dates, sports and slots from the calendar.</div>}</div><div className="mt-5 border-t pt-4"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase text-slate-400">Estimated total</p><p className="text-xs text-slate-500">Only selected quantities; final price set by manager</p></div><p className="text-2xl font-extrabold text-emerald-800">{money.format(estimatedTotal)}</p></div>{error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}<button disabled={busy || !selections.length} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Submit complete event request</button><Link to="/institute" className="mt-2 block text-center text-xs font-bold text-slate-500">Cancel</Link></div></aside>
        </section> : form.facilityId ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center text-sm font-semibold text-amber-800">This facility has no event-bookable sports and slots.</div> : <div className="rounded-3xl border border-dashed bg-white p-10 text-center text-sm text-slate-500">Select a facility to load its multi-sport calendar.</div>}
      </form></div>;
  }

  return <div className="mx-auto max-w-6xl p-5 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Institution portal</p><h1 className="mt-2 text-3xl font-extrabold">Event requests</h1><p className="mt-2 text-sm text-slate-600">Track manager review, quotation, payment and confirmation.</p></div><Link to="/institute/new" className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />New request</Link></div>{error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}<div className="mt-6 space-y-4">{rows.length ? rows.map((row) => <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap justify-between gap-4"><div><p className="text-xs font-bold text-emerald-700">{row.bookingReference}</p><h2 className="mt-1 text-xl font-extrabold">{row.eventName}</h2><p className="mt-1 text-sm text-slate-500">{row.facilityName} · {row.selections?.length || 0} scheduled slots</p></div><Status value={row.status} /></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><Info icon={CalendarDays} label="Dates" value={`${displayDate(row.startDate)} to ${displayDate(row.endDate)}`} /><Info icon={Users} label="Students" value={row.participantCount} /><Info icon={School} label="Sports" value={[...new Set((row.selections || []).map((item) => item.sportName))].join(", ")} /></div><Schedule selections={row.selections || []} />{row.managerNote ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm"><strong>Manager note:</strong> {row.managerNote}</p> : null}<div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase text-slate-400">Original estimate</p><p className="font-extrabold">{money.format(row.estimatedAmount || 0)}</p></div>{row.status === "Approved" ? <div className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><div><p className="text-xs font-bold uppercase text-amber-700">Final quotation</p><p className="text-2xl font-extrabold">{money.format(row.quotedAmount)}</p></div><button disabled={busy} onClick={() => pay(row)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"><CreditCard className="h-4 w-4" />Pay with Razorpay</button></div> : null}{row.status === "Confirmed" ? <p className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="h-4 w-4" />Payment received and all selected slots confirmed</p> : null}</div></article>) : <div className="rounded-2xl border border-dashed bg-white p-10 text-center"><School className="mx-auto h-10 w-10 text-slate-300" /><h2 className="mt-3 font-extrabold">No event requests yet</h2><p className="mt-1 text-sm text-slate-500">Create your first multi-sport student event request.</p></div>}</div></div>;
}

function Schedule({ selections }) { return <details className="mt-4 rounded-xl border border-slate-200"><summary className="cursor-pointer px-4 py-3 text-sm font-bold">View complete schedule ({selections.length})</summary><div className="grid gap-2 border-t p-4 sm:grid-cols-2">{selections.map((item) => <div key={item.id} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="font-extrabold">{item.sportName}</p><p className="text-xs text-slate-500">{displayDate(item.date, { weekday: "short", day: "numeric", month: "short" })} · {item.slot?.startTime}–{item.slot?.endTime}</p><p className="text-xs text-slate-500">{item.participantCount} participants{item.inventoryMode === "exclusive-unit" ? ` · ${item.reservedUnits} ${item.baseUnitLabel}` : ""}</p></div>)}</div></details>; }
function Field({ label, children }) { return <label><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>; }
function Info({ icon: Icon, label, value }) { return <div className="flex gap-3 rounded-xl bg-slate-50 p-3"><Icon className="h-5 w-5 text-emerald-700" /><div><p className="text-xs font-bold text-slate-400">{label}</p><p className="font-semibold text-slate-700">{value}</p></div></div>; }
function Status({ value }) { const color = value === "Confirmed" ? "bg-emerald-100 text-emerald-800" : value === "Rejected" ? "bg-red-100 text-red-700" : value === "Approved" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"; return <span className={`h-fit rounded-full px-3 py-1 text-xs font-bold ${color}`}>{value}</span>; }
