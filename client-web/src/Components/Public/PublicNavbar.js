import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { API_BASE_URL } from "../../API/client";
import { UserActions } from "../../store/UserData";
import { readDemoToken } from "../Auth/demoAuth";

function BrandMark({ className = "w-11 h-11" }) {
  return (
    <div
      className={`${className} rounded-xl bg-brand-soft flex items-center justify-center flex-shrink-0 overflow-hidden`}
      aria-hidden
    >
      <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none">
        <path
          d="M24 4c-6 2-11 8-13 16-1 5 0 11 3 16l4-2c-2-4-3-9-2-13 1-6 5-11 10-13 5 2 9 7 10 13 1 4 0 9-2 13l4 2c3-5 4-11 3-16C35 12 30 6 24 4z"
          fill="#007D40"
          opacity="0.25"
        />
        <path
          d="M24 14c1.2 0 2.2.9 2.2 2.1s-1 2.1-2.2 2.1-2.2-.9-2.2-2.1.1-2.1 2.2-2.1zm-1.4 5.4h2.8l2.2 6.2h-2.1l-.5-1.5h-2l-.5 1.5h-2.1l2.2-6.2zm-.4 3.2h2l-.7-2.1h-.6l-.7 2.1zm-1.4 3.6 1.6 4.2h2.2l-1-2.6 2.2-1.6h-2.3l-1.1 1.1-.6-1.1H18l2.8 3z"
          fill="#007D40"
        />
      </svg>
    </div>
  );
}

const navLinkClass = ({ isActive }) =>
  `px-3.5 py-1.5 rounded-full text-sm font-semibold transition whitespace-nowrap ${
    isActive
      ? "bg-brand-soft text-brand-primary"
      : "text-slate-600 hover:text-brand-dark hover:bg-brand-mint"
  }`;

export default function PublicNavbar() {
  const location = useLocation();
  const dispatch = useDispatch();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState(() => {
    try { return window.localStorage.getItem("token") || ""; } catch (error) { return ""; }
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
          // Keep the saved session during a temporary network failure.
        }
      });
    return () => controller.abort();
  }, [dispatch, hasUser, sessionToken]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-[1200] bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 min-w-0 group">
          <BrandMark />
          <div className="min-w-0">
            <div className="font-extrabold text-brand-dark text-sm sm:text-base leading-tight truncate group-hover:text-brand-primary transition">
              Gujarat Sports Infrastructure Portal
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">
              Sports, Youth &amp; Cultural Activities Department, Government of Gujarat
            </div>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/explore" className={navLinkClass}>
            Explore Facilities
          </NavLink>

          <a
            href={isHome ? "#about" : "/#about"}
            className="px-3.5 py-1.5 rounded-full text-sm font-semibold text-slate-600 hover:text-brand-dark hover:bg-brand-mint transition"
          >
            About
          </a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="hidden sm:flex w-9 h-9 items-center justify-center rounded-full text-slate-500 hover:bg-brand-soft hover:text-brand-primary transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
          </button>
          {isLoggedIn ? (
            <Link
              to={roleHome}
              className="inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full border border-slate-200 bg-white hover:bg-brand-soft transition"
              title={userData?.Name || "Account"}
            >
              <span className="w-8 h-8 rounded-full bg-brand-primary text-white text-xs font-extrabold flex items-center justify-center">
                {initials}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-bold text-brand-primary border border-brand-primary/30 hover:bg-brand-soft transition"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="inline-flex px-4 py-2 rounded-full text-sm font-bold text-white bg-brand-primary hover:bg-brand-dark transition shadow-sm"
              >
                Register
              </Link>
            </>
          )}
          <button
            type="button"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-full text-slate-600 hover:bg-brand-soft"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          <NavLink to="/" end className={navLinkClass} onClick={() => setMobileOpen(false)}>
            Home
          </NavLink>
          <NavLink to="/explore" className={navLinkClass} onClick={() => setMobileOpen(false)}>
            Explore Facilities
          </NavLink>
          <a
            href={isHome ? "#about" : "/#about"}
            className="block px-3.5 py-2 text-sm font-semibold text-slate-600"
            onClick={() => setMobileOpen(false)}
          >
            About
          </a>
          {!isLoggedIn && (
            <Link
              to="/login"
              className="block px-3.5 py-2 text-sm font-bold text-brand-primary sm:hidden"
              onClick={() => setMobileOpen(false)}
            >
              Login
            </Link>
          )}
          {!isLoggedIn ? <Link to="/signup" className="block px-3.5 py-2 text-sm font-bold text-brand-primary sm:hidden" onClick={() => setMobileOpen(false)}>Register</Link> : null}
        </div>
      )}
    </header>
  );
}
