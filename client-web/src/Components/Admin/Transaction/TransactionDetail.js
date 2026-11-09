import React from "react";
import { Link2 } from "lucide-react";
import { formatCurrency, formatDate } from "../../../utils/admin/adminUtils";
import { Button, Drawer, StatusPill } from "../Common/AdminUI";

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
      <dt className="w-44 shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-words text-xs text-slate-700">{children}</dd>
    </div>
  );
}

export default function TransactionDetail({ transaction, onClose }) {
  if (!transaction) return null;
  const row = transaction;

  return (
    <Drawer
      open={Boolean(row)}
      onClose={onClose}
      title={row.id}
      subtitle={`${row.facilityName} · ${row.district}`}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            size="sm"
            variant="secondary"
            disabled
            title="No refund contract exists in the backend"
          >
            Initiate refund
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount</p>
            <p className="text-2xl font-extrabold text-brand-dark">{formatCurrency(row.amount)}</p>
          </div>
          <StatusPill status={row.status} />
          <div className="ml-auto text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</p>
            <p className="text-xs text-slate-700">{formatDate(row.date)}</p>
          </div>
        </div>

        <section>
          <h3 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
            Transaction
          </h3>
          <dl className="divide-y divide-slate-100/70">
            <Row label="Transaction ID">
              <span className="font-mono">{row.id}</span>
            </Row>
            <Row label="Payment reference">
              <span className="font-mono">{row.reference}</span>
            </Row>
            <Row label="Payment method">{row.method}</Row>
            <Row label="Status">{row.status}</Row>
            <Row label="Service">{row.service}</Row>
            <Row label="Booking reference">
              <span className="inline-flex items-center gap-1 font-mono">
                <Link2 className="h-3 w-3 text-slate-500" aria-hidden="true" />
                {row.bookingReference}
              </span>
            </Row>
          </dl>
        </section>

        <section className="border-t border-slate-200 pt-4">
          <h3 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
            Customer
          </h3>
          <dl className="divide-y divide-slate-100/70">
            <Row label="Name">{row.customerName}</Row>
            <Row label="Role">{row.customerRole}</Row>
            <Row label="Email">{row.customerEmail}</Row>
          </dl>
        </section>

        <section className="border-t border-slate-200 pt-4">
          <h3 className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-emerald-700">
            Facility
          </h3>
          <dl className="divide-y divide-slate-100/70">
            <Row label="Facility">{row.facilityName}</Row>
            <Row label="District">{row.district}</Row>
            <Row label="Sport">{row.sport}</Row>
          </dl>
        </section>

      </div>
    </Drawer>
  );
}
