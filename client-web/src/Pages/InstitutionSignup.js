import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Eye, EyeOff } from "lucide-react";
import { api } from "../API/client";

const input = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function InstitutionSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ institutionName: "", institutionType: "School", registrationNumber: "", address: "", Name: "", Email: "", ContactNum: "", Password: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.Password.length < 8) return setError("Password must be at least 8 characters.");
    if (form.Password !== form.confirmPassword) return setError("Passwords do not match.");
    setSaving(true);
    try {
      await api.post("/signup", { ...form, Email: form.Email.trim().toLowerCase(), Role: 7 }, { auth: false });
      navigate(`/login?registered=institute&email=${encodeURIComponent(form.Email.trim().toLowerCase())}`);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return <div className="min-h-screen bg-brand-mint px-4 py-6 text-slate-800">
    <div className="mx-auto mb-5 flex max-w-5xl items-center justify-between"><Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-brand-primary"><ArrowLeft className="h-4 w-4" />Back home</Link><Link to="/login" className="text-sm font-bold text-brand-primary">Already registered? Sign in</Link></div>
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-[0.75fr_1.25fr]">
      <aside className="hidden bg-brand-dark p-10 text-white md:block"><Building2 className="h-12 w-12 rounded-2xl bg-white/10 p-3" /><h1 className="mt-8 text-3xl font-extrabold">Institution event bookings</h1><p className="mt-4 text-sm leading-6 text-emerald-100">Request sports facilities for student tournaments, annual sports meets, trials and training camps. Facility management reviews availability and provides the final quotation before payment.</p></aside>
      <form onSubmit={submit} className="space-y-4 p-6 sm:p-10">
        <div><p className="text-xs font-bold uppercase tracking-widest text-brand-primary">Educational institute registration</p><h2 className="mt-1 text-2xl font-extrabold text-brand-dark">Institute and coordinator details</h2></div>
        <Field label="Institution name"><input className={input} value={form.institutionName} onChange={(e) => update("institutionName", e.target.value)} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Institution type"><select className={input} value={form.institutionType} onChange={(e) => update("institutionType", e.target.value)}><option>School</option><option>College / University</option><option>Sports Academy</option><option>Other</option></select></Field><Field label="Registration / affiliation number"><input className={input} value={form.registrationNumber} onChange={(e) => update("registrationNumber", e.target.value)} required /></Field></div>
        <Field label="Registered address"><textarea className={input} rows="2" value={form.address} onChange={(e) => update("address", e.target.value)} required /></Field>
        <Field label="Coordinator / contact person"><input className={input} value={form.Name} onChange={(e) => update("Name", e.target.value)} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Official email"><input type="email" className={input} value={form.Email} onChange={(e) => update("Email", e.target.value)} required /></Field><Field label="Contact number"><input type="tel" className={input} value={form.ContactNum} onChange={(e) => update("ContactNum", e.target.value)} required /></Field></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Password"><div className="relative"><input type={show ? "text" : "password"} minLength="8" className={`${input} pr-11`} value={form.Password} onChange={(e) => update("Password", e.target.value)} required /><button type="button" onClick={() => setShow((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-slate-400" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field><Field label="Confirm password"><input type={show ? "text" : "password"} minLength="8" className={input} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} required /></Field></div>
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button disabled={saving} className="w-full rounded-xl bg-brand-primary py-3 text-sm font-extrabold text-white disabled:opacity-60">{saving ? "Creating account…" : "Create institution account"}</button>
      </form>
    </div>
  </div>;
}

function Field({ label, children }) { return <label><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>; }
