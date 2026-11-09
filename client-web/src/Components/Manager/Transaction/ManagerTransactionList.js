import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Download,
  RotateCcw,
  Search,
  Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { managerService } from "../../../services/manager/managerService";
import { DEMO_TODAY, TRANSACTION_METHODS, TRANSACTION_STATUSES } from "../../../data/admin/adminDemoData";
import {
  filterTransactions,
  formatCurrency,
  formatDate,
  formatNumber,
  summariseManagerTransactions,
} from "../../../utils/manager/managerUtils";
import { useAdminQuery, useTableState } from "../../../hooks/manager/useManagerQuery";
import { BarChart, ChartCard } from "../Common/ManagerUI";
import {
  Button,
  Card,
  DataTable,
  DemoBanner,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  Notice,
  PageHeader,
  PageShell,
  Pagination,
  StatusPill,
  TableSkeleton,
  inputClass,
  selectClass,
  Drawer,
} from "../Common/ManagerUI";

const EMPTY_FILTERS = {
  search: "",
  status: "",
  method: "",
  from: "",
  to: "",
};

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    status: params.get("status") || "",
    method: params.get("method") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export default function ManagerTransactionList() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState(null);

  const query = useMemo(
    () => ({
      status: filters.status,
      method: filters.method,
      from: filters.from,
      to: filters.to,
    }),
    [filters]
  );
  const queryKey = JSON.stringify(query);

  const { data, loading, error, reload } = useAdminQuery(
    () => managerService.listTransactions(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const visibleRows = useMemo(
    () => filterTransactions(rows, { search: filters.search }),
    [rows, filters.search]
  );

  const summary = useMemo(() => summariseManagerTransactions(visibleRows), [visibleRows]);
  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "date",
    sortDir: "desc",
  });
  const selectedRow = selected
    ? visibleRows.find((row) => row.id === selected) || null
    : null;

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
    setParams({}, { replace: true });
    setNotice(null);
  }

  function exportRows() {
    const sheet = XLSX.utils.json_to_sheet(
      visibleRows.map((row) => ({
        "Transaction ID": row.id,
        "Payment reference": row.reference,
        Customer: row.customerName,
        Role: row.customerRole,
        Facility: row.facilityName,
        District: row.district,
        Sport: row.sport,
        Service: row.service,
        "Booking reference": row.bookingReference,
        "Amount (INR)": row.amount,
        Method: row.method,
        Status: row.status,
        Date: row.date,
      }))
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Transactions");
    XLSX.writeFile(book, `manager-transactions-${DEMO_TODAY}.xlsx`);
    setNotice(`Exported ${visibleRows.length} rows to XLSX.`);
  }

  const columns = [
    {
      key: "id",
      header: "Transaction",
      sortKey: "id",
      render: (row) => (
        <div className="min-w-[160px]">
          <p className="font-mono text-[11px] font-bold text-slate-700">{row.id}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-500">{row.reference}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => (
        <div>
          <p className="text-slate-700">{row.customerName}</p>
          <p className="text-[11px] text-slate-500">{row.customerRole}</p>
        </div>
      ),
    },
    {
      key: "facility",
      header: "Facility & district",
      sortKey: "district",
      render: (row) => (
        <div className="min-w-[170px]">
          <p className="text-slate-700">{row.facilityName}</p>
          <p className="text-[11px] text-slate-500">{row.district}</p>
        </div>
      ),
    },
    {
      key: "service",
      header: "Service",
      render: (row) => <span className="text-[11px] text-slate-600">{row.service}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortKey: "amount",
      render: (row) => (
        <span className="whitespace-nowrap font-bold text-brand-dark">{formatCurrency(row.amount)}</span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (row) => <span className="whitespace-nowrap text-[11px]">{row.method}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "date",
      header: "Date",
      sortKey: "date",
      render: (row) => (
        <span className="whitespace-nowrap text-[11px] text-slate-600">{formatDate(row.date)}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: () => (
        <ChevronRight className="ml-auto h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Transactions"
        title="Transactions"
        description="Facility-scoped transaction ledger for this sports complex only."
        actions={
          <>
            <Button variant="secondary" onClick={exportRows} disabled={visibleRows.length === 0}>
              <Download className="h-4 w-4" /> Export XLSX
            </Button>
            <Button variant="ghost" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Reset filters
            </Button>
          </>
        }
      />

      <DemoBanner>
        Transactions are fictional and scoped to this facility. Export creates a local
        XLSX file containing only demo rows. Refund and manual status changes are
        disabled — no payment contract exists in this phase.
      </DemoBanner>

      {notice ? (
        <Notice tone="info" title="Export" onDismiss={() => setNotice(null)}>
          {notice}
        </Notice>
      ) : null}

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Transactions"
          value={formatNumber(summary.count)}
          caption="Facility-scoped"
          icon={Wallet}
          tone="slate"
        />
        <KpiCard
          label="Collected"
          value={formatCurrency(summary.volume, { compact: true })}
          caption="Successful transactions only"
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          label="Successful"
          value={formatNumber(summary.byStatus.Success)}
          caption="Status = Success"
          icon={CheckCircle2}
          tone="green"
        />
        <KpiCard
          label="Pending"
          value={formatNumber(summary.byStatus.Pending)}
          caption="Status = Pending"
          icon={Clock3}
          tone="amber"
        />
        <KpiCard
          label="Failed / refunded"
          value={formatNumber(summary.byStatus.Failed + summary.byStatus.Refunded)}
          caption={`${formatNumber(summary.byStatus.Failed)} failed · ${formatNumber(
            summary.byStatus.Refunded
          )} refunded`}
          icon={AlertTriangle}
          tone="blue"
        />
      </div>

      <ChartCard
        className="mb-4"
        title="Transaction status summary"
        description="Facility-level transaction counts by status."
      >
        <BarChart
          categories={["Success", "Pending", "Failed", "Refunded"]}
          series={[
            {
              name: "Transactions",
              data: [
                summary.byStatus.Success,
                summary.byStatus.Pending,
                summary.byStatus.Failed,
                summary.byStatus.Refunded,
              ],
            },
          ]}
          colors={["#10b981", "#f59e0b", "#ef4444", "#a78bfa"]}
          height={240}
          horizontal
          distributed
          formatValue={(value) => formatNumber(value)}
        />
      </ChartCard>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <Field label="Search" htmlFor="txn-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="txn-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Transaction ID, payment reference, customer or booking"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Status" htmlFor="txn-status">
            <select
              id="txn-status"
              className={selectClass}
              value={filters.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              <option value="">All statuses</option>
              {TRANSACTION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Payment method" htmlFor="txn-method">
            <select
              id="txn-method"
              className={selectClass}
              value={filters.method}
              onChange={(event) => update({ method: event.target.value })}
            >
              <option value="">All methods</option>
              {TRANSACTION_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </Field>

          <Field label="From" htmlFor="txn-from">
            <input
              id="txn-from"
              type="date"
              className={selectClass}
              value={filters.from}
              max={filters.to || DEMO_TODAY}
              onChange={(event) => update({ from: event.target.value })}
            />
          </Field>

          <Field label="To" htmlFor="txn-to">
            <input
              id="txn-to"
              type="date"
              className={selectClass}
              value={filters.to}
              min={filters.from}
              max={DEMO_TODAY}
              onChange={(event) => update({ to: event.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={8} columns={7} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            <DataTable
              caption="Transaction records"
              columns={columns}
              rows={table.pageRows}
              sort={table.sort}
              onSort={table.toggleSort}
              onRowClick={(row) => setSelected(row.id)}
              empty={
                <EmptyState
                  title="No transactions match these filters"
                  action={<Button onClick={reset}>Reset filters</Button>}
                />
              }
            />
            {table.total > 0 ? (
              <Pagination
                page={table.page}
                pageCount={table.pageCount}
                pageSize={table.pageSize}
                total={table.total}
                setPage={table.setPage}
                setPageSize={table.setPageSize}
              />
            ) : null}
          </>
        )}
      </Card>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
        Status changes and refunds are informational only in this phase; no payment
        contract exists to persist them.
      </p>

      {selectedRow && (
        <Drawer
          open={Boolean(selectedRow)}
          onClose={() => setSelected(null)}
          title={selectedRow.id}
          subtitle={`${selectedRow.facilityName} · ${selectedRow.district}`}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount</p>
                <p className="text-2xl font-extrabold text-brand-dark">{formatCurrency(selectedRow.amount)}</p>
              </div>
              <StatusPill status={selectedRow.status} />
              <div className="ml-auto text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</p>
                <p className="text-xs text-slate-700">{formatDate(selectedRow.date)}</p>
              </div>
            </div>
            <dl className="divide-y divide-slate-100/70 text-xs">
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">Transaction ID</dt>
                <dd className="text-right font-mono text-slate-700">{selectedRow.id}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">Payment reference</dt>
                <dd className="text-right font-mono text-slate-700">{selectedRow.reference}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">Customer</dt>
                <dd className="text-right text-slate-700">{selectedRow.customerName}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">Role</dt>
                <dd className="text-right text-slate-700">{selectedRow.customerRole}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">Method</dt>
                <dd className="text-right text-slate-700">{selectedRow.method}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">Service</dt>
                <dd className="text-right text-slate-700">{selectedRow.service}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">Booking reference</dt>
                <dd className="text-right font-mono text-slate-700">{selectedRow.bookingReference}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">Facility</dt>
                <dd className="text-right text-slate-700">{selectedRow.facilityName}</dd>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <dt className="text-slate-500">District</dt>
                <dd className="text-right text-slate-700">{selectedRow.district}</dd>
              </div>
            </dl>
            <p className="text-[11px] text-slate-500">
              Refunds and manual status changes are disabled — no payment contract
              exists in this phase.
            </p>
          </div>
        </Drawer>
      )}
    </PageShell>
  );
}

