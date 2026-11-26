import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Loader2,
  Medal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trophy,
  User,
  X,
  XCircle,
} from "lucide-react";
import { api } from "../../API/client";

const CATEGORIES = [
  "Tournament Participation",
  "Gold Medal",
  "Silver Medal",
  "Bronze Medal",
  "Competition Winner",
  "Championship",
  "Personal Record",
  "Other",
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10";
const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10";

export default function AchievementsWorkspace({
  role = "admin",
  athleteId = null,
  athleteName = null,
  embedded = false,
  onClose = null,
}) {
  const [achievements, setAchievements] = useState([]);
  const [sports, setSports] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sportFilter, setSportFilter] = useState("");

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [verifyModal, setVerifyModal] = useState(null); // achievement object to verify/reject
  const [verifyStatus, setVerifyStatus] = useState("Verified");
  const [verifyRemarks, setVerifyRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Add form state
  const [form, setForm] = useState({
    athleteId: athleteId || "",
    sportId: "",
    category: CATEGORIES[0],
    title: "",
    achievementDate: new Date().toISOString().slice(0, 10),
    eventName: "",
    rank: "",
    description: "",
    verificationStatus: "Verified",
    verificationRemarks: `Recorded by ${role}`,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const achievementsQuery = athleteId ? `?athleteId=${athleteId}` : "";
      const [achievementsRes, sportsRes] = await Promise.all([
        api.get(`/api/achievements${achievementsQuery}`),
        api.get("/getSports"),
      ]);

      setAchievements(achievementsRes.data || []);
      setSports(sportsRes.data || []);

      // Load athletes list for the dropdown if adding achievements is possible and athlete is not fixed
      if (!athleteId) {
        try {
          if (role === "coach") {
            const res = await api.get("/api/coach/rateable-athletes");
            const list = (res.data?.athletes || []).map((item) => ({
              _id: item.athleteId,
              name: item.name,
              email: item.email,
              sports: item.sports?.map((s) => s.name).join(", "),
            }));
            setAthletes(list);
          } else {
            // Manager / Admin: /getAthletes returns scoped athletes
            const res = await api.get("/getAthletes");
            const list = (res.data || []).map((item) => ({
              _id: item._id,
              name: item.userId?.Name || "Athlete",
              email: item.userId?.Email || "",
              phone: item.userId?.ContactNum || "",
            }));
            setAthletes(list);
          }
        } catch (athleteErr) {
          console.warn("Could not load athletes list:", athleteErr.message);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load achievements");
    } finally {
      setLoading(false);
    }
  }, [athleteId, role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered achievements
  const filteredAchievements = useMemo(() => {
    return achievements.filter((item) => {
      if (statusFilter !== "All" && item.verificationStatus !== statusFilter) {
        return false;
      }
      if (sportFilter && String(item.sport?._id || item.sport) !== String(sportFilter)) {
        return false;
      }
      if (search.trim()) {
        const needle = search.toLowerCase();
        const aName = item.athlete?.userId?.Name?.toLowerCase() || "";
        const aEmail = item.athlete?.userId?.Email?.toLowerCase() || "";
        const title = item.title?.toLowerCase() || "";
        const eventName = item.eventName?.toLowerCase() || "";
        const sportName = item.sport?.SportName?.toLowerCase() || "";
        if (
          !aName.includes(needle) &&
          !aEmail.includes(needle) &&
          !title.includes(needle) &&
          !eventName.includes(needle) &&
          !sportName.includes(needle)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [achievements, statusFilter, sportFilter, search]);

  // Counts
  const counts = useMemo(() => {
    const total = achievements.length;
    const pending = achievements.filter((a) => a.verificationStatus === "Pending").length;
    const verified = achievements.filter((a) => a.verificationStatus === "Verified").length;
    const rejected = achievements.filter((a) => a.verificationStatus === "Rejected").length;
    return { total, pending, verified, rejected };
  }, [achievements]);

  // Save new achievement
  const handleSaveAchievement = async (e) => {
    e.preventDefault();
    if (!form.sportId) {
      setNotice({ type: "error", text: "Please select a sport." });
      return;
    }
    const finalAthleteId = athleteId || form.athleteId;
    if (!finalAthleteId) {
      setNotice({ type: "error", text: "Please select an athlete." });
      return;
    }

    setSubmitting(true);
    setNotice(null);
    try {
      await api.post("/api/achievements", {
        ...form,
        athleteId: finalAthleteId,
      });
      setNotice({ type: "success", text: "Achievement successfully recorded!" });
      setAddModalOpen(false);
      setForm({
        athleteId: athleteId || "",
        sportId: "",
        category: CATEGORIES[0],
        title: "",
        achievementDate: new Date().toISOString().slice(0, 10),
        eventName: "",
        rank: "",
        description: "",
        verificationStatus: "Verified",
        verificationRemarks: `Recorded by ${role}`,
      });
      await loadData();
    } catch (saveErr) {
      setNotice({ type: "error", text: saveErr.message || "Failed to record achievement" });
    } finally {
      setSubmitting(false);
    }
  };

  // Open verify modal
  const openVerifyModal = (achievement, targetStatus) => {
    setVerifyModal(achievement);
    setVerifyStatus(targetStatus);
    setVerifyRemarks(
      targetStatus === "Verified"
        ? `Verified by ${role}`
        : `Rejected by ${role}: Details could not be confirmed`
    );
  };

  // Submit verification status update
  const handleUpdateVerification = async (e) => {
    e.preventDefault();
    if (!verifyModal) return;
    setSubmitting(true);
    setNotice(null);
    try {
      await api.patch(`/api/achievements/${verifyModal._id}/verification`, {
        verificationStatus: verifyStatus,
        verificationRemarks: verifyRemarks,
      });
      setNotice({
        type: "success",
        text: `Achievement marked as ${verifyStatus}.`,
      });
      setVerifyModal(null);
      await loadData();
    } catch (verErr) {
      setNotice({ type: "error", text: verErr.message || "Failed to update verification status" });
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-7 w-7 text-amber-500" />
            <h1 className="font-display text-2xl font-extrabold text-slate-900">
              {athleteName ? `${athleteName}'s Achievements` : "Athlete Achievements"}
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {role === "admin"
              ? "State-wide review, verification, and recording of athlete achievements and medals."
              : role === "manager"
              ? "Review, verify, and add tournament achievements for athletes registered at your facility."
              : "Review and verify student-athlete achievements, medals, and championship records."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            title="Refresh list"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add achievement
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notice && (
        <div
          className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${
            notice.type === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>{notice.text}</span>
          <button onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[13px] font-bold text-slate-700">Total Achievements</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 tabular-nums">{counts.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-amber-900">Pending Review</p>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-amber-900 tabular-nums">{counts.pending}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-emerald-900">Verified</p>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-emerald-900 tabular-nums">{counts.verified}</p>
        </div>
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-bold text-rose-900">Rejected</p>
            <XCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="mt-2 font-display text-2xl font-extrabold text-rose-900 tabular-nums">{counts.rejected}</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {["All", "Pending", "Verified", "Rejected"].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                statusFilter === status
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status}
              {status === "Pending" && counts.pending > 0 && (
                <span className="ml-1.5 rounded-full bg-amber-400 px-1.5 py-0.2 text-[10px] text-amber-950 font-black">
                  {counts.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none focus:border-brand-primary"
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
          >
            <option value="">All Sports</option>
            {sports.map((sport) => (
              <option key={sport._id} value={sport._id}>
                {sport.SportName}
              </option>
            ))}
          </select>

          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search athlete, title, event..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-brand-primary"
            />
          </div>
        </div>
      </div>

      {/* Achievements Table / List */}
      {loading ? (
        <div className="flex justify-center rounded-2xl border border-slate-200 bg-white py-20 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
        </div>
      ) : filteredAchievements.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Athlete</th>
                  <th className="px-5 py-3.5">Sport & Category</th>
                  <th className="px-5 py-3.5">Achievement & Event</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAchievements.map((item) => {
                  const athleteUser = item.athlete?.userId;
                  const complex = item.athlete?.SportComplexId;
                  const status = item.verificationStatus;

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">
                          {athleteUser?.Name || athleteName || "Athlete"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {athleteUser?.Email || athleteUser?.ContactNum || "—"}
                        </div>
                        {complex?.name && (
                          <div className="text-[11px] text-slate-400">{complex.name}</div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-block rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200/60">
                          {item.sport?.SportName || "Sport"}
                        </span>
                        <div className="mt-1 text-xs font-semibold text-slate-600">
                          {item.category}
                        </div>
                      </td>

                      <td className="px-5 py-4 max-w-xs">
                        <div className="font-bold text-slate-900">{item.title}</div>
                        {item.eventName && (
                          <div className="text-xs text-slate-600 font-medium">
                            {item.eventName}
                            {item.rank ? ` · Rank: ${item.rank}` : ""}
                          </div>
                        )}
                        {item.description && (
                          <div className="mt-1 text-xs text-slate-400 line-clamp-2">
                            {item.description}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                        {item.achievementDate
                          ? new Date(item.achievementDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {status === "Verified" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Verified
                          </span>
                        ) : status === "Rejected" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                            <XCircle className="h-3.5 w-3.5 text-rose-600" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                            <Clock className="h-3.5 w-3.5 text-amber-600" /> Pending
                          </span>
                        )}
                        {item.verificationRemarks && (
                          <div className="mt-1 text-[11px] text-slate-400 max-w-[160px] truncate" title={item.verificationRemarks}>
                            {item.verificationRemarks}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {status !== "Verified" && (
                            <button
                              type="button"
                              onClick={() => openVerifyModal(item, "Verified")}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                              title="Verify Achievement"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Verify
                            </button>
                          )}
                          {status !== "Rejected" && (
                            <button
                              type="button"
                              onClick={() => openVerifyModal(item, "Rejected")}
                              className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                              title="Reject Achievement"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <Trophy className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-3 font-display text-lg font-bold text-slate-800">
            No achievements found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {search || sportFilter || statusFilter !== "All"
              ? "No achievements match your filters. Try clearing or expanding your search."
              : "No achievements have been recorded yet. Click '+ Add achievement' to record one."}
          </p>
        </div>
      )}

      {/* Add Achievement Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Medal className="h-6 w-6 text-emerald-600" />
                <h3 className="font-display text-xl font-extrabold text-slate-900">
                  Record Athlete Achievement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAchievement} className="mt-5 grid gap-4 sm:grid-cols-2">
              {/* Athlete selection */}
              {!athleteId ? (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Select Athlete *
                  </label>
                  <select
                    required
                    className={selectClass}
                    value={form.athleteId}
                    onChange={(e) => setForm({ ...form, athleteId: e.target.value })}
                  >
                    <option value="">-- Choose Athlete --</option>
                    {athletes.map((a) => (
                      <option key={a._id} value={a._id}>
                        {a.name} ({a.email || a.phone || "No contact"})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="sm:col-span-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700">
                  Athlete: <span className="font-bold text-slate-900">{athleteName}</span>
                </div>
              )}

              {/* Sport */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Sport *</label>
                <select
                  required
                  className={selectClass}
                  value={form.sportId}
                  onChange={(e) => setForm({ ...form, sportId: e.target.value })}
                >
                  <option value="">-- Select Sport --</option>
                  {sports.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.SportName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Category *</label>
                <select
                  required
                  className={selectClass}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Achievement Title *
                </label>
                <input
                  required
                  placeholder="e.g. State Championship Gold Medal, U-19 Winner"
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              {/* Date */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Achievement Date *
                </label>
                <input
                  required
                  type="date"
                  className={inputClass}
                  value={form.achievementDate}
                  onChange={(e) => setForm({ ...form, achievementDate: e.target.value })}
                />
              </div>

              {/* Rank / Position */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Rank / Position
                </label>
                <input
                  placeholder="e.g. 1st Place, Gold, Finalist"
                  className={inputClass}
                  value={form.rank}
                  onChange={(e) => setForm({ ...form, rank: e.target.value })}
                />
              </div>

              {/* Event Name */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Event / Tournament Name
                </label>
                <input
                  placeholder="e.g. 36th National Games, SAG Inter-District Tournament"
                  className={inputClass}
                  value={form.eventName}
                  onChange={(e) => setForm({ ...form, eventName: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-slate-700">Description</label>
                <textarea
                  rows={3}
                  placeholder="Additional context, scores, timing, or certificate numbers..."
                  className={inputClass}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              {/* Verification Status */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Initial Status
                </label>
                <select
                  className={selectClass}
                  value={form.verificationStatus}
                  onChange={(e) => setForm({ ...form, verificationStatus: e.target.value })}
                >
                  <option value="Verified">Verified (Direct Approval)</option>
                  <option value="Pending">Pending Verification</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Verification Remarks
                </label>
                <input
                  className={inputClass}
                  value={form.verificationRemarks}
                  onChange={(e) => setForm({ ...form, verificationRemarks: e.target.value })}
                />
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex items-center justify-end gap-3 sm:col-span-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Achievement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify / Reject Modal */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display text-lg font-extrabold text-slate-900">
                {verifyStatus === "Verified" ? "Verify Achievement" : "Reject Achievement"}
              </h3>
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVerification} className="mt-4 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200">
                <p className="text-xs font-bold text-emerald-700">
                  {verifyModal.sport?.SportName} · {verifyModal.category}
                </p>
                <h4 className="mt-1 font-bold text-slate-900">{verifyModal.title}</h4>
                {verifyModal.eventName && (
                  <p className="text-xs text-slate-600 mt-0.5">Event: {verifyModal.eventName}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">
                  Athlete: {verifyModal.athlete?.userId?.Name || "Athlete"}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Set Status
                </label>
                <select
                  className={selectClass}
                  value={verifyStatus}
                  onChange={(e) => setVerifyStatus(e.target.value)}
                >
                  <option value="Verified">Verified</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Verification Remarks / Notes
                </label>
                <textarea
                  rows={3}
                  className={inputClass}
                  placeholder="e.g. Verified against certificate submitted, record verified."
                  value={verifyRemarks}
                  onChange={(e) => setVerifyRemarks(e.target.value)}
                />
              </div>

              <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => setVerifyModal(null)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-50 ${
                    verifyStatus === "Verified"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm {verifyStatus}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    return content;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <div className="mx-auto max-w-7xl">{content}</div>
    </div>
  );
}
