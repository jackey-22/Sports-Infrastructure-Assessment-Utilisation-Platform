const AMENITIES = ["floodlights", "drinkingWater", "changingRooms", "firstAid", "parking", "gym", "divyangjanFriendly", "canteen"];
const text = value => typeof value === "string" ? value.trim().toLowerCase() : "";
function exploreFacilities(rows, query = {}) {
  const districts = [...new Set(rows.map(f => f.district).filter(Boolean))].sort();
  const sports = [...new Set(rows.flatMap(f => f.sports.map(s => s.name)).filter(Boolean))].sort();
  const q = text(query.q).slice(0, 200);
  const requested = text(query.amenities).split(",").filter(Boolean);
  if (requested.some(key => !AMENITIES.map(text).includes(key))) throw new Error("Invalid amenity filter");
  const grade = text(query.grade);
  if (grade && !["a", "b", "c", "d"].includes(grade)) throw new Error("Invalid grade filter");
  const sort = query.sort || "name";
  if (!["name", "condition", "price"].includes(sort)) throw new Error("Invalid sort order");
  let data = rows.filter(f => (!query.id || String(f.id) === String(query.id)) &&
    (!text(query.district) || text(f.district) === text(query.district)) &&
    (!text(query.sport) || f.sports.some(s => text(s.name) === text(query.sport))) &&
    (!q || [f.name, f.district, f.taluka, f.location, ...f.sports.map(s => s.name)].some(v => text(v).includes(q))) &&
    (!grade || text(f.condition?.grade).startsWith(`grade ${grade}`)) &&
    requested.every(key => AMENITIES.some(k => text(k) === key && f.amenities?.[k] === true)));
  const price = f => { const prices = f.sports.map(s => s.price?.amount).filter(n => typeof n === "number" && Number.isFinite(n)); return prices.length ? Math.min(...prices) : Infinity; };
  data.sort((a,b) => (sort === "condition" ? (b.condition?.score ?? -1) - (a.condition?.score ?? -1) : sort === "price" ? price(a) - price(b) : 0) || a.name.localeCompare(b.name));
  return { data, meta: { total: data.length, districts, sports, districtCount: new Set(data.map(f => f.district)).size, sportCount: new Set(data.flatMap(f => f.sports.map(s => s.name))).size } };
}
module.exports = { exploreFacilities };
