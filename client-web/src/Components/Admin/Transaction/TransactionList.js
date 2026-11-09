import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  RotateCcw,
  Search,
  Undo2,
  Wallet,
} from "lucide-react";
import * as XLSX from "xlsx";
import { adminService } from "../../../services/admin/adminService";
import {
  DEMO_DISTRICTS,
  DEMO_FACILITIES,
  DEMO_TODAY,
  TRANSACTION_METHODS,
  TRANSACTION_STATUSES,
} from "../../../data/admin/adminDemoData";
import { useAdminQuery, useTableState } from "../../../hooks/admin/useAdminQuery";
import {
  filterTransactions,
  formatCurrency,
  formatDate,
  formatNumber,
  summariseTransactions,
} from "../../../utils/admin/adminUtils";
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
} from "../Common/AdminUI";
import TransactionDetail from "./TransactionDetail";

const EMPTY_FILTERS = {
  search: "",
  status: "",
  method: "",
  district: "",
  facilityId: "",
  from: "",
  to: "",
};

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    status: params.get("status") || "",
    method: params.get("method") || "",
    district: params.get("district") || "",
    facilityId: params.get("facility") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

export default function TransactionList() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState(null);

  const query = useMemo(
    () => ({
      status: filters.status,
      method: filters.method,
      district: filters.district,
      facilityId: filters.facilityId,
      from: filters.from,
      to: filters.to,
    }),
    [filters]
  );
  const queryKey = JSON.stringify(query);

  const { data, loading, error, reload } = useAdminQuery(
    () => adminService.listTransactions(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  const facilityOptions = useMemo(
    () =>
      DEMO_FACILITIES.filter(
        (facility) => !filters.district || facility.district === filters.district
      ),
    [filters.district]
  );

  const visibleRows = useMemo(
    () => filterTransactions(rows, { search: filters.search }),
    [rows, filters.search]
  );

  const summary = useMemo(() => summariseTransactions(visibleRows), [visibleRows]);
  const table = useTableState(visibleRows, { pageSize: 10, sortKey: "date", sortDir: "desc" });
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
    XLSX.writeFile(book, `admin-transactions-${DEMO_TODAY}.xlsx`);
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
        eyebrow="Admin · Transactions"
        title="Transactions"
        description="Transaction ledger across facilities, with status, method, facility and date filters."
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
        Transactions are fictional. Export creates a local XLSX file containing only
        demo rows. The backend currently persists no amount or status, so no refund or
        reconciliation action is offered.
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
          caption="After search and filters"
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
          )} refunded records`}
          icon={AlertTriangle}
          tone="blue"
        />
      </div>

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

          <Field label="District" htmlFor="txn-district">
            <select
              id="txn-district"
              className={selectClass}
              value={filters.district}
              onChange={(event) =>
                update({ district: event.target.value, facilityId: "" })
              }
            >
              <option value="">All districts</option>
              {DEMO_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Facility" htmlFor="txn-facility">
            <select
              id="txn-facility"
              className={selectClass}
              value={filters.facilityId}
              onChange={(event) => update({ facilityId: event.target.value })}
            >
              <option value="">All facilities</option>
              {facilityOptions.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
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
                  description="Clear the search box or widen the date, status and facility filters."
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
        <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
        Refunds are disabled: no refund contract exists in the current backend.
      </p>

      <TransactionDetail transaction={selectedRow} onClose={() => setSelected(null)} />
    </PageShell>
  );
}
