import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Clock3,
  FileText,
  MessageCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { citizenService } from "../../../services/citizen/citizenService";
import {
  filterFeedback,
  formatDate,
  formatNumber,
  ratingStars,
  FEEDBACK_ENTITIES,
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
  SectionHeader,
  StatusPill,
  TableSkeleton,
  inputClass,
  selectClass,
} from "../Common/CitizenUI";

const MAX_RATING = 5;
const MIN_RATING = 1;

const EMPTY_FORM = {
  entityType: "facility",
  entityId: "",
  entityName: "",
  sportName: "",
  coachName: "",
  rating: "",
  remarks: "",
};

export default function CitizenFeedback() {
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    search: "",
    entityType: "",
    rating: "",
  }));
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [rows, setRows] = useState([]);
  const [sports, setSports] = useState([]);
  const [submitError, setSubmitError] = useState("");

  const query = useMemo(
    () => ({
      entityType: filters.entityType,
      rating: filters.rating,
    }),
    [filters]
  );
  const queryKey = JSON.stringify(query);

  const { data, loading, error, reload } = useAdminQuery(
    () => citizenService.listFeedback(query),
    [queryKey]
  );

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  useEffect(() => {
    let active = true;
    citizenService
      .listSports()
      .then((list) => {
        if (active) setSports(list);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const visibleRows = useMemo(
    () => filterFeedback(rows, { search: filters.search }),
    [rows, filters.search]
  );

  const table = useTableState(visibleRows, {
    pageSize: 10,
    sortKey: "createdAt",
    sortDir: "desc",
  });

  const totalRatings = visibleRows.length;
  const averageRating =
    totalRatings > 0
      ? Math.round(
          (visibleRows.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) /
            totalRatings) *
            10
        ) / 10
      : 0;

  const entityOptions = FEEDBACK_ENTITIES;
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
    if (!form.entityType) next.entityType = "Select an entity type.";
    if (form.entityType === "facility") {
      if (!form.entityId) next.entityName = "Select the sport you are rating.";
    } else if (!form.entityName.trim()) {
      next.entityName = "Entity name is required.";
    }
    const rating = Number(form.rating);
    if (
      !form.rating ||
      Number.isNaN(rating) ||
      rating < MIN_RATING ||
      rating > MAX_RATING
    ) {
      next.rating = "Enter a rating between " + MIN_RATING + " and " + MAX_RATING + ".";
    }
    if (!form.remarks.trim()) next.remarks = "Written feedback is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function confirmSubmit() {
    if (!validate()) return;
    setConfirm(true);
  }

  async function submit() {
    setBusy(true);
    setSubmitError("");
    try {
      if (form.entityType === "facility") {
        await citizenService.submitFacilityRating({
          sportId: form.entityId,
          rating: Number(form.rating),
          remarks: form.remarks,
        });
      } else if (form.entityType === "sport") {
        await citizenService.submitSportRating({
          sportId: form.entityId,
          sportName: form.entityName,
          rating: Number(form.rating),
          remarks: form.remarks,
        });
      } else {
        await citizenService.submitCoachRating({
          coachId: form.entityId,
          coachName: form.entityName,
          sport: form.sportName,
          rating: Number(form.rating),
          remarks: form.remarks,
        });
      }
      setResult({
        entityType: form.entityType,
        entityName: form.entityName,
        rating: Number(form.rating),
      });
      setConfirm(false);
      setForm(EMPTY_FORM);
      setErrors({});
      reload();
    } catch (err) {
      setConfirm(false);
      setSubmitError(
        err && err.message
          ? err.message
          : "Could not submit the feedback. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setErrors({});
    setResult(null);
    setSubmitError("");
  }

  const confirmDescription =
    (form.entityType === "facility" ? "Facility" : form.entityType === "sport" ? "Sport" : "Coach") +
    ": " +
    form.entityName +
    " · Rating: " +
    form.rating +
    " / 5";

  return (
    <PageShell>
      <PageHeader
        eyebrow="Citizen Console · Feedback"
        title="Submit feedback"
        description="Rate a sports facility, sport or coach."
        actions={
          <Button variant="ghost" onClick={resetForm}>
            <RotateCcw className="h-4 w-4" /> Reset form
          </Button>
        }
      />

      <DemoBanner>
        Facility ratings are submitted to the server (POST /addRating, recorded
        per sport against your facility). The history table below is demo-only:
        there is no per-user rating history endpoint yet. Sport and coach feedback
        have no backend contract and are demo-only.
      </DemoBanner>

      {result ? (
        <Notice tone="success" title="Feedback recorded">
          <p>
            {result.entityType === "facility"
              ? "Facility rating"
              : result.entityType === "sport"
              ? "Sport feedback"
              : "Coach feedback"} for{" "}
              <strong className="font-mono">{result.entityName}</strong> of{" "}
              <strong>{result.rating} / 5</strong> recorded.
          </p>
        </Notice>
      ) : null}

      {submitError ? (
        <Notice tone="error" title="Could not submit feedback">
          <p>{submitError}</p>
        </Notice>
      ) : null}

      <form noValidate>
        <Card>
          <SectionHeader title="Entity and rating" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 px-4 py-4 sm:px-5">
            <Field label="Entity type" htmlFor="fb-entity">
              <select
                id="fb-entity"
                className={selectClass}
                value={form.entityType}
                onChange={(event) =>
                  update({
                    entityType: event.target.value,
                    entityName: "",
                    entityId: "",
                  })
                }
                aria-invalid={Boolean(errors.entityType)}
                aria-describedby={errors.entityType ? "fb-entity-error" : undefined}
              >
                <option value="">Select entity type</option>
                {entityOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </select>
              {errors.entityType ? (
                <p id="fb-entity-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.entityType}
                </p>
              ) : null}
            </Field>

            {form.entityType === "facility" ? (
              <Field label="Sport" htmlFor="fb-sport" hint="Facility ratings are recorded per sport.">
                <select
                  id="fb-sport"
                  className={selectClass}
                  value={form.entityId}
                  onChange={(event) => {
                    const match = sports.find((s) => s.id === event.target.value);
                    update({
                      entityId: event.target.value,
                      entityName: match ? match.name : "",
                    });
                  }}
                  aria-invalid={Boolean(errors.entityName)}
                  aria-describedby={errors.entityName ? "fb-sport-error" : undefined}
                >
                  <option value="">Select a sport</option>
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
                {errors.entityName ? (
                  <p id="fb-sport-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.entityName}
                  </p>
                ) : null}
              </Field>
            ) : (
              <Field label="Entity name" htmlFor="fb-name" hint="Name of the sport or coach.">
                <input
                  id="fb-name"
                  className={inputClass}
                  value={form.entityName}
                  onChange={(event) => update({ entityName: event.target.value })}
                  aria-invalid={Boolean(errors.entityName)}
                  aria-describedby={errors.entityName ? "fb-name-error" : undefined}
                />
                {errors.entityName ? (
                  <p id="fb-name-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.entityName}
                  </p>
                ) : null}
              </Field>
            )}

            <Field label="Rating (1–5)" htmlFor="fb-rating">
              <select
                id="fb-rating"
                className={selectClass}
                value={form.rating}
                aria-invalid={Boolean(errors.rating)}
                aria-describedby={errors.rating ? "fb-rating-error" : undefined}
                onChange={(event) => update({ rating: event.target.value })}
              >
                <option value="">Select rating</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={String(value)}>
                    {value} star{value > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              {errors.rating ? (
                <p id="fb-rating-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.rating}
                </p>
              ) : null}
            </Field>
          </div>

          <Field label="Remarks / feedback" htmlFor="fb-remarks" hint="Written feedback for the entity.">
            <textarea
              id="fb-remarks"
              rows={3}
              className={inputClass}
              value={form.remarks}
              onChange={(event) => update({ remarks: event.target.value })}
              aria-invalid={Boolean(errors.remarks)}
              aria-describedby={errors.remarks ? "fb-remarks-error" : undefined}
            />
            {errors.remarks ? (
              <p id="fb-remarks-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                {errors.remarks}
              </p>
            ) : null}
          </Field>
        </Card>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <Button type="button" variant="ghost" onClick={resetForm}>
            <RotateCcw className="h-4 w-4" /> Reset form
          </Button>
          <Button type="button" onClick={confirmSubmit}>
            Submit feedback
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Submit this feedback?"
        description={confirmDescription}
        confirmLabel="Submit feedback"
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      />

      <Card className="mt-4">
        <SectionHeader
          title="Feedback history"
          description="Your submitted feedback records."
        />
        <div className="grid grid-cols-1 gap-3 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <Field label="Search" htmlFor="fb-search" className="sm:col-span-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="fb-search"
                type="search"
                value={filters.search}
                onChange={(event) => update({ search: event.target.value })}
                placeholder="Entity name or remarks"
                className={`${inputClass} pl-9`}
              />
            </div>
          </Field>

          <Field label="Entity type" htmlFor="fb-filter-type">
            <select
              id="fb-filter-type"
              className={selectClass}
              value={filters.entityType}
              onChange={(event) => update({ entityType: event.target.value })}
            >
              <option value="">All types</option>
              {entityOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Rating" htmlFor="fb-filter-rating">
            <select
              id="fb-filter-rating"
              className={selectClass}
              value={filters.rating}
              onChange={(event) => update({ rating: event.target.value })}
            >
              <option value="">All ratings</option>
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value} value={String(value)}>
                  {value} star{value > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading && !data ? (
          <TableSkeleton rows={8} columns={5} />
        ) : error ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : visibleRows.length === 0 ? (
          <EmptyState
            title="No feedback matches these filters"
            action={<Button onClick={resetForm}>Reset form</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 px-4 py-4 sm:px-5">
              <KpiCard
                label="Total feedback"
                value={formatNumber(totalRatings)}
                caption="Your submissions"
                icon={Users}
                tone="slate"
              />
              <KpiCard
                label="Average rating"
                value={averageRating == null ? "—" : averageRating + " / 5"}
                icon={ShieldCheck}
                tone="blue"
              />
            </div>
            <DataTable
              caption="Feedback records"
              columns={[
                {
                  key: "id",
                  header: "Feedback ID",
                  sortKey: "id",
                  render: (row) => (
                    <span className="font-mono text-[11px] font-bold text-slate-700">{row.id}</span>
                  ),
                },
                {
                  key: "entity",
                  header: "Entity",
                  render: (row) => (
                    <div className="min-w-[150px]">
                      <p className="font-bold text-brand-dark">{row.entityName}</p>
                      <p className="text-[11px] text-slate-500">{row.entityType}</p>
                    </div>
                  ),
                },
                {
                  key: "rating",
                  header: "Rating",
                  sortKey: "rating",
                  align: "right",
                  render: (row) => (
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-amber-400">
                        {row.rating} / 5
                      </span>
                    </div>
                  ),
                },
                {
                  key: "type",
                  header: "Type",
                  render: (row) => (
                    <span className="whitespace-nowrap text-[11px] text-slate-600">
                      {row.entityType}
                    </span>
                  ),
                },
                {
                  key: "date",
                  header: "Submitted",
                  sortKey: "createdAt",
                  render: (row) => (
                    <span className="whitespace-nowrap text-[11px] text-slate-600">
                      {formatDate(row.createdAt)}
                    </span>
                  ),
                },
              ]}
              rows={table.pageRows}
              sort={table.sort}
              onSort={table.toggleSort}
              empty={
                <EmptyState
                  title="No feedback matches these filters"
                  action={<Button onClick={resetForm}>Reset form</Button>}
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
    </PageShell>
  );
}

