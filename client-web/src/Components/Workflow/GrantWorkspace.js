import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  IndianRupee,
  Loader2,
  MessageCircleQuestion,
  Plus,
  ScanSearch,
  X,
} from "lucide-react";
import { api, API_BASE_URL } from "../../API/client";
import { getPublicFacilities } from "../../services/public/publicFacilityService";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  PageShell,
  StatusPill,
  inputClass,
  selectClass,
} from "../Admin/Common/AdminUI";

const rupees = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const fileUrl = (value) =>
  /^https?:\/\//i.test(value || "") ? value : `${API_BASE_URL}${value || ""}`;

function percentForAmount(grant, amountUsed) {
  if (!Number.isFinite(amountUsed) || !Number(grant.allocatedAmount)) return 0;
  return Math.round(((amountUsed / Number(grant.allocatedAmount)) * 100) * 100) / 100;
}

function verifiedTotals(grant, updates) {
  const amountUsed = updates
    .filter((item) => item.reviewStatus === "Verified")
    .reduce((total, item) => total + (Number(item.amountUsed) || 0), 0);
  return { amountUsed, percent: percentForAmount(grant, amountUsed) };
}

function milestoneError(grant, amountUsed, verifiedTotal, submittedPercent = null) {
  if (!Number.isFinite(amountUsed) || amountUsed <= 0) {
    return "Milestone amount must be greater than zero.";
  }
  if (verifiedTotal.amountUsed + amountUsed > Number(grant.allocatedAmount)) {
    return `Milestone amount cannot exceed the remaining ${rupees(Number(grant.allocatedAmount) - verifiedTotal.amountUsed)}.`;
  }
  const calculated = percentForAmount(grant, amountUsed);
  if (submittedPercent !== null && Math.abs(Number(submittedPercent) - calculated) > 0.01) {
    return `The percentage should be ${calculated}% for ${rupees(amountUsed)} usage.`;
  }
  return "";
}

