import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Compass, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { API_BASE_URL } from "../../API/client";
import { UserActions } from "../../store/UserData";
import { readDemoToken } from "../Auth/demoAuth";
import symbolImg from "../../Assets/symbol.png";

const navLinkClass = ({ isActive }) =>
  `px-3.5 py-2 rounded-xl text-sm font-semibold transition whitespace-nowrap ${
    isActive
      ? "bg-emerald-50 text-brand-primary"
      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
  }`;

export default function PublicNavbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [sessionToken, setSessionToken] = useState(() => {
    try {
      return window.localStorage.getItem("token") || "";
    } catch {
      return "";
    }
  });

  const userData = useSelector((state) => state.user?.user);
  const hasToken = Boolean(sessionToken);
  const hasUser = Boolean(userData && (userData.Email || userData.Name));
  const isLoggedIn = hasToken;
  const initials =
    (userData?.Name || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U";

  const isHome = location.pathname === "/";

  const roleHome =
    userData?.Role === 5
      ? "/admin"
      : userData?.Role === 4
      ? "/authority"
      : userData?.Role === 3
      ? "/manager"
      : userData?.Role === 2
      ? "/coach/dashboard"
      : userData?.Role === 0
      ? "/citizen/dashboard"
      : userData?.Role === 7
      ? "/institute"
      : userData?.Role === 6
      ? "/gate"
      : userData?.Role === 1
      ? "/supervisor"
      : "/login";

  useEffect(() => {
    if (!sessionToken || hasUser) return undefined;
    const demoUser = readDemoToken(sessionToken);
    if (demoUser) {
      dispatch(UserActions.getuserdata(demoUser));
      return undefined;
    }
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: sessionToken }),
      signal: controller.signal,
    })
      .then(async (response) => ({ response, body: await response.json().catch(() => null) }))
      .then(({ response, body }) => {
        if (response.ok && body?.rcode === 200 && body.data) {
          dispatch(UserActions.getuserdata(body.data));
          return;
        }
        window.localStorage.removeItem("token");
        setSessionToken("");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          // Preserve token on transient network outage
        }
      });
    return () => controller.abort();
  }, [dispatch, hasUser, sessionToken]);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleSignOut = () => {
    window.localStorage.removeItem("token");
    setSessionToken("");
    dispatch(UserActions.getuserdata({}));
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-[1200] border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="group flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 p-1.5">
            <img src={symbolImg} alt="Government of Gujarat emblem" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold tracking-tight text-slate-900 transition group-hover:text-brand-primary sm:text-base">
              Gujarat Sports Infrastructure Portal
            </p>
            <p className="hidden truncate text-[11px] font-medium text-slate-500 sm:block">
              Sports Authority of Gujarat · Government of Gujarat
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/explore" className={navLinkClass}>
            Explore Facilities
          </NavLink>
          <NavLink to={userData?.Role === 7 ? "/institute" : "/institution-signup"} className={navLinkClass}>
            Institution Events
          </NavLink>
          <a
            href={isHome ? "#about" : "/#about"}
            className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            About
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          {isLoggedIn ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-2 pr-3 text-sm font-bold text-slate-700 shadow-xs transition hover:border-slate-300 hover:bg-slate-50"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-xs font-extrabold text-white">
                  {initials}
                </span>
                <span className="hidden max-w-[120px] truncate sm:inline">
                  {userData?.Name?.split(" ")[0] || "Account"}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl"
                >
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-xs font-extrabold text-slate-900">
                      {userData?.Name || "Signed in user"}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {userData?.Email || "Active session"}
                    </p>
                  </div>
                  <div className="py-1">
                    <Link
                      to={roleHome}
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-emerald-50 hover:text-brand-primary"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Open Console
                    </Link>
                    <Link
                      to="/explore"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      <Compass className="h-4 w-4" />
                      Explore Facilities
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="rounded-xl bg-brand-primary px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-brand-dark"
              >
                Register
              </Link>
            </div>
          )}

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="space-y-1 border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
          <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/explore" className={navLinkClass} onClick={() => setMobileOpen(false)}>
            Explore Facilities
          </NavLink>
          <NavLink
            to={userData?.Role === 7 ? "/institute" : "/institution-signup"}
            className={navLinkClass}
            onClick={() => setMobileOpen(false)}
          >
            Institution Events
          </NavLink>
          <a
            href={isHome ? "#about" : "/#about"}
            className="block rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
            onClick={() => setMobileOpen(false)}
          >
            About
          </a>
          <div className="border-t border-slate-100 pt-2">
            {isLoggedIn ? (
              <div className="flex items-center justify-between gap-2 px-1 py-1">
                <Link
                  to={roleHome}
                  className="flex-1 rounded-xl bg-brand-primary px-4 py-2.5 text-center text-sm font-bold text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Open Console
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-xl border border-rose-200 px-3 py-2.5 text-sm font-bold text-rose-600"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  className="rounded-xl border border-slate-200 py-2.5 text-center text-sm font-bold text-slate-700"
                  onClick={() => setMobileOpen(false)}
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="rounded-xl bg-brand-primary py-2.5 text-center text-sm font-bold text-white"
                  onClick={() => setMobileOpen(false)}
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
