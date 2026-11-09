import React, { useState } from "react";
import {
  Outlet,
  NavLink,
  useNavigate,
  useLoaderData,
} from "react-router-dom";
import { FetchDistrict } from "../../API/FetchDistrict";
import Swal from "sweetalert2";
import { UserActions } from "../../store/UserData";
import { useDispatch } from "react-redux";
import image from "./../../Assets/symbol.png";
import { FetchComplaintType } from "../../API/FetchComplaintType";
import {
  Building2,
  Activity,
  Users,
  LogOut,
  Calendar,
  BarChart3,
  FileText,
  ClipboardList,
  MessageCircle,
  Clock,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/citizen/dashboard", label: "Dashboard", icon: Activity },
  { to: "/citizen/attendance", label: "Attendance", icon: Clock },
  { to: "/citizen/feedback", label: "Feedback", icon: MessageCircle },
  { to: "/citizen/complaints", label: "Complaints", icon: FileText },
  { to: "/citizen/profile", label: "Profile", icon: Users },
];

const itemClass = ({ isActive }) =>
  `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
    isActive ? "bg-brand-primary text-white" : "text-emerald-50 hover:bg-white/10"
  }`;

const Layout = () => {
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  dispatch(UserActions.getuserdata(useLoaderData()));

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You redirect to Login page...",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Logout",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        navigate("/");
      }
    });
  };

  FetchDistrict();
  FetchComplaintType();

  return (
    <div className="min-h-screen bg-brand-mint font-sans text-slate-800">
      <aside
        className="fixed inset-y-0 left-0 z-40 w-64 border-r border-white/10 bg-brand-dark flex flex-col lg:flex hidden"
        aria-label="Citizen navigation"
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-5">
          <img
            src={image}
            alt="KhelGujarat symbol"
            className="h-8 w-8 opacity-80"
          />
          <div>
            <p className="font-display text-sm font-extrabold text-white">KhelGujarat</p>
            <p className="text-xs text-emerald-100">
              Citizen Console
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Citizen modules">
          <p className="mb-2 px-3 text-xs font-semibold text-emerald-100/90">
            Services
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
              key={to}
              to={to}
              end={to === "/citizen/dashboard"}
              className={itemClass}
            >
              <Icon className="h-4 w-4 shrink-0 text-emerald-100" aria-hidden="true" />
              {label}
                </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
          >
            <LogOut className="h-4 w-4 shrink-0 text-emerald-100" aria-hidden="true" />
            Logout
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <p className="text-sm font-extrabold text-brand-dark">Citizen Console</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          aria-label="Open navigation"
          aria-expanded={isOpen}
        >
          <span className="sr-only">Menu</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {isOpen ? (
        <div className="fixed inset-0 z-[1200] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <aside className="relative flex h-full w-72 flex-col border-r border-white/10 bg-brand-dark">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-emerald-50 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              aria-label="Close navigation"
            >
              <span className="sr-only">Close</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
              <p className="mb-2 px-3 text-xs font-semibold text-emerald-100/90">
                Services
              </p>
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/citizen/dashboard"}
                  onClick={() => setOpen(false)}
                  className={itemClass}
                >
                  <Icon className="h-4 w-4 shrink-0 text-emerald-100" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </nav>
            <div className="border-t border-white/10 p-3">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-emerald-50 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
              >
                <LogOut className="h-4 w-4 shrink-0 text-emerald-100" aria-hidden="true" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <main className="lg:pl-64 min-h-screen">{<Outlet />}</main>
    </div>
  );
};

export default Layout;



