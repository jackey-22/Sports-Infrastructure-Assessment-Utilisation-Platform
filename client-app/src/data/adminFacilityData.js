import { GUJARAT_FACILITIES } from "./gujaratSportsData";

export const ADMIN_STORAGE_KEY = "khelgujarat-admin-data";

function readAdminData() {
  try {
    const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("Unable to load admin facilities for the public portal", error);
    return null;
  }
}

function toPublicFacility(facility, sports) {
  const relatedSports = sports
    .filter((sport) => sport.facility === facility.id)
    .map((sport) => ({
      name: sport.name,
      image: sport.image || "",
      courts: sport.units,
      category: sport.category,
      type: sport.type,
      availability: sport.availability,
      status: sport.status,
      feePerHour: "Contact facility",
      surface: sport.config || sport.type,
    }));

  return {
    id: facility.id,
    name: facility.name,
    district: facility.district,
    taluka: facility.locality || facility.city || facility.district,
    location: facility.address || `${facility.locality || facility.city}, ${facility.district}, Gujarat`,
    latitude: Number(facility.latitude) || 22.2587,
    longitude: Number(facility.longitude) || 71.1924,
    category: "Sports Complex",
    ownership: "Sports, Youth & Cultural Activities Department",
    operationalSince: facility.year || "Not specified",
    contactPerson: facility.manager || "Facility administration",
    contactPhone: facility.contact || "Not specified",
    contactEmail: facility.email || "Not specified",
    picture: facility.coverImage || facility.image || facility.images?.[0] || "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
    gallery: facility.images || (facility.image ? [facility.image] : []),
    timings: { openingTime: "06:00 AM", closingTime: "09:00 PM" },
    amenities: {},
    condition: {
      grade: facility.status === "Active" ? "Operational" : facility.status,
      score: facility.status === "Active" ? 80 : 60,
      lastMaintenanceDate: facility.lastMaintenanceDate || facility.maintenanceEnd || facility.maintenanceStart || "",
      maintenanceUrgency: "Normal / Routine",
      notes: facility.lastMaintenanceDate || facility.maintenanceEnd || facility.maintenanceStart
        ? `Last maintenance completed on ${facility.lastMaintenanceDate || facility.maintenanceEnd || facility.maintenanceStart}`
        : "Facility information managed by the department.",
    },
    details: {
      city: facility.city || "",
      locality: facility.locality || "",
      manager: facility.manager || "",
      contact: facility.contact || "",
      address: facility.address || "",
      status: facility.status || "",
      lastMaintenanceDate: facility.lastMaintenanceDate || "",
    },
    utilisation: { capacityDaily: 0, currentDailyFootfall: 0, utilizationRate: 0 },
    sports: relatedSports,
  };
}

export function getPublicFacilities() {
  if (typeof window === "undefined") return GUJARAT_FACILITIES;
  const adminData = readAdminData();
  if (!adminData?.facilities?.length) return GUJARAT_FACILITIES;

  const adminFacilities = adminData.facilities.map((facility) =>
    toPublicFacility(facility, adminData.sports || [])
  );
  const adminIds = new Set(adminFacilities.map((facility) => facility.id));
  return [...adminFacilities, ...GUJARAT_FACILITIES.filter((facility) => !adminIds.has(facility.id))];
}
