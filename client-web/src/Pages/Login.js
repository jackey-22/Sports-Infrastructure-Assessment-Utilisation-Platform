import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import { LoginSchemas } from "../Schemas";
import Swal from "sweetalert2";
import { useDispatch } from "react-redux";
import { UserActions } from "../store/UserData";
import {
  findDemoUser,
  demoToken,
  homeForRole,
} from "../Components/Auth/demoAuth";
import { ArrowLeft, Shield, UserCheck, Compass, Eye, EyeOff } from "lucide-react";

const initialValues = {
  Email: "",
  Password: "",
};

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const LoginHandler = (values) => {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    var raw = JSON.stringify({
      Email: values.Email,
      Password: values.Password,
    });
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow",
    };
    fetch("http://localhost:9999/login", requestOptions)
      .then((response) => response.json())
      .then((result) => {
        if (result.rcode !== 200) {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Invalid email or password.",
            timer: 2000,
          });
          return;
        }

        dispatch(UserActions.getuserdata(result.data));
        localStorage.setItem("token", result.token);
        navigate(homeForRole(result.data.Role));
      })
      .catch(() => {
        // Backend unreachable: fall back to the offline demo accounts so the
        // product can be demonstrated with no API running.
        const demoUser = findDemoUser(values.Email, values.Password);
        if (demoUser) {
          dispatch(UserActions.getuserdata(demoUser));
          localStorage.setItem("token", demoToken(demoUser));
          navigate(homeForRole(demoUser.Role));
          return;
        }
        Swal.fire({
          icon: "error",
          title: "Unable to sign in",
          text: "The server could not be reached. Please try again.",
        });
      });
  };

  const {
    values,
    errors,
    touched,
    handleBlur,
    handleChange,
    handleSubmit,
  } = useFormik({
    initialValues: initialValues,
    validationSchema: LoginSchemas,
    onSubmit: LoginHandler,
  });

  return (
    <div className="login-screen min-h-screen bg-brand-mint flex flex-col justify-between text-slate-800">
      <div className="max-w-7xl mx-auto w-full p-4 flex justify-between items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-brand-primary hover:text-brand-dark transition bg-white border border-slate-200 px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="text-xs text-slate-500 hidden sm:block">
          Sports, Youth & Cultural Activities Department &bull; Govt. of Gujarat
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm max-w-4xl w-full flex flex-col md:flex-row overflow-hidden">
          <div className="hidden md:flex md:w-1/2 bg-brand-soft p-8 flex-col justify-between text-brand-dark border-r border-slate-200">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white text-brand-primary flex items-center justify-center mb-4 border border-emerald-200">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Sports Authority of Gujarat
              </h2>
              <p className="text-xs uppercase tracking-wider text-brand-primary mt-1 font-semibold">
                Infrastructure Management & Assessment System
              </p>
              <p className="text-slate-600 text-sm mt-4 leading-relaxed">
                Centralized state platform for monitoring sports facility conditions across all 33 Gujarat districts, conducting quality audits, managing court bookings, and optimizing grassroots athletic utilization.
              </p>
            </div>

            <div className="space-y-3 mt-8 text-sm text-slate-700">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <span>Role-based access for administrators, district officers and facility managers.</span>
              </div>
              <div className="flex items-start gap-2">
                <UserCheck className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <span>Credentials are issued by the department. Contact your administrator if you need access.</span>
              </div>
              <div className="flex items-start gap-2">
                <Compass className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                <span>Citizens and athletes can explore facilities without signing in.</span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-center">
            <h1 className="text-xl font-bold text-brand-dark mb-1">Official Portal Sign In</h1>
            <p className="text-sm text-slate-600 mb-6">
              Enter your official SAG or DSO credentials to access administrative dashboards.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="login-email"
                  name="Email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@sag.gujarat.gov.in"
                  className="login-field w-full rounded-xl py-3 px-3.5 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-brand-primary outline-none"
                  value={values.Email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                {errors.Email && touched.Email && (
                  <small className="text-red-700 text-xs mt-1 block">
                    {errors.Email}
                  </small>
                )}
              </div>

              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="Password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="login-field w-full rounded-xl py-3 pl-3.5 pr-11 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-brand-primary outline-none"
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
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-500 hover:text-brand-primary focus:outline-none focus-visible:text-brand-primary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {errors.Password && touched.Password && (
                  <small className="text-red-700 text-xs mt-1 block">
                    {errors.Password}
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-brand-primary hover:bg-[#006634] text-white font-bold text-sm rounded-xl transition mt-2"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-200 text-center">
              <Link
                to="/"
                className="text-sm text-brand-primary hover:text-brand-dark font-semibold"
              >
                Are you an athlete or citizen? Explore facilities without login &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 text-center text-xs text-slate-500">
        Department of Sports, Youth & Cultural Activities &bull; Government of Gujarat &bull; PS000012
      </div>
    </div>
  );
};

export default Login;
