import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, CheckCircle, ChevronLeft, ChevronRight, Clock, Download, Layers, Loader2, Lock, MapPin, Minus, Plus, ShieldCheck, Sparkles, Trash2, Users, X } from "lucide-react";
import { useSelector } from "react-redux";
import { api } from "../../API/client";
import { downloadBookingInvoice } from "../../utils/bookingInvoice";
import BookingPassCard from "../Booking/BookingPassCard";

const fieldClass = "w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";
const today = () => {
  const value = new Date();
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setUTCDate(d.getUTCDate() + Math.max(0, Number(days || 0) - 1));
  return d.toISOString().slice(0, 10);
}

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
  const [mode, setMode] = useState("slot"); // "slot" | "bulk" | "subscription"
  const [slotId, setSlotId] = useState("");
  const [bulkSelections, setBulkSelections] = useState([]);
  const [planId, setPlanId] = useState("");
  const [subStartDate, setSubStartDate] = useState(today());

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
  const [gatewayProof, setGatewayProof] = useState(null);
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
    setBulkSelections([]);
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
  const subscriptionPlans = useMemo(() => config?.subscriptionPlans || [], [config]);

  useEffect(() => {
    if (subscriptionPlans.length) {
      setPlanId(subscriptionPlans[0]._id || "");
    } else {
      setPlanId("");
      if (mode === "subscription") setMode("slot");
    }
  }, [subscriptionPlans, mode]);

  const selectedPlan = useMemo(
    () => subscriptionPlans.find((p) => String(p._id) === String(planId)) || subscriptionPlans[0] || null,
    [subscriptionPlans, planId]
  );

  const selectedDateAvailability = availability?.dates?.find((entry) => entry.date === date);
  const availableSlots = selectedDateAvailability?.slots || [];
  const slot = availableSlots.find((row) => row.id === slotId);
  const policy = slot?.bookingPolicy || config?.bookingPolicy || {};
  const isGroup = policy.reservationType === "group";
  const isExclusive = policy.inventoryMode === "exclusive-unit";
  const singleTotal = bookingTotal(config, memberCount);
  const bulkTotal = bulkSelections.reduce((sum, item) => sum + bookingTotal(config, item.memberCount), 0);
  const total = mode === "subscription"
    ? Number(selectedPlan?.price) || 0
    : mode === "bulk"
      ? bulkTotal
      : singleTotal;

  const chooseConfig = (nextId) => {
    setConfigId(nextId);
    setSlotId("");
    setBulkSelections([]);
  };

  const chooseSlot = (nextSlotId) => {
    const nextSlot = availableSlots.find((row) => row.id === nextSlotId);
    if (mode === "bulk") {
      if (!nextSlot || !nextSlot.remaining) return;
      const key = `${date}:${nextSlot.id}`;
      setBulkSelections((prev) => {
        const exists = prev.find((item) => item.key === key);
        if (exists) return prev.filter((item) => item.key !== key);
        const minM = Number(nextSlot.bookingPolicy?.minMembers) || 1;
        const maxM = Number(nextSlot.bookingPolicy?.maxMembers) || 1;
        const exclusive = nextSlot.bookingPolicy?.inventoryMode === "exclusive-unit";
        const effectiveMax = exclusive ? maxM : Math.max(minM, Math.min(maxM, Number(nextSlot.remaining) || maxM));
        const isGroupSlot = nextSlot.bookingPolicy?.reservationType === "group" && effectiveMax > 1;
        return [
          ...prev,
          {
            key,
            date,
            slotId: nextSlot.id,
            slotLabel: nextSlot.label,
            startTime: nextSlot.startTime,
            endTime: nextSlot.endTime,
            isGroup: isGroupSlot,
            minMembers: minM,
            maxMembers: effectiveMax,
            exclusive,
            memberCount: Math.max(minM, Math.min(memberCount, effectiveMax)),
          },
        ];
      });
      return;
    }
    setSlotId(nextSlotId);
    setMemberCount(Number(nextSlot?.bookingPolicy?.minMembers) || 1);
  };

  const updateBulkMemberCount = (key, nextValue) => {
    setBulkSelections((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item;
        const parsed = Math.floor(Number(nextValue));
        const safe = Number.isFinite(parsed)
          ? Math.max(item.minMembers || 1, Math.min(parsed, item.maxMembers || 1))
          : item.minMembers || 1;
        return { ...item, memberCount: safe };
      })
    );
  };

  const verifyPayment = async (created, gatewayResponse) => {
    setSaving(true);
    setError("");
    setGatewayProof(gatewayResponse);
    try {
      const verified = await api.post(
        `/api/public/bookings/${created.id}/payment/verify`,
        gatewayResponse,
        { auth: false }
      );
      const confirmed = {
        ...created,
        pass: verified.data.pass,
        passes: verified.data.passes || (verified.data.pass ? [verified.data.pass] : []),
        status: verified.data.bookingStatus,
        paymentStatus: verified.data.paymentStatus,
        paidAt: verified.data.paidAt,
        paymentId: verified.data.razorpayPaymentId,
      };
      if (confirmed.status !== "Confirmed" || confirmed.paymentStatus !== "Paid") throw new Error("Payment has not been confirmed yet");
      setBooking(confirmed);
      window.dispatchEvent(new Event("booking-confirmed"));
      setPendingBooking(null);
      setGatewayProof(null);
      onConfirm(confirmed);
    } catch (verifyError) {
      setError(verifyError.message);
    } finally {
      setSaving(false);
    }
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
        theme: { color: "#007D40" },
        handler: (gatewayResponse) => verifyPayment(created, gatewayResponse),
        modal: {
          ondismiss: () => {
            setError("Payment was not completed. Your reservation hold lasts 15 minutes; you can retry below.");
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
      let payload;
      if (mode === "subscription") {
        if (!selectedPlan) throw new Error("Select a subscription plan.");
        payload = {
          bookingType: "subscription",
          configId,
          planId: selectedPlan._id,
          date: subStartDate,
          name,
          email,
          phone,
        };
      } else if (mode === "bulk") {
        if (!bulkSelections.length) throw new Error("Select at least one date and slot.");
        payload = {
          configId,
          selections: bulkSelections.map((item) => ({
            slotId: item.slotId,
            date: item.date,
            memberCount: item.memberCount,
          })),
          name,
          email,
          phone,
        };
      } else {
        payload = { configId, slotId, name, email, phone, date, memberCount };
      }

      const response = await api.post("/api/public/bookings", payload);
      setPendingBooking(response.data);
      await launchPayment(response.data);
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  };

  if (!facility) return null;

  const bulkDateSet = new Set(bulkSelections.map((s) => s.date));
  const canProceed = mode === "subscription"
    ? Boolean(selectedPlan)
    : mode === "bulk"
      ? bulkSelections.length > 0
      : Boolean(slotId && slot?.remaining);

  return <div className={standalone ? "py-4" : "fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"}>
    <div className={`mx-auto my-4 w-full ${standalone ? "max-w-[1380px]" : "max-w-xl"} overflow-hidden rounded-3xl border border-slate-200 bg-white ${standalone ? "shadow-sm" : "shadow-2xl"}`}>
      <div className="relative flex items-center justify-between overflow-hidden bg-gradient-to-r from-slate-950 via-emerald-950 to-teal-800 p-6 text-white sm:p-8">
        <div className="relative z-10"><p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">Public Pay & Play</p><h3 className="mt-2 text-2xl font-extrabold sm:text-3xl">Book your sport or plan</h3><p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-100"><MapPin className="h-4 w-4" />{facility.name}</p></div>
        {facility.picture ? <img src={facility.picture} alt="" className="absolute right-0 top-0 h-full w-2/5 object-cover opacity-20 [mask-image:linear-gradient(to_left,black,transparent)]" /> : null}
        {!standalone ? <button type="button" onClick={onClose} className="rounded-xl bg-white/10 p-2 hover:bg-white/20"><X className="h-5 w-5" /></button> : null}
      </div>

      <div className={standalone ? "p-5 sm:p-8" : "p-6"}>
        {booking ? <div className="mx-auto max-w-2xl space-y-5 py-8 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
          <div><h4 className="text-xl font-extrabold text-slate-800">Payment successful</h4><p className="mt-1 text-sm text-slate-500">Booking {booking.reference} is confirmed</p></div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left text-sm">
            <p className="font-extrabold text-slate-800">
              {booking.sport} · {booking.bookingType === "subscription" ? booking.plan?.name : booking.bookingType === "bulk" ? `${booking.sessionsCount || booking.passes?.length || 1} sessions booked` : booking.slot?.label}
            </p>
            <p className="mt-1 text-slate-600">
              {booking.bookingType === "subscription"
                ? `Valid ${booking.plan?.startDate} to ${booking.plan?.endDate}`
                : `${date} · ${booking.slot?.startTime || ""}–${booking.slot?.endTime || ""}`}
            </p>
            <div className="mt-4 flex justify-between border-t border-emerald-200 pt-3 font-bold"><span>{booking.status}</span><span>₹{booking.totalAmount} paid</span></div>
          </div>
          {(booking.passes?.length ? booking.passes : booking.pass ? [booking.pass] : []).map((passItem, idx) => (
            <BookingPassCard key={passItem?.bookingId || idx} pass={passItem} />
          ))}
          <div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => downloadBookingInvoice({ ...booking, name, facility: facility.name, date: booking.plan?.startDate || date, timeLabel: `${booking.slot?.startTime || ""} - ${booking.slot?.endTime || ""}`, members: booking.memberCount || 1, amount: booking.totalAmount })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white hover:bg-emerald-800"><Download className="h-4 w-4" />Download invoice</button><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">Done</button></div>
        </div> : pendingBooking ? <div className="mx-auto max-w-xl space-y-5 py-8 text-center">
          <div><h4 className="text-xl font-extrabold text-slate-800">Complete checkout</h4><p className="mt-1 text-sm text-slate-500">Reference {pendingBooking.reference}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left text-sm text-slate-700"><p>Your selection is held for 15 minutes during payment verification.</p><p className="mt-2 font-bold">Amount: ₹{pendingBooking.totalAmount}</p></div>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <button type="button" disabled={saving} onClick={() => gatewayProof ? verifyPayment(pendingBooking, gatewayProof) : launchPayment(pendingBooking)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}{gatewayProof ? "Retry payment verification" : "Pay securely with Razorpay"}</button>
          <button type="button" onClick={onClose} className="w-full rounded-xl py-2 text-sm font-bold text-slate-500">Cancel</button>
        </div> : loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : configs.length === 0 ? <div className="py-12 text-center"><p className="font-bold text-slate-700">Online booking is not configured for this facility yet.</p><button type="button" onClick={onClose} className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Close</button></div> : <form onSubmit={submit} className="grid items-start gap-7 lg:grid-cols-[minmax(0,1.55fr)_380px]">
          <div className="min-w-0 space-y-6">
            <section className="rounded-2xl border border-slate-200 p-5"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step 1</p><h4 className="mt-1 text-lg font-extrabold text-slate-900">Sport, booking type &amp; athlete details</h4></div>
              {currentCitizen ? <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700"><Lock className="h-4 w-4" />Booking as {currentCitizen.Name}. Contact details come from your account.</div> : null}
              <div className="grid gap-3 sm:grid-cols-2"><Field label="Sport"><select className={fieldClass} value={configId} onChange={(event) => chooseConfig(event.target.value)}>{configs.map((row) => <option key={row.id} value={row.id}>{row.sport?.SportName}</option>)}</select></Field><Field label="Athlete name"><input readOnly={Boolean(currentCitizen?.Name)} className={`${fieldClass} ${currentCitizen ? "bg-slate-100 text-slate-500" : ""}`} value={name} onChange={(event) => setName(event.target.value)} required /></Field><Field label="Mobile number"><input readOnly={Boolean(currentCitizen?.ContactNum)} className={`${fieldClass} ${currentCitizen ? "bg-slate-100 text-slate-500" : ""}`} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></Field><Field label="Email (optional)"><input readOnly={Boolean(currentCitizen?.Email)} className={`${fieldClass} ${currentCitizen ? "bg-slate-100 text-slate-500" : ""}`} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field></div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => setMode("slot")} className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${mode === "slot" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  <CalendarDays className="h-3.5 w-3.5" /> Single Slot
                </button>
                <button type="button" onClick={() => setMode("bulk")} className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${mode === "bulk" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                  <Layers className="h-3.5 w-3.5" /> Multi-Day / Multi-Slot
                </button>
                {subscriptionPlans.length > 0 ? (
                  <button type="button" onClick={() => setMode("subscription")} className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition ${mode === "subscription" ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    <Sparkles className="h-3.5 w-3.5" /> Monthly / Yearly Plan
                  </button>
                ) : null}
              </div>
            </section>

            {mode === "subscription" ? (
              <section className="rounded-2xl border border-slate-200 p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step 2</p>
                  <h4 className="mt-1 text-lg font-extrabold text-slate-900">Choose a subscription pass</h4>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {subscriptionPlans.map((plan) => (
                    <button
                      key={plan._id}
                      type="button"
                      onClick={() => setPlanId(plan._id)}
                      className={`rounded-2xl border p-4 text-left transition ${String(planId) === String(plan._id) ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/15" : "border-slate-200 bg-white hover:border-emerald-400"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-extrabold text-slate-900">{plan.name}</p>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase text-emerald-800">
                          {plan.durationType}
                        </span>
                      </div>
                      <p className="mt-2 text-2xl font-extrabold text-emerald-700">₹{plan.price}</p>
                      <p className="mt-1 text-xs text-slate-500">Valid for {plan.durationDays} days</p>
                      {plan.description ? <p className="mt-2 text-xs text-slate-600">{plan.description}</p> : null}
                    </button>
                  ))}
                </div>
                <div className="max-w-xs">
                  <Field label="Pass start date">
                    <input type="date" min={today()} className={fieldClass} value={subStartDate} onChange={(e) => setSubStartDate(e.target.value)} required />
                  </Field>
                </div>
              </section>
            ) : (
              <>
                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step 2</p>
                    <h4 className="mt-1 text-lg font-extrabold text-slate-900">
                      {mode === "bulk" ? "Pick dates and toggle slots across multiple days" : "Choose a date"}
                    </h4>
                  </div>
                  {availabilityLoading ? (
                    <div className="flex justify-center rounded-2xl border border-slate-200 py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
                    </div>
                  ) : availability ? (
                    <AvailabilityCalendar
                      availability={availability}
                      selectedDate={date}
                      highlightedDates={mode === "bulk" ? bulkDateSet : null}
                      onSelectDate={(nextDate) => {
                        const entry = availability.dates.find((item) => item.date === nextDate);
                        const firstSlot = entry?.slots.find((item) => item.remaining > 0) || entry?.slots[0];
                        setDate(nextDate);
                        if (mode === "slot") {
                          setSlotId(firstSlot?.id || "");
                          setMemberCount(Number(firstSlot?.bookingPolicy?.minMembers) || 1);
                        }
                      }}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                    />
                  ) : null}
                </section>

                <section className="rounded-2xl border border-slate-200 p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Step 3</p>
                      <h4 className="mt-1 text-lg font-extrabold text-slate-900">Available slots on {date}</h4>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {availableSlots.length} {availableSlots.length === 1 ? "slot" : "slots"}
                    </span>
                  </div>

                  {availableSlots.length ? (
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {availableSlots.map((row) => {
                        const selected = mode === "bulk"
                          ? bulkSelections.some((s) => s.key === `${date}:${row.id}`)
                          : slotId === row.id;
                        const soldOut = row.remaining === 0;
                        return (
                          <button
                            key={row.id}
                            type="button"
                            disabled={soldOut}
                            onClick={() => chooseSlot(row.id)}
                            className={`group flex h-full flex-col justify-between gap-3.5 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                              selected
                                ? "border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-600/15 shadow-xs"
                                : "border-slate-200 bg-white hover:border-emerald-400 hover:shadow-xs"
                            }`}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-[15px] font-extrabold leading-snug text-slate-900">
                                  {row.label}
                                </p>
                                <span
                                  className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                    row.remaining
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {row.remaining} {row.inventoryLabel} left
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                <span>{row.startTime}–{row.endTime}</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">
                                  {row.audience}
                                </span>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold capitalize text-slate-600">
                                  {String(row.purpose || "open-play").replace("-", " ")}
                                </span>
                              </div>

                              {row.coach ? (
                                <p className="text-xs font-semibold text-emerald-700">
                                  Coach: {row.coach}
                                </p>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-200/70 pt-2.5 text-xs font-bold">
                              {mode === "bulk" ? (
                                <span className={`inline-flex items-center gap-1 ${selected ? "text-emerald-700" : "text-slate-600 group-hover:text-emerald-700"}`}>
                                  {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                                  {selected ? "Added to selection" : "Add to selection"}
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 ${selected ? "text-emerald-700" : "text-slate-500 group-hover:text-emerald-700"}`}>
                                  {selected ? <Check className="h-3.5 w-3.5" /> : null}
                                  {soldOut ? "Unavailable" : selected ? "Selected slot" : "Select slot"}
                                </span>
                              )}
                              <span className="text-slate-400 group-hover:text-emerald-600">
                                {selected ? "Active" : ""}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                      No slots operate on this date.
                    </p>
                  )}
                </section>
              </>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Booking summary</p>
              <h4 className="mt-2 text-lg font-extrabold text-slate-900">{config?.sport?.SportName}</h4>
              {mode === "subscription" && selectedPlan ? (
                <div className="mt-4 space-y-3 text-sm">
                  <Summary label="Facility" value={facility.name} />
                  <Summary label="Plan" value={`${selectedPlan.name} (${selectedPlan.durationType})`} />
                  <Summary label="Valid from" value={subStartDate} />
                  <Summary label="Valid through" value={addDays(subStartDate, selectedPlan.durationDays)} />
                </div>
              ) : mode === "bulk" ? (
                <div className="mt-4 space-y-2.5 text-sm">
                  <Summary label="Facility" value={facility.name} />
                  <Summary label="Selected sessions" value={`${bulkSelections.length}`} />
                  {bulkSelections.length ? (
                    <div className="max-h-64 space-y-2 overflow-y-auto pt-1">
                      {bulkSelections.map((item) => (
                        <div key={item.key} className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800">{item.date} · {item.slotLabel}</p>
                              <p className="text-slate-500">{item.startTime}–{item.endTime} · ₹{bookingTotal(config, item.memberCount)}</p>
                            </div>
                            <button type="button" aria-label={`Remove ${item.slotLabel} on ${item.date}`} onClick={() => setBulkSelections((prev) => prev.filter((x) => x.key !== item.key))} className="text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                          {item.isGroup ? (
                            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                              <span className="font-semibold text-slate-600">
                                Members ({item.minMembers}–{item.maxMembers})
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  aria-label={`Decrease members for ${item.slotLabel}`}
                                  disabled={(item.memberCount || 1) <= (item.minMembers || 1)}
                                  onClick={() => updateBulkMemberCount(item.key, (item.memberCount || 1) - 1)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-50 p-0 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <input
                                  type="number"
                                  aria-label={`Number of members for ${item.slotLabel} on ${item.date}`}
                                  min={item.minMembers || 1}
                                  max={item.maxMembers || 1}
                                  value={item.memberCount}
                                  onChange={(e) => updateBulkMemberCount(item.key, e.target.value)}
                                  className="h-7 w-12 rounded-md border border-slate-300 text-center text-xs font-bold text-slate-800 outline-none focus:border-emerald-600"
                                />
                                <button
                                  type="button"
                                  aria-label={`Increase members for ${item.slotLabel}`}
                                  disabled={(item.memberCount || 1) >= (item.maxMembers || 1)}
                                  onClick={() => updateBulkMemberCount(item.key, (item.memberCount || 1) + 1)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 bg-slate-50 p-0 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-xs text-slate-500">Tap slots on one or more dates to build your bulk booking.</p>}
                </div>
              ) : (
                <>
                  <div className="mt-4 space-y-3 text-sm"><Summary label="Facility" value={facility.name} /><Summary label="Date" value={date} /><Summary label="Slot" value={slot ? `${slot.startTime}–${slot.endTime}` : "Select a slot"} /><Summary label="Availability" value={slot ? `${slot.remaining} ${slot.inventoryLabel} left` : "—"} /></div>
                  {isGroup ? <div className="mt-4"><Field label="Number of members"><input className={fieldClass} type="number" min={policy.minMembers || 1} max={policy.maxMembers || 1} value={memberCount} onChange={(event) => setMemberCount(Number(event.target.value))} required /></Field></div> : null}
                </>
              )}
            </div>

            {mode !== "subscription" ? (
              <div className={`rounded-2xl border p-4 ${isExclusive ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"}`}><div className="flex items-start gap-3"><Users className="mt-0.5 h-5 w-5 text-emerald-700" /><div><p className="text-sm font-extrabold text-slate-800">{isExclusive ? "Whole court or field reserved" : "Shared slot capacity"}</p><p className="mt-1 text-xs text-slate-600">{isExclusive ? `One athlete books for the group (${policy.minMembers}–${policy.maxMembers} members).` : `${slot?.remaining || 0} places currently available.`}</p></div></div></div>
            ) : null}

            <div className="rounded-2xl bg-slate-950 p-5 text-white"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Amount due</p><p className="mt-1 text-3xl font-extrabold">₹{total}</p></div><ShieldCheck className="h-7 w-7 text-emerald-400" /></div><p className="mt-2 text-xs text-slate-400">Secure Razorpay checkout · inventory held for 15 minutes</p>{error ? <p className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-xs font-semibold text-red-200">{error}</p> : null}<button disabled={saving || !canProceed} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-slate-950 hover:bg-emerald-400 disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Proceed to payment</button><button type="button" onClick={onClose} className="mt-2 w-full py-2 text-xs font-bold text-slate-400 hover:text-white">Cancel</button></div>
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

function AvailabilityCalendar({ availability, selectedDate, highlightedDates, onSelectDate, month, onMonthChange }) {
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
      const isSelected = selectedDate === value;
      const isMarked = highlightedDates?.has(value);
      return <button key={value} type="button" disabled={!inWindow || !entry} onClick={() => onSelectDate(value)} className={`min-h-14 rounded-lg border px-1 py-1 text-xs transition ${isSelected ? "border-emerald-700 bg-emerald-700 text-white" : isMarked ? "border-emerald-500 bg-emerald-100 text-emerald-900" : inWindow ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-400" : "border-transparent text-slate-300"}`}><span className="block font-bold">{day}</span>{inWindow ? <span className={`mt-1 block text-[9px] font-semibold ${isSelected ? "text-emerald-100" : available ? "text-emerald-600" : "text-red-400"}`}>{available ? `${available} open` : "Full"}</span> : null}</button>;
    })}</div>
    <p className="mt-3 text-center text-[10px] font-semibold text-slate-500">Bookings open only for the next two months. Availability updates from confirmed bookings and active payment holds.</p>
  </div>;
}
