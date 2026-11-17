import React, { useEffect, useMemo, useState } from "react";
import { Clock3, Edit3, Loader2, Plus, Trash2, Users, X } from "lucide-react";
import { api } from "../../../API/client";
import { Button, Card, EmptyState, PageHeader, PageShell } from "../Common/ManagerUI";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10";
const blankSlot = () => ({ label: "", startTime: "", endTime: "", days: [...DAYS], capacity: 1, audience: "mixed", purpose: "open-play", coachId: "", bookable: true });
const blankConfig = () => ({
  sportId: "",
  bookingMode: "capacity",
  unitLabel: "participants",
  unitCount: 1,
  capacityPerUnit: 1,
  price: { amount: 0, unit: "slot", calculation: "flat", perMemberAmount: 0 },
  bookingPolicy: { reservationType: "individual", inventoryMode: "shared-capacity", minMembers: 1, maxMembers: 1 },
  slots: [blankSlot()],
  status: "Active",
  notes: "",
});

function normalize(row) {
  return {
    ...row,
    sportId: row.sport?._id || row.sport,
    price: { calculation: "flat", perMemberAmount: 0, ...row.price },
    bookingPolicy: {
      reservationType: "individual",
      inventoryMode: "shared-capacity",
      minMembers: 1,
      maxMembers: 1,
      ...row.bookingPolicy,
    },
    slots: (row.slots || []).map((slot) => ({
      ...slot,
      coachId: slot.coach?._id || slot.coach || "",
    })),
  };
}

export default function SportsConfiguration() {
  const [configs, setConfigs] = useState([]);
  const [catalog, setCatalog] = useState({ sports: [], coaches: [], configuredSportIds: [] });
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [list, choices] = await Promise.all([
        api.get("/api/manager/sport-configs"),
        api.get("/api/manager/sport-catalog"),
      ]);
      setConfigs(list.data || []);
      setCatalog(choices.data || { sports: [], coaches: [], configuredSportIds: [] });
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (row) => {
    if (!window.confirm(`Remove ${row.sport?.SportName} from this facility?`)) return;
    try {
      await api.del(`/api/manager/sport-configs/${row._id}`);
      setNotice({ type: "success", text: "Sport configuration removed." });
      await load();
    } catch (error) { setNotice({ type: "error", text: error.message }); }
  };
  const save = async (value) => {
    if (value._id) await api.patch(`/api/manager/sport-configs/${value._id}`, value);
    else await api.post("/api/manager/sport-configs", value);
    setModal(null);
    setNotice({ type: "success", text: "Sport, capacity, price and slots saved." });
    await load();
  };

  return <PageShell>
    <PageHeader eyebrow="Facility Manager" title="Sports, capacity & slot mapping" description="Select sports from the global directory, define booking units and prices, then create audience-specific or coaching slots." actions={<Button onClick={() => setModal(blankConfig())}><Plus className="h-4 w-4" /> Add sport</Button>} />
    {notice ? <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.text}</div> : null}
    {loading ? <Card><div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-brand-primary" /></div></Card> : configs.length ? <div className="grid gap-5 xl:grid-cols-2">{configs.map((row) => <ConfigCard key={row._id} row={row} onEdit={() => setModal(normalize(row))} onDelete={() => remove(row)} />)}</div> : <Card><EmptyState title="No sports configured" description="Choose a sport from the global Admin directory and configure how it is booked at this facility." /></Card>}
    {modal ? <ConfigModal value={modal} catalog={catalog} onClose={() => setModal(null)} onSave={save} /> : null}
  </PageShell>;
}

