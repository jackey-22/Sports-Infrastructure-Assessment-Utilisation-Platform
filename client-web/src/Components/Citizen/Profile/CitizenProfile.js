import React from "react";
import { CalendarCheck, Compass, FileText, Mail, Phone, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Card, PageHeader, PageShell, SectionHeader } from "../Common/CitizenUI";

export default function CitizenProfile() {
  const citizen = useSelector((state) => state.user?.user) || {};
  return <PageShell>
    <PageHeader eyebrow="Citizen account" title="My profile" description="Your account information used automatically during booking." />
    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Card><SectionHeader title="Personal information" /><div className="p-5"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><UserRound className="h-8 w-8" /></div><h2 className="mt-4 text-xl font-extrabold text-slate-900">{citizen.Name || "Citizen"}</h2><div className="mt-5 space-y-3 text-sm text-slate-600"><p className="flex items-center gap-2"><Mail className="h-4 w-4 text-emerald-700" />{citizen.Email || "No email"}</p><p className="flex items-center gap-2"><Phone className="h-4 w-4 text-emerald-700" />{citizen.ContactNum || "No contact number"}</p></div></div></Card>
      <Card><SectionHeader title="Quick actions" /><div className="space-y-3 p-5"><Button as={Link} to="/explore" className="w-full"><Compass className="mr-2 h-4 w-4" />Explore & book</Button><Button as={Link} to="/citizen/bookings" variant="secondary" className="w-full"><CalendarCheck className="mr-2 h-4 w-4" />My bookings & ratings</Button><Button as={Link} to="/citizen/complaints" variant="secondary" className="w-full"><FileText className="mr-2 h-4 w-4" />Raise or track complaint</Button></div></Card>
    </div>
  </PageShell>;
}
