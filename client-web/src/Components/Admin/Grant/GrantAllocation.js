import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FilePlus2, Paperclip, RotateCcw, Trash2 } from "lucide-react";
import { adminService } from "../../../services/admin/adminService";
import {
  DEMO_FACILITIES,
  DEMO_GRANT_PURPOSES,
  DEMO_TODAY,
} from "../../../data/admin/adminDemoData";
import { formatCurrency, formatDate } from "../../../utils/admin/adminUtils";
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
} from "../Common/AdminUI";

const EMPTY_FORM = {
  facilityId: "",
  purpose: "",
  amount: "",
  date: DEMO_TODAY,
};

const MAX_ATTACHMENTS = 5;

export default function GrantAllocation() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const facility = useMemo(
    () => DEMO_FACILITIES.find((row) => row.id === form.facilityId) || null,
    [form.facilityId]
  );

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  }

  function validate() {
    const next = {};
    if (!form.facilityId) next.facilityId = "Select the receiving facility.";
    if (!form.purpose) next.purpose = "Select a grant purpose.";
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      next.amount = "Enter an amount greater than zero.";
    }
    if (!form.date) next.date = "Choose an allocation date.";
    else if (form.date > DEMO_TODAY) next.date = "Allocation date cannot be in the future.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    setConfirm(true);
  }

  function addFiles(fileList) {
    const files = Array.from(fileList || []).map((file) => file.name);
    setAttachments((current) =>
      [...current, ...files.filter((name) => !current.includes(name))].slice(0, MAX_ATTACHMENTS)
    );
  }

  async function confirmAllocation() {
    setBusy(true);
    try {
      const response = await adminService.createGrantDraft({
        facilityId: form.facilityId,
        purpose: form.purpose,
        amount: Number(form.amount),
        date: form.date,
        attachments,
      });
      setResult(response.grant);
      setConfirm(false);
      setForm(EMPTY_FORM);
      setAttachments([]);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setForm(EMPTY_FORM);
    setAttachments([]);
    setErrors({});
    setResult(null);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Admin · Grants"
        title="Allocate grant"
        description="Prepare a provisional grant allocation. Validation and review are frontend-only in this phase."
        actions={
          <Button as={Link} to="/admin/insights/grants" variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Back to grants
          </Button>
        }
      />

      <DemoBanner>
        Allocation is a demo preview. Reviewing creates the grant in the shared
        demo store so the receiving Facility Manager sees it in their grants list.
        Eligibility rules, funding percentages and approval hierarchy are not
        defined; nothing is saved to the backend.
      </DemoBanner>

      {result ? (
        <Notice tone="success" title="Allocation created">
          <p>
            Reference <strong className="font-mono">{result.id}</strong> was created
            for {result.facilityName} ({formatCurrency(result.allocated)}). The
            Facility Manager can see it in their grants list.
          </p>
          <p className="mt-1">
            <Link
              to="/admin/insights/grants"
              className="font-bold text-amber-800 underline decoration-amber-300/50 underline-offset-2 hover:text-amber-100"
            >
              Return to the grant list
            </Link>
          </p>
        </Notice>
      ) : null}

      <form onSubmit={submit} noValidate>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <SectionHeader
              title="Allocation details"
              description="Every field is required. Amounts are recorded in INR."
            />
            <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
              <Field
                label="Receiving facility"
                htmlFor="grant-facility"
                hint="Select the facility that will receive this grant."
                className="sm:col-span-2"
              >
                <select
                  id="grant-facility"
                  className={selectClass}
                  value={form.facilityId}
                  aria-invalid={Boolean(errors.facilityId)}
                  aria-describedby={errors.facilityId ? "grant-facility-error" : undefined}
                  onChange={(event) => update({ facilityId: event.target.value })}
                >
                  <option value="">Select a facility</option>
                  {DEMO_FACILITIES.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name} — {row.district}
                    </option>
                  ))}
                </select>
                {errors.facilityId ? (
                  <p id="grant-facility-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.facilityId}
                  </p>
                ) : null}
              </Field>

              <Field label="Grant purpose" htmlFor="grant-purpose">
                <select
                  id="grant-purpose"
                  className={selectClass}
                  value={form.purpose}
                  aria-invalid={Boolean(errors.purpose)}
                  aria-describedby={errors.purpose ? "grant-purpose-error" : undefined}
                  onChange={(event) => update({ purpose: event.target.value })}
                >
                  <option value="">Select a purpose</option>
                  {DEMO_GRANT_PURPOSES.map((purpose) => (
                    <option key={purpose} value={purpose}>
                      {purpose}
                    </option>
                  ))}
                </select>
                {errors.purpose ? (
                  <p id="grant-purpose-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.purpose}
                  </p>
                ) : null}
              </Field>

              <Field label="Allocation date" htmlFor="grant-date">
                <input
                  id="grant-date"
                  type="date"
                  className={inputClass}
                  value={form.date}
                  max={DEMO_TODAY}
                  aria-invalid={Boolean(errors.date)}
                  aria-describedby={errors.date ? "grant-date-error" : undefined}
                  onChange={(event) => update({ date: event.target.value })}
                />
                {errors.date ? (
                  <p id="grant-date-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.date}
                  </p>
                ) : null}
              </Field>

              <Field label="Proposed amount (INR)" htmlFor="grant-amount">
                <input
                  id="grant-amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  step="1000"
                  className={inputClass}
                  value={form.amount}
                  placeholder="e.g. 750000"
                  aria-invalid={Boolean(errors.amount)}
                  aria-describedby={errors.amount ? "grant-amount-error" : undefined}
                  onChange={(event) => update({ amount: event.target.value })}
                />
                {errors.amount ? (
                  <p id="grant-amount-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.amount}
                  </p>
                ) : null}
              </Field>

              <Field
                label="Supporting documentation"
                htmlFor="grant-files"
                hint={`${attachments.length}/${MAX_ATTACHMENTS} files selected.`}
                className="sm:col-span-2"
              >
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
                  <label
                    htmlFor="grant-files"
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-400"
                  >
                    <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                    Choose files
                    <input
                      id="grant-files"
                      type="file"
                      multiple
                      className="sr-only"
                      disabled={attachments.length >= MAX_ATTACHMENTS}
                      onChange={(event) => {
                        addFiles(event.target.files);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {attachments.length === 0 ? (
                    <p className="mt-2 text-[11px] text-slate-500">
                      No supporting documents selected.
                    </p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {attachments.map((name) => (
                        <li
                          key={name}
                          className="flex items-center justify-between gap-2 text-[11px] text-slate-600"
                        >
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <Paperclip className="h-3 w-3 shrink-0 text-slate-500" aria-hidden="true" />
                            <span className="truncate">{name}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAttachments((current) =>
                                current.filter((item) => item !== name)
                              )
                            }
                            className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                            aria-label={`Remove ${name}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Field>
            </div>

            <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
              <Button type="button" variant="ghost" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Reset form
              </Button>
              <Button type="submit">Review allocation</Button>
            </div>
          </Card>

          <Card className="h-fit">
            <SectionHeader title="Review summary" description="Check the allocation before you confirm." />
            <dl className="space-y-2 px-4 py-4 text-xs sm:px-5">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Facility
                </dt>
                <dd className="text-slate-700">
                  {facility ? facility.name : "Not selected"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  District
                </dt>
                <dd className="text-slate-700">{facility ? facility.district : "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Purpose
                </dt>
                <dd className="text-slate-700">{form.purpose || "Not selected"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Proposed amount
                </dt>
                <dd className="text-base font-extrabold text-brand-dark">
                  {Number(form.amount) > 0 ? formatCurrency(Number(form.amount)) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Allocation date
                </dt>
                <dd className="text-slate-700">{form.date ? formatDate(form.date) : "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Documents
                </dt>
                <dd className="text-slate-700">
                  {attachments.length} selected (names only)
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Create this allocation?"
        description={
          facility
            ? `${facility.name} (${facility.district}) · ${form.purpose} · ${formatCurrency(
                Number(form.amount)
              )}. The Facility Manager will see this grant.`
            : ""
        }
        confirmLabel="Create allocation"
        busy={busy}
        onConfirm={confirmAllocation}
        onCancel={() => setConfirm(false)}
      />
    </PageShell>
  );
}
