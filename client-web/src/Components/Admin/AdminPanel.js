import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  Edit3,
  ImagePlus,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import { ADMIN_STORAGE_KEY } from "../../data/adminFacilityData";

const DISTRICTS = [
  "Ahmedabad",
  "Amreli",
  "Anand",
  "Banaskantha",
  "Bhavnagar",
  "Gandhinagar",
  "Jamnagar",
  "Junagadh",
  "Kheda",
  "Kutch",
  "Mehsana",
  "Rajkot",
  "Surat",
  "Vadodara",
];
const STATUSES = ["Active", "Inactive", "Under Development", "Temporarily Closed"];
const MODULES = [
  { id: "facilities", label: "Facility Management", icon: Building2 },
  { id: "sports", label: "Sports Management", icon: LayoutDashboard },
  { id: "coaches", label: "Coach Management", icon: UserRound },
];
const ACTION_LABELS = {
  facilities: "facility",
  sports: "sport",
  coaches: "coach",
};

const demoData = {
  facilities: [
    {
      id: "FAC-001",
      name: "Sardar Patel Sports Complex",
      district: "Ahmedabad",
      city: "Ahmedabad",
      locality: "Navrangpura",
      status: "Active",
      sports: 4,
      coaches: 12,
      added: "2026-10-12",
      image: "",
      manager: "Kiran Patel",
      contact: "9876543210",
      address: "University Road, Navrangpura, Ahmedabad",
    },
    {
      id: "FAC-002",
      name: "Riverfront Athletics Centre",
      district: "Ahmedabad",
      city: "Ahmedabad",
      locality: "Paldi",
      status: "Active",
      sports: 3,
      coaches: 7,
      added: "2026-10-18",
      image: "",
      manager: "Mehul Shah",
      contact: "9876501234",
      address: "Riverfront Road, Paldi, Ahmedabad",
    },
    {
      id: "FAC-003",
      name: "Khel Mahakumbh Indoor Arena",
      district: "Vadodara",
      city: "Vadodara",
      locality: "Gotri",
      status: "Under Development",
      sports: 0,
      coaches: 0,
      added: "2026-10-27",
      image: "",
      manager: "Riya Desai",
      contact: "9898989898",
      address: "Gotri-Sevasi Road, Vadodara",
    },
  ],
  sports: [
    { id: "SPT-001", name: "Badminton", category: "Racquet", facility: "FAC-001", units: 8, type: "Indoor", availability: "Available", status: "Active", config: "8 courts, wooden flooring" },
    { id: "SPT-002", name: "Cricket", category: "Team Sport", facility: "FAC-001", units: 2, type: "Outdoor", availability: "Available", status: "Active", config: "2 grounds, floodlights" },
    { id: "SPT-003", name: "Swimming", category: "Aquatics", facility: "FAC-002", units: 1, type: "Indoor", availability: "Limited", status: "Active", config: "50m pool, 8 lanes" },
  ],
  coaches: [
    { id: "COA-001", name: "Aarav Joshi", sport: "Badminton", facility: "FAC-001", qualification: "B.P.Ed", contact: "9825012345", status: "Active" },
    { id: "COA-002", name: "Nisha Trivedi", sport: "Swimming", facility: "FAC-002", qualification: "Level 2 Coach", contact: "9898012345", status: "Active" },
  ],
};

const blankRecords = {
  facilities: { name: "", district: "", city: "", locality: "", status: "Active", manager: "", contact: "", email: "", year: "", latitude: "", longitude: "", address: "", image: "", images: [], coverImage: "", lastMaintenanceDate: "" },
  sports: { name: "", category: "Team Sport", facility: "", units: 1, type: "Indoor", availability: "Available", status: "Active", config: "", image: "" },
  coaches: { name: "", sport: "", facility: "", qualification: "", contact: "", status: "Active" },
};

function readData() {
  try {
    const stored = window.localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!stored) return demoData;
    const parsed = JSON.parse(stored);
    return {
      ...demoData,
      ...parsed,
      facilities: (parsed.facilities || demoData.facilities).map((facility) => ({
        ...facility,
        lastMaintenanceDate:
          facility.lastMaintenanceDate || facility.maintenanceEnd || facility.maintenanceStart || "",
      })),
    };
  } catch (error) {
    console.error("Unable to load admin data", error);
    return demoData;
  }
}