function ConfigCard({ row, onEdit, onDelete }) {
  const maxCapacity = Number(row.unitCount) * Number(row.capacityPerUnit);
  const groupBooking = row.bookingPolicy?.reservationType === "group";
  const exclusive = row.bookingPolicy?.inventoryMode === "exclusive-unit";
  const pricing = row.price?.calculation === "per-member"
    ? `₹${row.price?.perMemberAmount || row.price?.amount}/member`
    : row.price?.calculation === "base-plus-member"
      ? `₹${row.price?.amount} + ₹${row.price?.perMemberAmount}/member`
      : `₹${row.price?.amount}/${row.price?.unit}`;
  return <Card><div className="p-5">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-primary">{row.bookingMode} booking</p><h3 className="mt-1 font-display text-xl font-extrabold text-brand-dark">{row.sport?.SportName}</h3><p className="text-sm text-slate-500">{row.unitCount} {row.unitLabel} · capacity {maxCapacity} · {pricing}</p><p className="mt-1 text-xs font-semibold text-slate-500">{groupBooking ? `${row.bookingPolicy?.minMembers}–${row.bookingPolicy?.maxMembers} members per booking` : "One athlete per booking"} · {exclusive ? "whole unit reserved" : "shared slot capacity"}</p></div><div className="flex gap-1"><button onClick={onEdit} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-primary"><Edit3 className="h-4 w-4" /></button><button onClick={onDelete} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></div>
    <div className="mt-5 space-y-2">{row.slots.map((slot) => <div key={slot._id || slot.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-700">{slot.label}</p><span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">{slot.audience} · {slot.purpose}</span></div><div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{slot.startTime}–{slot.endTime}</span><span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{slot.capacity} capacity</span><span>{slot.coach?.userId?.Name || "No coach"}</span></div></div>)}</div>
  </div></Card>;
}

function ConfigModal({ value: initial, catalog, onClose, onSave }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key, next) => setValue((current) => ({ ...current, [key]: next }));
  const sport = catalog.sports.find((item) => item._id === value.sportId);
  const availableSports = useMemo(() => catalog.sports.filter((item) => value._id || !catalog.configuredSportIds.includes(item._id)), [catalog, value._id]);
  const compatibleCoaches = catalog.coaches.filter((coach) => (coach.sports || []).some((item) => (item.sport?._id || item.sport) === value.sportId));
  const chooseSport = (sportId) => {
    const selected = catalog.sports.find((item) => item._id === sportId);
    setValue((current) => ({ ...current, sportId, bookingMode: selected?.defaultBookingMode || current.bookingMode, unitLabel: selected?.unitLabel || current.unitLabel }));
  };
  const updateSlot = (index, key, next) => update("slots", value.slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, [key]: next } : slot));
  const toggleDay = (index, day) => {
    const days = value.slots[index].days || [];
    updateSlot(index, "days", days.includes(day) ? days.filter((item) => item !== day) : [...days, day]);
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try { await onSave(value); } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-900/60 p-4"><div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-primary">Facility configuration</p><h3 className="font-display text-2xl font-extrabold text-brand-dark">{sport?.SportName || "Add a sport"}</h3></div><button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div>
    <form onSubmit={submit} className="space-y-6 p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Global sport"><select required disabled={Boolean(value._id)} className={input} value={value.sportId} onChange={(e) => chooseSport(e.target.value)}><option value="">Select sport</option>{availableSports.map((item) => <option key={item._id} value={item._id}>{item.SportName}</option>)}</select></Field>
        <Field label="Booking model"><select className={input} value={value.bookingMode} onChange={(e) => update("bookingMode", e.target.value)}><option value="capacity">Participant capacity</option><option value="court">Court / lane / unit</option><option value="hybrid">Hybrid</option></select></Field>
        <Field label="Unit label"><input required className={input} value={value.unitLabel} onChange={(e) => update("unitLabel", e.target.value)} placeholder="courts, lanes, participants" /></Field>
        <Field label="Number of units"><input required min="1" type="number" className={input} value={value.unitCount} onChange={(e) => update("unitCount", Number(e.target.value))} /></Field>
        <Field label="Capacity per unit"><input required min="1" type="number" className={input} value={value.capacityPerUnit} onChange={(e) => update("capacityPerUnit", Number(e.target.value))} /></Field>
        <Field label="Status"><select className={input} value={value.status} onChange={(e) => update("status", e.target.value)}><option>Active</option><option>Inactive</option></select></Field>
        <Field label="Reservation type"><select className={input} value={value.bookingPolicy.reservationType} onChange={(e) => { const reservationType = e.target.value; update("bookingPolicy", { ...value.bookingPolicy, reservationType, minMembers: reservationType === "individual" ? 1 : Math.max(2, value.bookingPolicy.minMembers), maxMembers: reservationType === "individual" ? 1 : Math.max(2, value.bookingPolicy.maxMembers) }); }}><option value="individual">Individual athlete</option><option value="group">One athlete books for a group</option></select></Field>
        <Field label="Inventory rule"><select className={input} value={value.bookingPolicy.inventoryMode} onChange={(e) => update("bookingPolicy", { ...value.bookingPolicy, inventoryMode: e.target.value })}><option value="shared-capacity">Share slot capacity</option><option value="exclusive-unit">Reserve whole court / field</option></select></Field>
        <Field label="Pricing rule"><select className={input} value={value.price.calculation} onChange={(e) => { const calculation = e.target.value; update("price", { ...value.price, calculation, perMemberAmount: calculation === "per-member" && !value.price.perMemberAmount ? value.price.amount : value.price.perMemberAmount }); }}><option value="flat">Flat price per booking</option><option value="per-member">Price per member</option><option value="base-plus-member">Base price + per member</option></select></Field>
        {value.price.calculation !== "per-member" ? <Field label={value.price.calculation === "flat" ? "Booking price (₹)" : "Base price (₹)"}><input required min="0" type="number" className={input} value={value.price.amount} onChange={(e) => update("price", { ...value.price, amount: Number(e.target.value) })} /></Field> : null}
        <Field label="Price applies per"><select className={input} value={value.price.unit} onChange={(e) => update("price", { ...value.price, unit: e.target.value })}>{["slot", "hour", "person", "unit", "month"].map((item) => <option key={item}>{item}</option>)}</select></Field>
        {value.price.calculation !== "flat" ? <Field label="Per member price (₹)"><input required min="0" type="number" className={input} value={value.price.perMemberAmount} onChange={(e) => update("price", { ...value.price, perMemberAmount: Number(e.target.value) })} /></Field> : null}
        {value.bookingPolicy.reservationType === "group" ? <><Field label="Minimum members"><input required min="1" type="number" className={input} value={value.bookingPolicy.minMembers} onChange={(e) => update("bookingPolicy", { ...value.bookingPolicy, minMembers: Number(e.target.value) })} /></Field><Field label="Maximum members"><input required min="1" max={value.unitCount * value.capacityPerUnit} type="number" className={input} value={value.bookingPolicy.maxMembers} onChange={(e) => update("bookingPolicy", { ...value.bookingPolicy, maxMembers: Number(e.target.value) })} /></Field></> : null}
        <Field label="Notes"><input className={input} value={value.notes} onChange={(e) => update("notes", e.target.value)} /></Field>
      </div>
      <div><div className="mb-3 flex items-center justify-between"><div><h4 className="font-display text-lg font-extrabold text-brand-dark">Time slots</h4><p className="text-xs text-slate-500">Each slot can have its own capacity, audience, purpose and coach. Coaching slots accept individual bookings against shared capacity; other slots use the booking rule above.</p></div><button type="button" onClick={() => update("slots", [...value.slots, blankSlot()])} className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-3 py-2 text-xs font-bold text-brand-primary"><Plus className="h-3.5 w-3.5" />Add slot</button></div>
        <div className="space-y-4">{value.slots.map((slot, index) => <div key={slot._id || index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex justify-between"><p className="text-sm font-extrabold text-slate-700">Slot {index + 1}</p>{value.slots.length > 1 ? <button type="button" onClick={() => update("slots", value.slots.filter((_, slotIndex) => slotIndex !== index))} className="text-red-500"><Trash2 className="h-4 w-4" /></button> : null}</div><div className="grid gap-3 md:grid-cols-4">
          <Field label="Label"><input required className={input} value={slot.label} onChange={(e) => updateSlot(index, "label", e.target.value)} placeholder="Morning ladies" /></Field><Field label="Start"><input required type="time" className={input} value={slot.startTime} onChange={(e) => updateSlot(index, "startTime", e.target.value)} /></Field><Field label="End"><input required type="time" className={input} value={slot.endTime} onChange={(e) => updateSlot(index, "endTime", e.target.value)} /></Field><Field label="Capacity"><input required min="1" type="number" className={input} value={slot.capacity} onChange={(e) => updateSlot(index, "capacity", Number(e.target.value))} /></Field>
          <Field label="Audience"><select className={input} value={slot.audience} onChange={(e) => updateSlot(index, "audience", e.target.value)}>{["mixed", "women", "men", "children", "members"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Purpose"><select className={input} value={slot.purpose} onChange={(e) => updateSlot(index, "purpose", e.target.value)}>{["open-play", "coaching", "competition"].map((item) => <option key={item}>{item}</option>)}</select></Field><Field label="Coach"><select className={input} value={slot.coachId || ""} onChange={(e) => updateSlot(index, "coachId", e.target.value)}><option value="">No coach</option>{compatibleCoaches.map((coach) => <option key={coach._id} value={coach._id}>{coach.userId?.Name}</option>)}</select></Field><Field label="Booking"><select className={input} value={String(slot.bookable)} onChange={(e) => updateSlot(index, "bookable", e.target.value === "true")}><option value="true">Bookable</option><option value="false">Blocked</option></select></Field>
        </div><div className="mt-3 flex flex-wrap gap-2">{DAYS.map((day) => <button type="button" key={day} onClick={() => toggleDay(index, day)} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${(slot.days || []).includes(day) ? "bg-brand-primary text-white" : "bg-white text-slate-500"}`}>{day}</button>)}</div></div>)}</div>
      </div>
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save configuration</button></div>
    </form>
  </div></div>;
}
const Field = ({ label, children }) => <label><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>;
