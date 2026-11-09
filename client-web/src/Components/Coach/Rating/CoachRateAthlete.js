import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { coachService } from "../../../services/coach/coachService";
import {
  RATING_CRITERIA,
  formatNumber,
  validateFile,
  formatFileSize,
} from "../../../utils/coach/coachUtils";
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
} from "../Common/CoachUI";

const MAX_RATING = 5;
const MIN_RATING = 1;

const EMPTY_FORM = {
  athleteId: "",
  overallRating: "",
  remarks: "",
  criteria: Object.fromEntries(RATING_CRITERIA.map((c) => [c, ""])),
};

export default function CoachRateAthlete() {
  const { athleteId: routeAthleteId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [athletes, setAthletes] = useState([]);

  useEffect(() => {
    let active = true;
    coachService.listAthletes().then((rows) => {
      if (active) setAthletes(rows);
    });
    return () => {
      active = false;
    };
  }, []);

  const athlete = useMemo(
    () =>
      athletes.find((a) => a.id === (routeAthleteId || form.athleteId)) || null,
    [routeAthleteId, form.athleteId, athletes]
  );

  useEffect(() => {
    if (routeAthleteId) {
      setForm((current) => ({ ...current, athleteId: routeAthleteId }));
    }
  }, [routeAthleteId]);

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  }

  function updateCriterion(criterion, value) {
    setForm((current) => ({
      ...current,
      criteria: { ...current.criteria, [criterion]: value },
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next[criterion];
      return next;
    });
  }

  function validate() {
    const next = {};
    if (!form.athleteId) next.athleteId = "Select an athlete.";
    const overall = Number(form.overallRating);
    if (!form.overallRating || Number.isNaN(overall) || overall < MIN_RATING || overall > MAX_RATING) {
      next.overallRating = `Enter a rating between ${MIN_RATING} and ${MAX_RATING}.`;
    }
    if (!form.remarks.trim()) next.remarks = "Written feedback is required.";
    const emptyCriteria = RATING_CRITERIA.filter(
      (c) => !form.criteria[c] || Number(form.criteria[c]) < MIN_RATING || Number(form.criteria[c]) > MAX_RATING
    );
    if (emptyCriteria.length) {
      next.criteria = `Rate all criteria: ${emptyCriteria.join(", ")}.`;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function confirmSubmit() {
    if (!validate()) return;
    setConfirm(true);
  }

  async function submit() {
    setBusy(true);
    try {
      const response = await coachService.submitRating({
        athleteId: form.athleteId,
        sport: athlete ? athlete.sport : "",
        rating: Number(form.overallRating),
        remarks: form.remarks,
        parameters: RATING_CRITERIA.map((criterion) => ({
          parameter: criterion,
          value: Number(form.criteria[criterion]) || 0,
        })),
      });
      setResult(response.rating);
      setConfirm(false);
      setForm(EMPTY_FORM);
    } finally {
      setBusy(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setErrors({});
    setResult(null);
  }

  return (
    <PageShell>
      <PageHeader
        eyebrow="Coach Console · Rate Athlete"
        title="Submit coach rating"
        description="Rate an assigned athlete."
        actions={
          <Button as={Link} to="/coach/athletes" variant="secondary">
            <ArrowLeft className="h-3 w-3" /> Back to athletes
          </Button>
        }
      />

      <DemoBanner>
        Coach-to-athlete rating is a frontend demo. There is no backend endpoint
        for coach-to-athlete ratings (the mobile app's `ratingByInstructor` is
        unimplemented). Submitted ratings are held in local demo state only.
      </DemoBanner>

      {result ? (
        <Notice tone="success" title="Rating recorded">
          <p>
            Rating for <strong className="font-mono">{result.athleteName}</strong>
            of <strong>{result.rating} / 5</strong> is in the rating history.
          </p>
        </Notice>
      ) : null}

      <form noValidate>
        <Card>
          <SectionHeader title="Athlete and overall rating" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 px-4 py-4 sm:px-5">
            <Field label="Athlete" htmlFor="rate-athlete">
              <select
                id="rate-athlete"
                className={selectClass}
                value={form.athleteId}
                aria-invalid={Boolean(errors.athleteId)}
                aria-describedby={errors.athleteId ? "rate-athlete-error" : undefined}
                onChange={(event) => update({ athleteId: event.target.value })}
              >
                <option value="">Select an assigned athlete</option>
                {athletes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {a.sport}{a.rating != null ? ` (rated ${a.rating}/5)` : ""}
                  </option>
                ))}
              </select>
              {errors.athleteId ? (
                <p id="rate-athlete-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.athleteId}
                </p>
              ) : null}
            </Field>

            <Field label="Overall rating (1–5)" htmlFor="rate-overall">
              <select
                id="rate-overall"
                className={selectClass}
                value={form.overallRating}
                aria-invalid={Boolean(errors.overallRating)}
                aria-describedby={errors.overallRating ? "rate-overall-error" : undefined}
                onChange={(event) => update({ overallRating: event.target.value })}
              >
                <option value="">Select rating</option>
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={String(value)}>
                    {value} star{value > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              {errors.overallRating ? (
                <p id="rate-overall-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.overallRating}
                </p>
              ) : null}
            </Field>

            <Field label="Remarks / feedback" htmlFor="rate-remarks" hint="Written feedback for the athlete.">
              <textarea
                id="rate-remarks"
                rows={3}
                className={inputClass}
                value={form.remarks}
                onChange={(event) => update({ remarks: event.target.value })}
                aria-invalid={Boolean(errors.remarks)}
                aria-describedby={errors.remarks ? "rate-remarks-error" : undefined}
              />
              {errors.remarks ? (
                <p id="rate-remarks-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                  {errors.remarks}
                </p>
              ) : null}
            </Field>
          </div>
        </Card>

        <Card className="mt-4">
          <SectionHeader title="Rating criteria" caption="Rate each criterion from 1 to 5." />
          <div className="px-4 py-4 sm:px-5 space-y-3">
            {RATING_CRITERIA.map((criterion) => {
              const value = form.criteria[criterion] || "";
              const error = errors.criteria;
              return (
                <div key={criterion} className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2 last:border-b-0">
                  <div>
                    <p className="text-xs font-bold text-slate-600">{criterion}</p>
                    <p className="text-[11px] text-slate-500">
                      {value ? `${value} / 5` : "Not rated"}
                    </p>
                  </div>
                  <select
                    value={value}
                    onChange={(event) => updateCriterion(criterion, event.target.value)}
                    className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:border-brand-primary focus:outline-none w-20"
                    aria-invalid={Boolean(error)}
                  >
                    <option value="">—</option>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <option key={v} value={String(v)}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
            {errors.criteria ? (
              <p role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                {errors.criteria}
              </p>
            ) : null}
          </div>
        </Card>

        <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
          <Button type="button" variant="ghost" onClick={resetForm}>
            <RotateCcw className="h-4 w-4" /> Reset form
          </Button>
          <Button type="button" onClick={confirmSubmit}>
            Submit rating
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirm}
        title="Submit this coach rating?"
        description={
          athlete
            ? `${athlete.name} · ${athlete.sport} · Overall: ${form.overallRating} / 5.`
            : ""
        }
        confirmLabel="Submit rating"
        busy={busy}
        onConfirm={submit}
        onCancel={() => setConfirm(false)}
      />
    </PageShell>
  );
}