export default function GrantWorkspace({ role }) {
  const [rows, setRows] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllocate, setShowAllocate] = useState(false);
  const [notice, setNotice] = useState(null);
  const [grantForm, setGrantForm] = useState({
    facility: "",
    title: "",
    purpose: "",
    allocatedAmount: "",
    startDate: "",
    dueDate: "",
  });
  const [progress, setProgress] = useState({});
  const [submittingProgress, setSubmittingProgress] = useState({});
  const [scanningProofs, setScanningProofs] = useState({});
  const [queries, setQueries] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get(role === "admin" ? "/api/admin/grants" : "/api/manager/grants");
      setRows(result.data || []);
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (role === "admin") {
      getPublicFacilities()
        .then(setFacilities)
        .catch(() => setFacilities([]));
    }
  }, [role]);

  const allocate = async (event) => {
    event.preventDefault();
    try {
      await api.post("/api/admin/grants", {
        ...grantForm,
        allocatedAmount: Number(grantForm.allocatedAmount),
      });
      setGrantForm({
        facility: "",
        title: "",
        purpose: "",
        allocatedAmount: "",
        startDate: "",
        dueDate: "",
      });
      setShowAllocate(false);
      setNotice({ tone: "success", text: "Grant allocated successfully." });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
    }
  };

  const submitProgress = async (grantId) => {
    const value = progress[grantId] || {};
    setSubmittingProgress((old) => ({ ...old, [grantId]: true }));
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", value.proof);
      const uploaded = await api.upload("/api/uploads/attachment", uploadForm);
      await api.post(`/api/manager/grants/${grantId}/progress`, {
        amountUsed: Number(value.amountUsed),
        note: value.note,
        proofUrl: uploaded.data.url,
        proofName: uploaded.data.name,
        proofKey: uploaded.data.key,
        proofSize: uploaded.data.size,
        proofMimeType: uploaded.data.mimeType,
      });
      setProgress((old) => ({ ...old, [grantId]: {} }));
      setNotice({ tone: "success", text: "Grant milestone submitted for Admin review." });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
    } finally {
      setSubmittingProgress((old) => ({ ...old, [grantId]: false }));
    }
  };

  const review = async (grantId, progressId, decision) => {
    try {
      await api.patch(`/api/admin/grants/${grantId}/progress/${progressId}`, {
        decision,
        note: queries[progressId] || "",
      });
      setNotice({ tone: "success", text: `Milestone ${decision.toLowerCase()}.` });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
    }
  };

  const scanProof = async (grantId, progressId) => {
    setScanningProofs((old) => ({ ...old, [progressId]: true }));
    try {
      await api.post(`/api/admin/grants/${grantId}/progress/${progressId}/scan`, {});
      setNotice({ tone: "success", text: "AI proof scan finished." });
      await load();
    } catch (error) {
      setNotice({ tone: "error", text: error.message });
    } finally {
      setScanningProofs((old) => ({ ...old, [progressId]: false }));
    }
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow={role === "admin" ? "State Grant Ledger" : "Facility Grants"}
        title="Grant Management & Utilisation"
        description="Track allocated infrastructure grants, milestone proofs, admin verifications, and utilisation progress."
        actions={
          role === "admin" ? (
            <Button
              onClick={() => setShowAllocate((v) => !v)}
              variant={showAllocate ? "secondary" : "primary"}
            >
              {showAllocate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showAllocate ? "Cancel" : "Allocate Grant"}
            </Button>
          ) : null
        }
      />

      {notice ? (
        <div
          className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold ${
            notice.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-slate-400 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      {role === "admin" && showAllocate ? (
        <Card className="mb-6 border-2 border-emerald-500/20 p-5 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-extrabold text-slate-900">
            Allocate a New Grant
          </h2>
          <form onSubmit={allocate} className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Facility *</label>
              <select
                required
                className={selectClass}
                value={grantForm.facility}
                onChange={(event) => setGrantForm({ ...grantForm, facility: event.target.value })}
              >
                <option value="">Select facility</option>
                {facilities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Grant Title *</label>
              <input
                required
                className={inputClass}
                placeholder="e.g. Track Lighting & Turf Upgrade"
                value={grantForm.title}
                onChange={(event) => setGrantForm({ ...grantForm, title: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Amount (INR) *</label>
              <input
                required
                min="1"
                type="number"
                className={inputClass}
                value={grantForm.allocatedAmount}
                onChange={(event) =>
                  setGrantForm({ ...grantForm, allocatedAmount: event.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Purpose *</label>
              <input
                required
                className={inputClass}
                value={grantForm.purpose}
                onChange={(event) => setGrantForm({ ...grantForm, purpose: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">Start Date</label>
              <input
                type="date"
                className={inputClass}
                value={grantForm.startDate}
                onChange={(event) => setGrantForm({ ...grantForm, startDate: event.target.value })}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Progress Due Date
              </label>
              <input
                type="date"
                className={inputClass}
                value={grantForm.dueDate}
                onChange={(event) => setGrantForm({ ...grantForm, dueDate: event.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 md:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setShowAllocate(false)}>
                Cancel
              </Button>
              <Button type="submit">Allocate Grant</Button>
            </div>
          </form>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-brand-primary" />
        </div>
      ) : rows.length ? (
        <div className="space-y-5">
          {rows.map((grant) => (
            <GrantCard
              key={grant._id}
              {...{
                grant,
                role,
                progress,
                setProgress,
                submitProgress,
                submittingProgress,
                scanProof,
                scanningProofs,
                queries,
                setQueries,
                review,
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            title="No grants found"
            description="Allocated infrastructure grants and milestone submissions will appear here."
          />
        </Card>
      )}
    </PageShell>
  );
}

function GrantCard({
  grant,
  role,
  progress,
  setProgress,
  submitProgress,
  submittingProgress,
  scanProof,
  scanningProofs,
  queries,
  setQueries,
  review,
}) {
  const updates = [...(grant.progressUpdates || [])].sort(
    (a, b) => new Date(a.submittedAt) - new Date(b.submittedAt)
  );
  const pending = updates.filter((item) => item.reviewStatus === "Pending");
  const totals = verifiedTotals(grant, updates);
  const draft = progress[grant._id] || {};
  const amountUsed =
    draft.amountUsed === "" || draft.amountUsed == null ? NaN : Number(draft.amountUsed);
  const calculatedPercent = percentForAmount(grant, amountUsed);
  const validation = milestoneError(grant, amountUsed, totals);
  const complete = totals.amountUsed >= Number(grant.allocatedAmount);
  const canSubmit =
    !pending.length &&
    !complete &&
    !validation &&
    String(draft.note || "").trim() &&
    draft.proof;
  const updateDraft = (key, value) =>
    setProgress((old) => ({ ...old, [grant._id]: { ...old[grant._id], [key]: value } }));

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-slate-900">{grant.title}</h2>
          <p className="text-xs font-medium text-slate-500">{grant.facility?.name}</p>
        </div>
        <div className="text-right">
          <p className="inline-flex items-center font-extrabold text-brand-primary tabular-nums">
            <IndianRupee className="h-4 w-4" />
            {Number(grant.allocatedAmount).toLocaleString("en-IN")}
          </p>
          <div className="mt-1">
            <StatusPill status={grant.status} />
          </div>
        </div>
      </div>

      <p className="mt-3 text-sm text-slate-600">{grant.purpose}</p>

      <div className="mt-4 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
        <Summary label="Verified utilisation" value={`${totals.percent}%`} />
        <Summary label="Verified usage" value={rupees(totals.amountUsed)} />
        <Summary
          label="Allocation remaining"
          value={rupees(Number(grant.allocatedAmount) - totals.amountUsed)}
        />
        <div className="h-2 overflow-hidden rounded-full bg-slate-200 sm:col-span-3">
          <div
            className="h-full rounded-full bg-brand-primary transition-all"
            style={{ width: `${totals.percent}%` }}
          />
        </div>
      </div>

      {role === "manager" && pending.length ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-800">
          A milestone is awaiting Admin verification. New milestones can be submitted once reviewed.
        </div>
      ) : null}

      {role === "manager" && complete && !pending.length ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          This grant has reached 100% verified utilisation.
        </div>
      ) : null}

      {role === "manager" && !pending.length && !complete ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-2">
          <Labeled label="Amount used in this milestone (₹)">
            <input
              type="number"
              min="1"
              max={Math.max(0, Number(grant.allocatedAmount) - totals.amountUsed)}
              className={inputClass}
              placeholder={`Remaining ${rupees(Number(grant.allocatedAmount) - totals.amountUsed)}`}
              value={draft.amountUsed || ""}
              onChange={(event) => updateDraft("amountUsed", event.target.value)}
            />
          </Labeled>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-brand-primary">
              This Milestone Share
            </p>
            <p className="mt-1 text-xl font-extrabold text-brand-dark tabular-nums">
              {Number.isFinite(amountUsed) ? `${calculatedPercent}%` : "—"}
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="text-xs text-slate-500">
              Percentage is computed against the full {rupees(grant.allocatedAmount)} allocation.
            </p>
            {draft.amountUsed && validation ? (
              <p className="mt-1 text-xs font-bold text-rose-600">{validation}</p>
            ) : null}
          </div>
          <textarea
            className={`${inputClass} md:col-span-2`}
            placeholder="Describe the work and expenditure covered by this milestone"
            value={draft.note || ""}
            onChange={(event) => updateDraft("note", event.target.value)}
          />
          <Labeled label="Usage proof (PDF, JPG or PNG)">
            <input
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              className="block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
              onChange={(event) => updateDraft("proof", event.target.files?.[0])}
            />
          </Labeled>
          <div className="flex items-end">
            <Button
              type="button"
              disabled={!canSubmit || submittingProgress[grant._id]}
              onClick={() => submitProgress(grant._id)}
              className="w-full"
            >
              {submittingProgress[grant._id] ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {submittingProgress[grant._id] ? "Uploading proof..." : "Submit Milestone for Review"}
            </Button>
          </div>
        </div>
      ) : null}

      {updates.length ? (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Milestone History
          </h3>
          {updates.map((item, index) => (
            <Milestone
              key={item._id}
              {...{
                item, index, updates, pending, grant, role, queries, setQueries, review,
                scanProof, scanningProofs,
              }}
            />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

function Milestone({
  item, index, updates, pending, grant, role, queries, setQueries, review,
  scanProof, scanningProofs,
}) {
  const itemError = milestoneError(
    grant,
    Number(item.amountUsed),
    verifiedTotals(grant, updates.slice(0, index)),
    Number(item.percent)
  );
  const isFirstPending = pending[0] && String(pending[0]._id) === String(item._id);

  return (
    <div
      className={`rounded-xl border p-4 ${
        itemError ? "border-rose-200 bg-rose-50/40" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-slate-900 tabular-nums">{item.percent}% milestone</span>
        <StatusPill status={item.reviewStatus} />
      </div>
      <p className="mt-1 text-sm text-slate-700">{item.note}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 tabular-nums">
        Milestone amount: {rupees(item.amountUsed)}
      </p>
      {itemError ? (
        <p className="mt-2 rounded-lg bg-rose-100 p-2 text-xs font-bold text-rose-700">
          Invalid milestone: {itemError}
        </p>
      ) : null}
      {item.proofUrl ? (
        <a
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline"
          href={fileUrl(item.proofUrl)}
          target="_blank"
          rel="noreferrer"
        >
          <FileCheck2 className="h-4 w-4" />
          View {item.proofName || "proof"}
        </a>
      ) : null}
      {role === "admin" && item.proofUrl ? (
        <ProofExtraction
          extraction={item.proofExtraction}
          claimedAmount={item.amountUsed}
          scanning={Boolean(scanningProofs[item._id])}
          onScan={() => scanProof(grant._id, item._id)}
        />
      ) : null}
      {item.adminNote ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs font-semibold text-amber-800">
          Admin note: {item.adminNote}
        </p>
      ) : null}
      {role === "admin" && item.reviewStatus === "Pending" ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            className={`${inputClass} flex-1`}
            placeholder="Query note (required when raising query)"
            value={queries[item._id] || ""}
            onChange={(event) => setQueries({ ...queries, [item._id]: event.target.value })}
          />
          <Button
            type="button"
            disabled={!isFirstPending || Boolean(itemError)}
            onClick={() => review(grant._id, item._id, "Verified")}
          >
            <CheckCircle2 className="h-4 w-4" />
            Verify
          </Button>
          <Button
            type="button"
            variant="amber"
            disabled={!isFirstPending}
            onClick={() => review(grant._id, item._id, "Query Raised")}
          >
            <MessageCircleQuestion className="h-4 w-4" />
            Raise Query
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ProofExtraction({ extraction, claimedAmount, scanning, onScan }) {
  const status = extraction?.status || "Not Scanned";
  const completed = status === "Completed";
  const total = extraction?.totalAmount;
  const hasTotal = total !== null && total !== undefined && Number.isFinite(Number(total));
  const difference = hasTotal ? Math.round((Number(total) - Number(claimedAmount || 0)) * 100) / 100 : null;
  const matches = difference !== null && Math.abs(difference) <= 1;
  const confidence = Math.round(Number(extraction?.confidence || 0) * 100);

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-indigo-800">
            <ScanSearch className="h-4 w-4" /> AI proof scan
          </p>
          <p className="mt-1 text-[11px] font-medium text-slate-500">
            OCR-assisted via {extraction?.provider || "the configured AI provider"}. Admin must verify before approval.
          </p>
        </div>
        <Button type="button" size="sm" variant="secondary" disabled={scanning} onClick={onScan}>
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
          {scanning ? "Scanning..." : completed ? "Re-scan" : "Scan proof"}
        </Button>
      </div>

      {status === "Pending" || scanning ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-indigo-700">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading proof details…
        </p>
      ) : completed ? (
        <>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ExtractedField label="Detected total" value={hasTotal ? rupees(total) : "Not detected"} />
            <ExtractedField label="Vendor / payee" value={extraction.vendorName || "Not detected"} />
            <ExtractedField label="Invoice / reference" value={extraction.invoiceNumber || extraction.paymentReference || "Not detected"} />
            <ExtractedField label="Document date" value={extraction.documentDate || "Not detected"} />
            <ExtractedField label="Document type" value={extraction.documentType || "Proof"} />
            <ExtractedField label="Subtotal" value={extraction.subtotal != null ? rupees(extraction.subtotal) : "Not detected"} />
            <ExtractedField label="Tax" value={extraction.taxAmount != null ? rupees(extraction.taxAmount) : "Not detected"} />
            <ExtractedField label="OCR confidence" value={`${confidence}%`} />
          </div>
          <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-bold ${
            !hasTotal
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : matches
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
          }`}>
            {!hasTotal
              ? "The document total could not be detected. Check the proof manually."
              : matches
                ? `Detected total matches the claimed ${rupees(claimedAmount)}.`
                : `Amount mismatch: claimed ${rupees(claimedAmount)}, detected ${rupees(total)} (${difference > 0 ? "+" : ""}${rupees(difference)} difference).`}
          </div>
          {extraction.summary ? <p className="mt-2 text-xs text-slate-700">{extraction.summary}</p> : null}
          {extraction.warnings?.length ? (
            <ul className="mt-2 space-y-1 text-xs font-semibold text-amber-800">
              {extraction.warnings.map((warning, index) => (
                <li key={`${warning}-${index}`} className="flex gap-1.5">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {warning}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {extraction?.error || "This proof has not been scanned yet."}
        </p>
      )}
    </div>
  );
}

function ExtractedField({ label, value }) {
  return (
    <div className="rounded-lg border border-indigo-100 bg-white px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-xs font-bold text-slate-800">{value}</p>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-extrabold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
      {children}
    </label>
  );
}
