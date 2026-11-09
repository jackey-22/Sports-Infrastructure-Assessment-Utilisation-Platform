import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Camera,
  Loader2,
  RotateCcw,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { managerService } from "../../../services/manager/managerService";
import { MANAGER_TODAY } from "../../../data/manager/managerDemoData";
import { ALLOWED_IMAGE_TYPES, MAX_FILE_SIZE_MB } from "../../../utils/manager/managerUtils";
import VisionFindings from "../../Assessment/VisionFindings";
import {
  Button,
  Card,
  Field,
  Notice,
  PageHeader,
  PageShell,
  ProgressBar,
  inputClass,
  selectClass,
} from "../Common/ManagerUI";

const SECTIONS = [
  { id: "facility", label: "Facility information" },
  { id: "infrastructure", label: "Sports infrastructure" },
  { id: "surfaces", label: "Playing surfaces and courts" },
  { id: "equipment", label: "Equipment condition" },
  { id: "lighting", label: "Lighting and electrical systems" },
  { id: "sanitation", label: "Sanitation and hygiene" },
  { id: "safety", label: "Safety and accessibility" },
  { id: "maintenance", label: "Maintenance requirements" },
  { id: "photos", label: "Photos and supporting evidence" },
  { id: "review", label: "Review and submission" },
];

const COMPONENTS = [
  {
    id: "turf",
    label: "Surface / turf quality",
    max: 25,
    hint: "Playing surface wear, evenness, and markings.",
  },
  {
    id: "lighting",
    label: "Lighting and floodlights",
    max: 20,
    hint: "Lux levels, working banks, and evening usability.",
  },
  {
    id: "sanitation",
    label: "Sanitation and changing rooms",
    max: 20,
    hint: "Hygiene, drinking water, and locker-room condition.",
  },
  {
    id: "safety",
    label: "Structural safety and perimeter",
    max: 15,
    hint: "Fencing, gates, and structural integrity.",
  },
  {
    id: "accessibility",
    label: "Divyangjan / accessibility",
    max: 20,
    hint: "Barrier-free access for para-athletes.",
  },
];

const MAX_PHOTOS = 6;

function validatePhoto(file) {
  const errors = [];
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    errors.push("Use a JPEG, PNG or WebP photograph.");
  }
  if (!file.size) errors.push("The file is empty.");
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    errors.push(`File too large. Maximum ${MAX_FILE_SIZE_MB} MB.`);
  }
  return errors;
}

const EMPTY_FORM = {
  inspectorName: "Facility Manager",
  assessmentDate: MANAGER_TODAY,
  maintenanceUrgency: "Normal / Routine",
  scores: Object.fromEntries(COMPONENTS.map((c) => [c.id, c.max])),
  inspectionNotes: "",
  photos: [],
  photoDescriptions: {},
  totalScore: null,
  status: "Draft",
  summary: "",
};

