import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Loader2, Users, X } from "lucide-react";
import { api } from "../../API/client";

const fieldClass = "w-full rounded-xl border border-slate-300 p-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";
const today = () => new Date().toISOString().slice(0, 10);

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

export default function CitizenBookingModal({ facility, onClose = () => {}, onConfirm = () => {} }) {
  const [configs, setConfigs] = useState([]);
  const [configId, setConfigId] = useState("");
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("Aarav Trivedi");
  const [email, setEmail] = useState("athlete.aarav@sag.gujarat.gov.in");
  const [phone, setPhone] = useState("+91 98980 12345");
  const [date, setDate] = useState(today());
  const [memberCount, setMemberCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState(null);
  const [pendingBooking, setPendingBooking] = useState(null);

  useEffect(() => {
    if (!facility) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.get(`/api/public/sport-configs?facilityName=${encodeURIComponent(facility.name)}`, { auth: false, signal: controller.signal })
      .then((response) => {
        const rows = response.data?.configs || [];
        setConfigs(rows);
        if (rows[0]) {
          setConfigId(rows[0].id);
          setSlotId(rows[0].slots?.[0]?._id || "");
          setMemberCount(Number(rows[0].slots?.[0]?.bookingPolicy?.minMembers || rows[0].bookingPolicy?.minMembers) || 1);
        }
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") setError(loadError.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [facility]);

  const config = useMemo(() => configs.find((row) => row.id === configId), [configs, configId]);
  const slot = config?.slots?.find((row) => row._id === slotId);
  const policy = slot?.bookingPolicy || config?.bookingPolicy || {};
  const isGroup = policy.reservationType === "group";
  const isExclusive = policy.inventoryMode === "exclusive-unit";
  const total = bookingTotal(config, memberCount);

  const chooseConfig = (nextId) => {
    const next = configs.find((row) => row.id === nextId);
    setConfigId(nextId);
    setSlotId(next?.slots?.[0]?._id || "");
    setMemberCount(Number(next?.slots?.[0]?.bookingPolicy?.minMembers || next?.bookingPolicy?.minMembers) || 1);
  };

  const chooseSlot = (nextSlotId) => {
    const nextSlot = config?.slots?.find((row) => row._id === nextSlotId);
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
      }, { auth: false });
      setPendingBooking(response.data);
      await launchPayment(response.data);
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  };

  if (!facility) return null;

  return <div className="fixed inset-0 z-[2000] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
    <div className="my-6 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-900 p-5 text-white">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-200">Public Pay & Play</p><h3 className="mt-1 text-xl font-bold">Book a sport slot</h3><p className="mt-0.5 text-xs text-blue-100">{facility.name}</p></div>
        <button type="button" onClick={onClose} className="rounded-xl bg-white/10 p-2 hover:bg-white/20"><X className="h-5 w-5" /></button>
      </div>

      <div className="p-6">
        {booking ? <div className="space-y-5 text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-emerald-500" />
          <div><h4 className="text-xl font-extrabold text-slate-800">Payment successful</h4><p className="mt-1 text-sm text-slate-500">Booking {booking.reference} is confirmed</p></div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-left text-sm">
            <p className="font-extrabold text-slate-800">{booking.sport} · {booking.slot?.label}</p>
            <p className="mt-1 text-slate-600">{date} · {booking.slot?.startTime}–{booking.slot?.endTime}</p>
            <p className="mt-1 text-slate-600">{booking.memberCount} {booking.memberCount === 1 ? "athlete" : "members"} · {booking.inventoryMode === "exclusive-unit" ? "whole court/field reserved" : "shared-capacity booking"}</p>
            <div className="mt-4 flex justify-between border-t border-emerald-200 pt-3 font-bold"><span>{booking.status}</span><span>₹{booking.totalAmount} paid</span></div>
          </div>
          <button type="button" onClick={onClose} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">Close</button>
        </div> : pendingBooking ? <div className="space-y-5 py-4 text-center">
          <div><h4 className="text-xl font-extrabold text-slate-800">Payment pending</h4><p className="mt-1 text-sm text-slate-500">Booking reference {pendingBooking.reference}</p></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left text-sm text-slate-700"><p>The selected court or capacity is held for 15 minutes.</p><p className="mt-2 font-bold">Amount: ₹{pendingBooking.totalAmount}</p></div>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <button type="button" disabled={saving} onClick={() => launchPayment(pendingBooking)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Pay securely with Razorpay</button>
          <button type="button" onClick={onClose} className="w-full rounded-xl py-2 text-sm font-bold text-slate-500">Cancel</button>
        </div> : loading ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-blue-600" /></div> : configs.length === 0 ? <div className="py-12 text-center"><p className="font-bold text-slate-700">Online booking is not configured for this facility yet.</p><button type="button" onClick={onClose} className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white">Close</button></div> : <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Booker name"><input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required /></Field>
            <Field label="Mobile number"><input className={fieldClass} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required /></Field>
          </div>
          <Field label="Email (optional)"><input className={fieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Sport"><select className={fieldClass} value={configId} onChange={(event) => chooseConfig(event.target.value)}>{configs.map((row) => <option key={row.id} value={row.id}>{row.sport?.SportName}</option>)}</select></Field>
            <Field label="Booking date"><input className={fieldClass} type="date" min={today()} value={date} onChange={(event) => setDate(event.target.value)} required /></Field>
          </div>
          <Field label="Time slot"><select className={fieldClass} value={slotId} onChange={(event) => chooseSlot(event.target.value)} required>{(config?.slots || []).map((row) => <option key={row._id} value={row._id}>{row.label} · {row.startTime}–{row.endTime} · {row.audience}</option>)}</select></Field>

          {isGroup ? <Field label="Number of members"><input className={fieldClass} type="number" min={policy.minMembers || 1} max={policy.maxMembers || 1} value={memberCount} onChange={(event) => setMemberCount(Number(event.target.value))} required /></Field> : null}

          <div className={`rounded-xl border p-4 ${isExclusive ? "border-indigo-200 bg-indigo-50" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex items-start gap-3"><Users className="mt-0.5 h-5 w-5 text-indigo-600" /><div><p className="text-sm font-extrabold text-slate-800">{isExclusive ? "One booking reserves the whole court or field" : "Booking uses shared slot capacity"}</p><p className="mt-1 text-xs text-slate-600">{isExclusive ? `Only one athlete books for the entire group. Enter ${policy.minMembers}–${policy.maxMembers} members.` : `This slot has a capacity of ${slot?.capacity || 0} athletes.`}</p></div></div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Amount due</p><p className="text-xl font-extrabold text-slate-800">₹{total}</p></div><p className="max-w-[55%] text-right text-xs text-slate-500">{config?.price?.calculation === "per-member" ? "Calculated per member" : config?.price?.calculation === "base-plus-member" ? "Base booking charge plus member charge" : "Flat charge for this booking"}</p></div>
          {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button disabled={saving || !slotId} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Proceed to payment</button></div>
        </form>}
        {!booking && error && (loading || configs.length === 0) ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      </div>
    </div>
  </div>;
}

function Field({ label, children }) {
  return <label><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-600">{label}</span>{children}</label>;
}
