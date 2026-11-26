// Match the server's per-parameter rounding; saved server scores remain authoritative.
const round2 = value => Math.round(value * 100) / 100;
function parameterScore(parameter, raw) {
  if (raw === "" || raw === null || raw === undefined || !["number", "string"].includes(typeof raw) || typeof raw === "string" && !raw.trim()) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  if (parameter.evaluationType === "qualitative") {
    const max = Number(parameter.maxScore);
    return max > 0 && value >= 0 && value <= max ? value / max * 100 : null;
  }
  const min = Number(parameter.benchmark?.min),
    max = Number(parameter.benchmark?.max);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || value < min || value > max) return null;
  return (parameter.scoringMethod === "lower_is_better" ? max - value : value - min) / (max - min) * 100;
}
function evaluationPreview(template, scores) {
  const parameters = (template?.parameters || []).filter(parameter => parameter.active);
  const details = parameters.map(parameter => {
    const normalized = parameterScore(parameter, scores[parameter._id]);
    return {
      parameterId: parameter._id,
      parameterName: parameter.name,
      actualValue: scores[parameter._id],
      normalizedScore: normalized === null ? null : round2(normalized),
      weightedScore: normalized === null ? 0 : Math.round(normalized * parameter.weightage) / 100
    };
  });
  const invalid = details.find(detail => detail.normalizedScore === null);
  return {
    details,
    total: round2(details.reduce((sum, detail) => sum + detail.weightedScore, 0)),
    completed: details.filter(detail => detail.normalizedScore !== null).length,
    valid: parameters.length > 0 && !invalid,
    error: invalid ? `Enter a valid score for ${invalid.parameterName}.` : parameters.length ? "" : "This template has no active parameters."
  };
}
function preferredSport(row) {
  return String(row?.nextBooking?.sportId || row?.latestBooking?.sportId || row?.sports?.[0]?.id || "");
}
function evaluationPayload(row, sportId, template, scores, remarks, bookingId) {
  if (!row?.canRate || !row?.athleteId) throw new Error("This athlete is not eligible for evaluation yet.");
  if (!sportId || !template) throw new Error("Select a sport with a published template.");
  const preview = evaluationPreview(template, scores);
  if (!preview.valid) throw new Error(preview.error);
  return {
    athleteId: row.athleteId,
    sportId,
    bookingId: bookingId || row?.selectedBookingId || row?.bookingId || row?.latestBooking?.id || undefined,
    details: preview.details.map(detail => ({
      parameterId: detail.parameterId,
      actualValue: Number(detail.actualValue)
    })),
    remarks: remarks.trim()
  };
}
const ACHIEVEMENT_CATEGORIES = ["Tournament Participation", "Gold Medal", "Silver Medal", "Bronze Medal", "Competition Winner", "Championship", "Personal Record", "Other"];
function achievementPayload(form) {
  if (!form.sportId || !form.title.trim() || !ACHIEVEMENT_CATEGORIES.includes(form.category)) throw new Error("Select a sport, category and achievement title.");
  const date = new Date(form.achievementDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.achievementDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== form.achievementDate) throw new Error("Enter a valid achievement date (YYYY-MM-DD).");
  return {
    ...form,
    title: form.title.trim(),
    description: form.description.trim(),
    eventName: form.eventName.trim(),
    rank: form.rank.trim()
  };
}
module.exports = {
  parameterScore,
  evaluationPreview,
  evaluationPayload,
  preferredSport,
  achievementPayload,
  ACHIEVEMENT_CATEGORIES
};
