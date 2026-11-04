import React, { useState } from "react";
import {
  X,
  MapPin,
  Star,
  Clock,
  Users,
  ClipboardCheck,
  School,
  Ticket,
  ChevronDown,
  CalendarDays,
  Mail,
  Phone,
} from "lucide-react";
import { getConditionMeta, getAverageRating, getFacilityType } from "./exploreUtils";

export default function FacilityDetailPanel({
  facility,
  onClose = () => {},
  onOpenAudit = () => {},
  onOpenSchoolBook = () => {},
  onOpenBooking = () => {},
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  if (!facility) return null;
  const badge = getConditionMeta(facility);
  const { avg, count } = getAverageRating(facility);

  return (
    <div className="fixed inset-0 z-[1900] flex justify-end bg-black/40 backdrop-blur-[2px]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close details"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-md h-full bg-white shadow-2xl border-l border-slate-200 overflow-y-auto animate-fade-in">
        <div className="relative h-48">
          <img
            src={facility.picture}
            alt={facility.name}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 text-slate-700 flex items-center justify-center shadow"
          >
            <X className="w-4 h-4" />
          </button>
          <span
            className={`absolute bottom-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full ${badge.className}`}
          >
            {badge.label} · Condition {facility.condition.score}%
          </span>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">
              {getFacilityType(facility)}
            </p>
            <h2 className="text-xl font-extrabold text-brand-dark mt-0.5">
              {facility.name}
            </h2>
            <div className="flex items-start gap-1.5 text-slate-500 text-sm mt-1">
              <MapPin className="w-4 h-4 text-brand-primary mt-0.5 flex-shrink-0" />
              <span>{facility.location}</span>
            </div>
            {avg != null && (
              <div className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-slate-800">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {avg.toFixed(1)}
                <span className="text-slate-400 font-medium text-xs">({count})</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoChip icon={CalendarDays} label="Established" value={facility.operationalSince || "Not specified"} />
            <InfoChip icon={Phone} label="Contact" value={facility.contactPhone || "Not specified"} />
            <InfoChip icon={Mail} label="Email" value={facility.contactEmail || "Not specified"} />
            <InfoChip icon={Users} label="Manager" value={facility.contactPerson || "Not specified"} />
          </div>

          {(facility.details || facility.gallery?.length > 0) && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Complex details</h3>
              {facility.details?.city && <p><span className="font-bold text-slate-800">City:</span> {facility.details.city}</p>}
              {facility.details?.locality && <p><span className="font-bold text-slate-800">Area:</span> {facility.details.locality}</p>}
              {facility.details?.manager && <p><span className="font-bold text-slate-800">Manager:</span> {facility.details.manager}</p>}
              {facility.details?.status && <p><span className="font-bold text-slate-800">Status:</span> {facility.details.status}</p>}
              {facility.details?.lastMaintenanceDate && <p><span className="font-bold text-slate-800">Last maintenance:</span> {facility.details.lastMaintenanceDate}</p>}
              {facility.details?.address && <p><span className="font-bold text-slate-800">Address:</span> {facility.details.address}</p>}
              {facility.gallery?.length > 1 && <div className="grid grid-cols-3 gap-2 pt-1">{facility.gallery.map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${facility.name} gallery ${index + 1}`} className="h-16 w-full rounded-lg object-cover" />)}</div>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoChip
              icon={Clock}
              label="Hours"
              value={`${facility.timings?.openingTime} – ${facility.timings?.closingTime}`}
            />
            <InfoChip
              icon={Users}
              label="How busy"
              value={`${facility.utilisation?.utilizationRate}% full`}
            />
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
              Sports available
            </h3>
            <div className="space-y-2">
              {(facility.sports || []).map((sp) => (
                <div
                  key={sp.name}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2"
                >
                  {sp.image ? <img src={sp.image} alt={sp.name} className="h-12 w-12 rounded-lg object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-soft text-lg">🏅</div>}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-dark">{sp.name}</p>
                    <p className="text-xs text-slate-500">{sp.category || "Sport"} · {sp.type || "Format"} · {sp.courts || 0} courts / units</p>
                    <p className="text-xs text-slate-500">{sp.surface || "Details available at facility"} · {sp.availability || "Availability not specified"}</p>
                    {sp.feePerHour && <p className="text-xs font-semibold text-brand-primary">{sp.feePerHour}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-1">
            <div>
              <span className="font-bold text-slate-800">Last inspection:</span>{" "}
              {facility.condition?.lastInspectionDate}
            </div>
            {facility.condition?.notes && (
              <p className="pt-1 leading-relaxed">{facility.condition.notes}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              type="button"
              onClick={() => onOpenBooking(facility)}
              className="w-full py-3 rounded-xl bg-brand-primary text-white text-sm font-bold hover:bg-brand-dark transition flex items-center justify-center gap-2"
            >
              <Ticket className="w-4 h-4" /> Book slot
            </button>

            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="w-full py-2.5 rounded-xl bg-white text-slate-600 border border-slate-200 text-sm font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              More actions
              <ChevronDown className={`w-4 h-4 transition ${moreOpen ? "rotate-180" : ""}`} />
            </button>

            {moreOpen && (
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => onOpenSchoolBook(facility)}
                  className="w-full py-2.5 rounded-xl bg-brand-soft text-brand-primary border border-brand-light text-sm font-bold hover:bg-brand-light transition flex items-center justify-center gap-2"
                >
                  <School className="w-4 h-4" /> School / institution book
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAudit(facility)}
                  className="w-full py-2.5 rounded-xl bg-white text-slate-700 border border-slate-200 text-sm font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2"
                >
                  <ClipboardCheck className="w-4 h-4" /> Condition audit
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function InfoChip({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-slate-400">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="text-xs font-bold text-brand-dark mt-0.5">{value}</div>
    </div>
  );
}
