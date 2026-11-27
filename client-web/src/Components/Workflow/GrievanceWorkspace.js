import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  FileText,
  Loader2,
  LogOut,
  MessageSquarePlus,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { api, API_BASE_URL } from "../../API/client";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageShell,
  StatusPill,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../Admin/Common/AdminUI";

const fileUrl = (value) =>
  /^https?:\/\//i.test(value || "") ? value : `${API_BASE_URL}${value || ""}`;

export default function GrievanceWorkspace({ role }) {
  const admin = role === "admin";
  const citizen = ["citizen", "athlete"].includes(role);
  const noManualEscalate = ["citizen", "athlete", "coach"].includes(role);
  const [rows, setRows] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({
    sportsComplex: "",
    subject: "",
    description: "",
    proof: null,
  });
  const [responses, setResponses] = useState({});
  const [view, setView] = useState(admin ? "assigned" : "mine");
  const [status, setStatus] = useState("all");
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setRows([]);
    try {
      const result = await api.get(`/api/grievances?view=${view}`);
      if (currentRequest === requestId.current) setRows(result.data || []);
    } catch (error) {
      if (currentRequest === requestId.current) {
        setMessage({ type: "error", text: error.message });
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  const loadFacilities = useCallback(async () => {
    if (admin) return;
    try {
      const result = await api.get("/api/grievances/facilities");
      setFacilities(result.data || []);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    }
  }, [admin]);

  useEffect(() => {
    loadFacilities();
  }, [loadFacilities]);

  useEffect(() => {
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      let proof = {};
      if (form.proof) {
        const uploadForm = new FormData();
        uploadForm.append("file", form.proof);
        const uploaded = await api.upload("/api/uploads/attachment", uploadForm);
        proof = {
          proofUrl: uploaded.data.url,
          proofName: uploaded.data.name,
          proofKey: uploaded.data.key,
        };
      }
      await api.post("/api/grievances", {
        sportsComplex: form.sportsComplex,
        subject: form.subject,
        description: form.description,
        ...proof,
      });
      setForm({ sportsComplex: "", subject: "", description: "", proof: null });
      setShowCreateForm(false);
      await load();
      setMessage({
        type: "success",
        text: "Grievance submitted successfully. Track updates below.",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const respond = async (id, resolve, escalate = false) => {
    const response = String(responses[id] || "").trim();
    if (!response) {
      setMessage({ type: "error", text: "Please enter a response or remark first." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.post(`/api/grievances/${id}/${escalate ? "escalate" : "respond"}`, {
        response,
        reason: response,
        resolve,
        revision: rows.find((row) => row._id === id)?.revision,
      });
      setResponses((old) => ({ ...old, [id]: "" }));
      await load();
      setMessage({
        type: "success",
        text: escalate
          ? "Grievance escalated to the next authority level."
          : resolve
          ? "Grievance marked as resolved."
          : "Response recorded successfully.",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredRows = rows.filter(
    (item) => status === "all" || item.workflowStatus === status
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow="Sports Authority of Gujarat · Resolution Desk"
        title="Facility Grievances"
        description={
          admin
            ? "Monitor escalated facility complaints, SLAs, and resolution trails statewide."
            : "Report facility issues, attach evidence, and track status updates."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {role === "gate" ? (
              <Button variant="secondary" as="a" href="/gate">
                <ArrowLeft className="h-4 w-4" /> Gate Scanner
              </Button>
            ) : null}
            {role === "supervisor" ? (
              <Button
                variant="secondary"
                onClick={() => {
                  localStorage.removeItem("token");
                  window.location.assign("/login");
                }}
              >
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => {
                load();
                loadFacilities();
              }}
              aria-label="Refresh grievances"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {!admin ? (
              <Button
                onClick={() => setShowCreateForm((prev) => !prev)}
                variant={showCreateForm ? "secondary" : "primary"}
              >
                {showCreateForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showCreateForm ? "Cancel" : "Raise Grievance"}
              </Button>
            ) : null}
          </div>
        }
      />

      {message ? (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${
            message.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {!admin && showCreateForm ? (
        <Card className="mb-6 border-2 border-emerald-500/20 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5 text-brand-primary" />
              <h2 className="font-display text-lg font-extrabold text-slate-900">
                Submit a Facility Grievance
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Facility *</label>
              <select
                required
                className={selectClass}
                value={form.sportsComplex}
                onChange={(e) => setForm({ ...form, sportsComplex: e.target.value })}
              >
                <option value="">Select facility</option>
                {facilities.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Subject *</label>
              <input
                required
                className={inputClass}
                maxLength={240}
                placeholder="Short summary of the issue"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Complaint Details *
              </label>
              <textarea
                required
                rows="4"
                maxLength={5000}
                placeholder="Describe the maintenance, equipment, or operational issue..."
                className={inputClass}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Supporting Photo or PDF (optional)
              </label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
                className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-brand-primary hover:file:bg-emerald-100"
                onChange={(e) => setForm({ ...form, proof: e.target.files?.[0] || null })}
              />
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Submitting..." : "Submit Grievance"}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {/* Filter Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {!admin ? (
            <button
              type="button"
              onClick={() => setView("mine")}
              aria-pressed={view === "mine"}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                view === "mine"
                  ? "bg-brand-primary text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              My Grievances
            </button>
          ) : null}
          {["admin", "authority", "manager", "supervisor"].includes(role) ? (
            <button
              type="button"
              onClick={() => setView("assigned")}
              aria-pressed={view === "assigned"}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                view === "assigned"
                  ? "bg-brand-primary text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {role === "admin" || role === "authority" ? "All Complaints" : "Assigned to Me"}
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <select
            aria-label="Filter grievance status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-brand-primary"
          >
            <option value="all">All Statuses</option>
            {["Open", "Responded", "Escalated", "Resolved"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Card>
          <TableSkeleton rows={5} columns={4} />
        </Card>
      ) : filteredRows.length ? (
        <div className="space-y-4">
          {filteredRows.map((item) => {
            const escalated = item.workflowStatus === "Escalated";
            const history = item.history?.length
              ? [
                  ...(item.remarks || []).filter(
                    (remark) =>
                      !item.history.some(
                        (event) =>
                          event.reason === remark.remark &&
                          String(event.userId?._id || event.userId) ===
                            String(remark.userId?._id || remark.userId)
                      )
                  ),
                  ...item.history,
                ]
              : item.remarks || [];

            return (
              <Card
                key={item._id}
                className={`p-5 sm:p-6 ${escalated ? "border-rose-300" : ""}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-extrabold text-slate-900">
                        {item.subject || "Facility Grievance"}
                      </h2>
                      <StatusPill status={item.workflowStatus || "Open"} />
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {item.sportsComplex?.name || "Facility"} · Submitted by{" "}
                      <span className="font-semibold text-slate-700">
                        {item.userId?.Name || "Citizen"}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">
                      Handler: {item.handlingRole}
                    </span>
                    {item.dueAt && item.workflowStatus !== "Resolved" ? (
                      <p
                        className={`mt-1.5 flex items-center justify-end gap-1 text-[11px] font-bold ${
                          item.overdue ? "text-rose-600" : "text-amber-700"
                        }`}
                      >
                        {escalated || item.overdue ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        Due {new Date(item.dueAt).toLocaleDateString("en-IN")}
                        {item.overdue ? " (Overdue)" : ""}
                      </p>
                    ) : null}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-slate-700">
                  {item.Description}
                </p>

                {item.photo ? (
                  <a
                    href={fileUrl(item.photo)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-brand-primary transition hover:bg-emerald-100"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View {item.proofName || "attachment"}
                  </a>
                ) : null}

                {history.length ? (
                  <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Resolution Timeline
                    </p>
                    {history.map((event, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-800">
                            {event.userId?.Name || "System"} ·{" "}
                            <span className="capitalize text-brand-primary">
                              {event.action || "response"}
                            </span>
                            {event.toLevel !== undefined
                              ? ` to ${["Supervisor", "Manager", "District Authority", "Admin"][event.toLevel]}`
                              : ""}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {event.date ? new Date(event.date).toLocaleString("en-IN") : ""}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600">{event.reason || event.remark}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                {!citizen && (item.permissions?.canRespond || (!noManualEscalate && item.permissions?.canEscalate)) ? (
                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                    <textarea
                      className={inputClass}
                      rows="2"
                      aria-label="Response or escalation reason"
                      placeholder="Write an official response, resolution note, or escalation reason..."
                      value={responses[item._id] || ""}
                      onChange={(e) =>
                        setResponses({ ...responses, [item._id]: e.target.value })
                      }
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                      {item.permissions.canRespond ? (
                        <Button
                          variant="secondary"
                          disabled={saving}
                          onClick={() => respond(item._id, false)}
                        >
                          Send Response
                        </Button>
                      ) : null}
                      {!noManualEscalate && item.permissions.canEscalate ? (
                        <Button
                          variant="amber"
                          disabled={saving}
                          onClick={() => respond(item._id, false, true)}
                        >
                          Escalate Upward
                        </Button>
                      ) : null}
                      {item.permissions.canResolve ? (
                        <Button
                          variant="primary"
                          disabled={saving}
                          onClick={() => respond(item._id, true)}
                        >
                          Mark Resolved
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No grievances found"
            description={
              !admin
                ? "Click 'Raise Grievance' above to submit a new facility issue."
                : "No grievances match the selected filter."
            }
          />
        </Card>
      )}
    </PageShell>
  );
}
