import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, UserPlus } from "lucide-react";
import { api } from "../API/client";

const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20";

export default function CitizenSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ Name: "", Email: "", ContactNum: "", DOB: "", Password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
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
      await api.post("/signup", {
        Name: form.Name.trim(),
        Email: form.Email.trim().toLowerCase(),
        ContactNum: form.ContactNum.trim(),
        DOB: form.DOB,
        Password: form.Password,
        Role: 0,
      }, { auth: false });
      navigate(`/login?registered=1&email=${encodeURIComponent(form.Email.trim().toLowerCase())}`);
    } catch (signupError) {
      setError(signupError.message);
    } finally {
      setSaving(false);
    }
  };

  return <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-800">
    <div className="mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-3"><Link to="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft className="h-4 w-4 text-brand-primary" />Back to Portal</Link><div className="flex gap-4"><Link to="/institution-signup" className="text-sm font-bold text-brand-primary hover:underline">Register an institution</Link><Link to="/login" className="text-sm font-bold text-brand-primary hover:underline">Already registered? Sign in</Link></div></div>
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl md:grid-cols-[0.8fr_1.2fr]">
      <div className="hidden bg-brand-dark p-10 text-white md:block"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10"><UserPlus className="h-7 w-7" /></div><h1 className="mt-8 font-display text-3xl font-extrabold">Create your citizen account</h1><p className="mt-4 text-sm leading-6 text-emerald-100">Explore live facilities, complete secure bookings, view your activity and use athlete services through one account.</p><div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-emerald-100">Staff, coaches and facility managers receive accounts from their administrator. This form is only for athletes and citizens.</div></div>
      <form onSubmit={submit} className="space-y-4 p-6 sm:p-10">
        <div><p className="text-xs font-bold uppercase tracking-widest text-brand-primary">Athlete / Citizen registration</p><h2 className="mt-1 text-2xl font-extrabold text-brand-dark">Your account details</h2></div>
        <Field label="Full name"><input className={fieldClass} value={form.Name} onChange={(event) => update("Name", event.target.value)} autoComplete="name" required /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Email address"><input className={fieldClass} type="email" value={form.Email} onChange={(event) => update("Email", event.target.value)} autoComplete="email" required /></Field><Field label="Mobile number"><input className={fieldClass} type="tel" value={form.ContactNum} onChange={(event) => update("ContactNum", event.target.value)} autoComplete="tel" required /></Field></div>
        <Field label="Date of birth"><input className={fieldClass} type="date" max={new Date().toISOString().slice(0, 10)} value={form.DOB} onChange={(event) => update("DOB", event.target.value)} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Password"><div className="relative"><input className={`${fieldClass} pr-11`} type={showPassword ? "text" : "password"} minLength="8" value={form.Password} onChange={(event) => update("Password", event.target.value)} autoComplete="new-password" required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-0 px-3 text-slate-400" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></Field><Field label="Confirm password"><input className={fieldClass} type={showPassword ? "text" : "password"} minLength="8" value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} autoComplete="new-password" required /></Field></div>
        {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button disabled={saving} className="w-full rounded-xl bg-brand-primary py-3 text-sm font-extrabold text-white disabled:opacity-60">{saving ? "Creating account…" : "Create citizen account"}</button>
        <p className="text-center text-xs text-slate-500">By registering, you confirm that the submitted details belong to you.</p>
      </form>
    </div>
  </div>;
}

function Field({ label, children }) {
  return <label><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>;
}
