import React, { useState } from "react";
import { CheckCircle, QrCode, Calendar, Clock, CreditCard, User, Sparkles } from "lucide-react";

export default function CitizenBookingModal({
  facility,
  onClose = () => {},
  onConfirm = () => {}
}) {
  const [athleteName, setAthleteName] = useState("Aarav Trivedi");
  const [phone, setPhone] = useState("+91 98980 12345");
  const [selectedSport, setSelectedSport] = useState(facility?.sports[0]?.name || "Badminton");
  const [selectedDate, setSelectedDate] = useState("2026-11-03");
  const [selectedTime, setSelectedTime] = useState("07:00 AM - 08:00 AM");
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingPassId, setBookingPassId] = useState("");

  if (!facility) return null;

  const currentSport = facility.sports.find(s => s.name === selectedSport) || facility.sports[0];

  const handleBooking = (e) => {
    e.preventDefault();
    const passId = "SAG-EPASS-" + Math.floor(100000 + Math.random() * 900000);
    setBookingPassId(passId);
    setIsSuccess(true);
    onConfirm({
      passId,
      athleteName,
      phone,
      facilityName: facility.name,
      sport: selectedSport,
      date: selectedDate,
      time: selectedTime,
      fee: currentSport?.feePerHour || "₹100"
    });
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        <div className="bg-gradient-to-r from-blue-700 to-indigo-900 text-white p-5 flex justify-between items-center">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-blue-200">
              Sports Authority of Gujarat &bull; Public Pay & Play
            </div>
            <h3 className="text-xl font-bold mt-1">Book Sports Court / Facility Slot</h3>
            <p className="text-blue-100 text-xs mt-0.5">{facility.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {isSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-800">Slot Confirmed & Digital Pass Issued!</h4>
                <p className="text-xs text-slate-500 mt-1">Show this QR Pass at the venue security desk for turnstile entry.</p>
              </div>

              {/* Digital Pass Ticket */}
              <div className="bg-slate-50 border-2 border-dashed border-indigo-200 rounded-2xl p-5 text-left relative overflow-hidden">
                <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                      DIGITAL ENTRY PASS
                    </span>
                    <h5 className="font-extrabold text-slate-800 text-sm mt-1">{facility.name}</h5>
                    <p className="text-[11px] text-slate-500">{facility.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-slate-700">{bookingPassId}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Athlete / Citizen</span>
                    <p className="font-semibold text-slate-800">{athleteName}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Sport & Court</span>
                    <p className="font-semibold text-slate-800">{selectedSport}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Date & Time</span>
                    <p className="font-semibold text-slate-800">{selectedDate} &bull; {selectedTime}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Fee Status</span>
                    <p className="font-semibold text-emerald-600">{currentSport?.feePerHour} (Paid Online)</p>
                  </div>
                </div>

                {/* QR Code Graphic Mock */}
                <div className="flex items-center justify-center pt-2 border-t border-slate-200">
                  <div className="bg-white p-2 border border-slate-300 rounded-lg shadow-sm flex items-center gap-2">
                    <QrCode className="w-12 h-12 text-slate-800" />
                    <div className="text-[10px] text-slate-500 font-mono">
                      SCAN FOR QR ATTENDANCE<br />
                      VERIFIED BY SAG CLOUD
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow transition"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Athlete / Citizen Name
                </label>
                <input
                  type="text"
                  value={athleteName}
                  onChange={(e) => setAthleteName(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mobile Number (For WhatsApp / SMS Confirmation)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Sport
                  </label>
                  <select
                    value={selectedSport}
                    onChange={(e) => setSelectedSport(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {facility.sports.map((s, idx) => (
                      <option key={idx} value={s.name}>
                        {s.name} ({s.feePerHour}/hr)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Booking Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Preferred Time Slot
                </label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full p-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="06:00 AM - 07:00 AM">06:00 AM - 07:00 AM (Morning Peak)</option>
                  <option value="07:00 AM - 08:00 AM">07:00 AM - 08:00 AM (Morning Peak)</option>
                  <option value="08:00 AM - 09:00 AM">08:00 AM - 09:00 AM</option>
                  <option value="11:00 AM - 12:00 PM">11:00 AM - 12:00 PM (Off-Peak 30% Off)</option>
                  <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM (Off-Peak 30% Off)</option>
                  <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM (Evening Peak)</option>
                  <option value="06:00 PM - 07:00 PM">06:00 PM - 07:00 PM (Evening Peak)</option>
                  <option value="07:00 PM - 08:00 PM">07:00 PM - 08:00 PM (Floodlights)</option>
                </select>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500">Government Subsidized Hourly Fee:</span>
                  <div className="font-extrabold text-slate-800 text-sm">{currentSport?.feePerHour || "₹100"} / slot</div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded font-semibold text-[11px]">
                  Instant Confirmation
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow flex items-center gap-2"
                >
                  <CreditCard className="w-4 h-4" />
                  Confirm & Generate Pass
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

