import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  FileText,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { citizenService } from "../../../services/citizen/citizenService";
import {
  filterComplaints,
  formatDate,
  formatDateTime,
  formatNumber,
} from "../../../utils/citizen/citizenUtils";
import { useAdminQuery, useTableState } from "../../../hooks/citizen/useCitizenQuery";
import {
  Button,
  Card,
  ConfirmDialog,
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
  Tabs,
  inputClass,
  selectClass,
} from "../Common/CitizenUI";

const TABS = [
  { id: "register", label: "Register complaint" },
  { id: "track", label: "Track complaints" },
];

const EMPTY_FORM = {
  category: "",
  description: "",
  photoFile: null,
};

const EMPTY_FILTERS = {
  search: "",
  status: "",
  category: "",
};

function initialFilters(params) {
  return {
    ...EMPTY_FILTERS,
    status: params.get("status") || "",
    category: params.get("category") || "",
  };
}

export default function CitizenComplaints() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") === "register" ? "register" : "track");
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [filters, setFilters] = useState(() => initialFilters(params));
  const [rows, setRows] = useState([]);
  const [types, setTypes] = useState([]);
  const [submitError, setSubmitError] = useState("");

  const query = useMemo(
    () => ({
      status: filters.status,
      category: filters.category,
    }),
    [filters]
  );
  const queryKey = JSON.stringify(query);

  const { data, loading, error, reload } = useAdminQuery(
    () => citizenService.listComplaints(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  useEffect(() => {
    let active = true;
    citizenService
      .listComplaintTypes()
      .then((list) => {
        if (active) setTypes(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const typeName = (id) => {
    const match = types.find((type) => type.id === id);
    return match ? match.name : "Complaint";
  };

  const visibleRows = useMemo(
    () => filterComplaints(rows, { search: filters.search }),
    [rows, filters.search]
  );

  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "submittedAt",
    sortDir: "desc",
  });

  const summary = {
    total: visibleRows.length,
    pending: visibleRows.filter((r) => r.status === "Pending").length,
    resolved: visibleRows.filter((r) => r.status === "Resolved").length,
  };

  function changeTab(nextTab) {
    setTab(nextTab);
    const next = new URLSearchParams(params);
    next.set("tab", nextTab);
    setParams(next, { replace: true });
  }

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  }

  function updateFilter(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setParams({}, { replace: true });
  }

  function validateRegister() {
    const next = {};
    if (!form.category) next.category = "Select a complaint category.";
    if (!form.description.trim()) next.description = "Description is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function confirmRegister() {
    if (!validateRegister()) return;
    setConfirm(true);
  }

  async function submitRegister() {
    setBusy(true);
    setSubmitError("");
    try {
      const response = await citizenService.submitComplaint({
        typeId: form.category,
        description: form.description,
        photoFile: form.photoFile,
      });
      setResult(response.complaint);
      setConfirm(false);
      setForm(EMPTY_FORM);
      setErrors({});
      changeTab("track");
      reload();
    } catch (err) {
      setConfirm(false);
      setSubmitError(
        err && err.message
          ? err.message
          : "Could not register the complaint. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  function resetRegister() {
    setForm(EMPTY_FORM);
    setErrors({});
    setResult(null);
    setSubmitError("");
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen Console · Complaints"
        title="Complaints &amp; grievances"
        description="Register a new complaint or track existing ones for your facility."
        actions={
          <>
            <Button variant="ghost" onClick={resetFilters}>
              <RotateCcw className="h-4 w-4" /> Reset filters
            </Button>
          </>
        }
      />

      <DemoBanner>
        A complaint you register is saved in this browser. It appears in your
        track list, in the facility manager inbox, and moves to the district
        authority when the manager forwards it. Resolving it updates your status.
      </DemoBanner>

      {result ? (
        <Notice tone="success" title="Complaint registered">
          <p>
            Complaint <strong className="font-mono">{result.id}</strong>{" "}
            (<strong>{result.category}</strong>) was registered. Status:{" "}
            <strong>{result.status}</strong>.
          </p>
        </Notice>
      ) : null}

      {submitError ? (
        <Notice tone="error" title="Could not register complaint">
          <p>{submitError}</p>
        </Notice>
      ) : null}

      <Card className="mb-4">
        <Tabs tabs={TABS} active={tab} onChange={changeTab} label="Complaint actions" />
        {tab === "register" ? (
          <div className="px-4 py-4 sm:px-5">
            <Field label="Category" htmlFor="complaint-category">
              <select
                id="complaint-category"
                className={selectClass}
                value={form.category}
                onChange={(event) => update({ category: event.target.value })}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={errors.category ? "complaint-category-error" : undefined}
              >
                <option value="">Select a category</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {errors.category ? (
                <p id="complaint-category-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.category}
                </p>
              ) : null}
            </Field>

            <Field label="Description" htmlFor="complaint-description" hint="Describe the issue in detail.">
              <textarea
                id="complaint-description"
                rows={4}
                className={inputClass}
                value={form.description}
                onChange={(event) => update({ description: event.target.value })}
                aria-invalid={Boolean(errors.description)}
                aria-describedby={errors.description ? "complaint-description-error" : undefined}
              />
              {errors.description ? (
                <p id="complaint-description-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.description}
                </p>
              ) : null}
            </Field>

            <Field label="Photo (optional)" htmlFor="complaint-photo" hint="JPEG or PNG, uploaded with the complaint.">
              <input
                id="complaint-photo"
                type="file"
                accept="image/png,image/jpeg"
                className={inputClass}
                onChange={(event) =>
                  update({ photoFile: event.target.files?.[0] || null })
                }
              />
              <p className="mt-1 text-[11px] text-slate-500">
                The server stores the uploaded file name; only JPEG/PNG is accepted.
              </p>
            </Field>

            <div className="flex flex-col gap-2 border-t border-slate-200 pt-3">
              <Button type="button" variant="ghost" onClick={resetRegister}>
                <RotateCcw className="h-4 w-4" /> Reset form
              </Button>
              <Button type="button" onClick={confirmRegister}>
                Register complaint
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
              <KpiCard
                label="Total complaints"
                value={formatNumber(summary.total)}
                caption="Your submissions"
                icon={Users}
                tone="slate"
              />
              <KpiCard
                label="Pending"
                value={formatNumber(summary.pending)}
                caption="Awaiting resolution"
                icon={Clock3}
                tone="amber"
              />
              <KpiCard
                label="Resolved"
                value={formatNumber(summary.resolved)}
                caption="Status = Resolved"
                icon={ShieldCheck}
                tone="green"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
              <Field label="Search" htmlFor="complaint-search" className="sm:col-span-2">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                    aria-hidden="true"
                  />
                  <input
                    id="complaint-search"
                    type="search"
                    value={filters.search}
                    onChange={(event) => updateFilter({ search: event.target.value })}
                    placeholder="Reference, subject, category or status"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </Field>

              <Field label="Status" htmlFor="complaint-status">
                <select
                  id="complaint-status"
                  className={selectClass}
                  value={filters.status}
                  onChange={(event) => updateFilter({ status: event.target.value })}
                >
                  <option value="">All statuses</option>
                  {["Pending", "Resolved"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Category" htmlFor="complaint-category-filter">
                <select
                  id="complaint-category-filter"
                  className={selectClass}
                  value={filters.category}
                  onChange={(event) => updateFilter({ category: event.target.value })}
                >
                  <option value="">All categories</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Card className="overflow-hidden">
              {loading && !data ? (
                <TableSkeleton rows={8} columns={6} />
              ) : error ? (
                <ErrorState message={error.message} onRetry={reload} />
              ) : visibleRows.length === 0 ? (
                <EmptyState
                  title="No complaints match these filters"
                  action={<Button onClick={resetFilters}>Reset filters</Button>}
                />
              ) : (
                <DataTable
                  caption="Complaint records"
                  columns={[
                    {
                      key: "id",
                      header: "Reference",
                      sortKey: "id",
                      render: (row) => (
                        <span className="font-mono text-[11px] font-bold text-slate-700">{row.id}</span>
                      ),
                    },
                    {
                      key: "subject",
                      header: "Subject & category",
                      sortKey: "subject",
                      render: (row) => (
                        <div className="min-w-[200px]">
                          <p className="font-bold text-brand-dark">{row.subject}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            {row.category}
                          </p>
                        </div>
                      ),
                    },
                    {
                      key: "facility",
                      header: "Facility",
                      render: (row) => (
                        <span className="text-[11px] text-slate-600">{row.facilityName}</span>
                      ),
                    },
                    {
                      key: "status",
                      header: "Status",
                      sortKey: "status",
                      render: (row) => <StatusPill status={row.status} />,
                    },
                    {
                      key: "level",
                      header: "Level",
                      render: (row) => (
                        <span className="whitespace-nowrap text-[11px] text-slate-600">
                          {row.levelLabel}
                        </span>
                      ),
                    },
                    {
                      key: "submittedAt",
                      header: "Submitted",
                      sortKey: "submittedAt",
                      render: (row) => (
                        <span className="whitespace-nowrap text-[11px] text-slate-600">
                          {formatDate(row.submittedAt)}
                        </span>
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
                  ]}
                  rows={table.pageRows}
                  sort={table.sort}
                  onSort={table.toggleSort}
                  onRowClick={(row) => {
                    // Navigate handled via detail; here we just highlight.
                  }}
                  empty={
                    <EmptyState
                      title="No complaints match these filters"
                      action={<Button onClick={resetFilters}>Reset filters</Button>}
                    />
                  }
                />
              )}
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
            </Card>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirm}
        title="Register this complaint?"
        description={
          `${typeName(form.category)}${
            form.description ? " · " + form.description.slice(0, 80) : ""
          }. Saved to the server.`
        }
        confirmLabel="Register complaint"
        busy={busy}
        onConfirm={submitRegister}
        onCancel={() => setConfirm(false)}
      />
    </PageShell>
  );
}



