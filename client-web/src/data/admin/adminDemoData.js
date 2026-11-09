// Demo dataset for Phase 2C.1 Admin frontend screens.
//
// Every record here is fictional and exists only to exercise the UI. IDs and
// relationships are stable and shared by every screen, so dashboard totals,
// charts, tables and detail drawers always agree. Replace this module (and the
// matching service adapter) when the Admin APIs are implemented.
import { GUJARAT_FACILITIES, SPORTS_LIST } from "../gujaratSportsData";

export const DEMO_MODE = true;
export const DEMO_TODAY = "2026-10-31";
export const DEMO_MONTH_KEYS = [
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
];
export const DEMO_MONTH_LABELS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];

export const COMPLAINT_CATEGORIES = [
  "Turf & Surface Degradation",
  "Floodlight & Electrical Outage",
  "Sanitation & Drinking Water",
  "Locker Room & Hygiene",
  "Equipment Replacement Needed",
  "Perimeter & Security Issue",
];

// Existing ComplaintModel.level values (0 Supervisor, 1 Manager,
// 2 Authority, 3 Admin). Shown as stored; no new escalation rules are added.
export const LEVEL_LABELS = {
  0: "Level 0 · Supervisor",
  1: "Level 1 · Manager",
  2: "Level 2 · Authority",
  3: "Level 3 · Admin",
};

