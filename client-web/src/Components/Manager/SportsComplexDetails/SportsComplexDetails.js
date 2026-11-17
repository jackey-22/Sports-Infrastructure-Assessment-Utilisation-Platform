import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CalendarClock, CheckCircle2, Clock3, Edit3, ImageOff, Mail, MapPin, Phone, Trophy, Users } from "lucide-react";
import { api } from "../../../API/client";
import { Button, Card, EmptyState, ErrorState, KpiCard, PageHeader, PageShell, SectionHeader } from "../Common/ManagerUI";

const AMENITIES = {
  floodlights: "Floodlights", drinkingWater: "Drinking water", changingRooms: "Changing rooms",
  firstAid: "First aid", parking: "Parking", gym: "Gym",
  divyangjanFriendly: "Divyangjan friendly", canteen: "Canteen",
};
const STATUS_CLASS = {
  Active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Inactive: "border-slate-200 bg-slate-100 text-slate-600",
  "Under Development": "border-amber-200 bg-amber-50 text-amber-700",
  "Temporarily Closed": "border-red-200 bg-red-50 text-red-700",
};

export default function SportsComplexDetails() {
  const [facility, setFacility] = useState(null);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageFailed, setImageFailed] = useState(false);

  const load = async () => {
    setLoading(true); setError(null); setImageFailed(false);
    try {
      const [facilityResponse, sportsResponse] = await Promise.all([
        api.get("/api/manager/facility"), api.get("/api/manager/sport-configs"),
      ]);
      setFacility(facilityResponse.facility);
      setSports(sportsResponse.data || []);
    } catch (loadError) { setError(loadError); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const activeAmenities = useMemo(
    () => Object.entries(facility?.amenities || {}).filter(([, enabled]) => enabled),
    [facility]
  );
  const slotCount = sports.reduce((total, item) => total + (item.slots?.length || 0), 0);

  return <PageShell>
    <PageHeader eyebrow="Facility Manager" title="Facility details" description="Review the public information for your assigned facility and keep it accurate." actions={<div className="flex flex-wrap gap-2"><Button as={Link} to="/manager/sports-configuration" variant="secondary"><Trophy className="h-4 w-4" />Manage sports</Button><Button as={Link} to="/manager/editfacility"><Edit3 className="h-4 w-4" />Edit facility</Button></div>} />
    {loading ? <LoadingState /> : error ? <ErrorState message={error.message} onRetry={load} /> : !facility ? <Card><EmptyState title="No facility assigned" description="Ask the administrator to assign a facility to this manager account." /></Card> : <>
      <Card className="mb-5 overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(300px,0.8fr)_1.2fr]">
          <div className="relative min-h-64 bg-slate-100 lg:min-h-[360px]">
            {facility.picture && !imageFailed ? <img src={facility.picture} alt={facility.name} className="absolute inset-0 h-full w-full object-cover" onError={() => setImageFailed(true)} /> : <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-emerald-50 to-slate-100 text-slate-400"><ImageOff className="h-10 w-10" /><span className="text-sm font-semibold">No facility cover uploaded</span></div>}
          </div>
          <div className="flex flex-col justify-center p-5 sm:p-7 lg:p-9">
            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${STATUS_CLASS[facility.status] || STATUS_CLASS.Inactive}`}>{facility.status || "Status unavailable"}</span>{facility.facilityType ? <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">{facility.facilityType}</span> : null}</div>
            <h2 className="mt-4 font-display text-2xl font-extrabold text-brand-dark sm:text-3xl">{facility.name}</h2>
            <p className="mt-2 flex items-start gap-2 text-sm leading-6 text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />{[facility.location, facility.taluka, facility.district].filter(Boolean).join(", ") || "Address not added"}</p>
            <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2"><Detail label="Category" value={facility.category} icon={Building2} /><Detail label="Ownership" value={facility.ownership} icon={CheckCircle2} /><Detail label="Area" value={facility.area} icon={MapPin} /><Detail label="Operational since" value={facility.operationalSince} icon={CalendarClock} /></div>
          </div>
        </div>
      </Card>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Daily capacity" value={facility.capacityDaily || 0} caption="People per operating day" icon={Users} tone="green" /><KpiCard label="Configured sports" value={sports.length} caption="Available in Sports & Slots" icon={Trophy} tone="blue" /><KpiCard label="Booking slots" value={slotCount} caption="Across all configured sports" icon={Clock3} tone="violet" /><KpiCard label="Amenities" value={activeAmenities.length} caption="Marked available to citizens" icon={CheckCircle2} tone="amber" /></div>
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card><SectionHeader title="Contact & operating hours" description="Public information shown to citizens." /><div className="space-y-4 p-5"><ContactRow icon={Phone} label="Phone" value={facility.contactPhone} href={facility.contactPhone ? `tel:${facility.contactPhone}` : null} /><ContactRow icon={Mail} label="Email" value={facility.contactEmail} href={facility.contactEmail ? `mailto:${facility.contactEmail}` : null} /><ContactRow icon={Clock3} label="Opening time" value={facility.timings?.openingTime} /><ContactRow icon={Clock3} label="Closing time" value={facility.timings?.closingTime} /></div></Card>
        <Card><SectionHeader title="Available amenities" description="Facilities currently marked as available." /><div className="p-5">{activeAmenities.length ? <div className="grid gap-2 sm:grid-cols-2">{activeAmenities.map(([key]) => <div key={key} className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" />{AMENITIES[key] || key}</div>)}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No amenities have been marked available yet.</p>}</div></Card>
      </div>
    </>}
  </PageShell>;
}

function LoadingState() { return <div className="space-y-5"><div className="h-80 animate-pulse rounded-2xl bg-slate-200" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-200" />)}</div></div>; }
function Detail({ label, value, icon: Icon }) { return <div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-primary"><Icon className="h-4 w-4" /></span><div><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-0.5 text-sm font-semibold text-slate-700">{value || "Not provided"}</p></div></div>; }
function ContactRow({ icon: Icon, label, value, href }) { const content = <><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-brand-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span><span className="block truncate text-sm font-semibold text-slate-700">{value || "Not provided"}</span></span></>; return href ? <a href={href} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-emerald-200 hover:bg-emerald-50">{content}</a> : <div className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">{content}</div>; }
