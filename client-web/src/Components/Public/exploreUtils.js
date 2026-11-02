export const FACILITY_TYPE_OPTIONS = [
  "Sports Complex",
  "Stadium",
  "Indoor Hall",
  "Training Centre",
  "Playground",
];

export const CONDITION_OPTIONS = [
  { id: "excellent", label: "Excellent", color: "bg-emerald-500", match: (s) => s >= 85 },
  { id: "good", label: "Good", color: "bg-teal-500", match: (s) => s >= 70 && s < 85 },
  { id: "needs", label: "Needs Maintenance", color: "bg-amber-400", match: (s) => s >= 55 && s < 70 },
  { id: "critical", label: "Critical", color: "bg-red-500", match: (s) => s < 55 },
];

export const PRIMARY_SPORTS = [
  "Cricket",
  "Football",
  "Basketball",
  "Badminton",
  "Athletics & Track",
  "Swimming",
];

export function getFacilityType(facility) {
  const cat = (facility.category || "").toLowerCase();
  const name = (facility.name || "").toLowerCase();
  if (cat.includes("stadium")) return "Stadium";
  if (name.includes("indoor")) return "Indoor Hall";
  if (cat.includes("university") || cat.includes("institutional")) return "Training Centre";
  if (cat.includes("taluka") || (name.includes("ground") && !name.includes("complex"))) {
    return "Playground";
  }
  return "Sports Complex";
}

export function getConditionMeta(facility) {
  const score = facility?.condition?.score ?? 0;
  if (score >= 85) {
    return { id: "excellent", label: "Excellent", className: "bg-emerald-600 text-white" };
  }
  if (score >= 70) {
    return { id: "good", label: "Good", className: "bg-teal-600 text-white" };
  }
  if (score >= 55) {
    return {
      id: "needs",
      label: "Needs Maintenance",
      className: "bg-amber-500 text-white",
    };
  }
  return { id: "critical", label: "Critical", className: "bg-red-600 text-white" };
}

export function getAverageRating(facility) {
  const sports = facility?.sports || [];
  if (!sports.length) return { avg: null, count: 0 };
  const rated = sports.filter((s) => typeof s.rating === "number");
  if (!rated.length) return { avg: null, count: 0 };
  const sum = rated.reduce((acc, s) => acc + s.rating, 0);
  const avg = Math.round((sum / rated.length) * 10) / 10;
  const count = Math.round(
    40 + avg * 40 + (facility.utilisation?.currentDailyFootfall || 0) / 5
  );
  return { avg, count };
}

export function countByFacilityType(facilities) {
  const counts = Object.fromEntries(FACILITY_TYPE_OPTIONS.map((t) => [t, 0]));
  facilities.forEach((f) => {
    const t = getFacilityType(f);
    if (counts[t] != null) counts[t] += 1;
  });
  return counts;
}

export function sortFacilities(list, sortBy) {
  const arr = [...list];
  if (sortBy === "rating") {
    return arr.sort(
      (a, b) => (getAverageRating(b).avg || 0) - (getAverageRating(a).avg || 0)
    );
  }
  if (sortBy === "utilisation") {
    return arr.sort(
      (a, b) =>
        (b.utilisation?.utilizationRate || 0) - (a.utilisation?.utilizationRate || 0)
    );
  }
  if (sortBy === "condition") {
    return arr.sort((a, b) => (b.condition?.score || 0) - (a.condition?.score || 0));
  }
  return arr;
}
