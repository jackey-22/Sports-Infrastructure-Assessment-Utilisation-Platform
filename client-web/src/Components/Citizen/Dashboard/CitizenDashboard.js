import React, { useEffect, useState } from "react";
import { Award, Bell, CalendarCheck, Compass, FileText, Sparkles, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { api } from "../../../API/client";
import { LatestBookingPass } from "../../Booking/BookingPassCard";
import { Button, Card, KpiCard, PageHeader, PageShell, SectionHeader } from "../Common/CitizenUI";

export default function CitizenDashboard() {
  const citizen = useSelector((state) => state.user?.user) || {};
  const [data, setData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get("/api/citizen/bookings"),
      api.get("/api/citizen/reviews"),
      api.get("/api/grievances"),
      api.get("/api/athlete/announcements").catch(() => ({ data: [] })),
    ])
      .then(([bookings, reviews, grievances, announcements]) =>
        setData({
          bookings: bookings.data || [],
          reviews: reviews.data || [],
          grievances: grievances.data || [],
          announcements: announcements.data || [],
        })
      )
      .catch(() => setData({ bookings: [], reviews: [], grievances: [], announcements: [] }));
  }, []);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen & Athlete Account"
        title={`Welcome${citizen.Name ? `, ${citizen.Name.split(" ")[0]}` : ""}`}
        description="Discover sports facilities, manage your reservations, track athlete evaluations, and submit achievements."
        actions={
          <Button as={Link} to="/citizen/explore">
            <Compass className="h-4 w-4" />
            Explore &amp; Book
          </Button>
        }
      />

      <LatestBookingPass />

      {data?.announcements?.length ? (
        <Card className="mb-6 border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/40 shadow-sm">
          <SectionHeader
            title={
              <span className="inline-flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-700" /> Announcements · New Camps &amp; Slots
              </span>
            }
            description="Highlights tailored to your preferred sports and facility updates."
            action={
              <Link to="/citizen/profile" className="text-xs font-bold text-emerald-700 hover:underline">
                Manage Sport Preferences
              </Link>
            }
          />
          <div className="divide-y divide-slate-100">
            {data.announcements.slice(0, 4).map((item) => (
              <div key={item._id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800">
                      {item.category === "camp" ? "New Camp" : item.category === "slot" ? "New Slots" : "Announcement"}
                    </span>
                    {item.sportName ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700">
                        {item.sportName}
                      </span>
                    ) : null}
                    {item.isPreferred ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                        <Sparkles className="h-3 w-3" /> Matches your preference
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm font-extrabold text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">{item.description}</p>
                </div>
                {item.facilityId ? (
                  <Link
                    to={`/citizen/book/${item.facilityId}`}
                    className="shrink-0 rounded-xl bg-brand-primary px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-dark"
                  >
                    Book Now
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {!data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <KpiCard
              label="My Bookings"
              value={data.bookings.length}
              caption={`${data.bookings.filter((item) => item.bookingStatus === "Confirmed").length} confirmed reservations`}
              icon={CalendarCheck}
              tone="green"
              to="/citizen/bookings"
            />
            <KpiCard
              label="Ratings Submitted"
              value={data.reviews.length}
              caption="Facilities, sports & coaches"
              icon={Star}
              tone="amber"
              to="/citizen/bookings"
            />
            <KpiCard
              label="Grievances"
              value={data.grievances.length}
              caption={`${data.grievances.filter((item) => item.workflowStatus === "Resolved").length} resolved`}
              icon={FileText}
              tone="violet"
              to="/citizen/complaints"
            />
          </div>

          <Card>
            <SectionHeader title="Quick Actions" description="Navigate directly to your citizen and athlete services." />
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <Action
                to="/citizen/explore"
                icon={Compass}
                title="Explore & Book"
                text="Browse facilities on the GIS map and book available slots."
              />
              <Action
                to="/citizen/bookings"
                icon={CalendarCheck}
                title="Bookings & Passes"
                text="Download GST invoices, view gate QR passes, and rate sessions."
              />
              <Action
                to="/citizen/portfolio"
                icon={Award}
                title="Athlete Portfolio"
                text="View your statewide rank, coach evaluation charts, and verified medals."
              />
              <Action
                to="/citizen/complaints"
                icon={FileText}
                title="Grievances"
                text="Report facility issues and track status updates from managers."
              />
            </div>
          </Card>
        </>
      )}
    </PageShell>
  );
}

function Action({ to, icon: Icon, title, text }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-primary/40 hover:bg-emerald-50/40"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-brand-primary transition group-hover:bg-brand-primary group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <h2 className="mt-4 font-display text-base font-extrabold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p>
    </Link>
  );
}