function makeId(module) {
  const prefix = { facilities: "FAC", sports: "SPT", coaches: "COA" }[module];
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

function statusClass(status) {
  if (["Active", "Available", "Completed"].includes(status)) return "bg-emerald-50 text-emerald-700";
  if (["Open", "In Progress", "Limited", "Under Development"].includes(status)) return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const [data, setData] = useState(readData);
  const [activeModule, setActiveModule] = useState("facilities");
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [district, setDistrict] = useState("");
  const [modal, setModal] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    window.localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    setQuery("");
    setDistrict("");
  }, [activeModule]);

  const facilitiesById = useMemo(
    () => Object.fromEntries(data.facilities.map((facility) => [facility.id, facility.name])),
    [data.facilities]
  );
  const currentModule = MODULES.find((item) => item.id === activeModule);
  const records = useMemo(() => {
    const term = query.trim().toLowerCase();
    return data[activeModule].filter((record) => {
      const matchesTerm = !term || Object.values(record).some((value) => String(value).toLowerCase().includes(term));
      const matchesDistrict =
        !district ||
        (activeModule === "facilities" ? record.district === district : facilitiesById[record.facility]?.includes(district));
      return matchesTerm && matchesDistrict;
    });
  }, [activeModule, data, district, facilitiesById, query]);

  const showNotice = (message) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3000);
  };

  const saveRecord = (record) => {
    const next = { ...record, id: record.id || makeId(activeModule) };
    if (activeModule === "facilities" && !next.added) next.added = new Date().toISOString().slice(0, 10);
    setData((current) => ({
      ...current,
      [activeModule]: record.id
        ? current[activeModule].map((item) => (item.id === record.id ? next : item))
        : [next, ...current[activeModule]],
    }));
    setModal(null);
    showNotice(`${currentModule.label.replace(" Management", "")} saved successfully.`);
  };

  const removeRecord = (record) => {
    const dependent =
      activeModule === "facilities" &&
      (data.sports.some((item) => item.facility === record.id) ||
        data.coaches.some((item) => item.facility === record.id));
    if (dependent) {
      showNotice("This facility has related records. Reassign or remove them before deleting.");
      return;
    }
    if (!window.confirm(`Delete ${record.name || record.title}?`)) return;
    setData((current) => ({ ...current, [activeModule]: current[activeModule].filter((item) => item.id !== record.id) }));
    showNotice("Record deleted.");
  };

  const logout = () => {
    window.localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <aside className={`fixed inset-y-0 left-0 z-30 flex flex-col bg-brand-dark text-white transition-all ${collapsed ? "w-20" : "w-72"}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary font-display text-xl font-extrabold">K</div>
          {!collapsed && <div><p className="font-display text-lg font-extrabold">KhelGujarat</p><p className="text-[10px] uppercase tracking-[0.2em] text-brand-light">Admin Console</p></div>}
        </div>
        <nav className="flex-1 space-y-2 px-3 py-6">
          <p className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 ${collapsed ? "hidden" : ""}`}>Management</p>
          {MODULES.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveModule(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activeModule === id ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}>
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed && label}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button type="button" onClick={() => navigate("/explore")} className={`mb-2 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-brand-light hover:bg-white/10 ${collapsed ? "justify-center" : ""}`}>
            <ShieldCheck className="h-5 w-5" /> {!collapsed && "View public portal"}
          </button>
          <button type="button" onClick={logout} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : ""}`}>
            <span className="text-lg">↪</span> {!collapsed && "Sign out"}
          </button>
        </div>
      </aside>

      <main className={`min-h-screen transition-all ${collapsed ? "ml-20" : "ml-72"}`}>
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setCollapsed((value) => !value)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Toggle sidebar"><Menu className="h-5 w-5" /></button>
            <div><p className="text-xs font-medium text-slate-400">Admin / Management</p><h1 className="font-display text-xl font-extrabold text-brand-dark">{currentModule.label}</h1></div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100" aria-label="Notifications"><AlertTriangle className="h-5 w-5" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-500" /></button>
            <div className="hidden items-center gap-2 border-l border-slate-200 pl-4 sm:flex"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand-primary">AD</div><div><p className="text-sm font-bold">Admin User</p><p className="text-[11px] text-slate-400">Department Admin</p></div><ChevronDown className="h-4 w-4 text-slate-400" /></div>
          </div>
        </header>

        <section className="mx-auto max-w-[1500px] p-5 sm:p-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div><p className="mb-1 text-sm font-medium text-slate-500">Gujarat Sports Infrastructure</p><h2 className="font-display text-3xl font-extrabold tracking-tight text-brand-dark">Manage your {activeModule}</h2></div>
            <button type="button" onClick={() => setModal({ record: { ...blankRecords[activeModule] } })} className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-primary/20 transition hover:bg-brand-dark"><Plus className="h-4 w-4 shrink-0" /> Add {ACTION_LABELS[activeModule]}</button>
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Total records" value={data[activeModule].length} />
            <Metric label="Active" value={data[activeModule].filter((item) => item.status === "Active").length} />
            <Metric label="Needs attention" value={data[activeModule].filter((item) => ["Open", "In Progress", "Under Development"].includes(item.status)).length} />
            <Metric label="Last updated" value="Today" />
          </div>
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${activeModule}...`} className="w-full rounded-xl border-0 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none ring-brand-primary/20 focus:ring-2" /></div>
            <select value={district} onChange={(event) => setDistrict(event.target.value)} className="rounded-xl border-0 bg-slate-50 px-3 py-2.5 text-sm text-slate-600 outline-none ring-brand-primary/20 focus:ring-2"><option value="">All districts</option>{DISTRICTS.map((item) => <option key={item}>{item}</option>)}</select>
            <span className="px-2 text-xs font-semibold text-slate-400">{records.length} result{records.length === 1 ? "" : "s"}</span>
          </div>
          <RecordTable module={activeModule} records={records} facilities={facilitiesById} onEdit={(record) => setModal({ record })} onDelete={removeRecord} />
        </section>
      </main>
      {notice && <div className="fixed bottom-6 right-6 z-50 max-w-sm rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
      {modal && <RecordModal module={activeModule} record={modal.record} facilities={data.facilities} onClose={() => setModal(null)} onSave={saveRecord} />}
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold text-slate-400">{label}</p><p className="mt-1 font-display text-2xl font-extrabold text-brand-dark">{value}</p></div>;
}

