import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFormik } from "formik";
import { LoginSchemas } from "../Schemas";
import { Button } from "@material-tailwind/react";
import { useCookies } from "react-cookie";
import Swal from "sweetalert2";
import { useDispatch } from "react-redux";
import { UserActions } from "../store/UserData";
import image from "./../Assets/symbol.png";
import { DEMO_USERS } from "../data/gujaratSportsData";
import { ArrowLeft, Sparkles, Shield, UserCheck, Compass } from "lucide-react";

const initialValues = {
  Email: "",
  Password: "",
};

const Login = () => {
  const dispatch = useDispatch();
  const [cookies, setCookies] = useCookies(["token"]);
  const navigate = useNavigate();

  const handleQuickLogin = (demoUser) => {
    setFieldValue("Email", demoUser.email);
    setFieldValue("Password", demoUser.password);

    const mockToken = "mock_jwt_token_role_" + demoUser.roleId;
    dispatch(
      UserActions.getuserdata({
        _id: "demo_" + demoUser.roleId,
        Email: demoUser.email,
        Name: demoUser.name,
        Role: demoUser.roleId,
        District: demoUser.district,
      })
    );
    setCookies("token", mockToken, { maxAge: 86400, path: "/" });
    localStorage.setItem("token", mockToken);

    Swal.fire({
      icon: "success",
      title: "Authenticated!",
      text: `Signed in as ${demoUser.roleName}`,
      timer: 1200,
      showConfirmButton: false,
    });

    setTimeout(() => {
      if (demoUser.roleId === 5) navigate("/admin");
      else if (demoUser.roleId === 4) navigate("/authority");
      else if (demoUser.roleId === 3) navigate("/manager");
      else navigate("/");
    }, 1000);
  };

  const LoginHandler = (values) => {
    // Check local demo users first
    const demoMatch = DEMO_USERS.find(
      (u) =>
        u.email.toLowerCase() === values.Email.toLowerCase() &&
        (values.Password === u.password || values.Password === "admin123" || values.Password === "123456")
    );

    if (demoMatch) {
      handleQuickLogin(demoMatch);
      return;
    }

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
        const errorCode = result.rcode;
        if (errorCode === -9) {
          Swal.fire({
            icon: "error",
            title: "Oops...",
            text: "Invalid Credentials. Try one of the 1-click demo logins below!",
            timer: 2000,
          });
        }
        if (errorCode === 200) {
          dispatch(UserActions.getuserdata(result.data));
          const maxAgeInSeconds = 86400;
          setCookies("token", result.token, {
            maxAge: maxAgeInSeconds,
            path: "/",
          });
          localStorage.setItem("token", result.token);
          if (result.data.Role === 5) {
            navigate("/admin");
          } else if (result.data.Role === 4) {
            navigate("/authority");
          } else if (result.data.Role === 3) {
            navigate("/manager");
          } else {
            navigate("/");
          }
        }
      })
      .catch((error) => {
        console.log("Server connection error, checking demo match:", error);
        // Fallback for demo users
        const fallbackMatch = DEMO_USERS.find(
          (u) => u.email.toLowerCase() === values.Email.toLowerCase()
        );
        if (fallbackMatch) {
          handleQuickLogin(fallbackMatch);
        } else {
          Swal.fire({
            icon: "info",
            title: "Demo Mode Active",
            text: "Please click one of the quick demo persona buttons below to test without MongoDB.",
          });
        }
      });
  };

  const {
    values,
    errors,
    touched,
    handleBlur,
    handleChange,
    handleSubmit,
    setFieldValue,
  } = useFormik({
    initialValues: initialValues,
    validationSchema: LoginSchemas,
    onSubmit: LoginHandler,
  });

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between">
      {/* Top Navigation */}
      <div className="max-w-7xl mx-auto w-full p-4 flex justify-between items-center text-white">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-amber-400 hover:text-amber-300 transition bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <div className="text-xs text-slate-400 hidden sm:block">
          Sports, Youth & Cultural Activities Department &bull; Govt. of Gujarat
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/90 backdrop-blur-xl shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden">
          {/* Left Hero Graphic */}
          <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 p-8 flex-col justify-between text-white border-r border-slate-700">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mb-4 border border-amber-400/30">
                🏛️
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">
                Sports Authority of Gujarat
              </h2>
              <p className="text-xs uppercase tracking-wider text-indigo-300 mt-1 font-semibold">
                Infrastructure Management & Assessment System
              </p>
              <p className="text-slate-400 text-xs mt-4 leading-relaxed">
                Centralized state platform for monitoring sports facility conditions across all 33 Gujarat districts, conducting quality audits, managing court bookings, and optimizing grassroots athletic utilization.
              </p>
            </div>

            <div className="space-y-2 mt-8">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Quick Evaluation Personas
              </div>
              <div className="space-y-1.5">
                {DEMO_USERS.slice(0, 3).map((u, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickLogin(u)}
                    className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-xs flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-bold text-white group-hover:text-amber-400 transition">
                        {u.roleName}
                      </div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </div>
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-bold">
                      1-Click Login &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="w-full md:w-1/2 p-6 sm:p-8 flex flex-col justify-center">
            <h1 className="text-xl font-bold text-white mb-1">Official Portal Sign In</h1>
            <p className="text-xs text-slate-400 mb-6">
              Enter your official SAG or DSO credentials to access administrative dashboards.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  name="Email"
                  type="email"
                  placeholder="name@sag.gujarat.gov.in"
                  className="w-full rounded-xl py-2.5 px-3.5 text-sm bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={values.Email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                {errors.Email && touched.Email && (
                  <small className="text-rose-400 text-xs mt-1 block">
                    {errors.Email}
                  </small>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  name="Password"
                  type="password"
                  placeholder="Enter your password"
                  className="w-full rounded-xl py-2.5 px-3.5 text-sm bg-slate-900/80 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={values.Password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  required
                />
                {errors.Password && touched.Password && (
                  <small className="text-rose-400 text-xs mt-1 block">
                    {errors.Password}
                  </small>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg transition mt-2"
              >
                Sign In
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-700/80 text-center">
              <Link
                to="/"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Are you an athlete or citizen? Explore facilities without login &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 text-center text-xs text-slate-600">
        Department of Sports, Youth & Cultural Activities &bull; Government of Gujarat &bull; PS000012
      </div>
    </div>
  );
};

export default Login;
