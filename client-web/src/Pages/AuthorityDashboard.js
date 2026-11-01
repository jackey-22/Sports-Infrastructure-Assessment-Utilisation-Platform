import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Users,
  Trophy,
  Calendar,
  Clock,
  School,
  CheckCircle,
  AlertTriangle,
  FileText,
  Activity,
  Compass
} from "lucide-react";
import { GUJARAT_FACILITIES } from "../data/gujaratSportsData";
import FacilityConditionAudit from "../Components/Assessment/FacilityConditionAudit";

export default function AuthorityDashboard() {
  const user = useSelector((state) => state.user.user) || {};
  const districtName = user.District || "Ahmedabad District";

  const [auditFacility, setAuditFacility] = useState(null);
  const [districtFacilities] = useState(
    GUJARAT_FACILITIES.filter(
      (f) =>
        f.district.toLowerCase().includes("ahmedabad") ||
        f.district.toLowerCase().includes(districtName.toLowerCase().split(" ")[0])
    )
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
            <span>🏛️</span> Office of the District Sports Officer (DSO) &bull; SAG
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            {districtName} &bull; Sports Infrastructure Command
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Facility quality inspection, condition grading & grassroots tournament coordination
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <span>🗺️</span> District GIS Map
          </Link>
          <Link
            to="/authority/allcomplex"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-blue-300" />
            Manage Complexes
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              District Complexes
            </span>
            <div className="text-3xl font-black text-white mt-1">
              {districtFacilities.length > 0 ? districtFacilities.length : 3}
            </div>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <CheckCircle className="w-3.5 h-3.5" /> 100% Operational
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
            🏟️
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              District Condition Index
            </span>
            <div className="text-3xl font-black text-white mt-1">87.5%</div>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> High Standards
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
            🛡️
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Registered Athletes
            </span>
            <div className="text-3xl font-black text-white mt-1">4,280</div>
            <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1 mt-1">
              <Activity className="w-3.5 h-3.5" /> Across All Talukas
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl">
            👥
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Quarterly Inspections
            </span>
            <div className="text-3xl font-black text-white mt-1">100%</div>
            <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1 mt-1">
              <Calendar className="w-3.5 h-3.5" /> Up to Date
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
            📋
          </div>
        </div>
      </div>

      {/* District Facilities Table with Condition Assessment Trigger */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="font-extrabold text-white text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              District Facility Condition Assessments & Quality Audits
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Click "Conduct Audit" to record turf wear, lighting lux, or submit maintenance tenders
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
              <tr>
                <th className="p-4">Complex Name</th>
                <th className="p-4">Taluka</th>
                <th className="p-4">Condition Grade</th>
                <th className="p-4">Score</th>
                <th className="p-4">Last Inspected</th>
                <th className="p-4">Urgency</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {GUJARAT_FACILITIES.slice(0, 5).map((fac) => (
                <tr key={fac.id} className="hover:bg-slate-800/50 transition">
                  <td className="p-4 font-bold text-white">{fac.name}</td>
                  <td className="p-4 text-slate-400">{fac.taluka}</td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-black text-[10px] border shadow-sm ${
                        fac.condition.score >= 85
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : fac.condition.score >= 70
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {fac.condition.grade}
                    </span>
                  </td>
                  <td className="p-4 font-black text-slate-200">{fac.condition.score}%</td>
                  <td className="p-4 text-slate-400">{fac.condition.lastInspectionDate}</td>
                  <td className="p-4 text-slate-300">{fac.condition.maintenanceUrgency}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setAuditFacility(fac)}
                      className="px-3.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition shadow-sm"
                    >
                      Conduct Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
