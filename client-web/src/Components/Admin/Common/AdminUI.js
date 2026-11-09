import React, { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Info,
  Loader2,
  X,
} from "lucide-react";

export const inputClass =
  "w-full min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-60";

export const selectClass = `${inputClass} appearance-none pr-8`;

export function PageShell({ children }) {
  return (
    <div className="min-h-full bg-transparent font-sans text-slate-800">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-semibold text-brand-primary">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-brand-dark sm:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({ children, className = "", as: Tag = "section" }) {
  return (
    <Tag
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </Tag>
  );
}

export function SectionHeader({ title, description, action, className = "" }) {
  return (
    <div
      className={`flex flex-col gap-2 border-b border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${className}`}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-bold text-brand-dark">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const KPI_TONES = {
  green: "border-emerald-200 bg-brand-soft text-brand-primary",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  blue: "border-sky-200 bg-sky-50 text-sky-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
};

export function KpiCard({
  label,
  value,
  caption,
  icon: Icon,
  tone = "green",
  to,
  onClick,
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">
          {label}
        </p>
        {Icon ? (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
              KPI_TONES[tone] || KPI_TONES.green
            }`}
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-brand-dark">{value}</p>
      {caption ? <p className="mt-1 text-xs text-slate-500">{caption}</p> : null}
    </>
  );

  const className =
    "group block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-primary/40 hover:bg-brand-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary";

  if (to) {
    return (
      <Link to={to} className={className} aria-label={`${label}: ${value}. Open module.`}>
        {content}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}

const STATUS_TONES = {
  Pending: "border-amber-200 bg-amber-50 text-amber-800",
  Resolved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Failed: "border-red-200 bg-red-50 text-red-700",
  Refunded: "border-violet-200 bg-violet-50 text-violet-700",
  Allocated: "border-sky-200 bg-sky-50 text-sky-800",
  "Partially Released": "border-amber-200 bg-amber-50 text-amber-800",
  "Utilisation Pending": "border-amber-200 bg-amber-50 text-amber-800",
  "Under Verification": "border-violet-200 bg-violet-50 text-violet-700",
  Closed: "border-slate-200 bg-slate-100 text-slate-600",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Checked In": "border-amber-200 bg-amber-50 text-amber-800",
  Verified: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Rejected: "border-red-200 bg-red-50 text-red-700",
  Submitted: "border-amber-200 bg-amber-50 text-amber-800",
  Analysed: "border-sky-200 bg-sky-50 text-sky-800",
  Released: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

export function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
        STATUS_TONES[status] || STATUS_TONES.Closed
      }`}
    >
      {status}
    </span>
  );
}

export function DemoBanner() {
  return null;
}

export function Notice({ tone = "info", title, children, onDismiss }) {
  const tones = {
    info: "border-sky-200 bg-sky-50 text-sky-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    error: "border-red-200 bg-red-50 text-red-800",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${tones[tone]}`}
    >
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-bold">{title}</p> : null}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-1 hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          aria-label="Dismiss message"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

const BUTTON_VARIANTS = {
  primary:
    "bg-brand-primary text-white hover:bg-[#006634] border border-brand-primary focus-visible:outline-brand-primary",
  secondary:
    "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 focus-visible:outline-brand-primary",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-brand-dark border border-transparent focus-visible:outline-brand-primary",
  danger:
    "bg-red-600 text-white hover:bg-red-500 border border-red-600 focus-visible:outline-red-300",
  amber:
    "bg-amber-500 text-slate-950 hover:bg-amber-400 border border-amber-500 focus-visible:outline-amber-300",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  as: Tag = "button",
  disabled,
  children,
  ...rest
}) {
  const sizes = {
    sm: "px-2.5 py-1.5 text-xs",
    md: "min-h-11 px-3.5 py-2.5 text-sm",
  };
  return (
    <Tag
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary
      } ${sizes[size]} ${className}`}
      disabled={Tag === "button" ? disabled : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function Field({ label, htmlFor, hint, children, className = "" }) {
  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={htmlFor}
          className="mb-1.5 block text-sm font-semibold text-slate-700"
        >
          {label}
        </label>
      ) : null}
      {children}
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({ title = "No records found", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-bold text-brand-dark">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="space-y-2 p-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading records</span>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <div
              key={columnIndex}
              className="h-7 flex-1 animate-pulse rounded-md bg-slate-200"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center" role="alert">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
        <AlertCircle className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-bold text-brand-dark">Could not load this view</p>
      <p className="mt-1 max-w-sm text-xs text-slate-500">
        {message || "Something went wrong while reading the records."}
      </p>
      {onRetry ? (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function Tabs({ tabs, active, onChange, label = "Sections" }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex flex-wrap gap-1 border-b border-slate-200"
    >
      {tabs.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`-mb-px border-b-2 px-3 py-2.5 text-xs font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
              selected
                ? "border-brand-primary text-brand-dark"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({
  page,
  pageCount,
  pageSize,
  total,
  setPage,
  setPageSize,
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span>
          Showing <strong className="text-slate-800">{start}</strong>–
          <strong className="text-slate-800">{end}</strong> of{" "}
          <strong className="text-slate-800">{total}</strong>
        </span>
        <label className="ml-2 flex items-center gap-1.5">
          <span className="sr-only sm:not-sr-only">Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-brand-primary focus:outline-none"
          >
            {[10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Prev
        </button>
        <span className="px-2">
          Page <strong className="text-slate-800">{page}</strong> of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={page >= pageCount}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          aria-label="Next page"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function DataTable({
  columns,
  rows,
  rowKey = "id",
  sort,
  onSort,
  onRowClick,
  empty = <EmptyState />,
  caption,
}) {
  if (!rows.length) return empty;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((column) => {
              const sortable = Boolean(column.sortKey && onSort);
              const active = sortable && sort && sort.key === column.sortKey;
              return (
                <th
                  key={column.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={`whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-500 ${
                    column.align === "right" ? "text-right" : ""
                  }`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(column.sortKey)}
                      className="inline-flex items-center gap-1 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                    >
                      {column.header}
                      <span aria-hidden="true" className="text-[9px]">
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => {
            const interactive = Boolean(onRowClick);
            return (
              <tr
                key={row[rowKey]}
                onClick={interactive ? () => onRowClick(row) : undefined}
                onKeyDown={
                  interactive
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={interactive ? 0 : undefined}
                className={
                  interactive
                    ? "cursor-pointer transition hover:bg-brand-mint focus-visible:bg-brand-mint focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary"
                    : "transition hover:bg-slate-50"
                }
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 align-middle text-slate-700 ${
                      column.align === "right" ? "text-right" : ""
                    } ${column.className || ""}`}
                  >
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ProgressBar({ value, max = 100, label, tone = "green" }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const tones = {
    green: "bg-emerald-500",
    amber: "bg-amber-500",
    blue: "bg-sky-500",
    violet: "bg-violet-500",
  };
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>{label}</span>
          <span className="font-bold text-slate-800">{percent}%</span>
        </div>
      ) : null}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || "Progress"}
      >
        <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-2xl" }) {
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1500] flex justify-end">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex h-full w-full ${width} flex-col border-l border-slate-200 bg-white shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-extrabold tracking-tight text-brand-dark">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-brand-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-3">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "primary",
  busy = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-base font-extrabold text-brand-dark">
          {title}
        </h2>
        <p id="confirm-description" className="mt-2 text-xs leading-relaxed text-slate-600">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
