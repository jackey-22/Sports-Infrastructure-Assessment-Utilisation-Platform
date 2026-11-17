export const FACILITY_TYPE_OPTIONS = [
  "Sports Complex",
  "Stadium",
  "Indoor Hall",
  "Training Centre",
  "Playground",
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
  if (FACILITY_TYPE_OPTIONS.includes(facility?.facilityType)) return facility.facilityType;
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

export function getAverageRating(facility) {
  if (facility?.ratingSummary?.count) {
    return { avg: facility.ratingSummary.average, count: facility.ratingSummary.count };
  }
  return { avg: null, count: 0 };
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
  return arr;
}