export const GRIEVANCE_STATUSES = ["Pending", "Resolved"];
export const TRANSACTION_STATUSES = [
  "Success",
  "Pending",
  "Failed",
  "Refunded",
];
export const TRANSACTION_METHODS = [
  "UPI",
  "Credit Card",
  "Debit Card",
  "Net Banking",
  "Cash",
];
export const GRANT_STATUSES = [
  "Allocated",
  "Partially Released",
  "Utilisation Pending",
  "Under Verification",
  "Closed",
];
export const GRANT_PURPOSES = [
  "Infrastructure upgradation",
  "Equipment procurement",
  "Maintenance & repairs",
  "Coaching & training support",
  "Event hosting support",
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function daysBefore(dateString, days) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysAfter(dateString, days) {
  return daysBefore(dateString, -days);
}

export const DEMO_FACILITIES = GUJARAT_FACILITIES.map((facility, index) => {
  const athletes = 320 + ((index * 137) % 640);
  const coaches = 9 + ((index * 5) % 13);
  const capacity = facility.utilisation.capacityDaily;
  const baseUtilisation = facility.utilisation.utilizationRate;

  return {
    id: facility.id,
    name: facility.name,
    district: facility.district,
    taluka: facility.taluka,
    sports: facility.sports.map((item) => item.name),
    capacity,
    utilisation: baseUtilisation,
    athletes,
    coaches,
    utilisationTrend: DEMO_MONTH_KEYS.map((_, month) =>
      clamp(
        baseUtilisation + Math.round(Math.sin(index + month) * 6) + (month - 2),
        45,
        98
      )
    ),
    registrationTrend: DEMO_MONTH_KEYS.map(
      (_, month) => 18 + ((index * 11 + month * 7) % 43)
    ),
  };
});

const CITIZENS = [
  { name: "Rohan Mehta", role: "Athlete", email: "rohan.mehta@example.test" },
  { name: "Priya Desai", role: "Athlete", email: "priya.desai@example.test" },
  { name: "Aarav Patel", role: "Athlete", email: "aarav.patel@example.test" },
  { name: "Isha Trivedi", role: "Athlete", email: "isha.trivedi@example.test" },
  { name: "Neel Shah", role: "Guest", email: "neel.shah@example.test" },
  { name: "Hetal Joshi", role: "Athlete", email: "hetal.joshi@example.test" },
  { name: "Manav Rathod", role: "Coach", email: "manav.rathod@example.test" },
  { name: "Foram Bhatt", role: "Athlete", email: "foram.bhatt@example.test" },
  { name: "Dev Chauhan", role: "Guest", email: "dev.chauhan@example.test" },
  { name: "Riya Solanki", role: "Athlete", email: "riya.solanki@example.test" },
  { name: "Kunal Parmar", role: "Supervisor", email: "kunal.parmar@example.test" },
  { name: "Tanvi Modi", role: "Athlete", email: "tanvi.modi@example.test" },
];

const GRIEVANCE_TEMPLATES = [
  {
    category: "Turf & Surface Degradation",
    subject: "Turf wear near the north goalpost",
    description:
      "The synthetic turf around the north goalpost has worn through and players have reported slipping during evening sessions. Requesting inspection and resurfacing before the next district tournament.",
  },
  {
    category: "Floodlight & Electrical Outage",
    subject: "Floodlights not switching on in court 2",
    description:
      "Two floodlight banks in indoor court 2 remain off after the scheduled maintenance window. Evening coaching batches have been shifted to a single court.",
  },
  {
    category: "Sanitation & Drinking Water",
    subject: "Drinking water cooler not working",
    description:
      "The drinking water cooler near the main entrance has been out of service for three days. Athletes are using the canteen tap instead.",
  },
  {
    category: "Locker Room & Hygiene",
    subject: "Locker room cleaning frequency needs review",
    description:
      "The women's locker room is not cleaned between morning and evening batches. Requesting a revised cleaning schedule and consumables refill.",
  },
  {
    category: "Equipment Replacement Needed",
    subject: "Badminton nets and posts need replacement",
    description:
      "Two badminton nets are torn and one post is unstable. The equipment was last replaced more than two years ago.",
  },
  {
    category: "Perimeter & Security Issue",
    subject: "Broken boundary fencing near the parking area",
    description:
      "A section of the boundary fence is damaged, allowing unauthorised entry after closing hours. Requesting repair and a security review.",
  },
];

const STAFF_BY_LEVEL = {
  0: ["Hiren Patel (Supervisor)", "Kunal Parmar (Supervisor)"],
  1: ["Meera Joshi (Manager)", "Rakesh Solanki (Manager)"],
  2: ["Anil Desai (Authority)", "Shruti Nair (Authority)"],
  3: ["Kavita Shah (Admin)", "Vivek Rana (Admin)"],
};

function staff(level, seed) {
  const list = STAFF_BY_LEVEL[level] || STAFF_BY_LEVEL[0];
  return list[seed % list.length];
}

export const DEMO_GRIEVANCES = Array.from({ length: 54 }, (_, index) => {
  const template = GRIEVANCE_TEMPLATES[index % GRIEVANCE_TEMPLATES.length];
  const facility = DEMO_FACILITIES[index % DEMO_FACILITIES.length];
  const citizen = CITIZENS[index % CITIZENS.length];
  const statusCode = index % 3 === 0 ? 0 : 1;
  const level = index % 4;
  const submittedAt = daysBefore(DEMO_TODAY, 4 + index * 3);
  const resolvedAt =
    statusCode === 1 ? daysAfter(submittedAt, 2 + (index % 6)) : null;
  const resolvedWithinRange = resolvedAt && resolvedAt <= DEMO_TODAY;

  const remarks = [];
  if (statusCode === 1) {
    remarks.push({
      level,
      author: staff(level, index),
      remark:
        index % 2 === 0
          ? "Site inspected. Work order raised and completed."
          : "Issue verified and resolved with the facility team.",
      date: resolvedWithinRange ? `${resolvedAt}T11:20:00.000Z` : null,
    });
  }
  if (index % 5 === 0 && statusCode === 1) {
    remarks.unshift({
      level: Math.max(0, level - 1),
      author: staff(Math.max(0, level - 1), index + 1),
      remark: "Forwarded to the next level for review.",
      date: `${daysAfter(submittedAt, 1)}T09:10:00.000Z`,
    });
  }

  return {
    id: `GRV-2026-${String(index + 1).padStart(4, "0")}`,
    subject: template.subject,
    description: template.description,
    category: template.category,
    status: statusCode === 1 ? "Resolved" : "Pending",
    statusCode,
    level,
    levelLabel: LEVEL_LABELS[level],
    citizen,
    facilityId: facility.id,
    facilityName: facility.name,
    district: facility.district,
    submittedAt,
    resolvedAt: resolvedWithinRange ? resolvedAt : null,
    updatedAt: resolvedWithinRange ? resolvedAt : submittedAt,
    satisfied: statusCode === 1 ? index % 2 : 0,
    attachments:
      index % 4 === 0
        ? [
            {
              name: `site-photo-${String(index + 1).padStart(2, "0")}.jpg`,
              type: "image",
            },
          ]
        : [],
    remarks,
  };
});

const BOOKING_SERVICES = [
  "Badminton court booking",
  "Swimming pool membership",
  "Athletics track session",
  "Football ground booking",
  "Coaching programme fee",
  "Table tennis table booking",
];

export const DEMO_TRANSACTIONS = Array.from({ length: 72 }, (_, index) => {
  const facility = DEMO_FACILITIES[index % DEMO_FACILITIES.length];
  const citizen = CITIZENS[(index + 3) % CITIZENS.length];
  const marker = index % 5;
  const status =
    marker === 0 ? "Failed" : marker === 2 ? "Pending" : marker === 4 ? "Refunded" : "Success";
  const amount = 500 + ((index * 275) % 9000);
  const date = daysBefore(DEMO_TODAY, 1 + index * 2);
  const method = TRANSACTION_METHODS[index % TRANSACTION_METHODS.length];

  return {
    id: `TXN-2026-${String(100000 + index)}`,
    reference: `pay_demo_${String(42000 + index)}`,
    customerName: citizen.name,
    customerRole: citizen.role,
    customerEmail: citizen.email,
    facilityId: facility.id,
    facilityName: facility.name,
    district: facility.district,
    sport: facility.sports[index % facility.sports.length],
    amount,
    method,
    status,
    date,
    bookingReference: `BK-2026-${String(7000 + index)}`,
    service: BOOKING_SERVICES[index % BOOKING_SERVICES.length],
  };
});

function buildGrant(index) {
  const facility = DEMO_FACILITIES[index % DEMO_FACILITIES.length];
  const purpose = GRANT_PURPOSES[index % GRANT_PURPOSES.length];
  const allocated = 600000 + index * 185000;
  const releaseRatio = index % 5 === 0 ? 0 : index % 4 === 0 ? 0.5 : 1;
  const released = Math.round((allocated * releaseRatio) / 1000) * 1000;
  const applicationDate = daysBefore(DEMO_TODAY, 20 + index * 8);

  const proofs = [];
  if (released > 0) {
    const proofCount = index % 3 === 0 ? 2 : 1;
    for (let proofIndex = 0; proofIndex < proofCount; proofIndex += 1) {
      const claimed = Math.round(released / proofCount / 1000) * 1000;
      const proofStatus =
        proofIndex === 0 ? "Verified" : index % 3 === 0 ? "Submitted" : "Rejected";
      proofs.push({
        id: `PROOF-${String(index + 1).padStart(3, "0")}-${proofIndex + 1}`,
        submittedAt: daysAfter(applicationDate, 20 + proofIndex * 9),
        claimed,
        status: proofStatus,
        proofFile: `utilisation-proof-${index + 1}-${proofIndex + 1}.pdf`,
        reviewedBy: proofStatus === "Submitted" ? null : "SAG Grant Cell",
        reviewedAt:
          proofStatus === "Submitted"
            ? null
            : daysAfter(applicationDate, 24 + proofIndex * 9),
        note:
          proofStatus === "Rejected"
            ? "Invoice copy is not legible. Re-upload requested."
            : "",
      });
    }
  }

  const utilised = proofs
    .filter((proof) => proof.status === "Verified")
    .reduce((total, proof) => total + proof.claimed, 0);
  const pendingVerification = proofs
    .filter((proof) => proof.status === "Submitted")
    .reduce((total, proof) => total + proof.claimed, 0);

  let status = "Allocated";
  if (released > 0 && pendingVerification > 0) status = "Under Verification";
  else if (released > 0 && utilised >= released) status = "Closed";
  else if (released > 0 && released < allocated) status = "Partially Released";
  else if (released > 0) status = "Utilisation Pending";

  const releases = [];
  if (released > 0) {
    const instalments = index % 3 === 0 ? 2 : 1;
    for (let instalment = 0; instalment < instalments; instalment += 1) {
      const share = instalments === 1 ? 1 : instalment === 0 ? 0.6 : 0.4;
      releases.push({
        id: `REL-${String(index + 1).padStart(3, "0")}-${instalment + 1}`,
        date: daysAfter(applicationDate, 5 + instalment * 12),
        amount: Math.round((released * share) / 1000) * 1000,
        mode: "Bank transfer (NEFT)",
        reference: `UTR-DEMO-${String(81000 + index * 2 + instalment)}`,
        status: "Released",
      });
    }
  }

  const history = [
    {
      at: applicationDate,
      actor: "Facility manager",
      action: "Grant application submitted",
      note: "Provisional frontend record.",
    },
  ];
  releases.forEach((release) => {
    history.push({
      at: release.date,
      actor: "SAG Grant Cell",
      action: `Release ${release.id} recorded`,
      note: `${release.mode} · ${release.reference}`,
    });
  });
  proofs.forEach((proof) => {
    history.push({
      at: proof.submittedAt,
      actor: facility.name,
      action: "Utilisation proof submitted",
      note: `${proof.proofFile} · claimed amount recorded`,
    });
    if (proof.reviewedAt) {
      history.push({
        at: proof.reviewedAt,
        actor: proof.reviewedBy,
        action: `Utilisation proof ${proof.status.toLowerCase()}`,
        note: proof.note || "Documents checked against the provisional model.",
      });
    }
  });

  return {
    id: `GRANT-2026-${String(index + 1).padStart(4, "0")}`,
    facilityId: facility.id,
    facilityName: facility.name,
    district: facility.district,
    purpose,
    allocated,
    released,
    utilised,
    pendingVerification,
    remaining: allocated - released,
    status,
    applicationDate,
    coordination: {
      manager: facility.name.includes("Complex") ? "Facility manager" : "District sports officer",
      contact: "grant.cell@example.test",
    },
    releases,
    proofs,
    history,
  };
}

export const DEMO_GRANTS = Array.from({ length: 20 }, (_, index) =>
  buildGrant(index)
);

export const DEMO_DISTRICTS = Array.from(
  new Set(DEMO_FACILITIES.map((facility) => facility.district))
).sort();

export const DEMO_SPORTS = Array.from(
  new Set(DEMO_FACILITIES.flatMap((facility) => facility.sports))
).sort();

export const DEMO_SPORT_CATALOGUE = SPORTS_LIST;

export const DEMO_GRANT_PURPOSES = GRANT_PURPOSES;
