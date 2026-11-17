import { api, API_BASE_URL } from "../api/client";
export const AMENITIES = [
  { key: "floodlights", label: "Floodlights", icon: "flash-outline" },
  { key: "drinkingWater", label: "Drinking water", icon: "water-outline" },
  { key: "changingRooms", label: "Changing rooms", icon: "shirt-outline" },
  { key: "firstAid", label: "First aid", icon: "medkit-outline" },
  { key: "parking", label: "Parking", icon: "car-outline" },
  { key: "divyangjanFriendly", label: "Accessible", icon: "accessibility-outline" },
  { key: "gym", label: "Gym", icon: "barbell-outline" },
  { key: "canteen", label: "Canteen", icon: "restaurant-outline" },
];
export const imageUrl = value => {
  if (!value || typeof value !== "string") return null;
  if (/^https?:\/\//i.test(value)) return value;
  let path = value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^public\//, "");
  if (!path.includes("/")) path = `SportComplexes/${path}`;
  return `${API_BASE_URL}/${path.replace(/^\//, "")}`;
};
export const timingLabel = facility => typeof facility.timings === "string" ? facility.timings : facility.timings?.openingTime && facility.timings?.closingTime ? `${facility.timings.openingTime} - ${facility.timings.closingTime}` : "Hours not provided";
export const startingPrice = facility => {
  const prices = (facility.sports || []).filter(s => s.bookable && typeof s.price?.amount === "number").map(s => s.price.amount);
  return prices.length ? Math.min(...prices) : null;
};
export async function loadFacilities(filters = {}) {
  const query = Object.entries(filters).filter(([,v]) => v !== "" && v != null).map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  return api.get(`/api/public/facilities?${query}`, { auth: false });
}
export async function loadBookingConfigs(id) {
  const response = await api.get(`/api/public/sport-configs?facilityId=${encodeURIComponent(id)}`, { auth: false });
  return response.data?.configs || [];
}
