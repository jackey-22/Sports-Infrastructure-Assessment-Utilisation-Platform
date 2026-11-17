import React, { useEffect, useState } from "react";
import { CalendarCheck, Compass, FileText, Loader2, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { api } from "../../../API/client";
import { LatestBookingPass } from "../../Booking/BookingPassCard";
import { Button, Card, KpiCard, PageHeader, PageShell, SectionHeader } from "../Common/CitizenUI";

export default function CitizenDashboard() {
  const citizen = useSelector((state) => state.user?.user) || {};
  const [data, setData] = useState(null);
  useEffect(() => {
    Promise.all([api.get("/api/citizen/bookings"), api.get("/api/citizen/reviews"), api.get("/api/grievances")])
      .then(([bookings, reviews, grievances]) => setData({ bookings: bookings.data || [], reviews: reviews.data || [], grievances: grievances.data || [] }))
      .catch(() => setData({ bookings: [], reviews: [], grievances: [] }));
  }, []);
  return <PageShell>
    <PageHeader eyebrow="Citizen account" title={`Welcome${citizen.Name ? `, ${citizen.Name.split(" ")[0]}` : ""}`} description="Explore bookable facilities, manage reservations, submit ratings and track complaints." actions={<Button as={Link} to="/explore"><Compass className="h-4 w-4" />Explore & book</Button>} />
    <LatestBookingPass />
    {!data ? <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-emerald-700" /></div> : <>
      <div className="mb-5 grid gap-3 sm:grid-cols-3"><KpiCard label="My bookings" value={data.bookings.length} caption={`${data.bookings.filter((item) => item.bookingStatus === "Confirmed").length} confirmed`} icon={CalendarCheck} tone="green" /><KpiCard label="Ratings submitted" value={data.reviews.length} caption="Facility, sport and coach" icon={Star} tone="amber" /><KpiCard label="Complaints" value={data.grievances.length} caption={`${data.grievances.filter((item) => item.workflowStatus === "Resolved").length} resolved`} icon={FileText} tone="violet" /></div>
      <Card><SectionHeader title="What would you like to do?" /><div className="grid gap-3 p-5 md:grid-cols-3"><Action to="/explore" icon={Compass} title="Explore & book" text="Find facilities, view live slots and make a booking." /><Action to="/citizen/bookings" icon={CalendarCheck} title="Bookings & ratings" text="Download invoices and rate facilities, sports or coaches." /><Action to="/citizen/complaints" icon={FileText} title="Complaints" text="Raise a complaint and track manager responses." /></div></Card>
    </>}
  </PageShell>;
}

function Action({ to, icon: Icon, title, text }) { return <Link to={to} className="rounded-2xl border border-slate-200 p-5 transition hover:border-emerald-400 hover:bg-emerald-50/40"><Icon className="h-6 w-6 text-emerald-700" /><h2 className="mt-3 font-extrabold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-500">{text}</p></Link>; }
