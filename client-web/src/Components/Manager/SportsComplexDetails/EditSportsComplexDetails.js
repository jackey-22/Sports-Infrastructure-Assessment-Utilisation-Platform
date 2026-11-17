import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../API/client";
import UploadImageField from "../../Common/UploadImageField";
import { Button, Card, PageHeader, PageShell } from "../Common/ManagerUI";

const input = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10";
const amenities = { floodlights: "Floodlights", drinkingWater: "Drinking water", changingRooms: "Changing rooms", firstAid: "First aid", parking: "Parking", gym: "Gym", divyangjanFriendly: "Divyangjan friendly", canteen: "Canteen" };

export default function EditSportsComplexDetails() {
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { api.get("/api/manager/facility").then((result) => setForm(result.facility)).catch((error) => setMessage(error.message)); }, []);
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage("");
    try { await api.patch("/api/manager/facility", form); setMessage("Facility details updated successfully."); }
    catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };
  return <PageShell>
    <PageHeader eyebrow="Facility Manager" title="Edit facility details" description="Keep public contact details, timings, amenities and facility photographs current." actions={<Button onClick={() => navigate("/manager/facilitydetails")} variant="secondary">Back</Button>} />
    {!form ? <Card><div className="flex justify-center p-16"><Loader2 className="h-7 w-7 animate-spin text-emerald-600" /></div></Card> : <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_420px]">
      <Card><div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Facility name"><input required className={input} value={form.name || ""} onChange={(e) => update("name", e.target.value)} /></Field>
        <Field label="District"><input disabled className={`${input} bg-slate-100`} value={form.district || ""} /></Field>
        <Field label="Complete address" full><textarea required rows="3" className={input} value={form.location || ""} onChange={(e) => update("location", e.target.value)} /></Field>
        <Field label="City / taluka"><input className={input} value={form.taluka || ""} onChange={(e) => update("taluka", e.target.value)} /></Field>
        <Field label="Area"><input className={input} value={form.area || ""} onChange={(e) => update("area", e.target.value)} /></Field>
        <Field label="Category"><input className={input} value={form.category || ""} onChange={(e) => update("category", e.target.value)} /></Field>
        <Field label="Ownership"><input className={input} value={form.ownership || ""} onChange={(e) => update("ownership", e.target.value)} /></Field>
        <Field label="Contact phone"><input className={input} value={form.contactPhone || ""} onChange={(e) => update("contactPhone", e.target.value)} /></Field>
        <Field label="Contact email"><input type="email" className={input} value={form.contactEmail || ""} onChange={(e) => update("contactEmail", e.target.value)} /></Field>
        <Field label="Opening time"><input type="time" className={input} value={form.timings?.openingTime || ""} onChange={(e) => update("timings", { ...form.timings, openingTime: e.target.value })} /></Field>
        <Field label="Closing time"><input type="time" className={input} value={form.timings?.closingTime || ""} onChange={(e) => update("timings", { ...form.timings, closingTime: e.target.value })} /></Field>
        <Field label="Daily capacity"><input min="0" type="number" className={input} value={form.capacityDaily || 0} onChange={(e) => update("capacityDaily", Number(e.target.value))} /></Field>
        <div className="sm:col-span-2"><p className="mb-2 text-xs font-bold text-slate-600">Amenities</p><div className="grid gap-2 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(amenities).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={Boolean(form.amenities?.[key])} onChange={(e) => update("amenities", { ...form.amenities, [key]: e.target.checked })} />{label}</label>)}</div></div>
      </div></Card>
      <div className="space-y-5"><Card><div className="p-5"><UploadImageField label="Public facility cover" value={form.picture || ""} onChange={(value) => update("picture", value)} /></div></Card><Card><div className="p-5"><p className="font-extrabold text-slate-900">Save changes</p><p className="mt-1 text-sm text-slate-500">Updates become visible in the public facility directory.</p>{message ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{message}</p> : null}<button disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save facility</button></div></Card></div>
    </form>}
  </PageShell>;
}

function Field({ label, full = false, children }) { return <label className={full ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>; }
