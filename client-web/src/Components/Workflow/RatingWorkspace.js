import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { api } from "../../API/client";

const control = "w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500";

export default function RatingWorkspace({ role }) {
  const [catalog, setCatalog] = useState({ facilities: [], coaches: [] });
  const [athletes, setAthletes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ targetType: "facility", facility: "", sport: "", coach: "", athleteId: "", rating: 5, remarks: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (role === "citizen") {
        const [choices, reviews] = await Promise.all([api.get("/api/citizen/rating-catalog"), api.get("/api/citizen/reviews")]);
        setCatalog(choices.data || { facilities: [], coaches: [] }); setHistory(reviews.data || []);
      } else {
        const [people, reviews] = await Promise.all([api.get("/api/coach/rateable-athletes"), api.get("/api/coach/athlete-ratings")]);
        setAthletes(people.data || []); setHistory(reviews.data || []);
      }
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }, [role]);
  useEffect(() => { load(); }, [load]);

  const selectedFacility = catalog.facilities.find((item) => item._id === form.facility);
  const coaches = useMemo(() => catalog.coaches.filter((item) => String(item.SportComplexId) === form.facility), [catalog.coaches, form.facility]);

  const submit = async (event) => {
    event.preventDefault(); setMessage("");
    try {
      if (role === "citizen") await api.post("/api/citizen/reviews", form);
      else await api.post("/api/coach/athlete-ratings", { athleteId: form.athleteId, rating: Number(form.rating), remarks: form.remarks });
      setMessage("Rating saved successfully."); setForm((old) => ({ ...old, remarks: "" })); await load();
    } catch (error) { setMessage(error.message); }
  };

  return <div className="space-y-6 p-4 sm:p-6">
    <div><h1 className="text-2xl font-extrabold text-slate-900">{role === "citizen" ? "Ratings & Reviews" : "Rate booked athletes"}</h1><p className="text-sm text-slate-500">{role === "citizen" ? "Rate a facility, a sport at that facility, or a coach." : "Only citizens with a confirmed booking under you are available."}</p></div>
    {message ? <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">{message}</div> : null}
    {loading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin" /></div> : <>
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
        {role === "citizen" ? <>
          <label className="text-xs font-bold text-slate-600">Rating target<select className={`${control} mt-1`} value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value, sport: "", coach: "" })}><option value="facility">Facility</option><option value="sport">Sport at facility</option><option value="coach">Coach</option></select></label>
          <label className="text-xs font-bold text-slate-600">Facility<select required className={`${control} mt-1`} value={form.facility} onChange={(e) => setForm({ ...form, facility: e.target.value, sport: "", coach: "" })}><option value="">Select facility</option>{catalog.facilities.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
          {form.targetType === "sport" ? <label className="text-xs font-bold text-slate-600">Sport<select required className={`${control} mt-1`} value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })}><option value="">Select sport</option>{(selectedFacility?.sports || []).map((item) => <option key={item.sport?._id} value={item.sport?._id}>{item.sport?.SportName}</option>)}</select></label> : null}
          {form.targetType === "coach" ? <label className="text-xs font-bold text-slate-600">Coach<select required className={`${control} mt-1`} value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })}><option value="">Select coach</option>{coaches.map((item) => <option key={item._id} value={item._id}>{item.userId?.Name}</option>)}</select></label> : null}
        </> : <label className="text-xs font-bold text-slate-600 md:col-span-2">Athlete<select required className={`${control} mt-1`} value={form.athleteId} onChange={(e) => setForm({ ...form, athleteId: e.target.value })}><option value="">Select booked athlete</option>{athletes.map((item) => <option key={item._id} value={item._id}>{item.userId?.Name} ({item.userId?.Email})</option>)}</select></label>}
        <label className="text-xs font-bold text-slate-600">Rating<select className={`${control} mt-1`} value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600">Comments<textarea className={`${control} mt-1`} rows="3" value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></label>
        <div className="md:col-span-2 flex justify-end"><button className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-extrabold text-slate-900">Save rating</button></div>
      </form>
      <section><h2 className="mb-3 font-extrabold text-slate-900">Rating history</h2><div className="grid gap-3 md:grid-cols-2">{history.map((item) => <article key={item._id} className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><b>{role === "citizen" ? item.facility?.name : item.athleteId?.userId?.Name}</b><span className="inline-flex items-center gap-1 font-bold text-amber-600"><Star className="h-4 w-4 fill-current" />{item.rating}</span></div><p className="mt-1 text-xs font-semibold uppercase text-slate-500">{role === "citizen" ? item.targetType : item.sport?.SportName || "Athlete assessment"}</p><p className="mt-2 text-sm text-slate-600">{item.remarks || "No comments"}</p></article>)}{!history.length ? <p className="text-sm text-slate-500">No ratings yet.</p> : null}</div></section>
    </>}
  </div>;
}
