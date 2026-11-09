import React, { useState } from "react";
import { Link } from "react-router-dom";
import { School } from "lucide-react";
import { GUJARAT_FACILITIES, SAMPLE_INSTITUTIONAL_BOOKINGS } from "../data/gujaratSportsData";
import FacilityConditionAudit from "../Components/Assessment/FacilityConditionAudit";
import AdminInsights from "../Components/Admin/Dashboard/AdminInsights";
import { Card, SectionHeader } from "../Components/Admin/Common/AdminUI";

// Statewide Admin home. AdminInsights owns the filterable KPI/chart overview;
// the facility condition index and institutional allocation queue below are the
// pre-existing operational panels this page already carried.
export default function AdminDashboard() {
  const [auditFacility, setAuditFacility] = useState(null);
  const [institutionalBookings, setInstitutionalBookings] = useState(SAMPLE_INSTITUTIONAL_BOOKINGS);

  const handleApproveBooking = (id) => {
    setInstitutionalBookings((prev) =>
      prev.map((booking) =>
        booking.id === id
          ? { ...booking, status: "Approved by State SAG" }
          : booking
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <AdminInsights />

      <div className="mx-auto w-full max-w-[1440px] space-y-6 px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <Card className="overflow-hidden lg:col-span-7">
            <SectionHeader
              title="Gujarat infrastructure condition index"
              description="Facility degradation, turf quality and inspection urgency from the existing assessment dataset."
              action={
                <Link
                  to="/admin"
                  className="text-[11px] font-bold text-emerald-700 hover:text-brand-dark"
                >
                  View all facilities →
                </Link>
              }
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                    <th scope="col" className="px-4 py-2.5 font-bold">Facility &amp; district</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">FCI score</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Grade</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Maintenance status</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-bold">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {GUJARAT_FACILITIES.slice(0, 6).map((facility) => (
                    <tr key={facility.id} className="transition hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-bold text-brand-dark">{facility.name}</div>
                        <div className="mt-0.5 text-[11px] text-slate-400">
                          {facility.district} · {facility.taluka}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-700">
                        {facility.condition.score}%
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${
                            facility.condition.score >= 85
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                              : facility.condition.score >= 70
                              ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
                              : facility.condition.score >= 55
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                              : "border-red-500/30 bg-red-500/10 text-red-700"
                          }`}
                        >
                          {facility.condition.grade.split(" ")[0]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-600">
                        {facility.condition.maintenanceUrgency}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setAuditFacility(facility)}
                          className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1 font-bold text-brand-dark transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden lg:col-span-5">
            <SectionHeader
              title="Educational tournament allocations"
              description="School, college and Khel Mahakumbh ground reservation queue."
              action={
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  {institutionalBookings.length} active
                </span>
              }
            />
            <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
              {institutionalBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs transition hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-600">
                        <School className="h-3 w-3" aria-hidden="true" />
                        {booking.institutionType}
                      </span>
                      <h3 className="mt-1 text-sm font-bold text-brand-dark">
                        {booking.institutionName}
                      </h3>
                    </div>
                    <span
                      className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                        booking.status.includes("Approved")
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-slate-400">
                    <div>
                      <strong className="text-slate-600">Event:</strong> {booking.eventType} ({booking.sport})
                    </div>
                    <div>
                      <strong className="text-slate-600">Venue:</strong> {booking.complexName}
                    </div>
                    <div>
                      <strong className="text-slate-600">Dates:</strong> {booking.startDate} to {booking.endDate} ·{" "}
                      {booking.participants} athletes
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-200 pt-2.5">
                    <span className="text-[11px] text-slate-500">
                      Contact: {booking.contactPerson}
                    </span>
                    {!booking.status.includes("Approved") && (
                      <button
                        type="button"
                        onClick={() => handleApproveBooking(booking.id)}
                        className="rounded-lg border border-brand-primary bg-brand-primary px-3 py-1 font-bold text-white transition hover:bg-[#006634] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                      >
                        Clear &amp; allocate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {auditFacility && (
        <FacilityConditionAudit
          facility={auditFacility}
          onClose={() => setAuditFacility(null)}
        />
      )}
    </div>
  );
}
