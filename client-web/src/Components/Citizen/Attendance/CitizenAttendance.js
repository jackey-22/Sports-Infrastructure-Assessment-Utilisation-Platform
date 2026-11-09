import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  Clock3,
  QrCode,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { citizenService } from "../../../services/citizen/citizenService";
import {
  filterAttendance,
  formatDate,
  formatNumber,
  summariseCitizenAttendance,
} from "../../../utils/citizen/citizenUtils";
import { useAdminQuery, useTableState } from "../../../hooks/citizen/useCitizenQuery";
import {
  Button,
  Card,
  DataTable,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  KpiCard,
  Notice,
  PageHeader,
  PageShell,
  Pagination,
  SectionHeader,
  StatusPill,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../Common/CitizenUI";

const CITIZEN_TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_FILTERS = {
  search: "",
  status: "",
  from: "",
  to: "",
};

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    status: params.get("status") || "",
    from: params.get("from") || "",
    to: params.get("to") || "",
  };
}

function timeOnly(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function weekday(value) {
  if (!value) return "";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date);
}

function formatDuration(minutes) {
  if (minutes == null) return "";
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} min`;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

export default function CitizenAttendance() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);
  const [facilityId, setFacilityId] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [scanValue, setScanValue] = useState("");
  const [scanResult, setScanResult] = useState(null);
  const [recording, setRecording] = useState(false);

  const query = useMemo(
    () => ({
      status: filters.status,
      from: filters.from,
      to: filters.to,
    }),
    [filters]
  );
  const queryKey = JSON.stringify(query);

  const { data, loading, error, reload } = useAdminQuery(
    () => citizenService.listAttendance(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  useEffect(() => {
    let active = true;
    citizenService
      .getFacilityId()
      .then((id) => {
        if (active) setFacilityId(id || "");
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const visibleRows = useMemo(
    () =>
      filterAttendance(rows, {
        search: filters.search,
        status: filters.status,
      }),
    [rows, filters.search, filters.status]
  );

  const summary = useMemo(
    () => summariseCitizenAttendance(visibleRows),
    [visibleRows]
  );
  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "date",
    sortDir: "desc",
  });

  const latest = rows[0] || null;
  const facilityName = latest?.facilityName || "Your sports complex";

  function update(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function reset() {
    setFilters(EMPTY_FILTERS);
    setParams({}, { replace: true });
  }

  async function submitScan(value) {
    const code = String(value || "").trim();
    setScanResult(null);

    if (!code) {
      setScanResult({
        ok: false,
        message: "Enter the facility code shown at the entrance.",
      });
      return;
    }
    if (!facilityId) {
      setScanResult({
        ok: false,
        message: "Your facility is still loading. Try again in a moment.",
      });
      return;
    }
    if (code !== facilityId) {
      setScanResult({
        ok: false,
        message: "This QR code does not belong to your facility.",
      });
      return;
    }

    setRecording(true);
    try {
      const response = await citizenService.recordAttendance();
      setScanResult({
        ok: true,
        action: response.action,
        message:
          response.action === "exit"
            ? "Exit recorded. Your session is now closed."
            : "Entry recorded. Your session is now open.",
      });
      setScanOpen(false);
      setShowManual(false);
      setScanValue("");
      reload();
    } catch (err) {
      setScanResult({
        ok: false,
        message:
          err && err.message
            ? err.message
            : "Could not record attendance. Please try again.",
      });
    } finally {
      setRecording(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen Console · Attendance"
        title="QR check-in"
        description="Scan the QR code at the entrance to record your entry and exit at the facility."
        actions={
          <Button as={Link} to="/citizen/dashboard" variant="secondary">
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total sessions"
          value={formatNumber(summary.total)}
          caption="Recorded at this facility"
          icon={CalendarDays}
          tone="slate"
        />
        <KpiCard
          label="Completed"
          value={formatNumber(summary.completed)}
          caption="Entry and exit recorded"
          icon={ShieldCheck}
          tone="green"
        />
        <KpiCard
          label="Open sessions"
          value={formatNumber(summary.checkedIn)}
          caption="Waiting for check-out"
          icon={Clock3}
          tone="amber"
        />
        <KpiCard
          label="Total hours"
          value={
            summary.minutes == null
              ? "—"
              : `${Math.round((summary.minutes / 60) * 10) / 10} h`
          }
          caption="Completed session time"
          icon={Wallet}
          tone="blue"
        />
      </div>

      <Card className="mb-4">
        <SectionHeader
          title="QR check-in"
          description="Scan at the entrance when you arrive and again when you leave."
          action={
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
              <ShieldAlert className="h-3 w-3" aria-hidden="true" />
              Camera simulated on web
            </span>
          }
        />
        <div className="p-4 sm:p-5">
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-brand-dark">{facilityName}</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {latest?.status === "Checked In" ? (
                <>
                  You are checked in since{" "}
                  <strong className="text-amber-700">
                    {timeOnly(latest.entry)}
                  </strong>
                  . Scan again when you leave to close the session.
                </>
              ) : latest ? (
                <>
                  Last visit {formatDate(latest.date)} ·{" "}
                  {formatDuration(latest.durationMinutes) || "duration not recorded"}.
                </>
              ) : (
                "No visits recorded yet. Scan the facility QR code to check in."
              )}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => setScanOpen(true)}>
                <QrCode className="h-4 w-4" /> Scan QR
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowManual((open) => !open);
                  setScanResult(null);
                }}
              >
                Enter code manually
              </Button>
            </div>

            {showManual ? (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Field
                  label="Facility code"
                  htmlFor="scan-value"
                  hint="Use this only if the camera cannot read the code at the entrance."
                >
                  <input
                    id="scan-value"
                    className={inputClass}
                    value={scanValue}
                    onChange={(event) => setScanValue(event.target.value)}
                    placeholder="Facility code"
                  />
                </Field>
                <Button
                  className="mt-3"
                  size="sm"
                  onClick={() => submitScan(scanValue)}
                  disabled={recording}
                >
                  {recording ? "Recording…" : "Verify and record"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {scanResult && !scanOpen ? (
          <div className="px-4 pb-4 sm:px-5">
            <Notice
              tone={scanResult.ok ? "success" : "error"}
              title={scanResult.ok ? "Attendance recorded" : "Scan not accepted"}
            >
              {scanResult.message}
            </Notice>
          </div>
        ) : null}
      </Card>

      <Card className="mb-4">
        <SectionHeader
          title="Attendance history"
          description="Your check-in and check-out sessions at this facility."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={reset}
              disabled={
                !filters.search && !filters.status && !filters.from && !filters.to
              }
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset filters
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
          <Field label="Search" htmlFor="attendance-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="attendance-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Session ID or status"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Status" htmlFor="attendance-status">
            <select
              id="attendance-status"
              className={selectClass}
              value={filters.status}
              onChange={(event) => update({ status: event.target.value })}
            >
              <option value="">All statuses</option>
              {["Completed", "Checked In"].map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>

          <Field label="From" htmlFor="attendance-from">
            <input
              id="attendance-from"
              type="date"
              className={selectClass}
              value={filters.from}
              max={filters.to || CITIZEN_TODAY}
              onChange={(event) => update({ from: event.target.value })}
            />
          </Field>

          <Field label="To" htmlFor="attendance-to">
            <input
              id="attendance-to"
              type="date"
              className={selectClass}
              value={filters.to}
              min={filters.from}
              max={CITIZEN_TODAY}
              onChange={(event) => update({ to: event.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={8} columns={6} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : (
          <>
            <DataTable
              caption="Attendance history"
              columns={[
                {
                  key: "date",
                  header: "Date",
                  sortKey: "date",
                  render: (row) => (
                    <div className="whitespace-nowrap">
                      <p className="text-[11px] font-bold text-slate-800">
                        {formatDate(row.date)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {weekday(row.date)}
                      </p>
                    </div>
                  ),
                },
                {
                  key: "id",
                  header: "Session",
                  sortKey: "id",
                  render: (row) => (
                    <span className="whitespace-nowrap font-mono text-[11px] text-slate-600">
                      {row.id}
                    </span>
                  ),
                },
                {
                  key: "entry",
                  header: "Check-in",
                  render: (row) => (
                    <span
                      className="whitespace-nowrap text-[11px] font-semibold text-slate-700"
                      title={row.entry ? new Date(row.entry).toLocaleString() : ""}
                    >
                      {timeOnly(row.entry) || "—"}
                    </span>
                  ),
                },
                {
                  key: "exit",
                  header: "Check-out",
                  render: (row) =>
                    row.exit ? (
                      <span
                        className="whitespace-nowrap text-[11px] font-semibold text-slate-700"
                        title={new Date(row.exit).toLocaleString()}
                      >
                        {timeOnly(row.exit)}
                      </span>
                    ) : (
                      <span className="inline-flex whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        In session
                      </span>
                    ),
                },
                {
                  key: "duration",
                  header: "Duration",
                  align: "right",
                  render: (row) => (
                    <span className="whitespace-nowrap text-[11px] text-slate-600">
                      {formatDuration(row.durationMinutes) || "Ongoing"}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <StatusPill status={row.status} />,
                },
              ]}
              rows={table.pageRows}
              sort={table.sort}
              onSort={table.toggleSort}
              empty={
                <EmptyState
                  title="No attendance records match these filters"
                  description="Try a different status or date range."
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

      <Drawer
        open={scanOpen}
        onClose={() => {
          if (!recording) setScanOpen(false);
        }}
        title="Scan facility QR"
        subtitle="Hold the QR code at the entrance inside the frame."
        width="max-w-md"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setScanOpen(false)}
              disabled={recording}
            >
              Cancel
            </Button>
            <Button
              onClick={() => submitScan(facilityId)}
              disabled={recording || !facilityId}
            >
              <QrCode className="h-4 w-4" />
              {recording ? "Recording…" : "Simulate scan"}
            </Button>
          </div>
        }
      >
        <div className="mx-auto max-w-xs">
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-brand-primary/40 bg-brand-mint p-6">
            <div className="mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-xl bg-white text-brand-primary/40">
              <Camera className="h-12 w-12" aria-hidden="true" />
              <p className="mt-2 text-[11px] font-bold uppercase tracking-wider">
                Point at the gate
              </p>
            </div>
            <span
              className="absolute inset-x-8 top-10 h-0.5 animate-pulse bg-brand-primary/70"
              aria-hidden="true"
            />
            <span className="absolute left-3 top-3 h-5 w-5 rounded-tl-lg border-l-2 border-t-2 border-brand-primary" />
            <span className="absolute right-3 top-3 h-5 w-5 rounded-tr-lg border-r-2 border-t-2 border-brand-primary" />
            <span className="absolute bottom-3 left-3 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-brand-primary" />
            <span className="absolute bottom-3 right-3 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-brand-primary" />
          </div>
          <p className="mt-4 text-center text-xs leading-relaxed text-slate-600">
            Keep the code steady. A successful scan records your entry or exit
            automatically.
          </p>
          <div className="mt-4">
            <Notice tone="info" title="Simulated camera">
              Camera scanning is not available on web yet. Use “Simulate scan”
              to record the visit as if the gate code was read.
            </Notice>
          </div>
          {scanResult && !scanResult.ok ? (
            <Notice tone="error" title="Scan not accepted">
              {scanResult.message}
            </Notice>
          ) : null}
        </div>
      </Drawer>
    </PageShell>
  );
}
