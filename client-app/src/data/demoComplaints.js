// One grievance written here shows up for the citizen, the facility manager,
// the district authority, and the admin grievance list. Browser only.
import { demoStore } from "./demoStore";
import { MANAGER_FACILITY } from "./manager/managerDemoData";
import {
  DEMO_AUTHORITY_COMPLAINTS,
  DEMO_COMPLAINT_TYPES,
  DEMO_MANAGER_COMPLAINTS,
  saveDemoComplaint,
} from "./offlineLists";

const LEVEL_LABELS = {
  0: "Level 0 · Supervisor",
  1: "Level 1 · Manager",
  2: "Level 2 · Authority",
  3: "Level 3 · Admin",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function typeName(typeId) {
  const match = DEMO_COMPLAINT_TYPES.find((item) => item._id === typeId);
  return match ? match.Type : typeId || "Complaint";
}

function citizenView(row) {
  if (!row.forCitizen) return null;
  return {
    id: row._id,
    facilityId: MANAGER_FACILITY.id,
    facilityName: MANAGER_FACILITY.name,
    district: MANAGER_FACILITY.district,
    category: row.type?.Type || "Complaint",
    subject: row.Description,
    description: row.Description,
    status: Number(row.status) === 1 ? "Resolved" : "Pending",
    statusCode: Number(row.status) === 1 ? 1 : 0,
    level: Number(row.level) || 0,
    levelLabel: LEVEL_LABELS[Number(row.level) || 0],
    submittedAt: row.date,
    resolvedAt: Number(row.status) === 1 ? row.date : null,
    updatedAt: row.date,
    satisfied: 0,
    attachments: [],
    remarks: row.remarks || [],
    demo: true,
  };
}

export function linkedCitizenComplaints() {
  return DEMO_MANAGER_COMPLAINTS.map(citizenView).filter(Boolean);
}

export function registerComplaint({
  description,
  typeId,
  category,
  raisedBy,
  citizenName,
  role,
  level,
  forCitizen,
}) {
  const id = `COM-${Date.now()}`;
  const name = category || typeName(typeId);
  const atLevel = level == null ? (raisedBy === "manager" ? 2 : 0) : Number(level);
  const lists = atLevel >= 2 ? ["manager", "authority"] : ["manager"];
  const row = saveDemoComplaint({
    _id: id,
    date: today(),
    level: atLevel,
    status: 0,
    Description: description,
    raisedBy: raisedBy || "citizen",
    forCitizen: Boolean(forCitizen),
    userId: { Name: citizenName || "Citizen", Role: role == null ? 0 : role },
    sportsComplex: { name: MANAGER_FACILITY.name },
    type: { Type: name },
    remarks: [],
    photo: [],
    lists,
  });

  demoStore.addGrievance({
    id,
    subject: description,
    description,
    category: name,
    level: atLevel,
    citizen: citizenName || "Citizen",
    submittedAt: row.date,
  });

  return citizenView({ ...row, forCitizen: true }) || {
    id,
    category: name,
    subject: description,
    description,
    status: "Pending",
    level: atLevel,
    levelLabel: LEVEL_LABELS[atLevel],
    demo: true,
  };
}

export function settleComplaint(id, { status, level, remark, actor }) {
  const managerRow = DEMO_MANAGER_COMPLAINTS.find((row) => row._id === id);
  const authorityRow = DEMO_AUTHORITY_COMPLAINTS.find((row) => row._id === id);
  const source = managerRow || authorityRow;
  if (!source && !demoStore.listGrievances().some((row) => row.id === id)) return null;

  const nextLevel = level == null ? source?.level : Number(level);
  const nextStatus = status == null ? source?.status : status;
  const note = remark || (nextLevel >= 2 && status == null
    ? "Forwarded to the district authority."
    : status === 1
      ? "Resolved."
      : "Updated.");
  const remarks = [
    ...(source?.remarks || []),
    { remark: note, level: nextLevel, date: today(), userId: { Name: actor || "Staff", Role: 3 } },
  ];
  const lists = [];
  if (managerRow || source) lists.push("manager");
  if (authorityRow || (nextLevel != null && nextLevel >= 2)) lists.push("authority");

  const stored = saveDemoComplaint({
    ...(source || { _id: id, Description: "", userId: { Name: actor || "Staff", Role: 4 }, photo: [] }),
    _id: id,
    status: nextStatus,
    level: nextLevel,
    remarks,
    lists,
  });

  const grievance = demoStore.listGrievances().find((row) => row.id === id);
  if (grievance) {
    demoStore.updateGrievanceStatus({
      id,
      status: Number(nextStatus) === 1 ? "Resolved" : undefined,
      level: nextLevel,
      remark: note,
      actor: actor || "Staff",
    });
  }

  return stored;
}
