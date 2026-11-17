/**
 * Idempotent demo data for Admin master data and Manager sport configuration.
 * Run after seedDatabase.js and seedManagerPageData.js.
 */
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const Sport = require("./Model/SportModel");
const SportsComplex = require("./Model/SportsComplexModel");
const User = require("./Model/UsersModel");
const Instructor = require("./Model/instructorModel");
const FacilitySportConfig = require("./Model/FacilitySportConfigModel");
const { hashPassword } = require("./Utils/password");

const SPORT_METADATA = {
  Badminton: {
    description: "Indoor racquet sport supporting singles, doubles, open play and coached batches.",
    formats: ["Singles", "Doubles", "Coaching"],
    defaultBookingMode: "court",
    unitLabel: "courts",
    parameters: ["Footwork", "Serve", "Smash", "Endurance"],
  },
  Swimming: {
    description: "Lane and batch-based aquatic sessions with audience and coaching controls.",
    formats: ["Open swim", "Learn to swim", "Competitive coaching"],
    defaultBookingMode: "capacity",
    unitLabel: "lanes",
    parameters: ["Technique", "Speed", "Endurance", "Turns"],
  },
  "Table Tennis": {
    description: "Indoor table bookings and coached training sessions.",
    formats: ["Singles", "Doubles", "Coaching"],
    defaultBookingMode: "court",
    unitLabel: "tables",
    parameters: ["Serve", "Footwork", "Control", "Match play"],
  },
  Basketball: {
    description: "Team training, open court sessions and competition reservations.",
    formats: ["Open court", "Team training", "Competition"],
    defaultBookingMode: "court",
    unitLabel: "courts",
    parameters: ["Shooting", "Dribbling", "Passing", "Fitness"],
  },
  Volleyball: {
    description: "Team court reservations where one athlete books for the full playing group.",
    formats: ["Full court", "Team training", "Match"],
    defaultBookingMode: "court",
    unitLabel: "courts",
    parameters: ["Serve", "Pass", "Set", "Attack", "Blocking"],
  },
  "Athletics & Track": {
    description: "Track access and coached athletics batches.",
    formats: ["Open track", "Sprint coaching", "Endurance coaching"],
    defaultBookingMode: "capacity",
    unitLabel: "participants",
    parameters: ["Speed", "Endurance", "Technique", "Strength"],
  },
};

