import React from "react";
import { Award, CalendarCheck, Compass, FileText, Mail, Medal, Phone, ShieldCheck, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Card, PageHeader, PageShell, SectionHeader } from "../Common/CitizenUI";

export default function CitizenProfile() {
  const citizen = useSelector((state) => state.user?.user) || {};
  const initials =
    (citizen.Name || "C")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C";

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen & Athlete Account"
        title="My Profile"
        description="Account details automatically pre-filled during court bookings and event registrations."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <SectionHeader title="Personal Information" />
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-6">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-primary font-display text-xl font-extrabold text-white shadow-sm">
                {initials}
              </div>
              <div>
                <h2 className="font-display text-xl font-extrabold text-slate-900">
                  {citizen.Name || "Citizen Athlete"}
                </h2>
                <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-brand-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified Citizen / Athlete
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Email Address" value={citizen.Email || "Not provided"} />
              <InfoRow icon={Phone} label="Mobile Number" value={citizen.ContactNum || "Not provided"} />
              {citizen.DOB ? (
                <InfoRow icon={CalendarCheck} label="Date of Birth" value={citizen.DOB} />
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <SectionHeader title="Quick Actions" description="Access your primary citizen & athlete tools." />
          <div className="space-y-2.5 p-5">
            <Button as={Link} to="/citizen/explore" className="w-full justify-start">
              <Compass className="h-4 w-4" /> Explore &amp; Book Venues
            </Button>
            <Button as={Link} to="/citizen/bookings" variant="secondary" className="w-full justify-start">
              <CalendarCheck className="h-4 w-4 text-brand-primary" /> My Bookings &amp; QR Passes
            </Button>
            <Button as={Link} to="/citizen/portfolio" variant="secondary" className="w-full justify-start">
              <Award className="h-4 w-4 text-brand-primary" /> Full Athlete Portfolio
            </Button>
            <Button as={Link} to="/citizen/performance" variant="secondary" className="w-full justify-start">
              <Trophy className="h-4 w-4 text-amber-500" /> Performance &amp; Achievements
            </Button>
            <Button as={Link} to="/citizen/leaderboard" variant="secondary" className="w-full justify-start">
              <Medal className="h-4 w-4 text-emerald-700" /> Statewide Sports Leaderboard
            </Button>
            <Button as={Link} to="/citizen/complaints" variant="secondary" className="w-full justify-start">
              <FileText className="h-4 w-4 text-slate-500" /> Raise or Track Grievances
            </Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-primary shadow-2xs">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
