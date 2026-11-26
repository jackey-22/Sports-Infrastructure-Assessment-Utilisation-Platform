import React, { useState } from "react";
import { Building2, CalendarPlus, ClipboardList, Compass, LogOut, Menu, X } from "lucide-react";
import { NavLink, Outlet, useLoaderData, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { UserActions } from "../../store/UserData";

const items = [
  { to: "/institute", label: "Event requests", icon: ClipboardList, end: true },
  { to: "/institute/new", label: "New event request", icon: CalendarPlus },
  { to: "/explore", label: "Explore facilities", icon: Compass },
];
const itemClass = ({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${isActive ? "bg-brand-primary text-white" : "text-emerald-50 hover:bg-white/10"}`;

export default function InstitutionLayout() {
  const dispatch = useDispatch();
  dispatch(UserActions.getuserdata(useLoaderData()));
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const signOut = () => { localStorage.removeItem("token"); navigate("/"); };
  const nav = <><div className="flex h-20 items-center gap-3 border-b border-white/10 px-5"><Building2 className="h-10 w-10 rounded-xl bg-white/10 p-2 text-white" /><div><p className="font-extrabold text-white">KhelGujarat</p><p className="text-xs text-emerald-100">Institution portal</p></div></div><nav className="flex-1 space-y-1 px-3 py-5">{items.map(({ icon: Icon, ...item }) => <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setOpen(false)} className={itemClass}><Icon className="h-4 w-4" />{item.label}</NavLink>)}</nav><div className="border-t border-white/10 p-3"><button onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-emerald-50 hover:bg-white/10"><LogOut className="h-4 w-4" />Sign out</button></div></>;
  return <div className="min-h-screen bg-brand-mint"><aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-dark lg:flex">{nav}</aside><header className="sticky top-0 z-30 flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden"><p className="font-extrabold text-brand-dark">Institution portal</p><button onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button></header>{open ? <div className="fixed inset-0 z-[1300] lg:hidden"><button className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} aria-label="Close navigation" /><aside className="relative flex h-full w-72 flex-col bg-brand-dark"><button className="absolute right-3 top-4 text-white" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button>{nav}</aside></div> : null}<main className="min-h-screen lg:pl-64"><Outlet /></main></div>;
}
