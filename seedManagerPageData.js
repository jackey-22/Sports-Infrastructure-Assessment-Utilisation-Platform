/**
 * Seeds demo instructors and guest time slots for the facility manager pages:
 *   /manager/allinstructor  -> InstructorDataTable  (GET /getInstructorswithall)
 *   /manager/slottable      -> SlotDataTable        (GET /getGuest)
 *
 * Idempotent: re-running updates the same users, instructors and guests.
 * Run: node seedManagerPageData.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const SportModel = require("./Model/SportModel");
const SportsComplexModel = require("./Model/SportsComplexModel");
const UserModel = require("./Model/UsersModel");
const InstructorModel = require("./Model/instructorModel");
const GuestModel = require("./Model/GuestModel");
const { hashPassword } = require("./Utils/password");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sfic";

const INSTRUCTORS = {
  "SAG Khokhra Sports Complex": [
    {
      email: "coach.khokhra@sag.gujarat.gov.in",
      name: "Nirav Joshi",
      contact: "+91 79 2216 4810",
      experience: 8,
      sports: [{ sport: "Badminton", slots: [["06:00", "08:00"], ["17:00", "19:00"]] }],
    },
    {
      email: "pooja.desai@sag.gujarat.gov.in",
      name: "Pooja Desai",
      contact: "+91 79 2216 4812",
      experience: 5,
      sports: [{ sport: "Table Tennis", slots: [["07:00", "09:00"]] }],
    },
    {
      email: "amit.rathod@sag.gujarat.gov.in",
      name: "Amit Rathod",
      contact: "+91 79 2216 4814",
      experience: 6,
      sports: [{ sport: "Athletics & Track", slots: [["05:30", "07:30"]] }],
    },
  ],
  "Sama Indoor Sports Complex": [
    {
      email: "hetal.mehta@sag.gujarat.gov.in",
      name: "Hetal Mehta",
      contact: "+91 265 278 9122",
      experience: 7,
      sports: [{ sport: "Badminton", slots: [["06:00", "08:00"]] }],
    },
    {
      email: "jignesh.patel@sag.gujarat.gov.in",
      name: "Jignesh Patel",
      contact: "+91 265 278 9124",
      experience: 4,
      sports: [{ sport: "Basketball", slots: [["16:00", "18:00"]] }],
    },
    {
      email: "ravi.solanki@sag.gujarat.gov.in",
      name: "Ravi Solanki",
      contact: "+91 265 278 9126",
      experience: 9,
      sports: [
        { sport: "Lawn Tennis", slots: [["07:00", "09:00"]] },
        { sport: "Table Tennis", slots: [["18:00", "20:00"]] },
      ],
    },
  ],
};

// duration is in days; the page prints createdAt/updatedAt as Start/End date.
const GUESTS = {
  "SAG Khokhra Sports Complex": [
    { name: "Kunal Shah", email: "kunal.shah@example.test", contact: "+91 98250 11001", sport: "Badminton", from: "06:00", to: "08:00", duration: 15, startOffset: -4, endOffset: 11 },
    { name: "Meera Vyas", email: "meera.vyas@example.test", contact: "+91 98250 11002", sport: "Table Tennis", from: "07:00", to: "09:00", duration: 30, startOffset: -10, endOffset: 20 },
    { name: "Darshan Amin", email: "darshan.amin@example.test", contact: "+91 98250 11003", sport: "Athletics & Track", from: "05:30", to: "07:30", duration: 7, startOffset: -2, endOffset: 5 },
    { name: "Riya Chauhan", email: "riya.chauhan@example.test", contact: "+91 98250 11004", sport: "Badminton", from: "17:00", to: "19:00", duration: 30, startOffset: -20, endOffset: 10 },
    { name: "Sahil Modi", email: "sahil.modi@example.test", contact: "+91 98250 11005", sport: "Swimming", from: "06:00", to: "07:00", duration: 15, startOffset: -1, endOffset: 14 },
  ],
  "Sama Indoor Sports Complex": [
    { name: "Ayesha Sheikh", email: "ayesha.sheikh@example.test", contact: "+91 98250 22001", sport: "Badminton", from: "06:00", to: "08:00", duration: 30, startOffset: -6, endOffset: 24 },
    { name: "Parth Joshi", email: "parth.joshi@example.test", contact: "+91 98250 22002", sport: "Basketball", from: "16:00", to: "18:00", duration: 15, startOffset: -3, endOffset: 12 },
    { name: "Nidhi Trivedi", email: "nidhi.trivedi@example.test", contact: "+91 98250 22003", sport: "Lawn Tennis", from: "07:00", to: "09:00", duration: 7, startOffset: -1, endOffset: 6 },
    { name: "Yash Pandya", email: "yash.pandya@example.test", contact: "+91 98250 22004", sport: "Table Tennis", from: "18:00", to: "20:00", duration: 30, startOffset: -15, endOffset: 15 },
    { name: "Ishita Rana", email: "ishita.rana@example.test", contact: "+91 98250 22005", sport: "Basketball", from: "17:00", to: "19:00", duration: 15, startOffset: -8, endOffset: 7 },
  ],
};

function isoOffset(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

function atIso(days) {
  return new Date(`${isoOffset(days)}T00:00:00.000Z`);
}

async function seedInstructors(complex, manager, sportIdByName) {
  const rows = INSTRUCTORS[complex.name] || [];
  for (const row of rows) {
    let coach = await UserModel.findOne({ Email: row.email });
    if (!coach) {
      coach = await UserModel.create({
        Name: row.name,
        Email: row.email,
        Password: hashPassword("coach"),
        ContactNum: row.contact,
        Role: 2,
        DistrictId: manager.DistrictId,
        SportComplexId: complex._id,
        IsActive: 1,
      });
    } else if (String(coach.SportComplexId || "") !== String(complex._id)) {
      coach.SportComplexId = complex._id;
      await coach.save();
    }

    const sports = row.sports
      .map((entry) => ({
        sport: sportIdByName.get(entry.sport),
        timeSlot: entry.slots.map(([from, to]) => ({ from, to })),
        experience: row.experience,
      }))
      .filter((entry) => entry.sport);

    const payload = {
      SportComplexId: complex._id,
      userId: coach._id,
      createdBy: manager._id,
      sports,
    };
    const existing = await InstructorModel.findOne({
      userId: coach._id,
      SportComplexId: complex._id,
    });
    if (existing) {
      await InstructorModel.updateOne({ _id: existing._id }, payload);
    } else {
      await InstructorModel.create(payload);
    }
  }
  console.log(`   ${complex.name}: ${rows.length} instructors`);
}

async function seedGuests(complex, sportIdByName) {
  const rows = GUESTS[complex.name] || [];
  for (const row of rows) {
    const sportId = sportIdByName.get(row.sport);
    if (!sportId) continue;
    const start = atIso(row.startOffset);
    const end = atIso(row.endOffset);
    await GuestModel.collection.updateOne(
      { Email: row.email, SportComplexId: complex._id },
      {
        $set: {
          Name: row.name,
          Email: row.email,
          ContactNum: row.contact,
          Role: 0,
          IsActive: 1,
          timeslot: { from: row.from, to: row.to },
          duration: row.duration,
          sport: sportId,
          SportComplexId: complex._id,
          Startdate: isoOffset(row.startOffset),
          Enddate: isoOffset(row.endOffset),
          createdAt: start,
          updatedAt: end,
        },
      },
      { upsert: true }
    );
  }
  console.log(`   ${complex.name}: ${rows.length} guest time slots`);
}

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const sports = await SportModel.find({});
  const sportIdByName = new Map(sports.map((sport) => [sport.SportName, sport._id]));

  const managers = await UserModel.find({ Role: 3, SportComplexId: { $ne: null } });
  console.log(`Found ${managers.length} facility manager(s).`);

  for (const manager of managers) {
    const complex = await SportsComplexModel.findById(manager.SportComplexId);
    if (!complex) {
      console.log(`   Skipping ${manager.Email}: complex not found.`);
      continue;
    }
    if (!INSTRUCTORS[complex.name]) {
      console.log(`   Skipping ${complex.name}: no seed rows defined.`);
      continue;
    }
    await seedInstructors(complex, manager, sportIdByName);
    await seedGuests(complex, sportIdByName);
  }

  console.log("Seeding complete. Instructors:", await InstructorModel.countDocuments());
  console.log("Seeding complete. Guest time slots:", await GuestModel.countDocuments());
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error("Seeding failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
