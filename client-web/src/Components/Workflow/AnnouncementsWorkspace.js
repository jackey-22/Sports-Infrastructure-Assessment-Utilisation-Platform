import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bell,
  Building2,
  CheckCircle2,
  Loader2,
  Megaphone,
  Plus,
  RefreshCw,
  RotateCcw,
  Tag,
} from "lucide-react";
import { api } from "../../API/client";

const CATEGORIES = [
  { value: "general", label: "General Update" },
  { value: "slot", label: "New Slots" },
  { value: "camp", label: "New Camp / Event" },
  { value: "maintenance", label: "Facility Notice" },
];

const CATEGORY_STYLE = {
  general: "bg-slate-100 text-slate-700 ring-slate-200",
  slot: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  camp: "bg-amber-50 text-amber-800 ring-amber-200",
  maintenance: "bg-sky-50 text-sky-700 ring-sky-200",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10";

export default function AnnouncementsWorkspace({ role = "admin" }) {
  const isAdmin = role === "admin";
  const [announcements, setAnnouncements] = useState([]);
  const [sports, setSports] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [sportId, setSportId] = useState("");
  const [facilityId, setFacilityId] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [togglingId, setTogglingId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const requests = [api.get("/api/announcements"), api.get("/getSports")];
      if (isAdmin) requests.push(api.get("/getSportsComplex"));
      const [annRes, sportsRes, facRes] = await Promise.all(requests);
      setAnnouncements(annRes.data || []);
      setSports(sportsRes.data || []);
      if (isAdmin && facRes) setFacilities(facRes.data || []);
    } catch (err) {
      setError(err.message || "Could not load announcements.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filtered = useMemo(() => {
    if (statusFilter === "active") return announcements.filter((a) => a.active === "1");
    if (statusFilter === "archived") return announcements.filter((a) => a.active !== "1");
    return announcements;
  }, [announcements, statusFilter]);

  const activeCount = useMemo(
    () => announcements.filter((a) => a.active === "1").length,
    [announcements]
  );

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setFeedback({ type: "error", text: "Please enter both a title and a description." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.post("/api/announcements", {
        title: title.trim(),
        description: description.trim(),
        category,
        sportId: sportId || null,
        facilityId: isAdmin ? facilityId || null : null,
      });
      const notified = Number(res.notifiedCount || 0);
      setFeedback({
        type: "success",
        text: sportId
          ? `Announcement published! Notified ${notified} athlete${notified === 1 ? "" : "s"} following this sport.`
          : "Announcement published to athlete home.",
      });
      setTitle("");
      setCategory("general");
      setSportId("");
      setFacilityId("");
      setDescription("");
      setShowForm(false);
      await loadData();
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Could not publish announcement." });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (item) => {
    setTogglingId(item._id);
    setFeedback(null);
    try {
      const nextActive = item.active === "1" ? "0" : "1";
      await api.patch(`/api/announcements/${item._id}`, { active: nextActive });
      setAnnouncements((prev) =>
        prev.map((a) => (a._id === item._id ? { ...a, active: nextActive } : a))
      );
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Could not update announcement." });
    } finally {
      setTogglingId("");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-primary">
            <Megaphone className="h-4 w-4" />
            <span>{isAdmin ? "Platform Announcements" : "Facility Announcements"}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Announcements</h1>
          <p className="mt-1 text-sm text-slate-600">
            Publish updates, camps, or slot openings highlighted on Athlete Home. Selecting a sport automatically notifies athletes following that sport.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "Close Form" : "Post Announcement"}
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">New Announcement</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <Bell className="h-3.5 w-3.5" />
              Highlights on Athlete Home
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Summer Basketball Selection Camp"
                className={inputClass}
                maxLength={140}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Sport Tag (optional — notifies preferred athletes)
              </label>
              <select
                value={sportId}
                onChange={(e) => setSportId(e.target.value)}
                className={inputClass}
              >
                <option value="">All Sports (No sport-specific push)</option>
                {sports.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.SportName}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin ? (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Facility (optional)
                </label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Platform-wide (All Facilities)</option>
                  {facilities.map((f) => (
                    <option key={f._id} value={f._id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Announcement Details *
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Share dates, registration steps, venue notes, or slot details..."
              className={inputClass}
              maxLength={800}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2 text-xs font-bold text-white transition hover:opacity-95 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Megaphone className="h-3.5 w-3.5" />}
              {saving ? "Publishing..." : "Publish Announcement"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
          {[
            { id: "all", label: `All (${announcements.length})` },
            { id: "active", label: `Active (${activeCount})` },
            { id: "archived", label: `Archived (${announcements.length - activeCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? "bg-brand-primary text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
          {error}
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading announcements...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Megaphone className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-3 text-sm font-bold text-slate-900">No announcements yet</h3>
          <p className="mt-1 text-xs text-slate-500">
            Post an announcement above or create new slots / approve institutional events to publish automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const catMeta = CATEGORIES.find((c) => c.value === item.category) || CATEGORIES[0];
            const isActive = item.active === "1";
            return (
              <div
                key={item._id}
                className={`rounded-2xl border bg-white p-5 shadow-2xs transition ${
                  isActive ? "border-slate-200" : "border-slate-200/70 bg-slate-50/70 opacity-80"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${
                          CATEGORY_STYLE[item.category] || CATEGORY_STYLE.general
                        }`}
                      >
                        {catMeta.label}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          isActive
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isActive ? "Live on Athlete Home" : "Archived"}
                      </span>
                      {item.sportName ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                          <Tag className="h-3 w-3" />
                          {item.sportName}
                        </span>
                      ) : null}
                      {item.facilityName ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                          <Building2 className="h-3 w-3" />
                          {item.facilityName}
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
                    <p className="text-xs text-slate-400">
                      Published {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                    </p>
                  </div>

                  {item.canManage ? (
                    <button
                      type="button"
                      disabled={togglingId === item._id}
                      onClick={() => handleToggle(item)}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {togglingId === item._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : isActive ? (
                        <Archive className="h-3.5 w-3.5" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      {isActive ? "Archive" : "Republish"}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