export default function ManagerAssessmentForm() {
  const [activeSection, setActiveSection] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [fileErrors, setFileErrors] = useState({});
  const [errors, setErrors] = useState({});
  const [draft, setDraft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);
  const [facility, setFacility] = useState(null);
  const [facilityError, setFacilityError] = useState("");
  // shortcut: the analysis id lasts for this visit, restore it from history if a refresh must keep an in-progress analysis.
  const [analysis, setAnalysis] = useState(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");

  const totalScore = useMemo(
    () =>
      Object.values(form.scores).reduce((total, value) => total + Number(value || 0), 0),
    [form.scores]
  );

  const grade = useMemo(() => {
    if (totalScore == null) return null;
    if (totalScore >= 85) return "Grade A (Excellent)";
    if (totalScore >= 70) return "Grade B (Good)";
    if (totalScore >= 55) return "Grade C (Fair)";
    return "Grade D (Needs attention)";
  }, [totalScore]);

  const maxPossible = useMemo(
    () => COMPONENTS.reduce((total, c) => total + c.max, 0),
    []
  );

  useEffect(() => {
    let cancelled = false;
    managerService
      .getAssignedFacility()
      .then((row) => {
        if (!cancelled) setFacility(row);
      })
      .catch((error) => {
        if (!cancelled) setFacilityError(error.message || "Assigned facility could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Questionnaire drafts only. Photograph bytes cannot live in localStorage.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("mgr_assessment_draft");
      if (stored) {
        const parsed = JSON.parse(stored);
        setDraft(parsed);
        if (parsed.form) setForm((current) => ({ ...current, ...parsed.form, photos: [] }));
      }
    } catch {
      // Ignore corrupt draft storage.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "mgr_assessment_draft",
        JSON.stringify({ form, totalScore, updatedAt: MANAGER_TODAY })
      );
    } catch {
      // Ignore storage failures.
    }
  }, [form, totalScore]);

  function update(patch) {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      Object.keys(patch).forEach((key) => delete next[key]);
      return next;
    });
  }

  function setScore(componentId, value) {
    setForm((current) => ({
      ...current,
      scores: { ...current.scores, [componentId]: value },
    }));
  }

  function addPhotos(fileList) {
    const incoming = Array.from(fileList || []);
    const next = [...files];
    const nextErrors = { ...fileErrors };
    let changed = false;

    incoming.forEach((file) => {
      const already = next.some((f) => f.name === file.name && f.size === file.size);
      if (already) return;
      changed = true;
      const err = validatePhoto(file);
      if (err.length) {
        nextErrors[file.name] = err.join(" ");
      } else if (next.length >= MAX_PHOTOS) {
        nextErrors[file.name] = `Maximum ${MAX_PHOTOS} photos.`;
      } else {
        delete nextErrors[file.name];
        next.push({
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          file,
        });
      }
    });

    setFiles(next);
    setFileErrors(nextErrors);
    setAnalysis(null);
    setAnalysisError("");
    if (!changed && incoming.length) {
      setFileErrors({ ...nextErrors, __general: "No new photos added (duplicate or at limit)." });
    }
  }

  function removePhoto(index) {
    setFiles((current) => {
      const next = current.filter((_, i) => i !== index);
      if (current[index].url) URL.revokeObjectURL(current[index].url);
      const nextErrors = { ...fileErrors };
      if (current[index]) delete nextErrors[current[index].name];
      setFileErrors(nextErrors);
      return next;
    });
    setAnalysis(null);
    setAnalysisError("");
  }

  function validate() {
    const next = {};
    if (!form.inspectorName.trim()) next.inspectorName = "Inspector name is required.";
    if (!form.assessmentDate) next.assessmentDate = "Assessment date is required.";
    else if (form.assessmentDate > MANAGER_TODAY) {
      next.assessmentDate = "Assessment date cannot be in the future.";
    }
    if (!form.inspectionNotes.trim()) next.inspectionNotes = "Field observations are required.";
    if (!form.maintenanceUrgency) next.maintenanceUrgency = "Urgency classification is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function sectionValid(sectionId) {
    if (sectionId === "facility") return Boolean(form.inspectorName.trim());
    if (sectionId === "review") return validate();
    return true;
  }

  function nextSection() {
    if (!sectionValid(SECTIONS[activeSection].id)) return;
    setActiveSection((current) => Math.min(current + 1, SECTIONS.length - 1));
  }

  function prevSection() {
    setActiveSection((current) => Math.max(current - 1, 0));
  }

  async function saveDraft() {
    if (!validate()) return;
    setDraft({ form, files, totalScore, updatedAt: MANAGER_TODAY });
  }

  async function requestAnalysis() {
    const ready = files.filter((item) => item.file);
    if (!ready.length) {
      setAnalysisError("Attach at least one photograph before requesting analysis.");
      setAnalysis(null);
      return;
    }
    setAnalysing(true);
    setAnalysisError("");
    try {
      const response = await managerService.analyseFacilityPhotos(
        ready.map((item) => item.file),
        form.inspectionNotes
      );
      setAnalysis(response.assessment || null);
    } catch (error) {
      setAnalysis(null);
      setAnalysisError(error.message || "Image analysis failed. No findings were created.");
    } finally {
      setAnalysing(false);
    }
  }

  async function submitAssessment() {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await managerService.saveAssessment({
        analysisId: analysis ? analysis.id : undefined,
        inspectorName: form.inspectorName,
        assessmentDate: form.assessmentDate,
        scores: form.scores,
        maintenanceUrgency: form.maintenanceUrgency,
        managerObservations: form.inspectionNotes,
        photoNames: files.map((item) => item.name),
      });
      const saved = response.assessment;
      setResult({
        id: saved.id,
        score: saved.score,
        grade: saved.grade,
        status: saved.status,
        ai: saved.ai,
      });
      setForm(EMPTY_FORM);
      setFiles([]);
      setAnalysis(null);
      setDraft(null);
      try {
        window.localStorage.removeItem("mgr_assessment_draft");
      } catch {
        // ignore
      }
    } catch (error) {
      setSubmitError(error.message || "The assessment was not saved.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setFiles([]);
    setErrors({});
    setFileErrors({});
    setResult(null);
    setSubmitError("");
    setAnalysis(null);
    setAnalysisError("");
    setDraft(null);
    try {
      window.localStorage.removeItem("mgr_assessment_draft");
    } catch {
      // ignore
    }
  }

  const current = SECTIONS[activeSection];
  const isLast = activeSection === SECTIONS.length - 1;
  const isFirst = activeSection === 0;
  const draftExists = Boolean(draft);

  return (
    <PageShell>
      <PageHeader
        eyebrow="Facility Manager · Condition Assessment"
        title="New condition assessment"
        description={
          facility
            ? `Assessment for ${facility.name}${facility.district ? `, ${facility.district}` : ""}. Questionnaire scores are manager-entered. Photograph analysis is a separate server request.`
            : "Loading the facility assigned to this account."
        }
        actions={
          <Button variant="ghost" onClick={resetForm}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        }
      />

      <Notice tone="warning" title="Two separate results">
        The questionnaire score is the sum of the ratings you enter. It is not an AI
        result. Photograph analysis runs on the server and is shown separately. If that
        request fails, no findings are invented. Images sent for analysis are not stored
        on this server.
      </Notice>

      {facilityError ? (
        <Notice tone="error" title="Assigned facility unavailable">
          {facilityError} Analysis and submission stay disabled until the facility loads.
        </Notice>
      ) : null}

      {result ? (
        <Notice tone="success" title="Assessment saved">
          <p>
            Assessment <strong className="font-mono">{result.id}</strong> saved with
            questionnaire score <strong>{result.score} / 100</strong> ({result.grade}).
            {result.ai && result.ai.status === "completed"
              ? ` Visual index from photographs: ${result.ai.visualConditionIndex == null ? "not calculated" : result.ai.visualConditionIndex}.`
              : " No photograph analysis was attached."}
          </p>
          <p className="mt-1">
            <Link
              to={`/manager/assessment/${result.id}`}
              className="font-bold text-emerald-800 underline"
            >
              View this assessment
            </Link>
          </p>
        </Notice>
      ) : null}

      {submitError ? (
        <Notice tone="error" title="Assessment was not saved">
          {submitError}
        </Notice>
      ) : null}

      {draftExists && !result ? (
        <Notice tone="warning" title="Local draft available">
          A saved draft exists for this assessment. Use "Restore draft" to resume, or
          reset to start over. Drafts live in browser localStorage only.
        </Notice>
      ) : null}

      <Card>
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Section {activeSection + 1} of {SECTIONS.length}
            </p>
            <h3 className="text-sm font-bold text-brand-dark">{current.label}</h3>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <span>{activeSection + 1}</span>
            <span>/</span>
            <span>{SECTIONS.length}</span>
          </div>
        </div>

        <div className="px-4 py-5 sm:px-5">
          {current.id === "facility" && (
            <>
              <Field label="Inspector / auditor name" htmlFor="asmt-inspector">
                <input
                  id="asmt-inspector"
                  className={inputClass}
                  value={form.inspectorName}
                  onChange={(event) => update({ inspectorName: event.target.value })}
                  aria-invalid={Boolean(errors.inspectorName)}
                  aria-describedby={errors.inspectorName ? "asmt-inspector-error" : undefined}
                />
                {errors.inspectorName ? (
                  <p id="asmt-inspector-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.inspectorName}
                  </p>
                ) : null}
              </Field>

              <Field label="Assessment date" htmlFor="asmt-date">
                <input
                  id="asmt-date"
                  type="date"
                  className={inputClass}
                  value={form.assessmentDate}
                  max={MANAGER_TODAY}
                  onChange={(event) => update({ assessmentDate: event.target.value })}
                  aria-invalid={Boolean(errors.assessmentDate)}
                  aria-describedby={errors.assessmentDate ? "asmt-date-error" : undefined}
                />
                {errors.assessmentDate ? (
                  <p id="asmt-date-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.assessmentDate}
                  </p>
                ) : null}
              </Field>

              <Field label="Maintenance urgency" htmlFor="asmt-urgency">
                <select
                  id="asmt-urgency"
                  className={selectClass}
                  value={form.maintenanceUrgency}
                  onChange={(event) => update({ maintenanceUrgency: event.target.value })}
                >
                  <option value="Normal / Routine">Normal / Routine</option>
                  <option value="Minor Attention Required">Minor Attention Required</option>
                  <option value="High Priority Repair">High Priority Repair</option>
                  <option value="Critical Renovation">Critical Renovation</option>
                </select>
              </Field>
            </>
          )}

          {current.id === "infrastructure" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs text-slate-600 mb-3">
                Facility: {facility ? `${facility.name}${facility.district ? ` · ${facility.district}` : ""}` : "Assigned facility not loaded."}
              </p>
              <p className="text-[11px] text-slate-500">
                Review the mapped sports and confirm the infrastructure inventory before
                scoring components.
              </p>
            </div>
          )}

          {current.id === "surfaces" && (
            <div className="space-y-4">
              {COMPONENTS.filter((c) => c.id === "turf").map((component) => (
                <div key={component.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-600">
                      {component.label}
                    </span>
                    <span className="text-xs font-bold text-brand-dark">
                      {form.scores[component.id]} / {component.max}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={component.max}
                    value={form.scores[component.id]}
                    onChange={(event) => setScore(component.id, Number(event.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">{component.hint}</p>
                </div>
              ))}
            </div>
          )}

          {current.id === "equipment" && (
            <div className="space-y-4">
              {COMPONENTS.filter((c) => c.id === "lighting").map((component) => (
                <div key={component.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-600">
                      {component.label}
                    </span>
                    <span className="text-xs font-bold text-brand-dark">
                      {form.scores[component.id]} / {component.max}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={component.max}
                    value={form.scores[component.id]}
                    onChange={(event) => setScore(component.id, Number(event.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">{component.hint}</p>
                </div>
              ))}
            </div>
          )}

          {current.id === "lighting" && (
            <div className="space-y-4">
              {COMPONENTS.filter((c) => c.id === "sanitation").map((component) => (
                <div key={component.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-600">
                      {component.label}
                    </span>
                    <span className="text-xs font-bold text-brand-dark">
                      {form.scores[component.id]} / {component.max}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={component.max}
                    value={form.scores[component.id]}
                    onChange={(event) => setScore(component.id, Number(event.target.value))}
                    className="w-full accent-blue-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">{component.hint}</p>
                </div>
              ))}
            </div>
          )}

          {current.id === "sanitation" && (
            <div className="space-y-4">
              {COMPONENTS.filter((c) => c.id === "safety").map((component) => (
                <div key={component.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-600">
                      {component.label}
                    </span>
                    <span className="text-xs font-bold text-brand-dark">
                      {form.scores[component.id]} / {component.max}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={component.max}
                    value={form.scores[component.id]}
                    onChange={(event) => setScore(component.id, Number(event.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">{component.hint}</p>
                </div>
              ))}
            </div>
          )}

          {current.id === "safety" && (
            <div className="space-y-4">
              {COMPONENTS.filter((c) => c.id === "accessibility").map((component) => (
                <div key={component.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[11px] font-bold text-slate-600">
                      {component.label}
                    </span>
                    <span className="text-xs font-bold text-brand-dark">
                      {form.scores[component.id]} / {component.max}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={component.max}
                    value={form.scores[component.id]}
                    onChange={(event) => setScore(component.id, Number(event.target.value))}
                    className="w-full accent-violet-500"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">{component.hint}</p>
                </div>
              ))}
            </div>
          )}

          {current.id === "maintenance" && (
            <>
              <Field label="Maintenance urgency classification" htmlFor="asmt-maint-urgency">
                <select
                  id="asmt-maint-urgency"
                  className={selectClass}
                  value={form.maintenanceUrgency}
                  onChange={(event) => update({ maintenanceUrgency: event.target.value })}
                  aria-invalid={Boolean(errors.maintenanceUrgency)}
                  aria-describedby={errors.maintenanceUrgency ? "asmt-maint-urgency-error" : undefined}
                >
                  <option value="Normal / Routine">Normal / Routine</option>
                  <option value="Minor Attention Required">Minor Attention Required</option>
                  <option value="High Priority Repair">High Priority Repair</option>
                  <option value="Critical Renovation">Critical Renovation</option>
                </select>
                {errors.maintenanceUrgency ? (
                  <p id="asmt-maint-urgency-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.maintenanceUrgency}
                  </p>
                ) : null}
              </Field>
            </>
          )}

          {current.id === "photos" && (
            <>
              <Field label="Photo upload" htmlFor="asmt-photos" hint={`JPEG, PNG or WebP. Maximum ${MAX_FILE_SIZE_MB} MB each, up to ${MAX_PHOTOS} photographs.`}>
                <label
                  htmlFor="asmt-photos"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-400"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Choose photos
                  <input
                    id="asmt-photos"
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    disabled={files.length >= MAX_PHOTOS}
                    onChange={(event) => {
                      addPhotos(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  <span className="ml-2 text-[11px] text-slate-400">
                    ({files.length}/{MAX_PHOTOS})
                  </span>
                </label>
                {files.length === 0 ? (
                  <p className="mt-2 text-[11px] text-slate-500">No photos attached.</p>
                ) : (
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {files.map((file, index) => (
                      <div key={file.name} className="relative group">
                        <img
                          src={file.url}
                          alt={file.name}
                          className="w-full h-24 rounded-lg object-cover border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 rounded p-1 text-slate-400 hover:bg-red-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                          aria-label={`Remove ${file.name}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {Object.values(fileErrors).some((err) => err) ? (
                  <ul className="mt-2 space-y-1">
                    {Object.entries(fileErrors).map(([name, err]) =>
                      name === "__general" ? null : (
                        <li key={name} role="alert" className="text-[11px] font-bold text-red-700">
                          {name}: {err}
                        </li>
                      )
                    )}
                    {fileErrors.__general ? (
                      <li role="alert" className="text-[11px] font-bold text-red-700">
                        {fileErrors.__general}
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </Field>
              <div className="mt-4">
                <Button type="button" onClick={requestAnalysis} disabled={analysing || !files.length}>
                  {analysing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  {analysing ? "Analysing photographs…" : "Request AI image analysis"}
                </Button>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                  Photographs are sent to the server and then to the configured vision
                  provider. They are not kept on the server. A failure leaves this
                  assessment without AI findings.
                </p>
              </div>
              {analysisError ? (
                <Notice tone="error" title="Image analysis failed">
                  {analysisError}
                </Notice>
              ) : null}
              {analysis && analysis.ai ? <VisionFindings analysis={analysis.ai} /> : null}

              <Field label="Photo descriptions (optional)" hint="Describe each photo for the reviewer. This text is your note, not an AI finding.">
                <textarea
                  id="asmt-photo-descriptions"
                  rows={3}
                  className={inputClass}
                  placeholder="e.g. Turf wear near north goalpost; Floodlight bank 2 out of service"
                  value={form.photoDescriptions?.general || ""}
                  onChange={(event) =>
                    update({ photoDescriptions: { ...form.photoDescriptions, general: event.target.value } })
                  }
                />
              </Field>
            </>
          )}

          {current.id === "review" && (
            <>
              <Field label="Manager-entered observations" htmlFor="asmt-notes" hint="Your notes. These are stored separately from AI findings and questionnaire scores.">
                <textarea
                  id="asmt-notes"
                  rows={4}
                  className={inputClass}
                  value={form.inspectionNotes}
                  onChange={(event) => update({ inspectionNotes: event.target.value })}
                  aria-invalid={Boolean(errors.inspectionNotes)}
                  aria-describedby={errors.inspectionNotes ? "asmt-notes-error" : undefined}
                />
                {errors.inspectionNotes ? (
                  <p id="asmt-notes-error" role="alert" className="mt-1 text-[11px] font-bold text-red-700">
                    {errors.inspectionNotes}
                  </p>
                ) : null}
              </Field>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Questionnaire score
                  </span>
                  <span className="text-2xl font-extrabold text-brand-dark">{totalScore}</span>
                </div>
                <ProgressBar label={grade || "Not yet scored"} value={totalScore} max={maxPossible} tone="green" />
                <p className="mt-2 text-[11px] text-slate-500">
                  {totalScore} of {maxPossible} points from the ratings above. {grade || "Score appears once every component has a value."} This is not the visual index.
                </p>
              </div>

              <div className="mt-4">
                {analysis && analysis.ai && analysis.ai.status === "completed" ? (
                  <VisionFindings analysis={analysis.ai} />
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600">
                    <p className="flex items-start gap-2">
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
                      <span>
                        No AI image analysis is attached. Use Request AI image analysis on
                        the photos step. Submitting now saves the questionnaire only.
                      </span>
                    </p>
                  </div>
                )}
                {analysisError ? (
                  <p className="mt-2 text-[11px] font-bold text-red-700" role="alert">{analysisError}</p>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-between sm:items-center sm:px-5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2 sm:mb-0">
            {files.length > 0 ? (
              <span className="flex items-center gap-1">
                <Camera className="h-3 w-3 text-slate-400" aria-hidden="true" />
                {files.length} photo(s) attached
              </span>
            ) : null}
          </div>
          <div className="flex gap-2">
            {!isFirst ? (
              <Button variant="secondary" onClick={prevSection}>
                Back
              </Button>
            ) : null}
            {isLast ? (
              <>
                <Button type="button" variant="ghost" onClick={saveDraft}>
                  Save draft
                </Button>
                <Button type="button" onClick={submitAssessment} disabled={submitting}>
                  {submitting ? "Saving…" : "Submit assessment"}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={nextSection}>Next →</Button>
            )}
          </div>
        </div>
      </Card>
    </PageShell>
  );
}

