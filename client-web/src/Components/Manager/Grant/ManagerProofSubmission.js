import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  Upload,
} from "lucide-react";
import { managerService } from "../../../services/manager/managerService";
import { DEMO_TODAY } from "../../../data/admin/adminDemoData";
import {
  formatCurrency,
  formatDate,
  validateFile,
  formatFileSize,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE_MB,
} from "../../../utils/manager/managerUtils";
import {
  Button,
  Card,
  ConfirmDialog,
  DemoBanner,
  Field,
  Notice,
  PageHeader,
  PageShell,
  SectionHeader,
  inputClass,
  selectClass,
} from "../Common/ManagerUI";

const MAX_ATTACHMENTS = 5;

const EMPTY_FORM = {
  grantId: "",
  expenditureDescription: "",
  claimedAmount: "",
  expenditureDate: DEMO_TODAY,
  expenseCategory: "",
  remarks: "",
};

const EXPENSE_CATEGORIES = [
  "Infrastructure upgradation",
  "Equipment procurement",
  "Maintenance & repairs",
  "Coaching & training support",
  "Event hosting support",
];

export default function ManagerProofSubmission() {
  const { grantId: routeGrantId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [grants, setGrants] = useState([]);

  useEffect(() => {
    let active = true;
    managerService.listGrants().then((rows) => {
      if (active) setGrants(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  const grant = useMemo(
    () => grants.find((row) => row.id === routeGrantId) || null,
    [grants, routeGrantId]
  );
  const eligibleGrants = useMemo(
    () =>
      grants.filter((g) =>
        ["Allocated", "Partially Released", "Utilisation Pending", "Under Verification"].includes(
          g.status
        )
      ),
    [grants]
  );

  function update(patch) {
    setForm((current) => {
      const next = { ...current, ...patch };
      return next;
    });
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  }

  // Load any persisted local draft on mount.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("mgr_proof_draft");
      if (stored) {
        const parsed = JSON.parse(stored);
        setDraft(parsed);
        setForm((current) => ({ ...current, ...parsed.form }));
        setFiles(parsed.files || []);
      }
    } catch {
      // Ignore corrupt draft storage.
    }
  }, []);

  useEffect(() => {
    // Persist draft to localStorage whenever form or files change (demo draft).
    try {
      window.localStorage.setItem(
        "mgr_proof_draft",
        JSON.stringify({ form, files, updatedAt: DEMO_TODAY })
      );
    } catch {
      // Ignore storage failures.
    }
  }, [form, files]);

  function validate() {
    const next = {};
    if (!form.grantId) next.grantId = "Select a grant.";
    if (!form.expenditureDescription.trim()) {
      next.expenditureDescription = "Describe the expenditure.";
    }
    const amount = Number(form.claimedAmount);
    if (!form.claimedAmount || Number.isNaN(amount) || amount <= 0) {
      next.claimedAmount = "Enter an amount greater than zero.";
    } else if (grant) {
      const remaining = grant.remaining;
      if (amount > remaining) {
        next.claimedAmount = `Claimed amount exceeds the remaining balance of ${formatCurrency(remaining)}.`;
      }
    }
    if (!form.expenditureDate) next.expenditureDate = "Choose an expenditure date.";
    else if (form.expenditureDate > DEMO_TODAY) {
      next.expenditureDate = "Expenditure date cannot be in the future.";
    }
    if (!form.expenseCategory) next.expenseCategory = "Select an expense category.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const next = [...files];
    const nextErrors = { ...fileErrors };
    let changed = false;

    incoming.forEach((file) => {
      const already = next.some((f) => f.name === file.name && f.size === file.size);
      if (already) return;
      changed = true;
      const fileErr = validateFile(file);
      if (fileErr.length) {
        nextErrors[file.name] = fileErr.join(" ");
      } else if (next.length >= MAX_ATTACHMENTS) {
        nextErrors[file.name] = `Maximum ${MAX_ATTACHMENTS} attachments.`;
      } else {
        delete nextErrors[file.name];
        next.push({ name: file.name, type: file.type, size: file.size });
      }
    });

    setFiles(next);
    setFileErrors(nextErrors);
    if (!changed && incoming.length) {
      setFileErrors({ ...nextErrors, __general: "No new files added (duplicate or at limit)." });
    }
  }

  function removeFile(index) {
    setFiles((current) => {
      const next = current.filter((_, i) => i !== index);
      const nextErrors = { ...fileErrors };
      const removed = current[index];
      if (removed) delete nextErrors[removed.name];
      setFileErrors(nextErrors);
      return next;
    });
  }

  async function submitDraft() {
    if (!validate()) return;
    setConfirm(false);
    setResult(null);
    // Draft already persisted to localStorage by the effect above.
    setDraft({ form, files, updatedAt: DEMO_TODAY });
  }

  async function confirmSubmit() {
    if (!validate()) return;
    setConfirm(true);
  }

  async function submit() {
    setBusy(true);
    try {
      await managerService.submitUtilisationProof({
        grantId: form.grantId,
        claimedAmount: Number(form.claimedAmount),
        expenditureDate: form.expenditureDate,
        expenseCategory: form.expenseCategory,
        expenditureDescription: form.expenditureDescription,
        documentName: files.map((f) => f.name).join(", "),
        documentNames: files.map((f) => f.name),
      });
      setResult({
        grantId: form.grantId,
        claimedAmount: Number(form.claimedAmount),
        files: files.length,
      });
      setConfirm(false);
      setForm(EMPTY_FORM);
      setFiles([]);
      setDraft(null);
      try {
        window.localStorage.removeItem("mgr_proof_draft");
      } catch {
        // ignore
      }
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFiles([]);
    setErrors({});
    setFileErrors({});
    setResult(null);
    setDraft(null);
    try {
      window.localStorage.removeItem("mgr_proof_draft");
    } catch {
      // ignore
    }
  }

  const grantOptions = grant ? [grant] : eligibleGrants;

  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Grants"
        title="Submit utilisation proof"
        description="Record expenditure evidence against an assigned grant."
        actions={
          <Button as={Link} to="/manager/grants" variant="secondary">
            <ArrowLeft className="h-3 w-3" /> Back to grants
          </Button>
        }
      />

      <DemoBanner>
        Utilisation proof submission is a frontend demo. Submitted proofs are
        recorded in the shared demo store so the Admin verification queue shows
        them; nothing is sent to the backend. Grant approval and release remain
        Admin powers.
      </DemoBanner>

      {result ? (
        <Notice tone="success" title="Proof submitted">
          <p>
            Utilisation proof for <strong className="font-mono">{result.grantId}</strong>
            claiming {formatCurrency(result.claimedAmount)} with{" "}
            {result.files} document(s) is in the verification queue.
          </p>
        </Notice>
      ) : null}

      {draft && !result ? (
        <Notice tone="warning" title="Local draft available">
          A previously saved draft exists for this submission. Use "Restore draft" to
          resume, or reset to start over. Drafts are stored in browser localStorage only.
        </Notice>
      ) : null}

      <form noValidate>
        <Card>
          <SectionHeader title="Grant and expenditure" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 px-4 py-4 sm:px-5">
            <Field label="Grant" htmlFor="proof-grant">
              <select
                id="proof-grant"
                className={selectClass}
                value={form.grantId}
                aria-invalid={Boolean(errors.grantId)}
                aria-describedby={errors.grantId ? "proof-grant-error" : undefined}
                onChange={(event) => update({ grantId: event.target.value })}
              >
                <option value="">Select an assigned grant</option>
                {grantOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.id} — {g.purpose} ({formatCurrency(g.remaining)} remaining)
                  </option>
                ))}
              </select>
              {errors.grantId ? (
                <p id="proof-grant-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.grantId}
                </p>
              ) : null}
            </Field>

            <Field label="Expenditure category" htmlFor="proof-category">
              <select
                id="proof-category"
                className={selectClass}
                value={form.expenseCategory}
                aria-invalid={Boolean(errors.expenseCategory)}
                aria-describedby={errors.expenseCategory ? "proof-category-error" : undefined}
                onChange={(event) => update({ expenseCategory: event.target.value })}
              >
                <option value="">Select a category</option>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.expenseCategory ? (
                <p id="proof-category-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.expenseCategory}
                </p>
              ) : null}
            </Field>

            <Field label="Expenditure date" htmlFor="proof-date">
              <input
                id="proof-date"
                type="date"
                className={inputClass}
                value={form.expenditureDate}
                max={DEMO_TODAY}
                aria-invalid={Boolean(errors.expenditureDate)}
                aria-describedby={errors.expenditureDate ? "proof-date-error" : undefined}
                onChange={(event) => update({ expenditureDate: event.target.value })}
              />
              {errors.expenditureDate ? (
                <p id="proof-date-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.expenditureDate}
                </p>
              ) : null}
            </Field>
          </div>

          <Field
            label="Expenditure description"
            htmlFor="proof-description"
            hint="What was purchased or paid for?"
            className="sm:col-span-2"
          >
            <textarea
              id="proof-description"
              rows={3}
              className={inputClass}
              value={form.expenditureDescription}
              onChange={(event) => update({ expenditureDescription: event.target.value })}
              aria-invalid={Boolean(errors.expenditureDescription)}
              aria-describedby={errors.expenditureDescription ? "proof-description-error" : undefined}
            />
            {errors.expenditureDescription ? (
              <p id="proof-description-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                {errors.expenditureDescription}
              </p>
            ) : null}
          </Field>

          <Field
            label="Claimed amount (INR)"
            htmlFor="proof-amount"
            hint={`Must be positive and within the remaining grant balance. Remaining: ${
              grant ? formatCurrency(grant.remaining) : "select a grant"
            }`}
            className="sm:col-span-2"
          >
            <input
              id="proof-amount"
              type="number"
              inputMode="decimal"
              min="0"
              step="1000"
              className={inputClass}
              value={form.claimedAmount}
              placeholder="e.g. 45000"
              aria-invalid={Boolean(errors.claimedAmount)}
              aria-describedby={errors.claimedAmount ? "proof-amount-error" : undefined}
              onChange={(event) => update({ claimedAmount: event.target.value })}
            />
            {errors.claimedAmount ? (
              <p id="proof-amount-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                {errors.claimedAmount}
              </p>
            ) : null}
          </Field>
        </Card>

        <Card className="mt-4">
          <SectionHeader title="Supporting documents" />
          <div className="px-4 py-4 sm:px-5">
            <label
              htmlFor="proof-files"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-400"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Choose files
              <input
                id="proof-files"
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                className="sr-only"
                disabled={files.length >= MAX_ATTACHMENTS}
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <span className="ml-2 text-[11px] text-slate-400">
                ({files.length}/{MAX_ATTACHMENTS}) · {MAX_FILE_SIZE_MB} MB max · JPG, PNG, WEBP, PDF
              </span>
            </label>
            {files.length === 0 ? (
              <p className="mt-2 text-[11px] text-slate-500">
                No supporting documents attached.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      <ImageIcon className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                      <span className="truncate">{file.name}</span>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {formatFileSize(file.size)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                      aria-label={`Remove ${file.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {Object.values(fileErrors).some((err) => err) ? (
              <ul className="mt-2 space-y-1">
                {Object.entries(fileErrors).map(([name, err]) => (
                  name === "__general" ? null : (
                    <li key={name} role="alert" className="text-[11px] font-bold text-red-700">
                      {name}: {err}
                    </li>
                  )
                ))}
                {fileErrors.__general ? (
                  <li role="alert" className="text-[11px] font-bold text-red-700">
                    {fileErrors.__general}
                  </li>
                ) : null}
              </ul>
            ) : null}
            <p className="mt-2 text-[11px] text-slate-500">
              File names and sizes are recorded only; documents are not uploaded in
              this phase.
            </p>
          </div>
        </Card>

        <Card className="mt-4">
          <SectionHeader title="Remarks" hint="Optional notes for the reviewer." />
          <textarea
            id="proof-remarks"
            rows={3}
            className={inputClass}
            value={form.remarks}
            placeholder="Additional context for the verification reviewer..."
            onChange={(event) => update({ remarks: event.target.value })}
          />
        </Card>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <Button type="button" variant="ghost" onClick={resetForm}>
            <RotateCcw className="h-4 w-4" /> Reset form
          </Button>
          {draft && !result ? (
            <Button type="button" variant="secondary" onClick={submitDraft}>
              Restore draft
            </Button>
          ) : null}
          <Button type="button" onClick={confirmSubmit}>Submit for review</Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Submit this utilisation proof?"
        description={
          grant
            ? `${grant.id} · ${formatCurrency(Number(form.claimedAmount))} claimed · ${files.length} document(s).`
            : ""
        }
        confirmLabel="Submit proof"
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      />
    </PageShell>
  );
}

