import React, { useState } from "react";
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
  Plus
} from "lucide-react";
import { GUJARAT_FACILITIES } from "../data/gujaratSportsData";
import FacilityConditionAudit from "../Components/Assessment/FacilityConditionAudit";

export default function ManagerDashboard() {
  const currentComplex = GUJARAT_FACILITIES[0]; // SAG Khokhra Sports Complex
  const [auditOpen, setAuditOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-6 border border-slate-800 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
            <span>🏟️</span> Facility Manager Control Console &bull; SAG
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
            {currentComplex.name}
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            {currentComplex.location} &bull; Operational Since {currentComplex.operationalSince} ({currentComplex.areaAcres} Acres)
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link
            to="/explore"
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5"
          >
            <span>🗺️</span> View on GIS Map
          </Link>
          <button
            onClick={() => setAuditOpen(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            Update Condition Audit
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Today's Footfall
            </span>
            <div className="text-3xl font-black text-white mt-1">
              {currentComplex.utilisation.currentDailyFootfall}
            </div>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <Activity className="w-3.5 h-3.5" /> / {currentComplex.utilisation.capacityDaily} Daily Max
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
            🏃
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Facility Condition (FCI)
            </span>
            <div className="text-3xl font-black text-white mt-1">
              {currentComplex.condition.score}%
            </div>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <ShieldCheck className="w-3.5 h-3.5" /> {currentComplex.condition.grade}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl">
            🛡️
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Utilization Rate
            </span>
            <div className="text-3xl font-black text-white mt-1">
              {currentComplex.utilisation.utilizationRate}%
            </div>
            <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1 mt-1">
              <Clock className="w-3.5 h-3.5" /> Peak: 6-9 AM, 5-8 PM
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-xl">
            📊
          </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Active Sports & Courts
            </span>
            <div className="text-3xl font-black text-white mt-1">
              {currentComplex.sports.length}
            </div>
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 mt-1">
              <Trophy className="w-3.5 h-3.5" /> BWF & IAAF Standard
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
            🏸
          </div>
        </div>
      </div>

      {/* Courts & Sports Breakdown */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-extrabold text-white text-base">
              Court & Pitch Utilization Status
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live capacity and pricing for {currentComplex.name}
            </p>
          </div>
          <Link
            to="/manager/slot"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            Manage Time Slots &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentComplex.sports.map((sp, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-slate-800 bg-slate-950 space-y-2 text-xs"
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-white text-sm">{sp.name}</span>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg font-bold text-[10px]">
                  ⭐ {sp.rating}
                </span>
              </div>
              <div className="text-slate-400 space-y-0.5">
                <div><strong className="text-slate-300">Courts:</strong> {sp.courts || sp.lanes || sp.tables || 1}</div>
                <div><strong className="text-slate-300">Surface:</strong> {sp.surface}</div>
                <div><strong className="text-slate-300">Citizen Fee:</strong> {sp.feePerHour}/hr</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Modal */}
      {auditOpen && (
        <FacilityConditionAudit
          facility={currentComplex}
          onClose={() => setAuditOpen(false)}
          onSaveAudit={() => setAuditOpen(false)}
        />
      )}
    </div>
  );
}
