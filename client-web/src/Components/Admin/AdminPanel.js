import React, { useEffect, useMemo, useRef, useState } from "react";
import { Building2, ClipboardList, Edit3, LayoutDashboard, Loader2, PanelLeftClose, PanelLeftOpen, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { Navigate, useSearchParams } from "react-router-dom";
import L from "leaflet";
import AdminSidebar from "./AdminSidebar";
import { api } from "../../API/client";
import UploadImageField from "../Common/UploadImageField";
import { ConfirmDialog } from "./Common/AdminUI";

const MODULES = [
  { id: "facilities", label: "Facility Management", icon: Building2 },
  { id: "sports", label: "Sports Management", icon: LayoutDashboard },
  { id: "coaches", label: "Coach Management", icon: UserRound },
  { id: "evaluationTemplates", label: "Evaluation Templates", icon: ClipboardList },
];
const FACILITY_TYPES = ["Sports Complex", "Stadium", "Indoor Hall", "Training Centre", "Playground"];
const DEFAULT_MAINTENANCE = {
  enabled: false,
  frequencyDays: 30,
  notifyDaysBefore: 3,
  priority: "Medium",
  checklistTitle: "",
  checklistNotes: "",
};
const EMPTY = {
  facilities: { name: "", facilityType: "Sports Complex", district: "", city: "", location: "", latitude: "", longitude: "", contactPhone: "", contactEmail: "", operationalSince: "", status: "Active", picture: "", managerName: "", managerEmail: "", managerContact: "", managerPassword: "" },
  sports: { name: "", category: "", description: "", image: "", status: "Active", maintenanceCycle: { ...DEFAULT_MAINTENANCE } },
  coaches: { name: "", email: "", contact: "", password: "", facilityId: "", sportIds: [], qualification: "", experience: 0, status: "Active" },
  evaluationTemplates: { sportId: "", parameters: [{ name: "", weightage: 20, evaluationType: "qualitative", maxScore: 5, scoringMethod: "higher_is_better", instructions: "" }], recognitionLevels: [{ minScore: 90, label: "Outstanding", badge: "gold" }] },
};
const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/10";
const idOf = (row) => row._id || row.id;

function normalize(module, row) {
  if (module === "facilities") return { ...row, facilityType: row.facilityType || "Sports Complex", district: row.district?._id || row.district || "", managerName: row.manager?.Name || "", managerEmail: row.manager?.Email || "", managerContact: row.manager?.ContactNum || "", managerPassword: "" };
  if (module === "sports") return { ...row, name: row.SportName, category: row.Category, image: row.baseUrl || "", maintenanceCycle: { ...DEFAULT_MAINTENANCE, ...(row.maintenanceCycle || {}) } };
  if (module === "evaluationTemplates") return { ...row, sportId: row.sport?._id || row.sport || "", parameters: (row.parameters || []).map((item) => ({ ...item, benchmark: item.benchmark || {} })) };
  return { ...row, name: row.userId?.Name || "", email: row.userId?.Email || "", contact: row.userId?.ContactNum || "", password: "", facilityId: row.SportComplexId?._id || "", sportIds: (row.sports || []).map((item) => item.sport?._id || item.sport), experience: row.sports?.[0]?.experience || 0 };
}

export default function AdminPanel() {
  const [params] = useSearchParams();
  const requested = params.get("section");
  const [active, setActive] = useState(MODULES.some((item) => item.id === requested) ? requested : "facilities");
  const [data, setData] = useState({ facilities: [], sports: [], coaches: [], evaluationTemplates: [] });
  const [districts, setDistricts] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [facilities, sports, coaches, districtResult, templates] = await Promise.all([
        api.get("/api/admin/facilities"), api.get("/api/admin/sports"),
        api.get("/api/admin/coaches"), api.get("/getDistrict", { auth: false }),
        api.get("/api/admin/evaluation-templates"),
      ]);
      setData({ facilities: facilities.data || [], sports: sports.data || [], coaches: coaches.data || [], evaluationTemplates: templates.data || [] });
      setDistricts(districtResult.data || []);
    } catch (error) {
      setNotice({ type: "error", text: error.message });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (MODULES.some((item) => item.id === requested)) setActive(requested); }, [requested]);
  useEffect(() => setQuery(""), [active]);

  const records = useMemo(() => {
    const rows = data[active] || [];
    const term = query.trim().toLowerCase();
    return term ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(term)) : rows;
  }, [active, data, query]);
  const current = MODULES.find((item) => item.id === active) || MODULES[0];

  if (requested === "achievements") {
    return <Navigate to="/admin/insights/achievements" replace />;
  }

  const save = async (record) => {
    const id = idOf(record);
    if (active === "evaluationTemplates") {
      const total = record.parameters.reduce((sum, item) => sum + Number(item.weightage || 0), 0);
      if (!record.sportId) throw new Error("Select a sport.");
      if (Math.abs(total - 100) > 0.0001) throw new Error("Parameter weightages must total 100%");
      if (id && record.status === "Draft") {
        await api.patch(`/api/admin/evaluation-templates/${id}`, record);
      } else {
        await api.post("/api/admin/evaluation-templates", {
          sportId: record.sportId,
          parameters: record.parameters,
          recognitionLevels: record.recognitionLevels,
          scoringFormula: "weighted_sum",
        });
      }
      setModal(null);
      setNotice({ type: "success", text: "Evaluation template saved as Draft." });
      await load();
      return;
    }
    const body = active === "facilities"
      ? {
          ...record,
          contactPhone: record.managerContact,
          contactEmail: record.managerEmail,
          manager: {
            name: record.managerName,
            email: record.managerEmail,
            contact: record.managerContact,
            password: record.managerPassword,
          },
        }
      : record;
    const path = `/api/admin/${active}${id ? `/${id}` : ""}`;
    if (id) await api.patch(path, body); else await api.post(path, body);
    setModal(null);
    setNotice({ type: "success", text: "Record saved successfully." });
    await load();
  };
  const remove = (record) => setConfirmDelete(record);
  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await api.del(`/api/admin/${active}/${idOf(confirmDelete)}`);
      setNotice({ type: "success", text: "Record deleted." });
      setConfirmDelete(null);
      await load();
    } catch (error) {
      setNotice({ type: "error", text: error.message });
      setConfirmDelete(null);
    }
  };

  return <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
    <aside className={`fixed inset-y-0 left-0 z-30 border-r border-slate-200/90 bg-white shadow-[1px_0_0_rgba(15,23,42,0.04),8px_0_24px_-16px_rgba(15,23,42,0.12)] transition-[width] duration-200 ease-out ${collapsed ? "w-[76px]" : "w-[260px]"}`}><AdminSidebar collapsed={collapsed} /></aside>
    <main className={`min-h-screen transition-[margin] duration-200 ease-out ${collapsed ? "ml-[76px]" : "ml-[260px]"}`}>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-md">
        <button onClick={() => setCollapsed((value) => !value)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}</button>
        <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
        <div><p className="text-[11px] font-bold uppercase tracking-wider text-brand-primary">Admin · Master directory</p><h1 className="font-display text-base font-extrabold text-slate-900">{current.label}</h1></div>
      </header>
      <section className="mx-auto max-w-[1440px] p-6 sm:p-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div><p className="text-sm text-slate-500">Database-backed master directory</p><h2 className="font-display text-3xl font-extrabold text-brand-dark">{current.label}</h2></div>
          <button onClick={() => setModal({ ...EMPTY[active] })} className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add {{ facilities: "facility", sports: "sport", coaches: "coach", evaluationTemplates: "template" }[active]}</button>
        </div>
        {notice ? <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{notice.text}</div> : null}
        <p className="mb-4 text-sm font-bold text-slate-700">
          {current.label}: <span className="text-brand-primary tabular-nums">{records.length}</span>
        </p>
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${active}...`} className="w-full rounded-xl bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none" /></div><span className="text-xs font-semibold text-slate-400">{records.length} records</span>
        </div>
        {loading ? <div className="flex justify-center rounded-2xl border bg-white py-20"><Loader2 className="h-7 w-7 animate-spin text-brand-primary" /></div> : <RecordTable module={active} records={records} onEdit={(row) => setModal(active === "evaluationTemplates" ? (row.status === "Draft" ? normalize(active, row) : { sportId: row.sport?._id || row.sport || "", parameters: row.parameters.map((item) => ({ ...item, benchmark: item.benchmark || {} })), recognitionLevels: row.recognitionLevels || [] }) : normalize(active, row))} onDelete={remove} onPublish={async (row) => {
          try { await api.post(`/api/admin/evaluation-templates/${row._id}/publish`, {}); setNotice({ type: "success", text: "Evaluation template published." }); await load(); }
          catch (error) { setNotice({ type: "error", text: error.message }); }
        }} />}
      </section>
    </main>
    {modal ? <RecordModal module={active} record={modal} facilities={data.facilities} sports={data.sports} districts={districts} onClose={() => setModal(null)} onSave={save} /> : null}
    <ConfirmDialog
      open={Boolean(confirmDelete)}
      title="Delete record?"
      description="This action permanently removes the selected master record. Active dependencies may be affected."
      confirmLabel="Delete record"
      tone="danger"
      onConfirm={executeDelete}
      onCancel={() => setConfirmDelete(null)}
    />
  </div>;
}

function RecordTable({ module, records, onEdit, onDelete, onPublish }) {
  if (module === "evaluationTemplates") {
    return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Sport</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Parameters</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{records.length ? records.map((record) => <tr key={record._id}><td className="px-5 py-4 font-bold">{record.sport?.SportName || "—"}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{record.status}</span></td><td className="px-5 py-4 text-sm text-slate-500">{record.parameters?.map((item) => item.name).join(", ")}</td><td className="px-5 py-4"><div className="flex justify-end gap-2">{record.status === "Draft" ? <button onClick={() => onPublish(record)} className="rounded-lg bg-brand-primary px-3 py-2 text-xs font-bold text-white">Publish</button> : null}<button onClick={() => onEdit(record)} className="rounded-lg p-2 text-slate-400 hover:text-brand-primary"><Edit3 className="h-4 w-4" /></button></div></td></tr>) : <tr><td colSpan={4} className="px-5 py-16 text-center text-sm text-slate-400">No evaluation templates found.</td></tr>}</tbody></table></div></div>;
  }
  const headers = module === "facilities" ? ["Facility", "Type", "District", "Manager", "Status"] : module === "sports" ? ["Sport", "Category", "Maintenance Cycle", "Status"] : ["Coach", "Facility", "Sports", "Qualification", "Status"];
  const values = (row) => module === "facilities"
    ? [row.name, row.facilityType || "Sports Complex", row.district?.District || "—", row.manager?.Name || "Unassigned", row.status]
    : module === "sports"
      ? [
          row.SportName,
          row.Category,
          row.maintenanceCycle?.enabled
            ? `Every ${row.maintenanceCycle.frequencyDays} days (${row.maintenanceCycle.priority || "Medium"})`
            : "Not configured",
          row.status,
        ]
      : [row.userId?.Name || "—", row.SportComplexId?.name || "—", (row.sports || []).map((item) => item.sport?.SportName).filter(Boolean).join(", "), row.qualification || "—", row.status];
  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map((header) => <th key={header} className="px-5 py-4">{header}</th>)}<th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{records.length ? records.map((record) => <tr key={idOf(record)} className="hover:bg-slate-50">{values(record).map((value, cell) => <td key={cell} className={`px-5 py-4 text-sm ${cell === 0 ? "font-bold text-slate-800" : "text-slate-500"}`}>{String(value || "—")}</td>)}<td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => onEdit(record)} className="rounded-lg p-2 text-slate-400 hover:text-brand-primary"><Edit3 className="h-4 w-4" /></button><button onClick={() => onDelete(record)} className="rounded-lg p-2 text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button></div></td></tr>) : <tr><td colSpan={headers.length + 1} className="px-5 py-16 text-center text-sm text-slate-400">No records found.</td></tr>}</tbody></table></div></div>;
}

function RecordModal({ module, record: initial, facilities, sports, districts, onClose, onSave }) {
  const [record, setRecord] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setRecord((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (
      module === "facilities" &&
      (record.latitude === "" ||
        record.longitude === "" ||
        !Number.isFinite(Number(record.latitude)) ||
        !Number.isFinite(Number(record.longitude)))
    ) {
      setError("Select the facility location on the map.");
      return;
    }
    setSaving(true); setError("");
    try { await onSave(record); } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };
  const isNew = !idOf(initial);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4"><div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
    <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-widest text-brand-primary">{isNew ? "New record" : "Edit record"}</p><h3 className="font-display text-2xl font-extrabold text-brand-dark">{module === "facilities" ? "Facility and manager" : module === "sports" ? "Global sport metadata" : module === "evaluationTemplates" ? "Sport evaluation template" : "Coach assignment"}</h3></div><button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button></div>
    <form onSubmit={submit} className="space-y-6 p-6">
      {module === "facilities" ? <FacilityFields record={record} update={update} districts={districts} isNew={isNew} /> : null}
      {module === "sports" ? <SportFields record={record} update={update} /> : null}
      {module === "coaches" ? <CoachFields record={record} update={update} facilities={facilities} sports={sports} isNew={isNew} /> : null}
      {module === "evaluationTemplates" ? <TemplateFields record={record} update={update} sports={sports} /> : null}
      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Save</button></div>
    </form>
  </div></div>;
}

const Field = ({ label, children, full = false }) => <label className={full ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>{children}</label>;

function TemplateFields({ record, update, sports }) {
  const setParameters = (parameters) => update("parameters", parameters);
  const updateParameter = (index, key, value) => setParameters(record.parameters.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  const total = record.parameters.reduce((sum, item) => sum + Number(item.weightage || 0), 0);
  return <div className="space-y-5">
    <Field label="Sport"><select required className={input} value={record.sportId} onChange={(event) => update("sportId", event.target.value)}><option value="">Select sport</option>{sports.map((sport) => <option key={sport._id} value={sport._id}>{sport.SportName}</option>)}</select></Field>
    <div className="flex items-center justify-between"><h4 className="font-display text-lg font-extrabold text-brand-dark">Evaluation parameters</h4><span className={`rounded-full px-3 py-1 text-xs font-bold ${total === 100 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>Total weight: {total}%</span></div>
    <div className="space-y-3">{record.parameters.map((parameter, index) => <div key={index} className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-12">
      <label className="md:col-span-3"><span className="mb-1 block text-xs font-bold text-slate-600">Parameter name</span><input required className={input} value={parameter.name} onChange={(event) => updateParameter(index, "name", event.target.value)} /></label>
      <label className="md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">Weight %</span><input required type="number" min="1" max="100" className={input} value={parameter.weightage} onChange={(event) => updateParameter(index, "weightage", Number(event.target.value))} /></label>
      <label className="md:col-span-3"><span className="mb-1 block text-xs font-bold text-slate-600">Evaluation type</span><select className={input} value={parameter.evaluationType} onChange={(event) => updateParameter(index, "evaluationType", event.target.value)}><option value="qualitative">Qualitative</option><option value="quantitative">Quantitative</option><option value="statistical">Statistical</option></select></label>
      <label className="md:col-span-2"><span className="mb-1 block text-xs font-bold text-slate-600">Maximum score</span><input type="number" min="1" className={input} value={parameter.maxScore || 5} onChange={(event) => updateParameter(index, "maxScore", Number(event.target.value))} /></label>
      <button type="button" className="md:col-span-2 self-end rounded-xl border border-red-200 px-3 py-2.5 text-sm font-bold text-red-600" onClick={() => setParameters(record.parameters.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
      <label className="md:col-span-12"><span className="mb-1 block text-xs font-bold text-slate-600">Instructions</span><input className={input} value={parameter.instructions || ""} onChange={(event) => updateParameter(index, "instructions", event.target.value)} /></label>
    </div>)}</div>
    <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-brand-primary px-4 py-2.5 text-sm font-bold text-brand-primary" onClick={() => setParameters([...record.parameters, { name: "", weightage: 0, evaluationType: "qualitative", maxScore: 5, scoringMethod: "higher_is_better", instructions: "" }])}><Plus className="h-4 w-4" />Add parameter</button>
  </div>;
}
function FacilityFields({ record, update, districts, isNew }) {
  return <><div className="grid gap-4 sm:grid-cols-2">
    <Field label="Facility name"><input required className={input} value={record.name} onChange={(e) => update("name", e.target.value)} /></Field>
    <Field label="Facility type"><select required className={input} value={record.facilityType || "Sports Complex"} onChange={(e) => update("facilityType", e.target.value)}>{FACILITY_TYPES.map((value) => <option key={value} value={value}>{value}</option>)}</select></Field>
    <Field label="District"><select required className={input} value={record.district} onChange={(e) => update("district", e.target.value)}><option value="">Select district</option>{districts.map((row) => <option key={row._id} value={row._id}>{row.District}</option>)}</select></Field>
    <Field label="City / taluka"><input className={input} value={record.city || ""} onChange={(e) => update("city", e.target.value)} /></Field><Field label="Operational since"><input type="date" className={input} value={record.operationalSince || ""} onChange={(e) => update("operationalSince", e.target.value)} /></Field>
    <Field label="Status"><select className={input} value={record.status} onChange={(e) => update("status", e.target.value)}>{["Active", "Inactive", "Under Development", "Temporarily Closed"].map((value) => <option key={value}>{value}</option>)}</select></Field><UploadImageField label="Facility cover image" value={record.picture || ""} onChange={(value) => update("picture", value)} />
    <Field label="Complete address" full><textarea required rows={3} className={input} value={record.location} onChange={(e) => update("location", e.target.value)} /></Field>
    <div className="sm:col-span-2"><FacilityLocationMap latitude={record.latitude} longitude={record.longitude} onChange={(latitude, longitude) => { update("latitude", latitude); update("longitude", longitude); }} /></div>
  </div><div><h4 className="mb-3 font-display text-lg font-extrabold text-brand-dark">Facility manager account</h4><div className="grid gap-4 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
    <Field label="Manager name"><input required className={input} value={record.managerName} onChange={(e) => update("managerName", e.target.value)} /></Field><Field label="Manager email"><input required type="email" className={input} value={record.managerEmail} onChange={(e) => update("managerEmail", e.target.value)} /></Field>
    <Field label="Contact number"><input required className={input} value={record.managerContact} onChange={(e) => update("managerContact", e.target.value)} /></Field><Field label={isNew ? "Temporary password" : "New password (optional)"}><input required={isNew} minLength={8} type="password" className={input} value={record.managerPassword} onChange={(e) => update("managerPassword", e.target.value)} /></Field>
  </div></div></>;
}

function FacilityLocationMap({ latitude, longitude, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasLocation =
    latitude !== "" &&
    longitude !== "" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined;

    const map = L.map(containerRef.current, {
      center: hasLocation ? [lat, lng] : [22.45, 71.9],
      zoom: hasLocation ? 15 : 7,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    if (hasLocation) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }

    const chooseLocation = ({ latlng }) => {
      const nextLatitude = latlng.lat.toFixed(6);
      const nextLongitude = latlng.lng.toFixed(6);
      if (!markerRef.current) {
        markerRef.current = L.marker(latlng).addTo(map);
      } else {
        markerRef.current.setLatLng(latlng);
      }
      onChangeRef.current(nextLatitude, nextLongitude);
    };

    map.on("click", chooseLocation);
    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.off("click", chooseLocation);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !hasLocation) return;
    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
  }, [hasLocation, lat, lng]);

  return <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
      <div><p className="text-sm font-bold text-slate-700">Facility location</p><p className="text-xs text-slate-500">Click the map to place the facility marker.</p></div>
      <span className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${hasLocation ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{hasLocation ? `${lat.toFixed(6)}, ${lng.toFixed(6)}` : "Location required"}</span>
    </div>
    <div ref={containerRef} className="h-80 w-full" />
  </div>;
}
function SportFields({ record, update }) {
  const mc = record.maintenanceCycle || DEFAULT_MAINTENANCE;
  const setMc = (patch) => update("maintenanceCycle", { ...mc, ...patch });
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Sport name"><input required className={input} value={record.name} onChange={(e) => update("name", e.target.value)} /></Field><Field label="Category"><input required className={input} placeholder="Aquatics, Racquet, Team..." value={record.category} onChange={(e) => update("category", e.target.value)} /></Field>
      <Field label="Status"><select className={input} value={record.status} onChange={(e) => update("status", e.target.value)}><option>Active</option><option>Inactive</option></select></Field><UploadImageField label="Sport image" value={record.image || ""} onChange={(value) => update("image", value)} />
      <Field label="Description" full><textarea rows={3} className={input} value={record.description} onChange={(e) => update("description", e.target.value)} /></Field>
    </div>
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-display text-base font-extrabold text-brand-dark">Periodic Maintenance &amp; Condition Assessment Cycle</h4>
          <p className="text-xs text-slate-500">Applies uniformly to every facility offering this sport. Managers are notified automatically when a review is due.</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">
          <input type="checkbox" checked={Boolean(mc.enabled)} onChange={(e) => setMc({ enabled: e.target.checked })} />
          Enable cycle
        </label>
      </div>
      {mc.enabled ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assessment frequency">
            <select className={input} value={mc.frequencyDays || 30} onChange={(e) => setMc({ frequencyDays: Number(e.target.value) })}>
              <option value={7}>Weekly (every 7 days)</option>
              <option value={14}>Fortnightly (every 14 days)</option>
              <option value={30}>Monthly (every 30 days)</option>
              <option value={60}>Every 2 months (60 days)</option>
              <option value={90}>Quarterly (every 90 days)</option>
              <option value={180}>Half-yearly (every 180 days)</option>
              <option value={365}>Yearly (every 365 days)</option>
            </select>
          </Field>
          <Field label="Notify manager before due date (days)">
            <input type="number" min={0} max={30} className={input} value={mc.notifyDaysBefore ?? 3} onChange={(e) => setMc({ notifyDaysBefore: Number(e.target.value) })} />
          </Field>
          <Field label="Priority level">
            <select className={input} value={mc.priority || "Medium"} onChange={(e) => setMc({ priority: e.target.value })}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </Field>
          <Field label="Assessment checklist title">
            <input className={input} placeholder="e.g. Court Surface & Lighting Check" value={mc.checklistTitle || ""} onChange={(e) => setMc({ checklistTitle: e.target.value })} />
          </Field>
          <Field label="Inspection instructions for facility manager" full>
            <textarea rows={2} className={input} placeholder="Describe key parameters to inspect during the periodic condition review..." value={mc.checklistNotes || ""} onChange={(e) => setMc({ checklistNotes: e.target.value })} />
          </Field>
        </div>
      ) : null}
    </div>
  </div>;
}
function CoachFields({ record, update, facilities, sports, isNew }) {
  const toggle = (id) => update("sportIds", record.sportIds.includes(id) ? record.sportIds.filter((value) => value !== id) : [...record.sportIds, id]);
  return <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Coach name"><input required className={input} value={record.name} onChange={(e) => update("name", e.target.value)} /></Field><Field label="Email"><input required type="email" className={input} value={record.email} onChange={(e) => update("email", e.target.value)} /></Field>
    <Field label="Contact"><input required className={input} value={record.contact} onChange={(e) => update("contact", e.target.value)} /></Field><Field label={isNew ? "Temporary password" : "New password (optional)"}><input required={isNew} minLength={8} type="password" className={input} value={record.password} onChange={(e) => update("password", e.target.value)} /></Field>
    <Field label="Facility"><select required className={input} value={record.facilityId} onChange={(e) => update("facilityId", e.target.value)}><option value="">Select facility</option>{facilities.map((row) => <option key={row._id} value={row._id}>{row.name}</option>)}</select></Field><Field label="Qualification"><input className={input} value={record.qualification} onChange={(e) => update("qualification", e.target.value)} /></Field>
    <Field label="Experience (years)"><input min="0" type="number" className={input} value={record.experience} onChange={(e) => update("experience", e.target.value)} /></Field><Field label="Status"><select className={input} value={record.status} onChange={(e) => update("status", e.target.value)}><option>Active</option><option>Inactive</option></select></Field>
    <Field label="Sports" full><div className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-3">{sports.map((sport) => <label key={sport._id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={record.sportIds.includes(sport._id)} onChange={() => toggle(sport._id)} />{sport.SportName}</label>)}</div></Field>
  </div>;
}
