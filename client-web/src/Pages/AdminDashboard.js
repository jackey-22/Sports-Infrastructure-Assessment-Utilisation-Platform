import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Trophy,
  Users,
  ShieldCheck,
  TrendingUp,
  MapPin,
  AlertTriangle,
  School,
  Activity,
  ArrowUpRight,
  Calendar,
  CheckCircle,
  Clock,
  Sparkles,
  Zap,
  Check
} from "lucide-react";
import { GUJARAT_FACILITIES, SAMPLE_INSTITUTIONAL_BOOKINGS } from "../data/gujaratSportsData";
import FacilityConditionAudit from "../Components/Assessment/FacilityConditionAudit";

export default function AdminDashboard() {
  const [data, setData] = useState({
    totalComplex: 38,
    totalSports: 14,
    totalAthletes: 18450,
    avgCondition: 81.4,
    utilizationRate: 76.5,
  });
  const [auditFacility, setAuditFacility] = useState(null);
  const [institutionalBookings, setInstitutionalBookings] = useState(SAMPLE_INSTITUTIONAL_BOOKINGS);

  useEffect(() => {
    fetch("http://localhost:9999/AdminViewDetails")
      .then((res) => res.json())
      .then((result) => {
        if (result && result.totalComplex) {
          setData((prev) => ({
            ...prev,
            totalComplex: result.totalComplex || prev.totalComplex,
            totalSports: result.totalSport || prev.totalSports,
          }));
        }
      })
      .catch((err) => console.log("Using live cached SAG dataset", err));
  }, []);

  const handleApproveBooking = (id) => {
    setInstitutionalBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "Approved by State SAG" } : b))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* 1. Header with Government Credentials */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <span>🏛️</span> Sports, Youth & Cultural Activities Department &bull; Govt. of Gujarat
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            State Sports Infrastructure Executive Console
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Macro-level planning, GIS assessment monitoring & institutional allocation across 33 Gujarat districts
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <span>🗺️</span> Open Statewide GIS Map
          </Link>
          <Link
            to="/admin/analysis"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            Detailed Analytics
          </Link>
        </div>
      </div>

      {/* 2. Executive Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Mapped Sports Venues
            </span>
            <div className="text-3xl font-black text-white mt-1">{data.totalComplex}</div>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle className="w-3.5 h-3.5" /> All 33 Districts Active
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl">
            🏛️
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Avg Condition Score (FCI)
            </span>
            <div className="text-3xl font-black text-white mt-1">{data.avgCondition}%</div>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Grade A/B Benchmark
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
            🛡️
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Weekly Athlete Footfall
            </span>
            <div className="text-3xl font-black text-white mt-1">18,450+</div>
            <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1 mt-1">
              <Activity className="w-3.5 h-3.5" /> Real-Time Attendance
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
            🏃
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Capacity Utilisation
            </span>
            <div className="text-3xl font-black text-white mt-1">{data.utilizationRate}%</div>
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1 mt-1">
              <Clock className="w-3.5 h-3.5" /> 23.5% Off-Peak Open
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
            📊
          </div>
        </div>
      </div>

      {/* 3. Main Grid: Infrastructure Assessment & Institutional Approval Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Infrastructure Assessment Priority Table */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="font-extrabold text-white text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Gujarat Infrastructure Condition & Maintenance Index
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Live monitoring of facility degradation, turf quality, and inspection urgency
              </p>
            </div>
            <Link
              to="/admin/allfacility"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
            >
              View All Facilities &rarr;
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                <tr>
                  <th className="p-4">Facility & District</th>
                  <th className="p-4">FCI Score</th>
                  <th className="p-4">Grade</th>
                  <th className="p-4">Maintenance Status</th>
                  <th className="p-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {GUJARAT_FACILITIES.slice(0, 6).map((fac) => (
                  <tr key={fac.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-white">{fac.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {fac.district} &bull; {fac.taluka}
                      </div>
                    </td>
                    <td className="p-4 font-black text-slate-200">{fac.condition.score}%</td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-black text-[10px] border shadow-sm ${
                          fac.condition.score >= 85
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : fac.condition.score >= 70
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : fac.condition.score >= 55
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-red-500/20 text-red-400 border-red-500/30"
                        }`}
                      >
                        {fac.condition.grade.split(" ")[0]}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 text-[11px]">
                      {fac.condition.maintenanceUrgency}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setAuditFacility(fac)}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition shadow-sm"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Educational Institutions & Tournament Booking Clearances */}
        <div className="lg:col-span-5 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h2 className="font-extrabold text-white text-base flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-400" />
                Educational Tournament Allocations
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                School, College & Khel Mahakumbh grounds reservation queue
              </p>
            </div>
            <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              {institutionalBookings.length} Active
            </span>
          </div>

          <div className="p-4 space-y-3 max-h-[480px] overflow-y-auto">
            {institutionalBookings.map((b) => (
              <div
                key={b.id}
                className="p-4 rounded-2xl border border-slate-800 bg-slate-950/60 hover:bg-slate-950 transition space-y-2 text-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                      {b.institutionType}
                    </span>
                    <h3 className="font-bold text-white mt-1 text-sm">{b.institutionName}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                      b.status.includes("Approved")
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <div className="text-slate-400 space-y-0.5">
                  <div><strong className="text-slate-300">Event:</strong> {b.eventType} ({b.sport})</div>
                  <div><strong className="text-slate-300">Venue:</strong> {b.complexName}</div>
                  <div><strong className="text-slate-300">Dates:</strong> {b.startDate} to {b.endDate} &bull; {b.participants} Athletes</div>
                </div>

                <div className="pt-2.5 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-[11px] text-slate-500">Contact: {b.contactPerson}</span>
                  {!b.status.includes("Approved") && (
                    <button
                      onClick={() => handleApproveBooking(b.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-md shadow-emerald-600/20"
                    >
                      Clear & Allocate
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Modal */}
      {auditFacility && (
        <FacilityConditionAudit
          facility={auditFacility}
          onClose={() => setAuditFacility(null)}
          onSaveAudit={() => setAuditFacility(null)}
        />
      )}
    </div>
  );
}
