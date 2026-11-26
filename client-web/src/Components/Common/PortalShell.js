import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import symbolImg from "../../Assets/symbol.png";
import { ConfirmDialog } from "../Admin/Common/AdminUI";

const STORAGE_KEY = "kg_drawer_collapsed";

const navItemClass = ({ isActive }, collapsed) =>
  `group relative flex items-center rounded-xl transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
    collapsed ? "justify-center px-2 py-2" : "gap-3 px-2.5 py-2"
  } ${
    isActive
      ? "bg-emerald-50/80 font-bold text-slate-900 ring-1 ring-emerald-200/80 shadow-2xs"
      : "font-semibold text-slate-600 hover:bg-slate-100/75 hover:text-slate-900"
  }`;

/**
 * Collapsible drawer shell shared across Citizen, Coach, Manager, Authority, and Institution consoles.
 */
export default function PortalShell({ roleTitle, sections = [], children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [logoutOpen, setLogoutOpen] = useState(false);
  const navigate = useNavigate();
  const user = useSelector((state) => state.user?.user) || {};

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Ignore storage failures
    }
  }, [collapsed]);

  const displayName = String(user.Name || roleTitle || "User")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  const initials =
    (displayName || "U")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const handleConfirmLogout = () => {
    setLogoutOpen(false);
    localStorage.removeItem("token");
    navigate("/");
  };

  const renderDrawerContent = (isCollapsed = false, isMobile = false) => (
    <div className="flex h-full flex-col bg-white text-slate-800">
      {/* Drawer Header */}
      <div
        className={`flex h-16 shrink-0 items-center border-b border-slate-200/80 ${
          isCollapsed ? "justify-center px-2" : "justify-between px-4"
        }`}
      >
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          title="KhelGujarat Portal Home"
          className="flex min-w-0 items-center gap-3 rounded-xl py-1 transition hover:opacity-90"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200/70 bg-emerald-50 p-1.5 shadow-2xs">
            <img src={symbolImg} alt="KhelGujarat emblem" className="h-full w-full object-contain" />
          </div>
          {!isCollapsed ? (
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-extrabold tracking-tight text-slate-900">
                KhelGujarat
              </p>
              <p className="truncate text-[11px] font-bold text-brand-primary">{roleTitle}</p>
            </div>
          ) : null}
        </Link>

        {isMobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      {/* Navigation Sections */}
      <nav
        className="flex-1 space-y-4 overflow-y-auto px-3 py-4"
        aria-label={`${roleTitle} navigation`}
      >
        {sections.map((section, idx) => (
          <div
            key={section.label || idx}
            className={idx > 0 ? "border-t border-slate-100 pt-3.5" : ""}
          >
            {section.label ? (
              isCollapsed ? (
                <span className="sr-only">{section.label}</span>
              ) : (
                <p className="mb-2 px-2.5 text-[10px] font-bold uppercase tracking-[0.09em] text-slate-400">
                  {section.label}
                </p>
              )
            ) : null}

            <div className="space-y-1">
              {section.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={isCollapsed ? label : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={(navProps) => navItemClass(navProps, isCollapsed)}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !isCollapsed ? (
                        <span
                          aria-hidden="true"
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-brand-primary"
                        />
                      ) : null}
                      {Icon ? (
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                            isActive
                              ? "bg-brand-primary text-white shadow-2xs"
                              : "bg-slate-100/90 text-slate-500 group-hover:bg-white group-hover:text-brand-primary group-hover:shadow-2xs"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                      ) : null}
                      {!isCollapsed ? (
                        <span className="truncate text-[13px]">{label}</span>
                      ) : (
                        <span className="sr-only">{label}</span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Drawer Footer */}
      <div className="shrink-0 border-t border-slate-200/70 bg-slate-50/70 p-3">
        <button
          type="button"
          title={isCollapsed ? "Sign out" : undefined}
          onClick={() => {
            setMobileOpen(false);
            setLogoutOpen(true);
          }}
          className={`group flex w-full items-center rounded-xl text-[13px] font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 ${
            isCollapsed ? "justify-center p-2" : "gap-3 px-2.5 py-2"
          }`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-200/70 text-slate-500 transition group-hover:bg-rose-100 group-hover:text-rose-600">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          {!isCollapsed ? <span>Sign out</span> : <span className="sr-only">Sign out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Desktop Collapsible Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200/90 bg-white shadow-[1px_0_0_rgba(15,23,42,0.04),8px_0_24px_-16px_rgba(15,23,42,0.12)] transition-[width] duration-200 ease-out lg:block ${
          collapsed ? "w-[76px]" : "w-[260px]"
        }`}
      >
        {renderDrawerContent(collapsed, false)}
      </aside>

      {/* Top Utility Header */}
      <header
        className={`sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md transition-[padding] duration-200 ease-out sm:px-6 ${
          collapsed ? "lg:pl-[96px]" : "lg:pl-[280px]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-2xs hover:bg-slate-50 lg:hidden"
            aria-label="Open navigation drawer"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Desktop Drawer Collapse/Expand Trigger */}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 lg:inline-flex"
            aria-label={collapsed ? "Expand navigation drawer" : "Collapse navigation drawer"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>

          <span className="hidden h-5 w-px bg-slate-200 lg:block" aria-hidden="true" />

          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary lg:hidden">
              KhelGujarat
            </p>
            <p className="truncate text-sm font-bold text-slate-800">{roleTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 rounded-full border border-slate-200/90 bg-slate-50 py-1 pl-1.5 pr-3.5 md:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary text-[10px] font-extrabold text-white shadow-2xs">
              {initials}
            </span>
            <span className="max-w-[200px] truncate text-xs font-bold text-slate-700">
              {displayName}
            </span>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[1300] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs"
          />
          <aside className="relative h-full w-72 overflow-hidden rounded-r-2xl border-r border-slate-200 bg-white shadow-2xl">
            {renderDrawerContent(false, true)}
          </aside>
        </div>
      ) : null}

      <main
        className={`min-h-[calc(100vh-4rem)] transition-[padding] duration-200 ease-out ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]"
        }`}
      >
        {children}
      </main>

      <ConfirmDialog
        open={logoutOpen}
        title="Sign out of KhelGujarat?"
        description="You will be signed out of your current session and redirected to the public portal."
        confirmLabel="Sign out"
        tone="danger"
        onConfirm={handleConfirmLogout}
        onCancel={() => setLogoutOpen(false)}
      />
    </div>
  );
}
