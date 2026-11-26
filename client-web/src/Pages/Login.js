import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useFormik } from "formik";
import { LoginSchemas } from "../Schemas";
import { useDispatch } from "react-redux";
import { UserActions } from "../store/UserData";
import { API_BASE_URL } from "../API/client";
import { findDemoUser, demoToken, homeForRole } from "../Components/Auth/demoAuth";
import { ArrowLeft, Compass, Eye, EyeOff, Loader2, Shield, UserCheck } from "lucide-react";
import symbolImg from "../Assets/symbol.png";

const initialValues = {
  Email: "",
  Password: "",
};

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const LoginHandler = async (values) => {
    setAuthError("");
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: values.Email, Password: values.Password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.rcode !== 200) {
        setAuthError(result.msg || "Invalid email address or password.");
        return;
      }
      dispatch(UserActions.getuserdata(result.data));
      localStorage.setItem("token", result.token);
      navigate(homeForRole(result.data.Role));
    } catch {
      const demoUser = findDemoUser(values.Email, values.Password);
      if (demoUser) {
        dispatch(UserActions.getuserdata(demoUser));
        localStorage.setItem("token", demoToken(demoUser));
        navigate(homeForRole(demoUser.Role));
        return;
      }
      setAuthError("Could not connect to the authentication service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const {
    values,
    errors,
    touched,
    handleBlur,
    handleChange,
    handleSubmit,
  } = useFormik({
    initialValues: { ...initialValues, Email: searchParams.get("email") || "" },
    validationSchema: LoginSchemas,
    onSubmit: LoginHandler,
  });

  return (
    <div className="flex min-h-screen flex-col justify-between bg-slate-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4 text-brand-primary" />
          Back to Portal
        </Link>
        <div className="hidden text-xs font-medium text-slate-500 sm:block">
          Sports, Youth &amp; Cultural Activities Department · Govt. of Gujarat
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5 md:grid-cols-2">
          {/* Left Institutional Panel */}
          <div className="hidden flex-col justify-between bg-brand-dark p-8 text-white md:flex lg:p-10">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 p-2">
                <img src={symbolImg} alt="KhelGujarat emblem" className="h-full w-full object-contain" />
              </div>
              <p className="mt-6 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                Sports Authority of Gujarat
              </p>
              <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white">
                KhelGujarat Unified Access
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-emerald-100/80">
                Centralized state portal for managing 33-district sports infrastructure, athlete evaluations, slot bookings, and facility condition audits.
              </p>
            </div>

            <div className="mt-8 space-y-3 border-t border-white/10 pt-6 text-xs text-emerald-100/90">
              <div className="flex items-start gap-2.5">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Role-based workspaces for Administrators, District Officers, Facility Managers, Coaches, and Gate Desk.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <UserCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Staff accounts are provisioned by the department administrator.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <Compass className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <span>Citizens and athletes can browse public venues without signing in.</span>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            <h1 className="font-display text-2xl font-extrabold text-slate-900">Sign in to KhelGujarat</h1>
            <p className="mt-1 text-sm text-slate-500">
              Enter your registered email and password to open your portal.
            </p>

            {searchParams.get("registered") ? (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
                Your {searchParams.get("registered") === "institute" ? "institution" : "citizen"} account has been created. Sign in below to continue.
              </p>
            ) : null}

            {authError ? (
              <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                {authError}
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-bold text-slate-700">
                  Email address
                </label>
                <input
                  id="login-email"
                  name="Email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@sag.gujarat.gov.in"
                  className="login-field w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                  value={values.Email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                {errors.Email && touched.Email ? (
                  <small className="mt-1 block text-xs font-medium text-rose-600">{errors.Email}</small>
                ) : null}
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-xs font-bold text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="Password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="login-field w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-3.5 pr-11 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    value={values.Password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-brand-primary focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.Password && touched.Password ? (
                  <small className="mt-1 block text-xs font-medium text-rose-600">{errors.Password}</small>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-primary py-3 text-sm font-bold text-white shadow-xs transition hover:bg-brand-dark disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 space-y-2 border-t border-slate-100 pt-5 text-center text-xs">
              <p className="text-slate-600">
                New citizen or athlete?{" "}
                <Link to="/signup" className="font-bold text-brand-primary hover:underline">
                  Create account
                </Link>
              </p>
              <p className="text-slate-600">
                School, college or sports academy?{" "}
                <Link to="/institution-signup" className="font-bold text-brand-primary hover:underline">
                  Register institution
                </Link>
              </p>
              <Link to="/explore" className="block pt-1 font-bold text-slate-700 hover:text-brand-primary">
                Explore facilities without signing in &rarr;
              </Link>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 text-center text-xs text-slate-500">
        Sports Authority of Gujarat · Government of Gujarat
      </footer>
    </div>
  );
}
