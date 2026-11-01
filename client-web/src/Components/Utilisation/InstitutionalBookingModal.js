import React, { useState } from "react";
import { School, Trophy, Calendar, Users, Mail, Phone, CheckCircle, FileCheck } from "lucide-react";

export default function InstitutionalBookingModal({
  facility,
  onClose = () => {},
  onSubmitBooking = () => {}
}) {
  const [institutionName, setInstitutionName] = useState("");
  const [institutionType, setInstitutionType] = useState("School");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventType, setEventType] = useState("Annual Sports Meet");
  const [sport, setSport] = useState(facility?.sports[0]?.name || "Athletics & Track");
  const [startDate, setStartDate] = useState("2026-11-20");
  const [endDate, setEndDate] = useState("2026-11-21");
  const [participants, setParticipants] = useState(250);
  const [purpose, setPurpose] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!facility) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const request = {
      id: "ib_" + Date.now(),
      institutionName,
      institutionType,
      contactPerson,
      email,
      phone,
      complexId: facility.id,
      complexName: facility.name,
      sport,
      eventType,
      startDate,
      endDate,
      participants: parseInt(participants) || 100,
      purpose: purpose || "Annual institutional sports tournament and trials.",
      status: "Submitted (Pending DSO Approval)",
      requestedAt: new Date().toISOString()
    };
    onSubmitBooking(request);
    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-6 relative">
          <div className="flex justify-between items-start">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/20 text-white px-3 py-1 rounded-full text-xs font-semibold mb-2">
                <School className="w-3.5 h-3.5" />
                Educational Institutions & Tournament Booking Portal
              </div>
              <h2 className="text-xl font-bold tracking-tight">Reserve Facility for Institution / Event</h2>
              <p className="text-emerald-100 text-sm mt-1">
                Venue: <strong>{facility.name}</strong> ({facility.district})
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl text-lg font-bold transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {isSubmitted ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-bold text-slate-800">Booking Application Submitted!</h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                Your application has been routed to the <strong>District Sports Officer (DSO {facility.district})</strong> and Facility Management for calendar clearance. An official acknowledgment has been sent to {email}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Institution / Organization Name
                  </label>
                  <input
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g. Gujarat Technological University / DPS"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Organization Type
                  </label>
                  <select
                    value={institutionType}
                    onChange={(e) => setInstitutionType(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="School">School (GSEB / CBSE / ICSE)</option>
                    <option value="College / University">College / University</option>
                    <option value="Sports Academy">Sports Academy / Club</option>
                    <option value="Government Dept / PSU">Government Dept / PSU</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Contact Person / Principal
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Dr. K. Patel"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sports@institution.edu.in"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Event Classification
                  </label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="Annual Sports Meet">Annual Sports Meet / Athletic Day</option>
                    <option value="Inter-School Tournament">Inter-School / Zonal Tournament</option>
                    <option value="Khel Mahakumbh Selection Camp">Khel Mahakumbh Selection Camp</option>
                    <option value="Summer Coaching Intensive">Summer Coaching Intensive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Primary Sport Required
                  </label>
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    {facility.sports.map((s, idx) => (
                      <option key={idx} value={s.name}>
                        {s.name} ({s.surface})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Expected Athletes
                  </label>
                  <input
                    type="number"
                    value={participants}
                    onChange={(e) => setParticipants(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Event Description & Ground Requirements
                </label>
                <textarea
                  rows="2"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Detail requirements: track marking, sound system, seating shade, podium, drinking water arrangements..."
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800">
                <strong>Government Subsidized Institutional Policy:</strong> Educational institutions recognized by Gujarat Education Dept receive prioritized calendar scheduling during off-peak and weekend slots.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition flex items-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  Submit Official Allocation Request
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

