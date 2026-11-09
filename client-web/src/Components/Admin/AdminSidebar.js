import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Gauge,
  LayoutDashboard,
  LogOut,
  MessageSquareWarning,
  Receipt,
  RotateCcw,
  ClipboardCheck,
  ShieldCheck,
  UserRound,
  Wallet,
} from "lucide-react";
import { resetDemoStore } from "../../data/demoStore";

const MANAGEMENT = [
  { id: "facilities", label: "Facility management", icon: Building2 },
  { id: "sports", label: "Sports management", icon: LayoutDashboard },
  { id: "coaches", label: "Coach management", icon: UserRound },
];

const PLATFORM = [
  {
    to: "/admin/insights",
    label: "Dashboard & insights",
    icon: Gauge,
    match: (path) => path === "/admin/insights",
  },
  { to: "/admin/insights/grievances", label: "Grievances", icon: MessageSquareWarning },
  { to: "/admin/insights/transactions", label: "Transactions", icon: Receipt },
  { to: "/admin/insights/grants", label: "Grants", icon: Wallet },
  { to: "/admin/insights/assessments", label: "Facility assessments", icon: ClipboardCheck },
];

function itemClass(active, collapsed) {
  return `flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
    collapsed ? "justify-center" : ""
  } ${
    active
      ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20"
      : "text-slate-200 hover:bg-white/10 hover:text-white"
  }`;
}

export default function AdminSidebar({ collapsed = false, onNavigate }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const section = new URLSearchParams(search).get("section") || "facilities";
  const onConsole = pathname === "/admin";

  const go = () => onNavigate?.();

  const signOut = () => {
    window.localStorage.removeItem("token");
    navigate("/");
  };

  const resetDemoData = () => {
    if (
      !window.confirm(
        "Restore the original records in this browser? Your sign-in is kept."
      )
    ) {
      return;
    }
    resetDemoStore();
  };

  return (
    <div className="flex h-full flex-col bg-brand-dark text-white">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary font-display text-xl font-extrabold">
          K
        </div>
        {!collapsed ? (
          <div>
            <p className="font-display text-lg font-extrabold">KhelGujarat</p>
            <p className="text-xs text-emerald-100">Admin console</p>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Admin">
        <p className={`mb-2 px-3 text-xs font-semibold text-emerald-100/90 ${collapsed ? "sr-only" : ""}`}>
          Overview
        </p>
        {PLATFORM.slice(0, 1).map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname);
          return (
            <Link key={item.to} to={item.to} onClick={go} aria-current={active ? "page" : undefined} className={itemClass(active, collapsed)}>
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed ? item.label : <span className="sr-only">{item.label}</span>}
            </Link>
          );
        })}

        <p className={`mb-2 mt-5 px-3 text-xs font-semibold text-emerald-100/90 ${collapsed ? "sr-only" : ""}`}>
          Management
        </p>
        {MANAGEMENT.map((item) => {
          const Icon = item.icon;
          const active = onConsole && section === item.id;
          return (
            <Link
              key={item.id}
              to={`/admin?section=${item.id}`}
              onClick={go}
              aria-current={active ? "page" : undefined}
              className={itemClass(active, collapsed)}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed ? item.label : <span className="sr-only">{item.label}</span>}
            </Link>
          );
        })}

        <p className={`mb-2 mt-5 px-3 text-xs font-semibold text-emerald-100/90 ${collapsed ? "sr-only" : ""}`}>
          Operations
        </p>
        {PLATFORM.slice(1).map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link key={item.to} to={item.to} onClick={go} aria-current={active ? "page" : undefined} className={itemClass(active, collapsed)}>
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed ? item.label : <span className="sr-only">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <Link to="/explore" onClick={go} className={itemClass(false, collapsed)}>
          <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed ? "View public portal" : <span className="sr-only">View public portal</span>}
        </Link>
        <button type="button" onClick={signOut} className={`mt-1 ${itemClass(false, collapsed)}`}>
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed ? "Sign out" : <span className="sr-only">Sign out</span>}
        </button>
        {!collapsed ? (
          <button
            type="button"
            onClick={resetDemoData}
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Reset records
          </button>
        ) : null}
      </div>
    </div>
  );
}
