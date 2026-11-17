import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle, ChevronLeft, ChevronRight, Download, Loader2, Lock, MapPin, ShieldCheck, Users, X } from "lucide-react";
import { useSelector } from "react-redux";
import { api } from "../../API/client";
import { downloadBookingInvoice } from "../../utils/bookingInvoice";

const fieldClass = "w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";
const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Razorpay Checkout.")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}

function bookingTotal(config, memberCount) {
  if (!config) return 0;
  const base = Number(config.price?.amount) || 0;
  const perMember = Number(config.price?.perMemberAmount) || 0;
  if (config.price?.calculation === "per-member") return (perMember || base) * memberCount;
  if (config.price?.calculation === "base-plus-member") return base + perMember * memberCount;
  return base;
}

export default function CitizenBookingModal({ facility, onClose = () => {}, onConfirm = () => {}, standalone = false }) {
  const [configs, setConfigs] = useState([]);
  const [configId, setConfigId] = useState("");
  const [slotId, setSlotId] = useState("");
  const reduxUser = useSelector((state) => state.user?.user);
  const [currentCitizen, setCurrentCitizen] = useState(reduxUser?.Role === 0 ? reduxUser : null);
  const [name, setName] = useState(reduxUser?.Role === 0 ? reduxUser.Name || "" : "");
  const [email, setEmail] = useState(reduxUser?.Role === 0 ? reduxUser.Email || "" : "");
  const [phone, setPhone] = useState(reduxUser?.Role === 0 ? reduxUser.ContactNum || "" : "");
  const [date, setDate] = useState(today());
  const [memberCount, setMemberCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(today().slice(0, 7));

  useEffect(() => {
    if (reduxUser?.Role === 0) {
      setCurrentCitizen(reduxUser);
      setName(reduxUser.Name || "");
      setEmail(reduxUser.Email || "");
      setPhone(reduxUser.ContactNum || "");
      return;
    }
    const token = window.localStorage.getItem("token");
    if (!token || token.startsWith("demo:")) return;
    api.post("/verify", { token }, { auth: false })
      .then((response) => {
        if (response.data?.Role === 0) {
          setCurrentCitizen(response.data);
          setName(response.data.Name || "");
          setEmail(response.data.Email || "");
          setPhone(response.data.ContactNum || "");
        }
      })
      .catch(() => {});
  }, [reduxUser]);

  useEffect(() => {
    if (!facility) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.get(`/api/public/sport-configs?facilityId=${encodeURIComponent(facility.id)}&facilityName=${encodeURIComponent(facility.name)}`, { auth: false, signal: controller.signal })
      .then((response) => {
        const rows = response.data?.configs || [];
        setConfigs(rows);
        if (rows[0]) {
          setConfigId(rows[0].id);
        }
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [facility]);

  useEffect(() => {
    if (!configId) return undefined;
    const controller = new AbortController();
    setAvailabilityLoading(true);
    setAvailability(null);
    api.get(`/api/public/sport-configs/${configId}/availability`, { auth: false, signal: controller.signal })
      .then((response) => {
        const next = response.data;
        setAvailability(next);
        const firstDate = next.dates?.find((entry) => entry.slots.some((entrySlot) => entrySlot.remaining > 0)) || next.dates?.[0];
        if (firstDate) {
          setDate(firstDate.date);
          setCalendarMonth(firstDate.date.slice(0, 7));
          const firstSlot = firstDate.slots.find((entrySlot) => entrySlot.remaining > 0) || firstDate.slots[0];
          setSlotId(firstSlot?.id || "");
          setMemberCount(Number(firstSlot?.bookingPolicy?.minMembers) || 1);
        }
      })
      .catch((loadError) => { if (loadError.name !== "AbortError") setError(loadError.message); })
      .finally(() => { if (!controller.signal.aborted) setAvailabilityLoading(false); });
    return () => controller.abort();
  }, [configId]);

  const config = useMemo(() => configs.find((row) => row.id === configId), [configs, configId]);
  const selectedDateAvailability = availability?.dates?.find((entry) => entry.date === date);
  const availableSlots = selectedDateAvailability?.slots || [];
  const slot = availableSlots.find((row) => row.id === slotId);
  const policy = slot?.bookingPolicy || config?.bookingPolicy || {};
  const isGroup = policy.reservationType === "group";
  const isExclusive = policy.inventoryMode === "exclusive-unit";
  const total = bookingTotal(config, memberCount);

  const chooseConfig = (nextId) => {
    setConfigId(nextId);
    setSlotId("");
  };

  const chooseSlot = (nextSlotId) => {
    const nextSlot = availableSlots.find((row) => row.id === nextSlotId);
    setSlotId(nextSlotId);
    setMemberCount(Number(nextSlot?.bookingPolicy?.minMembers) || 1);
  };

  const launchPayment = async (created) => {
    setSaving(true);
    setError("");
    try {
      await loadRazorpayCheckout();
      const payment = created.payment;
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        order_id: payment.orderId,
        name: "KhelGujarat",
        description: payment.description,
        prefill: payment.prefill,
        timeout: 900,
        theme: { color: "#2563eb" },
        handler: async (gatewayResponse) => {
          try {
            const verified = await api.post(
              `/api/public/bookings/${created.id}/payment/verify`,
              gatewayResponse,
              { auth: false }
            );
            const confirmed = {
              ...created,
              status: verified.data.bookingStatus,
              paymentStatus: verified.data.paymentStatus,
              paidAt: verified.data.paidAt,
              paymentId: verified.data.razorpayPaymentId,
            };
            setBooking(confirmed);
            setPendingBooking(null);
            onConfirm(confirmed);
          } catch (verifyError) {
            setError(verifyError.message);
          } finally {
            setSaving(false);
          }
        },
        modal: {
          ondismiss: () => {
            setError("Payment was not completed. Your court is held for 15 minutes; you can retry below.");
            setSaving(false);
          },
        },
      });
      checkout.on("payment.failed", (failure) => {
        setError(failure.error?.description || "Payment failed. Please try again.");
        setSaving(false);
      });
      checkout.open();
    } catch (paymentError) {
      setError(paymentError.message);
      setSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await api.post("/api/public/bookings", {
        configId, slotId, name, email, phone, date, memberCount,
      });
      setPendingBooking(response.data);
      await launchPayment(response.data);
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  };

  if (!facility) return null;

  return <div className={standalone ? "py-4" : "fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"}>
    <div className={`mx-auto my-4 w-full ${standalone ? "max-w-[1380px]" : "max-w-xl"} overflow-hidden rounded-3xl border border-slate-200 bg-white ${standalone ? "shadow-sm" : "shadow-2xl"}`}>
      <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-800 p-6 text-white sm:p-8">
        <div className="relative z-10"><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">Public Pay & Play</p><h3 className="mt-2 text-2xl font-extrabold sm:text-3xl">Book your sport</h3><p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-100"><MapPin className="h-4 w-4" />{facility.name}</p></div>
        {facility.picture ? <img src={facility.picture} alt="" className="absolute right-0 top-0 h-full w-2/5 object-cover opacity-20 [mask-image:linear-gradient(to_left,black,transparent)]" /> : null}
        {!standalone ? <button type="button" onClick={onClose} className="rounded-xl bg-white/10 p-2 hover:bg-white/20"><X className="h-5 w-5" /></button> : null}
      </div>

      <div className={standalone ? "p-5 sm:p-8" : "p-6"}>
        {booking ? <div className="mx-auto max-w-2xl space-y-5 py-8 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
          <div><h4 className="text-xl font-extrabold text-slate-800">Payment successful</h4><p className="mt-1 text-sm text-slate-500">Booking {booking.reference} is confirmed</p></div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left text-sm">
            <p className="font-extrabold text-slate-800">{booking.sport} · {booking.slot?.label}</p>
            <p className="mt-1 text-slate-600">{date} · {booking.slot?.startTime}–{booking.slot?.endTime}</p>
            <p className="mt-1 text-slate-600">{booking.memberCount} {booking.memberCount === 1 ? "athlete" : "members"} · {booking.inventoryMode === "exclusive-unit" ? "whole court/field reserved" : "shared-capacity booking"}</p>
            <div className="mt-4 flex justify-between border-t border-emerald-200 pt-3 font-bold"><span>{booking.status}</span><span>₹{booking.totalAmount} paid</span></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => downloadBookingInvoice({ ...booking, name, facility: facility.name, date, timeLabel: `${booking.slot?.startTime} - ${booking.slot?.endTime}`, members: booking.memberCount, amount: booking.totalAmount })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white hover:bg-emerald-800"><Download className="h-4 w-4" />Download invoice</button><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Done</button></div>
        </div> : pendingBooking ? <div className="mx-auto max-w-xl space-y-5 py-8 text-center">
          <div><h4 className="text-xl font-extrabold text-slate-800">Payment pending</h4><p className="mt-1 text-sm text-slate-500">Booking reference {pendingBooking.reference}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left text-sm text-slate-700"><p>The selected court or capacity is held for 15 minutes.</p><p className="mt-2 font-bold">Amount: ₹{pendingBooking.totalAmount}</p></div>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <button type="button" disabled={saving} onClick={() => launchPayment(pendingBooking)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Pay securely with Razorpay</button>
          <button type="button" onClick={onClose} className="w-full rounded-xl py-2 text-sm font-bold text-slate-500">Cancel</button>
        </div> : loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : configs.length === 0 ? <div className="py-12 text-center"><p className="font-bold text-slate-700">Online booking is not configured for this facility yet.</p><button type="button" onClick={onClose} className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Close</button></div> : <form onSubmit={submit} className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.55fr)_380px]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-slate-200 p-5"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step 1</p><h4 className="mt-1 text-lg font-extrabold text-slate-900">Sport and booking details</h4></div>
              {currentCitizen ? <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><Lock className="h-4 w-4" />Booking as {currentCitizen.Name}. Contact details come from your account.</div> : null}
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Sport"><select className={fieldClass} value={configId} onChange={(event) => chooseConfig(event.target.value)}>{configs.map((row) => <option key={row.id} value={row.id}>{row.sport?.SportName}</option>)}</select></Field><Field label="Booker name"><input readOnly={Boolean(currentCitizen)} className={`${fieldClass} ${currentCitizen ? "bg-slate-100 text-slate-500" : ""}`} value={name} onChange={(event) => setName(event.target.value)} required /></Field><Field label="Mobile number"><input readOnly={Boolean(currentCitizen)} className={`${fieldClass} ${currentCitizen ? "bg-slate-100 text-slate-500" : ""}`} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></Field><Field label="Email (optional)"><input readOnly={Boolean(currentCitizen)} className={`${fieldClass} ${currentCitizen ? "bg-slate-100 text-slate-500" : ""}`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field></div>
            </section>
            <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step 2</p><h4 className="mt-1 text-lg font-extrabold text-slate-900">Choose a date</h4></div>{availabilityLoading ? <div className="flex justify-center rounded-2xl border border-slate-200 py-12"><Loader2 className="h-6 w-6 animate-spin text-emerald-700" /></div> : availability ? <AvailabilityCalendar availability={availability} selectedDate={date} onSelectDate={(nextDate) => { const entry = availability.dates.find((item) => item.date === nextDate); const firstSlot = entry?.slots.find((item) => item.remaining > 0) || entry?.slots[0]; setDate(nextDate); setSlotId(firstSlot?.id || ""); setMemberCount(Number(firstSlot?.bookingPolicy?.minMembers) || 1); }} month={calendarMonth} onMonthChange={setCalendarMonth} /> : null}</section>
            <section><div className="mb-3"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step 3</p><h4 className="mt-1 text-lg font-extrabold text-slate-900">Available slots on {date}</h4></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{availableSlots.map((row) => <button key={row.id} type="button" disabled={row.remaining === 0} onClick={() => chooseSlot(row.id)} className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${slotId === row.id ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/10" : "border-slate-200 bg-white hover:border-emerald-400"}`}><div className="flex items-start justify-between gap-2"><p className="text-sm font-extrabold text-slate-800">{row.label}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.remaining ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{row.remaining} {row.inventoryLabel} left</span></div><p className="mt-2 text-xs text-slate-500">{row.startTime}–{row.endTime}</p><p className="mt-1 text-xs text-slate-500">{row.audience} · {row.purpose}</p>{row.coach ? <p className="mt-2 text-xs font-semibold text-emerald-700">Coach: {row.coach}</p> : null}</button>)}</div>{availableSlots.length === 0 ? <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">No slots operate on this date.</p> : null}</section>
          </div>
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Booking summary</p><h4 className="mt-2 text-lg font-extrabold text-slate-900">{config?.sport?.SportName}</h4><div className="mt-4 space-y-3 text-sm"><Summary label="Facility" value={facility.name} /><Summary label="Date" value={date} /><Summary label="Slot" value={slot ? `${slot.startTime}–${slot.endTime}` : "Select a slot"} /><Summary label="Availability" value={slot ? `${slot.remaining} ${slot.inventoryLabel} left` : "—"} /></div>{isGroup ? <div className="mt-4"><Field label="Number of members"><input className={fieldClass} type="number" min={policy.minMembers || 1} max={policy.maxMembers || 1} value={memberCount} onChange={(event) => setMemberCount(Number(event.target.value))} required /></Field></div> : null}</div>
            <div className={`rounded-2xl border p-4 ${isExclusive ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}><div className="flex items-start gap-3"><Users className="mt-0.5 h-5 w-5 text-emerald-700" /><div><p className="text-sm font-extrabold text-slate-800">{isExclusive ? "Whole court or field reserved" : "Shared slot capacity"}</p><p className="mt-1 text-xs text-slate-600">{isExclusive ? `One athlete books for the group (${policy.minMembers}–${policy.maxMembers} members).` : `${slot?.remaining || 0} places currently available.`}</p></div></div></div>
            <div className="rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Amount due</p><p className="mt-1 text-3xl font-extrabold">₹{total}</p></div><ShieldCheck className="h-7 w-7 text-emerald-400" /></div><p className="mt-2 text-xs text-slate-400">Secure Razorpay checkout · inventory held for 15 minutes</p>{error ? <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200">{error}</p> : null}<button disabled={saving || !slotId || !slot?.remaining} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Proceed to payment</button><button type="button" onClick={onClose} className="mt-2 w-full py-2 text-xs font-bold text-slate-400 hover:text-white">Cancel</button></div>
          </aside>
        </form>}
        {!booking && error && (loading || configs.length === 0) ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </div>
    </div>
  </div>;
}

function Field({ label, children }) {
  return <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span>{children}</label>;
}

function Summary({ label, value }) {
  return <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-2 last:border-0"><span className="text-slate-500">{label}</span><span className="text-right font-bold text-slate-800">{value}</span></div>;
}

function AvailabilityCalendar({ availability, selectedDate, onSelectDate, month, onMonthChange }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const leading = first.getDay();
  const days = new Date(year, monthNumber, 0).getDate();
  const byDate = new Map((availability.dates || []).map((entry) => [entry.date, entry]));
  const startMonth = availability.window.start.slice(0, 7);
  const endMonth = availability.window.end.slice(0, 7);
  const moveMonth = (offset) => {
    const next = new Date(year, monthNumber - 1 + offset, 1);
    onMonthChange(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };
  const cells = Array.from({ length: leading }, () => null).concat(Array.from({ length: days }, (_, index) => index + 1));
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
    <div className="mb-3 flex items-center justify-between"><button type="button" disabled={month <= startMonth} onClick={() => moveMonth(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-white disabled:opacity-25"><ChevronLeft className="h-4 w-4" /></button><div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-700" /><p className="text-sm font-extrabold text-slate-800">{first.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p></div><button type="button" disabled={month >= endMonth} onClick={() => moveMonth(1)} className="rounded-lg p-2 text-slate-500 hover:bg-white disabled:opacity-25"><ChevronRight className="h-4 w-4" /></button></div>
    <div className="grid grid-cols-7 gap-1 text-center">{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-1 text-[10px] font-bold uppercase text-slate-400">{day}</div>)}{cells.map((day, index) => {
      if (!day) return <div key={`blank-${index}`} />;
      const value = `${month}-${String(day).padStart(2, "0")}`;
      const entry = byDate.get(value);
      const inWindow = value >= availability.window.start && value <= availability.window.end;
      const available = entry?.available || 0;
      return <button key={value} type="button" disabled={!inWindow || !entry} onClick={() => onSelectDate(value)} className={`min-h-14 rounded-lg border px-1 py-1 text-xs transition ${selectedDate === value ? "border-emerald-700 bg-emerald-700 text-white" : inWindow ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-400" : "border-transparent text-slate-300"}`}><span className="block font-bold">{day}</span>{inWindow ? <span className={`mt-1 block text-[9px] font-semibold ${selectedDate === value ? "text-emerald-100" : available ? "text-emerald-600" : "text-red-400"}`}>{available ? `${available} open` : "Full"}</span> : null}</button>;
    })}</div>
    <p className="mt-3 text-center text-[10px] font-semibold text-slate-500">Bookings open only for the next two months. Availability updates from confirmed bookings and active payment holds.</p>
  </div>;
}