const CONFIGS = [
  {
    facility: "SAG Khokhra Sports Complex",
    sport: "Badminton",
    bookingMode: "court",
    unitLabel: "courts",
    unitCount: 6,
    capacityPerUnit: 4,
    price: { amount: 250, unit: "unit", calculation: "flat", perMemberAmount: 0 },
    bookingPolicy: { reservationType: "group", inventoryMode: "exclusive-unit", minMembers: 1, maxMembers: 4 },
    notes: "BWF wooden courts. Non-marking shoes are mandatory.",
    slots: [
      { label: "Morning open courts", startTime: "06:00", endTime: "08:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], capacity: 24, audience: "mixed", purpose: "open-play", coachEmail: "" },
      { label: "Junior coaching", startTime: "16:00", endTime: "17:30", days: ["Mon", "Wed", "Fri"], capacity: 18, audience: "children", purpose: "coaching", coachEmail: "coach.khokhra@sag.gujarat.gov.in" },
      { label: "Evening open courts", startTime: "18:00", endTime: "21:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], capacity: 24, audience: "mixed", purpose: "open-play", coachEmail: "" },
    ],
  },
  {
    facility: "SAG Khokhra Sports Complex",
    sport: "Swimming",
    bookingMode: "capacity",
    unitLabel: "lanes",
    unitCount: 8,
    capacityPerUnit: 6,
    price: { amount: 120, unit: "person", calculation: "per-member", perMemberAmount: 120 },
    bookingPolicy: { reservationType: "individual", inventoryMode: "shared-capacity", minMembers: 1, maxMembers: 1 },
    notes: "Fifty-metre pool with separate public and coaching batches.",
    slots: [
      { label: "Morning mixed", startTime: "06:00", endTime: "07:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], capacity: 40, audience: "mixed", purpose: "open-play", coachEmail: "" },
      { label: "Ladies batch", startTime: "07:15", endTime: "08:15", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], capacity: 32, audience: "women", purpose: "open-play", coachEmail: "" },
      { label: "Competitive coaching", startTime: "16:00", endTime: "18:00", days: ["Mon", "Wed", "Fri", "Sat"], capacity: 24, audience: "members", purpose: "coaching", coachEmail: "neha.shah@sag.gujarat.gov.in" },
      { label: "Evening public swim", startTime: "18:15", endTime: "19:15", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], capacity: 40, audience: "mixed", purpose: "open-play", coachEmail: "" },
      { label: "Pool maintenance", startTime: "13:00", endTime: "14:00", days: ["Sun"], capacity: 1, audience: "members", purpose: "maintenance", coachEmail: "", bookable: false },
    ],
  },
  {
    facility: "SAG Khokhra Sports Complex",
    sport: "Table Tennis",
    bookingMode: "court",
    unitLabel: "tables",
    unitCount: 5,
    capacityPerUnit: 4,
    price: { amount: 100, unit: "unit", calculation: "flat", perMemberAmount: 0 },
    bookingPolicy: { reservationType: "group", inventoryMode: "exclusive-unit", minMembers: 1, maxMembers: 4 },
    notes: "Five competition-standard indoor tables.",
    slots: [
      { label: "Morning tables", startTime: "07:00", endTime: "09:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], capacity: 20, audience: "mixed", purpose: "open-play", coachEmail: "pooja.desai@sag.gujarat.gov.in" },
      { label: "Evening coaching", startTime: "17:00", endTime: "19:00", days: ["Tue", "Thu", "Sat"], capacity: 15, audience: "children", purpose: "coaching", coachEmail: "pooja.desai@sag.gujarat.gov.in" },
    ],
  },
  {
    facility: "Sama Indoor Sports Complex",
    sport: "Badminton",
    bookingMode: "court",
    unitLabel: "courts",
    unitCount: 8,
    capacityPerUnit: 4,
    price: { amount: 300, unit: "unit", calculation: "flat", perMemberAmount: 0 },
    bookingPolicy: { reservationType: "group", inventoryMode: "exclusive-unit", minMembers: 1, maxMembers: 4 },
    notes: "Eight air-conditioned BWF-standard courts.",
    slots: [
      { label: "Morning members", startTime: "06:00", endTime: "08:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], capacity: 32, audience: "members", purpose: "open-play", coachEmail: "hetal.mehta@sag.gujarat.gov.in" },
      { label: "Ladies coaching", startTime: "10:00", endTime: "11:30", days: ["Tue", "Thu", "Sat"], capacity: 20, audience: "women", purpose: "coaching", coachEmail: "hetal.mehta@sag.gujarat.gov.in" },
      { label: "Evening public courts", startTime: "17:00", endTime: "21:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], capacity: 32, audience: "mixed", purpose: "open-play", coachEmail: "" },
    ],
  },
  {
    facility: "Sama Indoor Sports Complex",
    sport: "Basketball",
    bookingMode: "hybrid",
    unitLabel: "courts",
    unitCount: 2,
    capacityPerUnit: 20,
    price: { amount: 800, unit: "slot", calculation: "base-plus-member", perMemberAmount: 50 },
    bookingPolicy: { reservationType: "group", inventoryMode: "exclusive-unit", minMembers: 5, maxMembers: 20 },
    notes: "Full-court team bookings and coached youth batches.",
    slots: [
      { label: "Youth coaching", startTime: "16:00", endTime: "18:00", days: ["Mon", "Wed", "Fri"], capacity: 30, audience: "children", purpose: "coaching", coachEmail: "jignesh.patel@sag.gujarat.gov.in" },
      { label: "Team court booking", startTime: "18:00", endTime: "20:00", days: ["Tue", "Thu", "Sat"], capacity: 40, audience: "mixed", purpose: "competition", coachEmail: "" },
    ],
  },
  {
    facility: "Sama Indoor Sports Complex",
    sport: "Volleyball",
    bookingMode: "court",
    unitLabel: "courts",
    unitCount: 2,
    capacityPerUnit: 12,
    price: { amount: 500, unit: "slot", calculation: "base-plus-member", perMemberAmount: 50 },
    bookingPolicy: { reservationType: "group", inventoryMode: "exclusive-unit", minMembers: 6, maxMembers: 12 },
    notes: "One athlete books the whole volleyball court for a group of 6 to 12 players.",
    slots: [
      { label: "Morning team court", startTime: "07:00", endTime: "09:00", days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], capacity: 24, audience: "mixed", purpose: "open-play", coachEmail: "" },
      { label: "Evening match court", startTime: "18:00", endTime: "20:00", days: ["Mon", "Wed", "Fri", "Sat", "Sun"], capacity: 24, audience: "mixed", purpose: "competition", coachEmail: "" },
    ],
  },
];

async function seed() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  for (const [name, metadata] of Object.entries(SPORT_METADATA)) {
    await Sport.updateOne(
      { SportName: name },
      { $set: { ...metadata, status: "Active" } }
    );
  }

  const swimmingFacility = await SportsComplex.findOne({
    name: "SAG Khokhra Sports Complex",
  });
  const swimmingSport = await Sport.findOne({ SportName: "Swimming" });
  if (swimmingFacility && swimmingSport) {
    const manager = await User.findOne({
      Role: 3,
      SportComplexId: swimmingFacility._id,
    });
    let swimmingCoach = await User.findOne({
      Email: "neha.shah@sag.gujarat.gov.in",
    });
    if (!swimmingCoach) {
      swimmingCoach = await User.create({
        Name: "Neha Shah",
        Email: "neha.shah@sag.gujarat.gov.in",
        Password: hashPassword("coach"),
        ContactNum: "+91 79 2216 4816",
        Role: 2,
        DistrictId: manager && manager.DistrictId,
        SportComplexId: swimmingFacility._id,
        IsActive: 1,
      });
    }
    await Instructor.findOneAndUpdate(
      { userId: swimmingCoach._id, SportComplexId: swimmingFacility._id },
      {
        $set: {
          createdBy: manager ? manager._id : swimmingCoach._id,
          qualification: "SAI Level 2 Swimming Coach",
          status: "Active",
          sports: [
            {
              sport: swimmingSport._id,
              experience: 7,
              timeSlot: [{ from: "16:00", to: "18:00" }],
            },
          ],
        },
        $setOnInsert: {
          userId: swimmingCoach._id,
          SportComplexId: swimmingFacility._id,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );
  }

  let configurationCount = 0;
  for (const row of CONFIGS) {
    const [facility, sport] = await Promise.all([
      SportsComplex.findOne({ name: row.facility }),
      Sport.findOne({ SportName: row.sport }),
    ]);
    if (!facility || !sport) continue;

    const manager = await User.findOne({
      Role: 3,
      SportComplexId: facility._id,
    });
    if (!manager) continue;

    const slots = [];
    for (const slot of row.slots) {
      let coach = null;
      if (slot.coachEmail) {
        const coachUser = await User.findOne({ Email: slot.coachEmail });
        if (coachUser) {
          coach = await Instructor.findOne({
            userId: coachUser._id,
            SportComplexId: facility._id,
          });
        }
      }
      slots.push({
        label: slot.label,
        startTime: slot.startTime,
        endTime: slot.endTime,
        days: slot.days,
        capacity: slot.capacity,
        audience: slot.audience,
        purpose: slot.purpose,
        coach: coach ? coach._id : null,
        bookable: slot.bookable !== false,
      });
    }

    await FacilitySportConfig.findOneAndUpdate(
      { facility: facility._id, sport: sport._id },
      {
        $set: {
          bookingMode: row.bookingMode,
          unitLabel: row.unitLabel,
          unitCount: row.unitCount,
          capacityPerUnit: row.capacityPerUnit,
          price: row.price,
          bookingPolicy: row.bookingPolicy,
          slots,
          status: "Active",
          notes: row.notes,
          configuredBy: manager._id,
        },
        $setOnInsert: { facility: facility._id, sport: sport._id },
      },
      { upsert: true, new: true, runValidators: true }
    );
    await SportsComplex.updateOne(
      { _id: facility._id, "sports.sport": sport._id },
      { $set: { "sports.$.fees": String(row.price.amount), "sports.$.capacity": String(row.unitCount * row.capacityPerUnit) } }
    );
    await SportsComplex.updateOne(
      { _id: facility._id, "sports.sport": { $ne: sport._id } },
      { $push: { sports: { sport: sport._id, fees: String(row.price.amount), capacity: String(row.unitCount * row.capacityPerUnit) } } }
    );
    configurationCount += 1;
  }

  await Instructor.updateMany(
    { status: { $exists: false } },
    { $set: { status: "Active", qualification: "SAI Certified Coach" } }
  );

  console.log(
    `Management demo complete: ${await SportsComplex.countDocuments()} facilities, ${await Sport.countDocuments()} sports, ${await Instructor.countDocuments()} coaches, ${configurationCount} sport configurations.`
  );
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
