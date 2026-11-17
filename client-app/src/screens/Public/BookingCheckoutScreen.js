import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView, SafeAreaView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "../../components/AppText";
import { FacilityHeader, Chip, Button, StateMessage, ui, GREEN } from "../../components/FacilityUI";
import FacilityPayment from "../../components/FacilityPayment";
import { loadBookingConfigs } from "../../services/facilityService";
import { api } from "../../api/client";
const localDate = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`; };
export default function BookingCheckoutScreen({ facility, onBack, onDone }) {
  const [configs, setConfigs] = useState([]), [configId, setConfigId] = useState(""), [slotId, setSlotId] = useState("");
  const [date, setDate] = useState(localDate()), [name, setName] = useState(""), [phone, setPhone] = useState(""), [email, setEmail] = useState(""), [members, setMembers] = useState("1");
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(""), [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(null), [paymentOpen, setPaymentOpen] = useState(false), [proof, setProof] = useState(null), [confirmed, setConfirmed] = useState(null);
  const lock = useRef(false);
  useEffect(() => { let alive = true; setLoading(true); setError(""); loadBookingConfigs(facility?.id).then(rows => { if (alive) { const available = rows.filter(c => c.slots?.length); setConfigs(available); setConfigId(available[0]?.id || ""); setSlotId(""); } }).catch(err => { if (alive) setError(err.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, [facility?.id, revision]);
  const config = configs.find(c => c.id === configId), slot = config?.slots.find(s => s._id === slotId);
  const policy = slot?.bookingPolicy || config?.bookingPolicy;
  const count = Number(members), base = config?.price?.amount || 0, perMember = config?.price?.perMemberAmount || base;
  const total = config?.price?.calculation === "per-member" ? perMember * count : config?.price?.calculation === "base-plus-member" ? base + (config.price.perMemberAmount || 0) * count : base;
  const verify = async (data) => {
    if (lock.current) return;
    setPaymentOpen(false); setProof(data); setBusy(true); setError(""); lock.current = true;
    try { const response = await api.post(`/api/public/bookings/${pending.id}/payment/verify`, data, { auth: false }); if (response.data?.bookingStatus !== "Confirmed" || response.data?.paymentStatus !== "Paid") throw new Error("Payment has not been confirmed yet. Retry verification."); setConfirmed(response.data); setProof(null); }
    catch (err) { setError(err.message); } finally { lock.current = false; setBusy(false); }
  };
  const submit = async () => {
    if (lock.current) return;
    setError("");
    if (pending) { setPaymentOpen(true); return; }
    if (!slot) return setError("Select a sport and a time slot.");
    const parsed = new Date(`${date}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.getFullYear() !== Number(date.slice(0,4)) || parsed.getMonth()+1 !== Number(date.slice(5,7)) || parsed.getDate() !== Number(date.slice(8,10)) || date < localDate()) return setError("Choose a valid date today or later (YYYY-MM-DD).");
    const weekday = ["sun","mon","tue","wed","thu","fri","sat"][parsed.getDay()];
    if (slot.days?.length && !slot.days.some(day => day.toLowerCase().slice(0,3) === weekday)) return setError("This time slot does not run on the selected day.");
    if (!name.trim() || !/^\+?[0-9 ()-]{10,18}$/.test(phone.trim())) return setError("Enter your full name and a valid mobile number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (!Number.isInteger(count) || count < (policy?.minMembers || 1) || count > (policy?.maxMembers || 1)) return setError(`Members must be between ${policy?.minMembers || 1} and ${policy?.maxMembers || 1}.`);
    setBusy(true); lock.current = true;
    try { const response = await api.post("/api/public/bookings", { configId, slotId, date, name: name.trim(), phone: phone.trim(), email: email.trim(), memberCount: count }, { auth: false }); setPending(response.data); setPaymentOpen(true); }
    catch (err) { setError(err.message); } finally { lock.current = false; setBusy(false); }
  };
  const field = (label, value, setter, keyboardType = "default") => <View><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} style={ui.input} value={value} onChangeText={setter} editable={!busy && !pending} keyboardType={keyboardType} autoCapitalize="none" /></View>;
  return <SafeAreaView style={ui.safe}><View style={ui.screen}><FacilityHeader title={confirmed ? "Booking confirmed" : "Book a sports slot"} subtitle={facility?.name} onBack={busy ? undefined : onBack} /><ScrollView contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
    {confirmed ? <View style={[ui.card, { gap: 16, alignItems: "center" }]}><Ionicons name="checkmark-circle" size={52} color={GREEN} /><Text style={ui.sectionTitle}>Payment verified</Text><Text style={ui.muted}>Reference: {confirmed.bookingReference}</Text><Text style={ui.muted}>{date} | {pending.sport} | {pending.slot.label}</Text><Text style={ui.sectionTitle}>₹{confirmed.totalAmount}</Text><Text style={ui.muted}>Your booking is confirmed. Keep this reference for the facility reception.</Text><Button onPress={onDone || onBack}>Return to facilities</Button></View> : loading ? <ActivityIndicator size="large" color={GREEN} /> : <>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {!configs.length ? <StateMessage title="No online slots available" message="Please contact the facility, or try loading its booking schedule again." action="Reload schedule" onAction={() => setRevision(v => v + 1)} /> : <>
        {pending ? <View style={[ui.card, { gap: 12 }]}><Text style={ui.sectionTitle}>Reservation awaiting payment</Text><Text style={ui.muted}>{pending.reference} | {pending.sport} | {pending.slot.label}</Text><Text style={ui.muted}>The backend holds unpaid reservations for 15 minutes. Confirmation appears after payment verification.</Text></View> : <><View style={[ui.card, { gap: 12 }]}><Text style={ui.sectionTitle}>Select discipline</Text><View style={ui.wrap}>{configs.map(c => <Chip key={c.id} active={c.id === configId} onPress={() => { setConfigId(c.id); setSlotId(""); setMembers(String(c.bookingPolicy?.minMembers || 1)); }}>{c.sport?.SportName || "Sport"}</Chip>)}</View>{field("Date (YYYY-MM-DD)", date, setDate)}<Text style={ui.label}>Available session times</Text>{config?.slots.map(s => <Chip key={s._id} active={slotId === s._id} onPress={() => { setSlotId(s._id); setMembers(String(s.bookingPolicy?.minMembers || policy?.minMembers || 1)); }}>{s.label} | {s.startTime}-{s.endTime}{s.days?.length ? ` | ${s.days.join(", ")}` : ""}</Chip>)}</View><View style={[ui.card, { gap: 14 }]}><Text style={ui.sectionTitle}>Beneficiary details</Text>{field("Full name", name, setName)}{field("Mobile number", phone, setPhone, "phone-pad")}{field("Email (optional)", email, setEmail, "email-address")}{field(`Members (${policy?.minMembers || 1}-${policy?.maxMembers || 1})`, members, setMembers, "number-pad")}</View></>}
        <View style={[ui.card, { gap: 12 }]}><Text style={ui.sectionTitle}>Total: ₹{pending?.totalAmount ?? (Number.isFinite(total) ? total : 0)}</Text><Text style={ui.muted}>The server checks availability and calculates the final amount before opening secure payment.</Text><Button disabled={busy || (!pending && !slot)} onPress={proof ? () => verify(proof) : submit}>{busy ? "Please wait..." : proof ? "Retry payment verification" : pending ? "Continue payment" : "Continue to payment →"}</Button></View>
      </>}
    </>}
  </ScrollView>{paymentOpen && pending?.payment && <FacilityPayment payment={pending.payment} onPaid={verify} onClose={() => setPaymentOpen(false)} onError={message => { setPaymentOpen(false); setError(message); }} />}</View></SafeAreaView>;
}
