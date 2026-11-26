import AppScreenScroll from "../../components/common/AppScreenScroll";
import AppHeader from "../../components/common/AppHeader";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "../../components/AppText";
import { Chip, Button, StateMessage, ui, GREEN } from "../../components/FacilityUI";
import FacilityPayment from "../../components/FacilityPayment";
import BookingCalendar from "../../components/BookingCalendar";
import BookingPassCard from "../../components/qr/BookingPassCard";
import { loadBookingConfigs } from "../../services/facilityService";
import { api } from "../../api/client";
import { restoreSession } from "../../services/authService";
import { shareBookingReceipt } from "../../utils/bookingReceipt";

const localDate = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setUTCDate(d.getUTCDate() + Math.max(0, Number(days || 0) - 1));
  return d.toISOString().slice(0, 10);
}

function priceForConfig(config, memberCount) {
  if (!config) return 0;
  const base = config?.price?.amount || 0;
  const perMember = config?.price?.perMemberAmount || base;
  if (config?.price?.calculation === "per-member") return perMember * memberCount;
  if (config?.price?.calculation === "base-plus-member") return base + (config.price.perMemberAmount || 0) * memberCount;
  return base;
}

export default function BookingCheckoutScreen({
  facility,
  onBack,
  onDone
}) {
  const [configs, setConfigs] = useState([]),
    [configId, setConfigId] = useState(""),
    [mode, setMode] = useState("slot"),
    [slotId, setSlotId] = useState(""),
    [bulkSelections, setBulkSelections] = useState([]),
    [planId, setPlanId] = useState(""),
    [subStartDate, setSubStartDate] = useState(localDate());
  const [date, setDate] = useState(localDate()),
    [name, setName] = useState(""),
    [phone, setPhone] = useState(""),
    [email, setEmail] = useState(""),
    [members, setMembers] = useState("1"),
    [citizen, setCitizen] = useState(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  const [availability, setAvailability] = useState(null),
    [availabilityLoading, setAvailabilityLoading] = useState(false),
    [availabilityRevision, setAvailabilityRevision] = useState(0);
  const [pending, setPending] = useState(null),
    [paymentOpen, setPaymentOpen] = useState(false),
    [proof, setProof] = useState(null),
    [confirmed, setConfirmed] = useState(null);
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    restoreSession().then(user => {
      if (active && Number(user?.Role) === 0) {
        setCitizen(user);
        setName(user.Name || "");
        setEmail(user.Email || "");
        setPhone(user.ContactNum || "");
      }
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    loadBookingConfigs(facility?.id).then(rows => {
      if (alive) {
        setConfigs(rows);
        setConfigId(rows[0]?.id || "");
        setSlotId("");
        setBulkSelections([]);
      }
    }).catch(err => {
      if (alive) setError(err.message);
    }).finally(() => {
      if (alive) setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [facility?.id, revision]);

  useEffect(() => {
    if (!configId) return;
    let alive = true;
    setAvailabilityLoading(true);
    setAvailability(null);
    setSlotId("");
    setBulkSelections([]);
    api.get(`/api/public/sport-configs/${configId}/availability`, {
      auth: false
    }).then(response => {
      if (!alive) return;
      const next = response.data;
      setAvailability(next);
      const entry = next.dates.find(day => day.slots.some(slot => slot.remaining > 0)) || next.dates[0];
      setDate(entry?.date || next.window.start);
      const slot = entry?.slots.find(slot => slot.remaining > 0);
      setSlotId(slot?.id || "");
      setMembers(String(slot?.bookingPolicy?.minMembers || 1));
    }).catch(err => {
      if (alive) setError(err.message);
    }).finally(() => {
      if (alive) setAvailabilityLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [configId, availabilityRevision]);

  const config = configs.find(c => c.id === configId);
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
    () => subscriptionPlans.find(p => String(p._id) === String(planId)) || subscriptionPlans[0] || null,
    [subscriptionPlans, planId]
  );

  const slots = availability?.dates.find(day => day.date === date)?.slots || [],
    slot = slots.find(s => s.id === slotId);
  const policy = slot?.bookingPolicy || config?.bookingPolicy || {},
    isGroup = policy.reservationType === "group",
    exclusive = policy.inventoryMode === "exclusive-unit";
  const count = isGroup ? Number(members) : 1;
  const singleTotal = priceForConfig(config, count);
  const bulkTotal = bulkSelections.reduce((sum, item) => sum + priceForConfig(config, item.memberCount), 0);
  const total = mode === "subscription"
    ? Number(selectedPlan?.price) || 0
    : mode === "bulk"
      ? bulkTotal
      : singleTotal;

  const chooseDate = value => {
    setDate(value);
    if (mode === "slot") {
      const first = availability.dates.find(day => day.date === value)?.slots.find(s => s.remaining > 0);
      setSlotId(first?.id || "");
      setMembers(String(first?.bookingPolicy?.minMembers || 1));
    }
  };

  const toggleSlot = s => {
    if (!s.remaining) return;
    if (mode === "bulk") {
      const key = `${date}:${s.id}`;
      setBulkSelections(prev => {
        const exists = prev.find(item => item.key === key);
        if (exists) return prev.filter(item => item.key !== key);
        const minM = s.bookingPolicy?.minMembers || 1;
        const maxM = s.bookingPolicy?.maxMembers || 1;
        const isExclusiveSlot = s.bookingPolicy?.inventoryMode === "exclusive-unit";
        const effectiveMax = isExclusiveSlot ? maxM : Math.max(minM, Math.min(maxM, Number(s.remaining) || maxM));
        const isGroupSlot = s.bookingPolicy?.reservationType === "group" && effectiveMax > 1;
        const mCount = Math.max(minM, Math.min(count, effectiveMax));
        return [
          ...prev,
          {
            key,
            date,
            slotId: s.id,
            slotLabel: s.label,
            startTime: s.startTime,
            endTime: s.endTime,
            isGroup: isGroupSlot,
            minMembers: minM,
            maxMembers: effectiveMax,
            memberCount: mCount,
          },
        ];
      });
      return;
    }
    setSlotId(s.id);
    setMembers(String(s.bookingPolicy?.minMembers || 1));
  };

  const updateBulkMemberCount = (key, delta) => {
    setBulkSelections(prev =>
      prev.map(item => {
        if (item.key !== key) return item;
        const next = Math.max(item.minMembers || 1, Math.min((item.memberCount || 1) + delta, item.maxMembers || 1));
        return { ...item, memberCount: next };
      })
    );
  };

  const verify = async data => {
    if (lock.current) return;
    setPaymentOpen(false);
    setProof(data);
    setBusy(true);
    setError("");
    lock.current = true;
    try {
      const response = await api.post(`/api/public/bookings/${pending.id}/payment/verify`, data, {
        auth: false
      });
      if (response.data?.bookingStatus !== "Confirmed" || response.data?.paymentStatus !== "Paid") throw new Error("Payment has not been confirmed yet. Retry verification.");
      setConfirmed(response.data);
      setProof(null);
    } catch (err) {
      setError(err.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const submit = async () => {
    if (lock.current) return;
    setError("");
    if (pending) {
      setPaymentOpen(true);
      return;
    }
    if (!name.trim() || !/^\+?[0-9 ()-]{10,18}$/.test(phone.trim())) return setError("Enter your full name and valid mobile number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");

    let payload;
    if (mode === "subscription") {
      if (!selectedPlan) return setError("Select a subscription plan.");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(subStartDate)) return setError("Enter start date as YYYY-MM-DD.");
      payload = {
        bookingType: "subscription",
        configId,
        planId: selectedPlan._id,
        date: subStartDate,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      };
    } else if (mode === "bulk") {
      if (!bulkSelections.length) return setError("Select at least one date and time slot.");
      payload = {
        configId,
        selections: bulkSelections.map(item => ({
          slotId: item.slotId,
          date: item.date,
          memberCount: item.memberCount,
        })),
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      };
    } else {
      if (!slot || !slot.remaining) return setError("Choose an available date and slot.");
      if (!Number.isInteger(count) || count < (policy.minMembers || 1) || count > (policy.maxMembers || 1)) return setError(`Members must be between ${policy.minMembers || 1} and ${policy.maxMembers || 1}.`);
      payload = {
        configId,
        slotId,
        date,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        memberCount: count,
      };
    }

    setBusy(true);
    lock.current = true;
    try {
      const response = await api.post("/api/public/bookings", payload);
      setPending(response.data);
      setPaymentOpen(true);
    } catch (err) {
      setError(err.message);
      if (err.status === 409) setAvailabilityRevision(v => v + 1);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  const field = (label, value, setter, keyboardType = "default", locked = false) => <View><Text style={ui.label}>{label}</Text><TextInput accessibilityLabel={label} style={[ui.input, locked && {
      backgroundColor: "#EDF2EF",
      color: "#718078"
    }]} value={value} onChangeText={setter} editable={!busy && !pending && !locked} keyboardType={keyboardType} autoCapitalize="none" /></View>;

  const canProceed = mode === "subscription"
    ? Boolean(selectedPlan)
    : mode === "bulk"
      ? bulkSelections.length > 0
      : Boolean(slot?.remaining);

  return <View style={ui.safe}><View style={ui.screen}><AppScreenScroll contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled" header={<AppHeader title={confirmed ? "Booking confirmed" : "Book a sports slot or plan"} subtitle={facility?.name} onBack={busy ? undefined : onBack} />}>
    {confirmed ? <View style={{
          gap: 16
        }}><View style={[ui.card, {
            gap: 12,
            alignItems: "center"
          }]}><Ionicons name="checkmark-circle" size={48} color={GREEN} /><Text style={ui.sectionTitle}>Payment verified</Text><Text style={ui.muted}>Reference: {confirmed.bookingReference}</Text><Text style={ui.sectionTitle}>INR {confirmed.totalAmount}</Text></View>{(confirmed.passes?.length ? confirmed.passes : confirmed.pass ? [confirmed.pass] : []).map((p, idx) => <BookingPassCard key={p?.bookingId || idx} pass={p} />)}<Button secondary onPress={() => shareBookingReceipt({
            confirmed,
            pending,
            facility,
            date: mode === "subscription" ? subStartDate : date,
            name
          }).catch(err => setError(err.message))}>Download / share invoice</Button>{!!error && <Text style={ui.error}>{error}</Text>}<Button onPress={onDone || onBack}>Return to facilities</Button></View> : loading ? <ActivityIndicator size="large" color={GREEN} /> : <>
      {!!error && <Text accessibilityRole="alert" style={ui.error}>{error}</Text>}
      {!configs.length ? <StateMessage title="No online booking configured" message="Contact the facility or reload the booking schedule." action="Reload schedule" onAction={() => setRevision(v => v + 1)} /> : <>
        {pending ? <View style={[ui.card, {
              gap: 12
            }]}><Text style={ui.sectionTitle}>Complete payment</Text><Text style={ui.muted}>{pending.reference} | {pending.sport} | {pending.slot?.label}</Text><Text style={ui.muted}>Your reservation is held for 15 minutes. Complete payment to receive your QR pass.</Text></View> : <>
          <View style={[ui.card, {
                gap: 14
              }]}><Text style={ui.sectionTitle}>1. Sport &amp; contact details</Text><View style={ui.wrap}>{configs.map(c => <Chip key={c.id} active={c.id === configId} onPress={() => {
                    setError("");
                    setConfigId(c.id);
                  }}>{c.sport?.SportName || "Sport"}</Chip>)}</View><View style={ui.wrap}><Chip active={mode === "slot"} onPress={() => setMode("slot")}>Single Slot</Chip><Chip active={mode === "bulk"} onPress={() => setMode("bulk")}>Multi-Slot / Multi-Day</Chip>{subscriptionPlans.length > 0 && <Chip active={mode === "subscription"} onPress={() => setMode("subscription")}>Monthly / Yearly Plan</Chip>}</View>{citizen && <Text style={[ui.muted, {
                  color: GREEN
                }]}>Booking as {citizen.Name}. Contact details come from your account.</Text>}{field("Athlete name", name, setName, "default", !!citizen?.Name)}{field("Mobile number", phone, setPhone, "phone-pad", !!citizen?.ContactNum)}{field("Email (optional)", email, setEmail, "email-address", !!citizen?.Email)}</View>

          {mode === "subscription" ? (
            <View style={[ui.card, { gap: 12 }]}>
              <Text style={ui.sectionTitle}>2. Choose subscription plan</Text>
              <View style={{ gap: 10 }}>
                {subscriptionPlans.map(plan => {
                  const active = String(planId) === String(plan._id);
                  return (
                    <TouchableOpacity
                      key={plan._id}
                      onPress={() => setPlanId(plan._id)}
                      style={{
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: active ? GREEN : "#D6E2DB",
                        backgroundColor: active ? "#EBF8F1" : "#FFFFFF",
                        padding: 12,
                      }}
                    >
                      <Text style={{ fontWeight: "800", fontSize: 15, color: "#153D26" }}>
                        {plan.name} · ₹{plan.price}/{plan.durationType === "yearly" ? "yr" : "mo"}
                      </Text>
                      <Text style={ui.muted}>
                        Valid for {plan.durationDays} days{plan.description ? ` · ${plan.description}` : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {field("Start date (YYYY-MM-DD)", subStartDate, setSubStartDate)}
              {selectedPlan && (
                <Text style={[ui.muted, { color: GREEN, fontWeight: "700" }]}>
                  Pass valid from {subStartDate} to {addDays(subStartDate, selectedPlan.durationDays)}
                </Text>
              )}
            </View>
          ) : (
            <>
              <Text style={ui.sectionTitle}>2. {mode === "bulk" ? "Pick dates & add multiple slots" : "Choose a date"}</Text>{availabilityLoading ? <ActivityIndicator color={GREEN} /> : availability ? <BookingCalendar availability={availability} selectedDate={date} onSelect={chooseDate} /> : <Button secondary onPress={() => setAvailabilityRevision(v => v + 1)}>Reload availability</Button>}
              <View style={[ui.card, {
                    gap: 12
                  }]}><View style={[ui.row, {
                      justifyContent: "space-between"
                    }]}><Text style={[ui.sectionTitle, {
                        flex: 1
                      }]}>3. Available slots on {date}</Text><Button secondary onPress={() => setAvailabilityRevision(v => v + 1)}>Refresh</Button></View>{!availabilityLoading && !slots.length && <Text style={ui.muted}>No slots operate on this date.</Text>}{slots.map(s => {
                      const active = mode === "bulk" ? bulkSelections.some(sel => sel.key === `${date}:${s.id}`) : slotId === s.id;
                      return <View key={s.id} style={{
                          opacity: s.remaining ? 1 : 0.45
                        }}><Chip active={active} onPress={() => toggleSlot(s)}>{s.label} | {s.startTime}-{s.endTime}{mode === "bulk" ? (active ? " ✓" : " +") : ""}</Chip><Text style={[ui.muted, {
                            marginTop: 7
                          }]}>{s.remaining} {s.inventoryLabel} left | {s.audience} | {s.purpose}{s.coach ? ` | Coach: ${s.coach}` : ""}</Text></View>;
                    })}</View>

              {mode === "bulk" && (
                <View style={[ui.card, { gap: 10 }]}>
                  <Text style={ui.sectionTitle}>Selected sessions ({bulkSelections.length})</Text>
                  {bulkSelections.length === 0 ? <Text style={ui.muted}>Tap slots across dates to add them here.</Text> : bulkSelections.map(item => (
                    <View key={item.key} style={{ backgroundColor: "#F8FAFC", padding: 10, borderRadius: 10, gap: 8 }}>
                      <View style={[ui.row, { justifyContent: "space-between" }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: "700", color: "#0f172a" }}>{item.date} · {item.slotLabel}</Text>
                          <Text style={ui.muted}>{item.startTime}–{item.endTime} · ₹{priceForConfig(config, item.memberCount)}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setBulkSelections(prev => prev.filter(x => x.key !== item.key))}>
                          <Ionicons name="trash-outline" size={18} color="#DC2626" />
                        </TouchableOpacity>
                      </View>
                      {item.isGroup && (
                        <View style={[ui.row, { justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8 }]}>
                          <Text style={[ui.muted, { fontWeight: "700" }]}>Members ({item.minMembers}–{item.maxMembers})</Text>
                          <View style={[ui.row, { gap: 10, alignItems: "center" }]}>
                            <TouchableOpacity
                              disabled={(item.memberCount || 1) <= (item.minMembers || 1)}
                              onPress={() => updateBulkMemberCount(item.key, -1)}
                              style={{ borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", borderRadius: 8, width: 30, height: 30, alignItems: "center", justifyContent: "center", opacity: (item.memberCount || 1) <= (item.minMembers || 1) ? 0.4 : 1 }}
                            >
                              <Ionicons name="remove" size={16} color="#0f172a" />
                            </TouchableOpacity>
                            <Text style={{ fontWeight: "800", color: "#0f172a", minWidth: 22, textAlign: "center", includeFontPadding: false }}>{item.memberCount}</Text>
                            <TouchableOpacity
                              disabled={(item.memberCount || 1) >= (item.maxMembers || 1)}
                              onPress={() => updateBulkMemberCount(item.key, 1)}
                              style={{ borderWidth: 1, borderColor: "#CBD5E1", backgroundColor: "#FFFFFF", borderRadius: 8, width: 30, height: 30, alignItems: "center", justifyContent: "center", opacity: (item.memberCount || 1) >= (item.maxMembers || 1) ? 0.4 : 1 }}
                            >
                              <Ionicons name="add" size={16} color="#0f172a" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {mode === "slot" && (
                <View style={[ui.card, {
                      gap: 12
                    }]}><Text style={ui.sectionTitle}>Booking summary</Text><Text style={ui.muted}>{facility?.name}</Text><Text style={ui.muted}>{config?.sport?.SportName} | {date}</Text><Text style={ui.muted}>{slot ? `${slot.startTime}-${slot.endTime}` : "Select an available slot"}</Text>{isGroup && field(`Number of members (${policy.minMembers}-${policy.maxMembers})`, members, setMembers, "number-pad")}<Text style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: GREEN
                      }}>{exclusive ? "Whole court or field reserved" : "Shared slot capacity"}</Text><Text style={ui.muted}>{exclusive ? `One athlete books for the group (${policy.minMembers}-${policy.maxMembers} members).` : `${slot?.remaining || 0} places currently available.`}</Text></View>
              )}
            </>
          )}
        </>}
        <View style={[ui.card, {
              gap: 12
            }]}><Text style={ui.sectionTitle}>Amount due: INR {pending?.totalAmount ?? (Number.isFinite(total) ? total : 0)}</Text><Text style={ui.muted}>Secure Razorpay checkout | inventory held for 15 minutes</Text><Button disabled={busy || !pending && (!canProceed || availabilityLoading)} onPress={proof ? () => verify(proof) : submit}>{busy ? "Please wait..." : proof ? "Retry payment verification" : pending ? "Continue payment" : "Proceed to payment"}</Button><Button secondary disabled={busy} onPress={onBack}>Cancel</Button></View>
      </>}
    </>}
  </AppScreenScroll>{paymentOpen && pending?.payment && <FacilityPayment payment={pending.payment} onPaid={verify} onClose={() => setPaymentOpen(false)} onError={message => {
        setPaymentOpen(false);
        setError(message);
      }} />}</View></View>;
}