function RecordTable({ module, records, facilities, onEdit, onDelete }) {
  const fields = {
    facilities: ["name", "district", "status", "lastMaintenanceDate", "sports", "coaches"],
    sports: ["name", "category", "facility", "units", "type", "availability", "status"],
    coaches: ["name", "sport", "facility", "qualification", "contact", "status"],
  }[module];
  const labels = { name: "Name", district: "District", category: "Category", facility: "Facility", sports: "Sports", coaches: "Coaches", units: "Units", type: "Format", availability: "Availability", qualification: "Qualification", contact: "Contact", lastMaintenanceDate: "Last maintenance", status: "Status" };
  const display = (field, value) => field === "facility" ? facilities[value] || "Unassigned" : value;
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left"><thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500"><tr>{fields.map((field) => <th key={field} className="px-5 py-4 font-bold">{labels[field]}</th>)}<th className="px-5 py-4 text-right font-bold">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{records.length ? records.map((record) => <tr key={record.id} className="transition hover:bg-slate-50/80">{fields.map((field) => <td key={field} className="px-5 py-4 text-sm">{field === "status" || field === "availability" || field === "priority" ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(display(field, record[field]))}`}>{display(field, record[field])}</span> : <span className={field === "name" || field === "title" ? "font-bold text-slate-800" : "text-slate-500"}>{display(field, record[field])}</span>}</td>)}<td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" onClick={() => onEdit(record)} className="rounded-lg p-2 text-slate-400 hover:bg-brand-soft hover:text-brand-primary" aria-label="Edit"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => onDelete(record)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button></div></td></tr>) : <tr><td colSpan={fields.length + 1} className="px-5 py-16 text-center text-sm text-slate-400">No records match your search.</td></tr>}</tbody></table></div></div>;
}

function RecordModal({ module, record: initialRecord, facilities, onClose, onSave }) {
  const [record, setRecord] = useState(initialRecord);
  const [images, setImages] = useState(initialRecord.images || (initialRecord.image ? [initialRecord.image] : []));
  const isFacility = module === "facilities";
  const update = (key, value) => setRecord((current) => ({ ...current, [key]: value }));
  const readFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const selectedImages = await Promise.all(files.map(readFile));
    const nextImages = isFacility ? [...images, ...selectedImages] : selectedImages.slice(0, 1);
    setImages(nextImages);
    update("images", isFacility ? nextImages : []);
    update(isFacility ? "coverImage" : "image", nextImages[0] || "");
  };
  const removeImage = (index) => {
    const nextImages = images.filter((_, imageIndex) => imageIndex !== index);
    setImages(nextImages);
    update("images", nextImages);
    update(isFacility ? "coverImage" : "image", nextImages[0] || "");
  };
  const setCover = (image) => update("coverImage", image);
  const fields = {
    facilities: [
      ["name", "Sports complex name", "text"], ["district", "District", "select", DISTRICTS], ["city", "City", "text"], ["locality", "Area / locality", "text"],
      ["manager", "Complex manager", "text"], ["contact", "Contact number", "tel"], ["email", "Official email", "email"], ["year", "Year established", "number"], ["latitude", "Latitude", "number"], ["longitude", "Longitude", "number"], ["lastMaintenanceDate", "Last maintenance date", "date"], ["address", "Complete address", "textarea"], ["status", "Status", "select", STATUSES],
    ],
    sports: [["name", "Sport name", "text"], ["category", "Category", "select", ["Team Sport", "Racquet", "Aquatics", "Athletics", "Combat", "Other"]], ["facility", "Sports complex", "facility"], ["units", "Courts / units", "number"], ["type", "Indoor / outdoor", "select", ["Indoor", "Outdoor"]], ["availability", "Availability", "select", ["Available", "Limited", "Unavailable"]], ["status", "Status", "select", ["Active", "Inactive"]], ["config", "Infrastructure configuration", "textarea"]],
    coaches: [["name", "Coach name", "text"], ["sport", "Primary sport", "text"], ["facility", "Sports complex", "facility"], ["qualification", "Qualification", "text"], ["contact", "Contact number", "tel"], ["status", "Status", "select", ["Active", "Inactive"]]],
  }[module];
  const submit = (event) => { event.preventDefault(); if (!record.name && !record.title) return; onSave(record); };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-primary">{initialRecord.id ? "Edit record" : "New record"}</p><h3 className="font-display text-2xl font-extrabold text-brand-dark">{isFacility ? "Facility details" : `Add ${ACTION_LABELS[module]}`}</h3></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></div><form onSubmit={submit} className="p-6"><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, type, options]) => <label key={key} className={type === "textarea" ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{type === "textarea" ? <textarea required={key === "address"} value={record[key] || ""} onChange={(event) => update(key, event.target.value)} rows={3} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10" /> : type === "select" || type === "facility" ? <select required value={record[key] || ""} onChange={(event) => update(key, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10"><option value="">Select {label.toLowerCase()}</option>{(type === "facility" ? facilities.map((item) => ({ value: item.id, label: item.name })) : options.map((item) => ({ value: item, label: item }))).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input required={["name", "title", "district", "facility"].includes(key)} type={type} min={type === "number" && !["latitude", "longitude", "year"].includes(key) ? 1 : undefined} value={record[key] || ""} onChange={(event) => update(key, event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10" />}</label>)}</div>{isFacility && <LocationPicker latitude={record.latitude} longitude={record.longitude} onChange={(latitude, longitude) => setRecord((current) => ({ ...current, latitude, longitude }))} />}{(isFacility || module === "sports") && <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold">{isFacility ? "Complex image gallery" : "Sport image"}</p><p className="text-xs text-slate-400">{isFacility ? "Upload multiple images and choose one as the cover." : "This image is used only for this sport."}</p></div><label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-primary shadow-sm"><ImagePlus className="h-4 w-4" /> Choose image{isFacility ? "s" : ""}<input type="file" accept="image/*" multiple={isFacility} onChange={upload} className="hidden" /></label></div>{images.length > 0 && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{images.map((image, index) => <div key={`${image}-${index}`} className="relative"><img src={image} alt={`${isFacility ? "Complex" : "Sport"} preview ${index + 1}`} className="h-24 w-full rounded-xl object-cover" /><button type="button" onClick={() => removeImage(index)} className="absolute right-1 top-1 rounded-full bg-white px-1.5 py-0.5 text-xs text-red-600 shadow" aria-label="Remove image">×</button>{isFacility && <button type="button" onClick={() => setCover(image)} className={`mt-1 w-full rounded-lg px-2 py-1 text-[10px] font-bold ${record.coverImage === image ? "bg-brand-primary text-white" : "bg-white text-slate-500"}`}>{record.coverImage === image ? "Cover image" : "Make cover"}</button>}</div>)}</div>}</div>}<div className="mt-7 flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100">Cancel</button><button type="submit" className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-dark">Save record</button></div></form></div></div>;
}

function LocationPicker({ latitude, longitude, onChange }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return undefined;
    const map = L.map(mapRef.current, { center: hasCoordinates ? [lat, lng] : [22.45, 71.9], zoom: hasCoordinates ? 14 : 7.4 });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);
    mapInstanceRef.current = map;

    const setLocation = (event) => {
      const nextLat = event.latlng.lat.toFixed(6);
      const nextLng = event.latlng.lng.toFixed(6);
      onChange(nextLat, nextLng);
    };
    map.on("click", setLocation);
    if (hasCoordinates) markerRef.current = L.marker([lat, lng]).addTo(map);

    window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      map.off("click", setLocation);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !hasCoordinates) return;
    if (!markerRef.current) markerRef.current = L.marker([lat, lng]).addTo(map);
    else markerRef.current.setLatLng([lat, lng]);
  }, [hasCoordinates, lat, lng]);

  return <div className="sm:col-span-2 mt-1 rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="mb-2 flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-slate-700">Choose complex location</p><p className="text-xs text-slate-400">Click on the map to set the latitude and longitude.</p></div><span className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-500">{hasCoordinates ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "No location selected"}</span></div><div ref={mapRef} className="h-64 w-full overflow-hidden rounded-xl" /></div>;
}
