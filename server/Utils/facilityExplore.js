const AMENITIES = [
  "floodlights",
  "drinkingWater",
  "changingRooms",
  "firstAid",
  "parking",
  "gym",
  "divyangjanFriendly",
  "canteen",
];

const text = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

function exploreFacilities(rows, query = {}) {
  const districts = [...new Set(rows.map((facility) => facility.district).filter(Boolean))].sort();
  const sports = [
    ...new Set(rows.flatMap((facility) => facility.sports.map((sport) => sport.name)).filter(Boolean)),
  ].sort();
  const q = text(query.q).slice(0, 200);
  const requested = text(query.amenities).split(",").filter(Boolean);
  if (requested.some((key) => !AMENITIES.map(text).includes(key))) {
    throw new Error("Invalid amenity filter");
  }
  const grade = text(query.grade);
  if (grade && !["a", "b", "c", "d"].includes(grade)) {
    throw new Error("Invalid grade filter");
  }
  const purpose = text(query.purpose);
  const audience = text(query.audience);
  const maxPrice = query.maxPrice != null && query.maxPrice !== "" ? Number(query.maxPrice) : null;
  const minRating = query.minRating != null && query.minRating !== "" ? Number(query.minRating) : null;
  const hasSubscription = query.hasSubscription === "true" || query.hasSubscription === true;
  const sort = query.sort || "name";
  if (!["name", "condition", "price", "rating"].includes(sort)) {
    throw new Error("Invalid sort order");
  }
  let data = rows.filter(
    (facility) =>
      (!query.id || String(facility.id) === String(query.id)) &&
      (!text(query.district) || text(facility.district) === text(query.district)) &&
      (!text(query.sport) ||
        facility.sports.some((sport) => text(sport.name) === text(query.sport))) &&
      (!q ||
        [facility.name, facility.district, facility.taluka, facility.location, ...facility.sports.map((sport) => sport.name)]
          .some((value) => text(value).includes(q))) &&
      (!grade || text(facility.condition?.grade).startsWith(`grade ${grade}`)) &&
      (!purpose ||
        facility.sports.some((sport) =>
          Array.isArray(sport.purposes) && sport.purposes.some((p) => text(p) === purpose)
        )) &&
      (!audience ||
        facility.sports.some((sport) =>
          Array.isArray(sport.audiences) && sport.audiences.some((a) => text(a) === audience)
        )) &&
      (maxPrice == null || !Number.isFinite(maxPrice) ||
        facility.sports.some((sport) => typeof sport.price?.amount === "number" && sport.price.amount <= maxPrice)) &&
      (minRating == null || !Number.isFinite(minRating) ||
        (facility.ratingSummary?.average != null && facility.ratingSummary.average >= minRating)) &&
      (!hasSubscription || Boolean(facility.hasSubscriptions)) &&
      requested.every((key) =>
        AMENITIES.some((amenity) => text(amenity) === key && facility.amenities?.[amenity] === true)
      )
  );
  const price = (facility) => {
    const prices = facility.sports
      .map((sport) => sport.price?.amount)
      .filter((value) => typeof value === "number" && Number.isFinite(value));
    return prices.length ? Math.min(...prices) : Infinity;
  };
  data.sort(
    (a, b) =>
      (sort === "condition"
        ? (b.condition?.score ?? -1) - (a.condition?.score ?? -1)
        : sort === "rating"
          ? (b.ratingSummary?.average ?? -1) - (a.ratingSummary?.average ?? -1)
        : sort === "price"
          ? price(a) - price(b)
          : 0) || a.name.localeCompare(b.name)
  );
  return {
    data,
    meta: {
      total: data.length,
      districts,
      sports,
      districtCount: new Set(data.map((facility) => facility.district)).size,
      sportCount: new Set(data.flatMap((facility) => facility.sports.map((sport) => sport.name))).size,
    },
  };
}

module.exports = { exploreFacilities };
