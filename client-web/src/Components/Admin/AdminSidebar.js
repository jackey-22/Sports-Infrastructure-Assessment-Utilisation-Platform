import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Building2,
  Gauge,
  LayoutDashboard,
  LogOut,
  Medal,
  MessageSquareWarning,
  Receipt,
  ClipboardCheck,
  UserRound,
  Wallet,
  ClipboardList,
  School,
  Trophy,
  X,
} from "lucide-react";
import symbolImg from "../../Assets/symbol.png";
import { ConfirmDialog } from "./Common/AdminUI";

const MANAGEMENT = [
  { id: "facilities", label: "Facility management", icon: Building2 },
  { id: "sports", label: "Sports management", icon: LayoutDashboard },
  { id: "coaches", label: "Coach management", icon: UserRound },
  { id: "evaluationTemplates", label: "Evaluation templates", icon: ClipboardList },
];

const PLATFORM = [
  {
    to: "/admin/insights",
    label: "Dashboard & insights",
    icon: Gauge,
    match: (path) => path === "/admin/insights",
  },
  { to: "/admin/insights/leaderboard", label: "Top athletes", icon: Medal },
  { to: "/admin/insights/achievements", label: "Athlete achievements", icon: Trophy },
  { to: "/admin/insights/grievances", label: "Grievances", icon: MessageSquareWarning },
  { to: "/admin/insights/bookings", label: "Bookings & payments", icon: Receipt },
  { to: "/admin/insights/utilisation", label: "Slot utilisation", icon: BarChart3 },
  { to: "/admin/insights/institution-events", label: "Institution events", icon: School },
  { to: "/admin/insights/grants", label: "Grants", icon: Wallet },
  { to: "/admin/insights/assessments", label: "Facility assessments", icon: ClipboardCheck },
];

function itemClass(active, collapsed) {
  return `group relative flex w-full items-center rounded-xl text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
    collapsed ? "justify-center px-2 py-2" : "gap-3 px-2.5 py-2"
  } ${
    active
      ? "bg-emerald-50/80 font-bold text-slate-900 ring-1 ring-emerald-200/80 shadow-2xs"
      : "font-semibold text-slate-600 hover:bg-slate-100/75 hover:text-slate-900"
  }`;
}

function DrawerRow({ active, collapsed, icon: Icon, label }) {
  return (
    <>
      {active && !collapsed ? (
        <span
          aria-hidden="true"
          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand-primary"
        />
      ) : null}
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active
            ? "bg-brand-primary text-white shadow-2xs"
            : "bg-slate-100/90 text-slate-500 group-hover:bg-white group-hover:text-brand-primary group-hover:shadow-2xs"
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      {!collapsed ? (
        <span className="truncate text-[13px]">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </>
  );
}

export default function AdminSidebar({ collapsed = false, onNavigate, isMobile = false }) {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const section = new URLSearchParams(search).get("section") || "facilities";
  const onConsole = pathname === "/admin";

  const go = () => onNavigate?.();

  const confirmSignOut = () => {
    setLogoutOpen(false);
    window.localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="flex h-full flex-col bg-white text-slate-800">
      <div
        className={`flex h-16 shrink-0 items-center border-b border-slate-200/80 ${
          collapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <Link
          to="/"
          onClick={go}
          title="KhelGujarat Portal Home"
          className="flex min-w-0 items-center gap-3 rounded-xl py-1 transition hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/70 bg-emerald-50 p-1.5 shadow-2xs">
            <img src={symbolImg} alt="KhelGujarat emblem" className="h-full w-full object-contain" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-extrabold tracking-tight text-slate-900">
                KhelGujarat
              </p>
              <p className="truncate text-[11px] font-bold text-brand-primary">State Admin Console</p>
            </div>
          ) : null}
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={go}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4" aria-label="Admin">
        <div>
          <p className={`mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400 ${collapsed ? "sr-only" : ""}`}>
            Overview
          </p>
          <div className="space-y-1">
            {PLATFORM.slice(0, 1).map((item) => {
              const active = item.match(pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={go}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={itemClass(active, collapsed)}
                >
                  <DrawerRow active={active} collapsed={collapsed} icon={item.icon} label={item.label} />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3.5">
          <p className={`mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400 ${collapsed ? "sr-only" : ""}`}>
            Master Directory
          </p>
          <div className="space-y-1">
            {MANAGEMENT.map((item) => {
              const active = onConsole && section === item.id;
              return (
                <Link
                  key={item.id}
                  to={`/admin?section=${item.id}`}
                  onClick={go}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={itemClass(active, collapsed)}
                >
                  <DrawerRow active={active} collapsed={collapsed} icon={item.icon} label={item.label} />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3.5">
          <p className={`mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400 ${collapsed ? "sr-only" : ""}`}>
            Operations
          </p>
          <div className="space-y-1">
            {PLATFORM.slice(1).map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={go}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={itemClass(active, collapsed)}
                >
                  <DrawerRow active={active} collapsed={collapsed} icon={item.icon} label={item.label} />
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="shrink-0 border-t border-slate-200/70 bg-slate-50/70 p-3">
        <button
          type="button"
          title={collapsed ? "Sign out" : undefined}
          onClick={() => setLogoutOpen(true)}
          className={`group flex w-full items-center rounded-xl text-[13px] font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 ${
            collapsed ? "justify-center p-2" : "gap-3 px-2.5 py-2"
          }`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200/70 text-slate-500 transition group-hover:bg-rose-100 group-hover:text-rose-600">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          {!collapsed ? <span>Sign out</span> : <span className="sr-only">Sign out</span>}
        </button>
      </div>

      <ConfirmDialog
        open={logoutOpen}
        title="Sign out of KhelGujarat?"
        description="You will be signed out of your State Admin session and redirected to the public portal."
        confirmLabel="Sign out"
        tone="danger"
        onConfirm={confirmSignOut}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
