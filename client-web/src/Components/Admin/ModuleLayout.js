import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import AdminSidebar from "./AdminSidebar";

const STORAGE_KEY = "kg_drawer_collapsed";

export default function AdminModuleLayout({ children }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Ignore storage errors
    }
  }, [collapsed]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200/90 bg-white shadow-[1px_0_0_rgba(15,23,42,0.04),8px_0_24px_-16px_rgba(15,23,42,0.12)] transition-[width] duration-200 ease-out lg:block ${
          collapsed ? "w-[76px]" : "w-[260px]"
        }`}
      >
        <AdminSidebar collapsed={collapsed} />
      </aside>

      <header
        className={`sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md transition-[padding] duration-200 ease-out sm:px-6 ${
          collapsed ? "lg:pl-[96px]" : "lg:pl-[280px]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-2xs hover:bg-slate-50 lg:hidden"
            aria-label="Open module navigation"
            aria-expanded={open}
          >
            <Menu className="h-4 w-4" />
          </button>

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

          <p className="truncate text-sm font-bold text-slate-800">State Administration Console</p>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-[1300] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs"
          />
          <aside className="relative h-full w-72 overflow-hidden rounded-r-2xl border-r border-slate-200 bg-white shadow-2xl">
            <AdminSidebar isMobile onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      ) : null}

      <main
        className={`min-h-[calc(100vh-4rem)] transition-[padding] duration-200 ease-out ${
          collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]"
        }`}
      >
        {children || <Outlet />}
      </main>
    </div>
  );
}
