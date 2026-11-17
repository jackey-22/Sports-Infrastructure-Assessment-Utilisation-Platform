import React, { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Star, Trophy, UserRound, X } from "lucide-react";
import { api } from "../../../API/client";

const input = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15";
const targets = [
  { id: "facility", label: "Facility", help: "Overall venue experience", icon: Building2 },
  { id: "sport", label: "Sport", help: "A sport at this facility", icon: Trophy },
  { id: "coach", label: "Coach", help: "A coach at this facility", icon: UserRound },
];

export default function CitizenRatingDialog({ open, onClose, initialFacilityId = "", initialSportId = "", initialCoachId = "", initialTarget = "facility", onSaved = () => {} }) {
  const [catalog, setCatalog] = useState({ facilities: [], coaches: [] });
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ targetType: initialTarget, facility: initialFacilityId, sport: initialSportId, coach: initialCoachId, rating: 0, remarks: "" });
  const [hovered, setHovered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true); setMessage("");
    Promise.all([api.get("/api/citizen/rating-catalog"), api.get("/api/citizen/reviews")])
      .then(([choices, history]) => {
        setCatalog(choices.data || { facilities: [], coaches: [] });
        setReviews(history.data || []);
        setForm({ targetType: initialTarget, facility: String(initialFacilityId || ""), sport: String(initialSportId || ""), coach: String(initialCoachId || ""), rating: 0, remarks: "" });
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [open, initialFacilityId, initialSportId, initialCoachId, initialTarget]);

  const facility = catalog.facilities.find((item) => String(item._id) === String(form.facility));
  const sports = facility?.sports || [];
  const coaches = useMemo(() => catalog.coaches.filter((item) => String(item.SportComplexId) === String(form.facility)), [catalog.coaches, form.facility]);
  const existing = reviews.find((item) => item.targetType === form.targetType && String(item.facility?._id) === String(form.facility) && (form.targetType !== "sport" || String(item.sport?._id) === String(form.sport)) && (form.targetType !== "coach" || String(item.coach?._id) === String(form.coach)));

  useEffect(() => {
    if (!existing) return;
    setForm((old) => ({ ...old, rating: existing.rating, remarks: existing.remarks || "" }));
  }, [existing?._id]);

  if (!open) return null;
  const selectTarget = (targetType) => setForm((old) => ({ ...old, targetType, sport: targetType === "sport" ? old.sport : "", coach: targetType === "coach" ? old.coach : "", rating: 0, remarks: "" }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.rating) return setMessage("Select a star rating.");
    setSaving(true); setMessage("");
    try {
      const result = await api.post("/api/citizen/reviews", form);
      onSaved(result.data); onClose();
    } catch (error) { setMessage(error.message); }
    finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[2400] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Share your experience</p><h2 className="mt-1 text-2xl font-extrabold text-slate-900">Rate with stars</h2></div><button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
    {loading ? <div className="flex justify-center py-24"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : <form onSubmit={submit} className="space-y-6 p-6">
      <div className="grid gap-3 sm:grid-cols-3">{targets.map(({ id, label, help, icon: Icon }) => <button type="button" key={id} onClick={() => selectTarget(id)} className={`rounded-2xl border p-4 text-left transition ${form.targetType === id ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/10" : "border-slate-200 hover:border-emerald-300"}`}><Icon className={`h-5 w-5 ${form.targetType === id ? "text-emerald-700" : "text-slate-400"}`} /><p className="mt-2 font-extrabold text-slate-900">{label}</p><p className="mt-0.5 text-xs text-slate-500">{help}</p></button>)}</div>
      <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-600">Facility</span><select required className={input} value={form.facility} onChange={(e) => setForm({ ...form, facility: e.target.value, sport: "", coach: "", rating: 0, remarks: "" })}><option value="">Choose facility</option>{catalog.facilities.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      {form.targetType === "sport" ? <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-600">Sport at facility</span><select required className={input} value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value, rating: 0, remarks: "" })}><option value="">Choose sport</option>{sports.map((item) => <option key={item.sport?._id} value={item.sport?._id}>{item.sport?.SportName}</option>)}</select></label> : null}
      {form.targetType === "coach" ? <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-600">Coach at facility</span><select required className={input} value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value, rating: 0, remarks: "" })}><option value="">Choose coach</option>{coaches.map((item) => <option key={item._id} value={item._id}>{item.userId?.Name}</option>)}</select></label> : null}
      <div className="rounded-2xl bg-slate-50 p-5 text-center"><p className="text-sm font-bold text-slate-700">How was your experience?</p><div className="mt-3 flex justify-center gap-2" onMouseLeave={() => setHovered(0)}>{[1,2,3,4,5].map((value) => <button type="button" key={value} onMouseEnter={() => setHovered(value)} onClick={() => setForm({ ...form, rating: value })} aria-label={`${value} star${value === 1 ? "" : "s"}`} className="rounded-lg p-1 transition hover:scale-110"><Star className={`h-10 w-10 ${value <= (hovered || form.rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} /></button>)}</div><p className="mt-2 text-xs font-semibold text-slate-500">{form.rating ? ["", "Poor", "Fair", "Good", "Very good", "Excellent"][form.rating] : "Select 1 to 5 stars"}</p></div>
      <label><span className="mb-1.5 block text-xs font-bold uppercase text-slate-600">Comments (optional)</span><textarea rows="4" className={input} placeholder="Tell us what went well or what can improve…" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></label>
      {existing ? <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">You already rated this item. Saving will update your previous rating.</p> : null}{message ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null}
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button><button disabled={saving || !form.facility || !form.rating} className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4 fill-current" />}{existing ? "Update rating" : "Submit rating"}</button></div>
    </form>}
  </div></div>;
}

export function SubmittedRatings({ reviews }) {
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{reviews.map((item) => <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">{item.targetType}</p><h3 className="font-extrabold text-slate-900">{item.targetType === "facility" ? item.facility?.name : item.targetType === "sport" ? item.sport?.SportName : item.coach?.userId?.Name}</h3><p className="text-xs text-slate-500">{item.facility?.name}</p></div><div className="flex">{[1,2,3,4,5].map((value) => <Star key={value} className={`h-4 w-4 ${value <= item.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />)}</div></div>{item.remarks ? <p className="mt-3 text-sm text-slate-600">{item.remarks}</p> : null}<p className="mt-3 text-[11px] text-slate-400">Updated {new Date(item.updatedAt).toLocaleDateString("en-IN")}</p></article>)}</div>;
}
