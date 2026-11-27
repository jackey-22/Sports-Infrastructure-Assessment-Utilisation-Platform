import React, { useEffect, useMemo, useState } from "react";
import {
  Award,
  Bell,
  CalendarCheck,
  Check,
  Compass,
  FileText,
  Loader2,
  Mail,
  Medal,
  Phone,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { api } from "../../../API/client";
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

  const [sports, setSports] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    Promise.all([api.get("/getSports"), api.get("/api/athlete/preferences")])
      .then(([spRes, prefRes]) => {
        setSports(spRes.data || []);
        setSelectedIds((prefRes.data?.preferredSports || []).map((s) => String(s._id)));
        setNotifications(prefRes.data?.notifications || []);
      })
      .catch(() => {})
      .finally(() => setLoadingPrefs(false));
  }, []);

  const uniqueSports = useMemo(() => {
    const seen = new Map();
    sports.forEach((sp) => {
      const key = String(sp?.SportName || "").trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, sp);
    });
    return [...seen.values()];
  }, [sports]);

  const toggleSport = (id) => {
    const strId = String(id);
    setSelectedIds((prev) =>
      prev.includes(strId) ? prev.filter((item) => item !== strId) : [...prev, strId]
    );
  };

  const savePreferences = async () => {
    setSavingPrefs(true);
    setNotice("");
    try {
      await api.put("/api/athlete/preferences", { sportIds: selectedIds });
      setNotice("Sport notification preferences saved.");
    } catch (err) {
      setNotice(err.message || "Could not save preferences.");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen & Athlete Account"
        title="My Profile"
        description="Account details and sport notification preferences."
      />

      {notice ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
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

          {/* Preferred Sports for Notifications */}
          <Card>
            <SectionHeader
              title="Preferred Sports for Notifications"
              description="Select the sports you follow to receive push & in-app alerts when new slots or updates open."
              action={
                <Button type="button" onClick={savePreferences} disabled={savingPrefs || loadingPrefs}>
                  {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Save Preferences
                </Button>
              }
            />
            <div className="p-6">
              {loadingPrefs ? (
                <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {uniqueSports.map((sp) => {
                    const active = selectedIds.includes(String(sp._id));
                    return (
                      <button
                        key={sp._id}
                        type="button"
                        onClick={() => toggleSport(sp._id)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition ${
                          active
                            ? "border-emerald-600 bg-emerald-700 text-white shadow-2xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {active ? <Check className="h-3.5 w-3.5" /> : null}
                        {sp.SportName}
                      </button>
                    );
                  })}
                </div>
              )}

              {notifications.length ? (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-slate-500">
                    <Bell className="h-3.5 w-3.5 text-emerald-700" /> Recent Sport Alerts
                  </p>
                  <div className="space-y-2">
                    {notifications.slice(0, 5).map((n) => (
                      <div key={n._id} className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-2.5">
                        <p className="text-xs font-bold text-slate-800">{n.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="h-fit">
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
              <Medal className="h-4 w-4 text-emerald-700" /> Statewide Top Athletes
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
