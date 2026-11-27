/**
 * seedFullPortalTwoMonths.js
 * --------------------------
 * Idempotently seeds ~2 months (60 days) of realistic, consistent, relational
 * data across all SFIC KhelGujarat modules while preserving existing users,
 * facilities, sports, and configurations.
 */

const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const { getDbConnetion } = require("./config/dbconfig");
const { ROLE } = require("./Utils/roles");

const User = require("./Model/UsersModel");
const Sport = require("./Model/SportModel");
const SportsComplex = require("./Model/SportsComplexModel");
const FacilitySportConfig = require("./Model/FacilitySportConfigModel");
const Instructor = require("./Model/instructorModel");
const Athlete = require("./Model/athleteModel");
const Guest = require("./Model/GuestModel");
const BookingPayment = require("./Model/BookingPaymentModel");
const BookingAttendance = require("./Model/BookingAttendanceModel");
const EvaluationTemplate = require("./Model/EvaluationTemplateModel");
const PerformanceEvaluation = require("./Model/PerformanceEvaluationModel");
const AthleteAchievement = require("./Model/AthleteAchievementModel");
const Grant = require("./Model/GrantModel");
const ComplaintType = require("./Model/ComplaintTypeModel");
const Complaint = require("./Model/ComplaintModel");
const FacilityAssessment = require("./Model/FacilityAssessmentModel");
const Review = require("./Model/ReviewModel");
const InstitutionEventBooking = require("./Model/InstitutionEventBookingModel");
const Updates = require("./Model/UpdatesModel");

const SEED_TAG = "SEED-2M-2026";
const TODAY_STR = "2026-11-27";

