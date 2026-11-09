import React, { useState } from "react";
import { FileText } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/admin/adminUtils";
import { Button, Drawer, StatusPill } from "../Common/AdminUI";

function Metric({ label, value, muted = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`mt-0.5 text-sm font-extrabold ${muted ? "text-slate-600" : "text-brand-dark"}`}>
        {value}
      </p>
    </div>
  );
}

export default function VerificationReview({ proof, busy, onClose, onDecision }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  if (!proof) return null;

  function decide(decision) {
    if (decision === "Rejected" && !note.trim()) {
      setError("Add a reason before rejecting a utilisation proof.");
      return;
    }
    setError("");
    onDecision(decision, note.trim());
  }

  return (
    <Drawer
      open={Boolean(proof)}
      onClose={onClose}
      title="Review utilisation proof"
      subtitle={`${proof.id} · ${proof.grantId}`}
      width="max-w-xl"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex shrink-0 gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => decide("Rejected")}
            >
              Reject
            </Button>
            <Button size="sm" disabled={busy} onClick={() => decide("Verified")}>
              Approve
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={proof.status} />
          <span className="text-[11px] text-slate-400">
            Submitted {formatDate(proof.submittedAt)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Allocated" value={formatCurrency(proof.allocated, { compact: true })} muted />
          <Metric label="Released" value={formatCurrency(proof.released, { compact: true })} muted />
          <Metric label="Verified so far" value={formatCurrency(proof.utilised, { compact: true })} muted />
          <Metric label="Claimed here" value={formatCurrency(proof.claimed, { compact: true })} />
        </div>

        <section>
          <h3 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
            Submission
          </h3>
          <dl className="divide-y divide-slate-100/70 text-xs">
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-slate-500">Facility</dt>
              <dd className="text-right text-slate-700">{proof.facilityName}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-slate-500">District</dt>
              <dd className="text-right text-slate-700">{proof.district}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-slate-500">Purpose</dt>
              <dd className="text-right text-slate-700">{proof.purpose}</dd>
            </div>
            <div className="flex justify-between gap-3 py-2">
              <dt className="text-slate-500">Claimed expenditure</dt>
              <dd className="text-right font-bold text-slate-800">{formatCurrency(proof.claimed)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <FileText className="h-3.5 w-3.5" aria-hidden="true" /> Proof attachment
          </p>
          <p className="mt-1 break-all text-xs text-slate-700">{proof.proofFile}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Demo filename only. Document storage and preview are not part of this phase.
          </p>
        </section>

        <div>
          <label
            htmlFor="proof-note"
            className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-400"
          >
            Review note {proof.status === "Rejected" ? "(required to reject)" : "(optional)"}
          </label>
          <textarea
            id="proof-note"
            rows={3}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              if (error) setError("");
            }}
            placeholder="Record what was checked, or why the proof cannot be accepted."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
          />
          {error ? (
            <p role="alert" className="mt-1 text-[11px] font-bold text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}
