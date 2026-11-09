import React from "react";
import { Paperclip, ShieldAlert } from "lucide-react";
import { formatDate, formatDateTime } from "../../../utils/admin/adminUtils";
import { Button, Drawer, StatusPill } from "../Common/AdminUI";

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-xs text-slate-700">{children}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-t border-slate-200 pt-4 first:border-t-0 first:pt-0">
      <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function GrievanceDetail({ grievance, onClose, onRequestStatus, busy }) {
  if (!grievance) return null;
  const row = grievance;

  return (
    <Drawer
      open={Boolean(row)}
      onClose={onClose}
      title={row.subject}
      subtitle={`${row.id} · ${row.category}`}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled title="Escalation policy pending">
              Escalate
            </Button>
            <Button variant="secondary" size="sm" disabled title="Reassignment policy pending">
              Reassign
            </Button>
            {row.status === "Pending" ? (
              <Button
                size="sm"
                disabled={busy}
                onClick={() => onRequestStatus("Resolved")}
              >
                Mark resolved
              </Button>
            ) : (
              <Button
                size="sm"
                variant="amber"
                disabled={busy}
                onClick={() => onRequestStatus("Pending")}
              >
                Reopen
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={row.status} />
          <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
            {row.levelLabel}
          </span>
          {row.satisfied === 1 ? (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              Citizen marked satisfied
            </span>
          ) : null}
        </div>

        <Section title="Complaint">
          <p className="text-xs leading-relaxed text-slate-600">{row.description}</p>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> Attachments
            </p>
            {row.attachments.length === 0 ? (
              <p className="mt-1.5 text-xs text-slate-500">No attachment on this complaint.</p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {row.attachments.map((file) => (
                  <li
                    key={file.name}
                    className="flex items-center justify-between gap-2 text-xs text-slate-600"
                  >
                    <span className="truncate">{file.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>

        <Section title="Citizen & facility">
          <dl className="divide-y divide-slate-100/70">
            <Row label="Submitted by">
              {row.citizen.name}
              <span className="ml-1.5 text-[11px] text-slate-500">
                ({row.citizen.role} · {row.citizen.email})
              </span>
            </Row>
            <Row label="Facility">{row.facilityName}</Row>
            <Row label="District">{row.district}</Row>
            <Row label="Submitted on">{formatDate(row.submittedAt)}</Row>
            <Row label="Last update">{formatDate(row.updatedAt)}</Row>
          </dl>
        </Section>

        <Section title="Timeline & history">
          <ol className="relative space-y-3 border-l border-slate-200 pl-4">
            <li>
              <p className="text-xs font-bold text-brand-dark">Complaint submitted</p>
              <p className="text-[11px] text-slate-500">{formatDate(row.submittedAt)} · {row.citizen.name}</p>
            </li>
            {row.remarks.map((remark, index) => (
              <li key={`${remark.date}-${index}`}>
                <p className="text-xs font-bold text-brand-dark">{remark.author}</p>
                <p className="text-[11px] text-slate-400">{remark.remark}</p>
                <p className="text-[11px] text-slate-500">
                  {formatDateTime(remark.date)} · Level {remark.level}
                </p>
              </li>
            ))}
            {row.status === "Resolved" && row.resolvedAt ? (
              <li>
                <p className="text-xs font-bold text-emerald-700">Marked resolved</p>
                <p className="text-[11px] text-slate-500">{formatDate(row.resolvedAt)}</p>
              </li>
            ) : null}
          </ol>
        </Section>

        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-amber-100">
          <p className="flex items-center gap-1.5 font-bold text-amber-800">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> Pending product decision (Phase 2B.1)
          </p>
          <p className="mt-1">
            Escalation ownership, Admin reopen permission and district boundaries are
            not finalised. Escalate and reassign are disabled until those rules exist.
          </p>
        </div>

        <p className="text-[11px] text-slate-500">
          Grievance data mirrors the existing complaint model. Status changes made here
          do not alter the live complaint console.
        </p>
      </div>
    </Drawer>
  );
}