function addDaysStr(baseStr, offset) {
  const d = new Date(`${baseStr}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function dateAtIst(dateStr, hour = 10, min = 0) {
  return new Date(`${dateStr}T${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}:00+05:30`);
}

function pick(arr, idx) {
  return arr[idx % arr.length];
}

async function run() {
  getDbConnetion();
  await new Promise((resolve, reject) => {
    mongoose.connection.once("open", resolve);
    mongoose.connection.once("error", reject);
  });

  console.log("Loading existing master data...");
  const [
    adminUser,
    managers,
    supervisors,
    gateOps,
    athleteUsers,
    institutionUsers,
    sports,
    facilities,
    configs,
    coaches,
    athletes,
    templates,
    complaintTypes,
  ] = await Promise.all([
    User.findOne({ Role: ROLE.ADMIN }).lean(),
    User.find({ Role: ROLE.MANAGER, IsActive: { $ne: 0 } }).lean(),
    User.find({ Role: ROLE.SUPERVISOR, IsActive: { $ne: 0 } }).lean(),
    User.find({ Role: ROLE.GATE_OPERATOR, IsActive: { $ne: 0 } }).lean(),
    User.find({ Role: ROLE.ATHLETE, IsActive: { $ne: 0 } }).lean(),
    User.find({ Role: ROLE.INSTITUTION, IsActive: { $ne: 0 } }).lean(),
    Sport.find({ status: "Active" }).lean(),
    SportsComplex.find({ status: "Active" }).lean(),
    FacilitySportConfig.find({ status: "Active" }).populate("sport").lean(),
    Instructor.find({ status: "Active" }).populate("userId").lean(),
    Athlete.find().populate("userId").lean(),
    EvaluationTemplate.find({ status: "Published" }).lean(),
    ComplaintType.find().lean(),
  ]);

  if (!adminUser || !facilities.length || !sports.length || !configs.length) {
    throw new Error("Master data (admin, facilities, sports, configs) is missing. Cannot seed.");
  }

  // 1. Configure sport-level periodic maintenance cycles for key sports
  const CYCLE_PRESETS = {
    Badminton: { enabled: true, frequencyDays: 30, notifyDaysBefore: 3, priority: "High", checklistTitle: "Wooden Court & Lighting Audit", checklistNotes: "Inspect BWF court grip, net tension, and overhead LED lux levels." },
    Swimming: { enabled: true, frequencyDays: 14, notifyDaysBefore: 3, priority: "Critical", checklistTitle: "Pool Water Quality & Filtration Check", checklistNotes: "Verify chlorine/pH balance, deck anti-slip tiles, and filtration pump pressure." },
    Basketball: { enabled: true, frequencyDays: 30, notifyDaysBefore: 5, priority: "Medium", checklistTitle: "Hoop Stanchion & Court Surface Check", checklistNotes: "Inspect backboard bolts, rim springs, and court markings." },
    "Table Tennis": { enabled: true, frequencyDays: 60, notifyDaysBefore: 5, priority: "Low", checklistTitle: "Table Level & Flooring Check", checklistNotes: "Check table surface flatness, net clamps, and indoor ventilation." },
    Volleyball: { enabled: true, frequencyDays: 30, notifyDaysBefore: 3, priority: "Medium", checklistTitle: "Net Post & Sand/Court Safety Check", checklistNotes: "Inspect pole padding, boundary lines, and surface evenness." },
    "Athletics & Track": { enabled: true, frequencyDays: 45, notifyDaysBefore: 5, priority: "High", checklistTitle: "Synthetic Track & Lane Marking Check", checklistNotes: "Inspect synthetic track wear, drainage channels, and jumping pit sand." },
  };
  for (const sp of sports) {
    const preset = CYCLE_PRESETS[sp.SportName];
    if (preset && !sp.maintenanceCycle?.enabled) {
      await Sport.updateOne({ _id: sp._id }, { $set: { maintenanceCycle: preset } });
    }
  }
  console.log("1. Sport maintenance cycles configured.");

  // 2. Seed ~65 bookings + payments across the last 60 days + next 5 days
  const existingSeededBookings = await Guest.countDocuments({ bookingReference: /^BK-2M-/ });
  const createdBookings = [];
  if (existingSeededBookings < 50 && athleteUsers.length) {
    const dayOffsets = [
      -58, -55, -52, -49, -46, -43, -40, -37, -34, -31, -29, -27, -25, -23, -21,
      -19, -18, -16, -15, -13, -12, -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3,
    ];
    let seq = 1;
    for (let i = 0; i < dayOffsets.length; i++) {
      const offset = dayOffsets[i];
      const dateStr = addDaysStr(TODAY_STR, offset);
      // Create 2 bookings per sampled day across different configs
      for (let j = 0; j < 2; j++) {
        const cfg = pick(configs, i * 2 + j);
        const slot = cfg.slots?.find((s) => s.bookable !== false) || cfg.slots?.[0];
        if (!slot) continue;
        const citizen = pick(athleteUsers, i + j);
        const ref = `BK-2M-${String(seq).padStart(4, "0")}`;
        seq += 1;
        const exists = await Guest.findOne({ bookingReference: ref }).lean();
        if (exists) {
          createdBookings.push(exists);
          continue;
        }
        const members = cfg.bookingPolicy?.reservationType === "group" ? ((i + j) % 3) + 1 : 1;
        const amount = Math.max(100, (cfg.price?.amount || 200) * (cfg.price?.calculation === "per-member" ? members : 1));
        const bookedAt = dateAtIst(addDaysStr(dateStr, -1), 9 + (j * 4), 15);
        const passId = `PASS-2M-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

        const guest = await Guest.create({
          Name: citizen.Name || "Athlete",
          Email: citizen.Email || "athlete@khelgujarat.gov.in",
          ContactNum: citizen.ContactNum || "+919800000000",
          citizenUser: citizen._id,
          Role: citizen.Role || ROLE.ATHLETE,
          IsActive: 1,
          timeslot: { from: slot.startTime, to: slot.endTime },
          duration: 60,
          sport: cfg.sport._id,
          SportComplexId: cfg.facility,
          facilitySportConfig: cfg._id,
          slotId: slot._id,
          coach: slot.coach || null,
          memberCount: members,
          reservedUnits: 1,
          Startdate: dateStr,
          totalAmount: amount,
          bookingReference: ref,
          passId,
          bookingStatus: "Confirmed",
          paymentStatus: "Paid",
          createdAt: bookedAt,
          updatedAt: bookedAt,
        });

        await BookingPayment.create({
          booking: guest._id,
          bookingIds: [guest._id],
          bookingReference: ref,
          facility: cfg.facility,
          sport: cfg.sport._id,
          coach: slot.coach || null,
          amount,
          currency: "INR",
          gateway: "Razorpay",
          status: "Paid",
          razorpayOrderId: `order_2m_${ref.toLowerCase()}_${crypto.randomBytes(3).toString("hex")}`,
          razorpayPaymentId: `pay_2m_${ref.toLowerCase()}_${crypto.randomBytes(3).toString("hex")}`,
          payer: { name: guest.Name, email: guest.Email, phone: guest.ContactNum },
          paidAt: bookedAt,
          createdAt: bookedAt,
          updatedAt: bookedAt,
        });

        createdBookings.push(guest);
      }
    }
  }
  console.log(`2. Bookings & payments seeded/verified (${createdBookings.length} new/checked).`);

  // 3. Seed Gate Attendance (BookingAttendance) for ~70% of past confirmed bookings
  const pastConfirmed = await Guest.find({
    bookingStatus: "Confirmed",
    paymentStatus: "Paid",
    Startdate: { $lte: TODAY_STR },
  })
    .limit(120)
    .lean();
  const scannerId = gateOps[0]?._id || supervisors[0]?._id || managers[0]?._id || adminUser._id;
  let attCount = 0;
  for (let i = 0; i < pastConfirmed.length; i++) {
    if (i % 10 >= 7) continue; // 70% attendance rate
    const b = pastConfirmed[i];
    const already = await BookingAttendance.exists({ booking: b._id });
    if (already) continue;
    const entryAt = dateAtIst(b.Startdate, 7, 5);
    const exitAt = dateAtIst(b.Startdate, 8, 20);
    await BookingAttendance.create({
      booking: b._id,
      facility: b.SportComplexId,
      citizenUser: b.citizenUser || null,
      date: b.Startdate,
      entryAt,
      exitAt,
      entryBy: scannerId,
      exitBy: scannerId,
      members: b.memberCount || 1,
    });
    attCount += 1;
  }
  console.log(`3. Gate attendance records added: ${attCount}.`);

  // 4. Seed Multi-Session Performance Evaluations across 2 months
  const existingEvalCount = await PerformanceEvaluation.countDocuments();
  let evalAdded = 0;
  if (existingEvalCount < 45 && athletes.length && templates.length && coaches.length) {
    const templateBySport = new Map(templates.map((t) => [String(t.sport), t]));
    const evalOffsets = [-50, -35, -20, -10, -3];
    for (let aIdx = 0; aIdx < Math.min(athletes.length, 6); aIdx++) {
      const ath = athletes[aIdx];
      const tpl = templates[aIdx % templates.length];
      const coachUser = coaches[aIdx % coaches.length]?.userId?._id || coaches[0].userId;
      for (let eIdx = 0; eIdx < evalOffsets.length; eIdx++) {
        const evalDateStr = addDaysStr(TODAY_STR, evalOffsets[eIdx]);
        const exists = await PerformanceEvaluation.exists({
          athlete: ath._id,
          sport: tpl.sport,
          sessionDate: evalDateStr,
        });
        if (exists) continue;
        const baseScore = 66 + eIdx * 5 + (aIdx % 4) * 2;
        const details = (tpl.parameters || []).map((p, pIdx) => {
          const norm = Math.min(98, baseScore + ((pIdx % 3) - 1) * 4);
          const weight = Number(p.weightage || 25);
          return {
            parameterId: p._id,
            parameterName: p.name,
            actualValue: Math.max(1, Math.round((norm / 100) * (p.maxScore || 5))),
            normalizedScore: norm,
            weightedScore: Math.round(((norm * weight) / 100) * 100) / 100,
            remarks: norm >= 80 ? "Strong execution" : "Needs consistency in drills",
          };
        });
        const totalScore = Math.min(
          98,
          Math.round(details.reduce((s, d) => s + d.weightedScore, 0) * 10) / 10 || baseScore
        );
        await PerformanceEvaluation.create({
          athlete: ath._id,
          sport: tpl.sport,
          coach: coachUser,
          sessionDate: evalDateStr,
          template: tpl._id,
          templateVersion: tpl.version || 1,
          totalScore,
          recognition:
            totalScore >= 85
              ? { label: "Outstanding", badge: "gold" }
              : totalScore >= 75
              ? { label: "Commendable", badge: "silver" }
              : { label: "Developing", badge: "bronze" },
          remarks: `Session review (${evalDateStr}): steady improvement in technique and stamina.`,
          evaluationDate: dateAtIst(evalDateStr, 17, 0),
          details,
          status: "Submitted",
        });
        evalAdded += 1;
      }
    }
  }
  console.log(`4. Performance evaluations added: ${evalAdded}.`);

  // 5. Seed Athlete Achievements
  const existingAchCount = await AthleteAchievement.countDocuments();
  let achAdded = 0;
  if (existingAchCount < 10 && athletes.length && sports.length) {
    const achTemplates = [
      { title: "Gujarat State Sub-Junior Gold", category: "Gold Medal", eventName: "SAG State Championship 2026", rank: "1st Place", status: "Verified", offset: -42 },
      { title: "District Inter-Complex Silver", category: "Silver Medal", eventName: "Ahmedabad District Open", rank: "2nd Place", status: "Verified", offset: -33 },
      { title: "50m Freestyle Personal Best", category: "Personal Record", eventName: "Monsoon Aquatics Meet", rank: "28.4s PB", status: "Verified", offset: -26 },
      { title: "Zonal Badminton Quarterfinalist", category: "Tournament Participation", eventName: "West Zone Open 2026", rank: "Top 8", status: "Verified", offset: -19 },
      { title: "Inter-District Table Tennis Bronze", category: "Bronze Medal", eventName: "Khel Mahakumbh Trials", rank: "3rd Place", status: "Pending", offset: -11 },
      { title: "City Basketball League MVP", category: "Competition Winner", eventName: "Vadodara Hoops Cup", rank: "Winner", status: "Verified", offset: -8 },
      { title: "Annual Athletics 400m Finalist", category: "Championship", eventName: "Gujarat Track & Field Meet", rank: "4th Place", status: "Pending", offset: -4 },
      { title: "School Invitational Doubles", category: "Silver Medal", eventName: "Saurashtra Invitational", rank: "2nd Place", status: "Rejected", offset: -15 },
    ];
    for (let i = 0; i < achTemplates.length; i++) {
      const t = achTemplates[i];
      const ath = pick(athletes, i);
      const sp = pick(sports, i);
      const exists = await AthleteAchievement.exists({ athlete: ath._id, title: t.title });
      if (exists) continue;
      await AthleteAchievement.create({
        athlete: ath._id,
        sport: sp._id,
        title: t.title,
        description: `${t.title} achieved at ${t.eventName}.`,
        category: t.category,
        eventName: t.eventName,
        achievementDate: dateAtIst(addDaysStr(TODAY_STR, t.offset), 12, 0),
        rank: t.rank,
        verificationStatus: t.status,
        verifiedBy: t.status === "Pending" ? undefined : adminUser._id,
        verificationRemarks: t.status === "Verified" ? "Verified against official result sheet." : t.status === "Rejected" ? "Certificate scan unclear; please re-upload." : "",
      });
      achAdded += 1;
    }
  }
  console.log(`5. Athlete achievements added: ${achAdded}.`);

  // 6. Seed Facility Grants (with progress updates)
  const existingGrants = await Grant.countDocuments();
  let grantsAdded = 0;
  if (existingGrants < 6) {
    const grantDefs = [
      { title: "LED Floodlight & Indoor Court Relighting", purpose: "Upgrade 6 indoor badminton courts to BWF 750-lux anti-glare LEDs.", amount: 850000, status: "Verified", pct: 100, used: 842000, offset: -54 },
      { title: "Olympic Pool Filtration & Ozone Plant", purpose: "Replace sand-filter media and install automated pH/chlorine dosing.", amount: 1200000, status: "Proof Submitted", pct: 75, used: 880000, offset: -41 },
      { title: "Synthetic Track Resurfacing Phase-II", purpose: "Repair 400m outer lanes and repaint starting markings.", amount: 1500000, status: "In Progress", pct: 45, used: 620000, offset: -30 },
      { title: "Drinking Water & Changing Room Renovation", purpose: "Install RO water coolers and upgrade 4 athlete locker rooms.", amount: 450000, status: "Query Raised", pct: 60, used: 270000, offset: -22 },
      { title: "Basketball Electronic Scoreboard & Shot Clocks", purpose: "Install FIBA-compliant 24-second shot clocks and LED scoreboard.", amount: 320000, status: "Allocated", pct: 0, used: 0, offset: -9 },
      { title: "Solar Rooftop Backup for Sports Complex", purpose: "25kW grid-tied solar array for uninterrupted evening slot operations.", amount: 950000, status: "Verified", pct: 100, used: 935000, offset: -48 },
    ];
    for (let i = 0; i < grantDefs.length; i++) {
      const g = grantDefs[i];
      const fac = pick(facilities, i);
      const mgr = managers.find((m) => String(m.SportComplexId) === String(fac._id)) || managers[0] || adminUser;
      const exists = await Grant.exists({ facility: fac._id, title: g.title });
      if (exists) continue;
      const start = dateAtIst(addDaysStr(TODAY_STR, g.offset), 10, 0);
      const due = dateAtIst(addDaysStr(TODAY_STR, g.offset + 60), 18, 0);
      const progressUpdates = g.pct > 0 ? [{
        percent: g.pct,
        amountUsed: g.used,
        note: `Milestone ${g.pct}% completed with vendor invoice & site photos.`,
        submittedBy: mgr._id,
        submittedAt: dateAtIst(addDaysStr(TODAY_STR, g.offset + 14), 15, 0),
        reviewStatus: g.status === "Verified" ? "Verified" : g.status === "Query Raised" ? "Query Raised" : "Pending",
        adminNote: g.status === "Verified" ? "All bills verified." : g.status === "Query Raised" ? "Attach GST invoice copy for electrical fittings." : "",
        reviewedBy: g.status === "Verified" || g.status === "Query Raised" ? adminUser._id : undefined,
        reviewedAt: g.status === "Verified" || g.status === "Query Raised" ? dateAtIst(addDaysStr(TODAY_STR, g.offset + 17), 11, 0) : undefined,
      }] : [];

      await Grant.create({
        facility: fac._id,
        title: g.title,
        purpose: g.purpose,
        allocatedAmount: g.amount,
        allocatedBy: adminUser._id,
        startDate: start,
        dueDate: due,
        status: g.status,
        progressUpdates,
        createdAt: start,
      });
      grantsAdded += 1;
    }
  }
  console.log(`6. Facility grants added: ${grantsAdded}.`);

  // 7. Seed Grievances (Complaints) across statuses
  const existingComplaints = await Complaint.countDocuments();
  let compAdded = 0;
  if (existingComplaints < 8 && complaintTypes.length && athleteUsers.length) {
    const compDefs = [
      { subject: "Court 3 floodlight flickering during evening slot", desc: "Two overhead lamps in court 3 flicker after 7 PM.", wf: "Open", level: 1, status: 0, offset: -2 },
      { subject: "Pool locker room drainage blockage", desc: "Men's shower drain is slow and needs desilting.", wf: "Responded", level: 1, status: 0, offset: -5 },
      { subject: "Drinking water cooler warm near athletics track", desc: "RO cooler compressor near gate 2 is not cooling.", wf: "Escalated", level: 3, status: 0, offset: -9 },
      { subject: "Broken table tennis barrier partitions", desc: "Three court dividers have cracked hinges.", wf: "Resolved", level: 1, status: 1, offset: -24 },
      { subject: "Badminton net cable snapped on Court 1", desc: "Replaced wire tensioner and tightened post.", wf: "Resolved", level: 1, status: 1, offset: -36 },
      { subject: "Parking gate lighting dim after 8 PM", desc: "Entry walkway bulb needs replacement.", wf: "Open", level: 0, status: 0, offset: -1 },
      { subject: "Basketball backboard padding loose", desc: "Bottom foam edge padding is peeling off on West hoop.", wf: "Escalated", level: 2, status: 0, offset: -12 },
      { subject: "Washroom soap dispensers empty", desc: "Refill needed in indoor hall ground floor.", wf: "Resolved", level: 0, status: 1, offset: -18 },
    ];
    for (let i = 0; i < compDefs.length; i++) {
      const c = compDefs[i];
      const fac = pick(facilities, i);
      const cit = pick(athleteUsers, i);
      const cType = pick(complaintTypes, i);
      const mgr = managers.find((m) => String(m.SportComplexId) === String(fac._id)) || managers[0] || adminUser;
      const exists = await Complaint.exists({ subject: c.subject });
      if (exists) continue;
      const created = dateAtIst(addDaysStr(TODAY_STR, c.offset), 11, 0);
      const due = dateAtIst(addDaysStr(TODAY_STR, c.offset + 3), 11, 0);
      await Complaint.create({
        workflowVersion: 2,
        type: cType._id,
        subject: c.subject,
        Description: c.desc,
        userId: cit._id,
        sportsComplex: fac._id,
        level: c.level,
        status: c.status,
        workflowStatus: c.wf,
        dueAt: due,
        escalatedAt: c.wf === "Escalated" ? dateAtIst(addDaysStr(TODAY_STR, c.offset + 3), 12, 0) : undefined,
        resolvedAt: c.wf === "Resolved" ? dateAtIst(addDaysStr(TODAY_STR, c.offset + 2), 16, 0) : undefined,
        history: [
          { action: "Submitted", userId: cit._id, role: ROLE.ATHLETE, toLevel: c.level, reason: "Submitted by citizen", date: created },
          ...(c.wf === "Resolved" ? [{ action: "Resolved", userId: mgr._id, role: ROLE.MANAGER, fromLevel: c.level, toLevel: c.level, reason: "Issue inspected and rectified.", date: dateAtIst(addDaysStr(TODAY_STR, c.offset + 2), 16, 0) }] : []),
        ],
        createdAt: created,
      });
      compAdded += 1;
    }
  }
  console.log(`7. Grievances added: ${compAdded}.`);

  // 8. Seed Facility Condition Assessments aligned with maintenance cycles
  const existingAssessments = await FacilityAssessment.countDocuments({ status: "Submitted" });
  let assessAdded = 0;
  if (existingAssessments < 12) {
    // Mix of recent (-4d, -10d -> On track) and older (-28d, -35d -> Due soon / Overdue)
    const assessOffsets = [-4, -10, -15, -28, -35, -8, -19, -42];
    for (let i = 0; i < Math.min(configs.length, assessOffsets.length); i++) {
      const cfg = configs[i];
      const fac = facilities.find((f) => String(f._id) === String(cfg.facility)) || facilities[0];
      const mgr = managers.find((m) => String(m.SportComplexId) === String(fac._id)) || managers[0] || adminUser;
      const dateStr = addDaysStr(TODAY_STR, assessOffsets[i]);
      const exists = await FacilityAssessment.exists({
        facilityId: fac._id,
        sportId: cfg.sport._id,
        assessmentDate: dateStr,
      });
      if (exists) continue;
      const vci = 72 + ((i * 7) % 23);
      await FacilityAssessment.create({
        facilityId: fac._id,
        facilityName: fac.name,
        sportId: cfg.sport._id,
        sportName: cfg.sport.SportName,
        inspectorName: mgr.Name || "Facility Manager",
        submittedBy: mgr._id,
        assessmentDate: dateStr,
        status: "Submitted",
        managerObservations: `Routine condition review for ${cfg.sport.SportName} at ${fac.name}. Surface, safety gear and lighting inspected.`,
        ai: {
          status: "completed",
          visualConditionIndex: vci,
          overallSummary: vci >= 85 ? "Excellent operational condition." : "Good condition; minor preventive upkeep advised.",
        },
        createdAt: dateAtIst(dateStr, 14, 0),
      });
      assessAdded += 1;
    }
  }
  console.log(`8. Facility condition assessments added: ${assessAdded}.`);

  // 9. Seed Platform Reviews (facility, sport, coach)
  const existingReviews = await Review.countDocuments();
  let revAdded = 0;
  if (existingReviews < 14 && athleteUsers.length) {
    const remarksList = [
      "Well-maintained courts and punctual slot management.",
      "Clean changing rooms and helpful coaching staff.",
      "Great lighting and smooth QR check-in at the gate.",
      "Good value for money; morning slots are well organized.",
      "Coach guidance is structured and very encouraging.",
    ];
    for (let i = 0; i < 15; i++) {
      const cit = pick(athleteUsers, i);
      const cfg = pick(configs, i);
      const targetType = i % 3 === 0 ? "facility" : i % 3 === 1 ? "sport" : "coach";
      const coachObj = coaches.find((c) => String(c.SportComplexId) === String(cfg.facility)) || coaches[0];
      const filter = {
        reviewer: cit._id,
        targetType,
        facility: cfg.facility,
        sport: targetType === "sport" ? cfg.sport._id : null,
        coach: targetType === "coach" && coachObj ? coachObj._id : null,
      };
      if (targetType === "coach" && !coachObj) continue;
      const exists = await Review.exists(filter);
      if (exists) continue;
      await Review.create({
        ...filter,
        rating: 4 + (i % 2),
        remarks: pick(remarksList, i),
        createdAt: dateAtIst(addDaysStr(TODAY_STR, -(i * 3 + 2)), 18, 0),
      });
      revAdded += 1;
    }
  }
  console.log(`9. Platform reviews added: ${revAdded}.`);

  // 10. Seed Institution Event Bookings
  const existingInst = await InstitutionEventBooking.countDocuments();
  let instAdded = 0;
  if (existingInst < 5 && (institutionUsers.length || athleteUsers.length)) {
    const instActor = institutionUsers[0] || athleteUsers[0];
    const eventDefs = [
      { name: "Inter-School Badminton Zonal Meet", type: "Tournament", offset: -38, status: "Confirmed", amount: 12000 },
      { name: "University Athletics Selection Trials", type: "Trials", offset: -21, status: "Confirmed", amount: 18000 },
      { name: "State Youth Aquatics Training Camp", type: "Training Camp", offset: -11, status: "Approved", amount: 15000 },
      { name: "District Inter-College Volleyball Cup", type: "Annual Sports Meet", offset: 4, status: "Submitted", amount: 9500 },
    ];
    for (let i = 0; i < eventDefs.length; i++) {
      const ev = eventDefs[i];
      const cfg = pick(configs, i);
      const slot = cfg.slots?.[0];
      if (!slot) continue;
      const ref = `INST-2M-${String(i + 1).padStart(3, "0")}`;
      const exists = await InstitutionEventBooking.exists({ bookingReference: ref });
      if (exists) continue;
      const dStr = addDaysStr(TODAY_STR, ev.offset);
      await InstitutionEventBooking.create({
        bookingReference: ref,
        institution: instActor._id,
        facility: cfg.facility,
        eventName: ev.name,
        eventType: ev.type,
        purpose: `${ev.name} organized under SAG institutional quota.`,
        selections: [{
          facilitySportConfig: cfg._id,
          sport: cfg.sport._id,
          slotId: slot._id,
          date: dStr,
          participantCount: 24,
          requestedUnits: 2,
          reservedUnits: 2,
          estimatedAmount: ev.amount,
        }],
        startDate: dStr,
        endDate: dStr,
        estimatedAmount: ev.amount,
        quotedAmount: ev.amount,
        status: ev.status,
        paymentStatus: ev.status === "Confirmed" ? "Paid" : "Pending",
        paidAt: ev.status === "Confirmed" ? dateAtIst(dStr, 9, 0) : undefined,
        confirmedAt: ev.status === "Confirmed" ? dateAtIst(dStr, 9, 5) : undefined,
        createdAt: dateAtIst(addDaysStr(dStr, -5), 11, 0),
      });
      instAdded += 1;
    }
  }
  console.log(`10. Institution event bookings added: ${instAdded}.`);

  // 11. Seed Updates / Notifications
  const existingUpdates = await Updates.countDocuments();
  let updAdded = 0;
  if (existingUpdates < 6) {
    const updateDefs = [
      { title: "Khel Mahakumbh Winter Registration Window", description: "All district complexes are advised to keep morning slots open for trialists.", level: 0, offset: -25 },
      { title: "Quarterly Safety & Equipment Audit", description: "Facility managers must ensure periodic sport condition assessments are logged on time.", level: 0, offset: -14 },
      { title: "Swimming Pool Maintenance Schedule", description: "Bi-weekly water filtration and chlorine balancing reminder for aquatic centers.", level: 2, offset: -6 },
      { title: "Evening Floodlight Timer Adjustment", description: "Winter sunset timing updated: floodlights switch on at 17:45 IST.", level: 2, offset: -3 },
    ];
    for (let i = 0; i < updateDefs.length; i++) {
      const u = updateDefs[i];
      const exists = await Updates.exists({ title: u.title });
      if (exists) continue;
      await Updates.create({
        title: u.title,
        description: u.description,
        level: u.level,
        sportComplexId: u.level === 2 ? pick(facilities, i)._id : undefined,
        active: "1",
        createdAt: dateAtIst(addDaysStr(TODAY_STR, u.offset), 9, 30),
      });
      updAdded += 1;
    }
  }
  console.log(`11. Updates & notifications added: ${updAdded}.`);

  // Print final collection counts
  console.log("\n=== Final Collection Counts ===");
  const cols = await mongoose.connection.db.listCollections().toArray();
  for (const c of cols.sort((a, b) => a.name.localeCompare(b.name))) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(`${c.name}: ${count}`);
  }
  process.exit(0);
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
