/**
 * Complete Database Seeder for KhelGujarat - Sports Infrastructure Management System
 * Problem Statement: PS000012 (Sports, Youth & Cultural Activities Department, Govt. of Gujarat)
 */

const mongoose = require("mongoose");
require("dotenv").config();

const DistrictsModel = require("./Model/DistrictsModel");
const SportModel = require("./Model/SportModel");
const UserModel = require("./Model/UsersModel");
const SportsComplexModel = require("./Model/SportsComplexModel");
const ComplaintTypeModel = require("./Model/ComplaintTypeModel");
const ComplaintModel = require("./Model/ComplaintModel");
const { hashPassword } = require("./Utils/password");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sfic";

const GUJARAT_DISTRICTS = [
  "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch",
  "Bhavnagar", "Botad", "Chhotaudepur", "Dahod", "Dang", "Devbhumi Dwarka",
  "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch",
  "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal",
  "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar",
  "Tapi", "Vadodara", "Valsad"
];

const SPORTS_DATA = [
  { SportName: "Badminton", Category: "Racquet Sports", baseUrl: "./sports/badminton.png" },
  { SportName: "Athletics & Track", Category: "Track & Field", baseUrl: "./sports/athletics.png" },
  { SportName: "Cricket", Category: "Field Sports", baseUrl: "./sports/cricket.png" },
  { SportName: "Football", Category: "Field Sports", baseUrl: "./sports/football.png" },
  { SportName: "Swimming", Category: "Aquatics", baseUrl: "./sports/swimming.png" },
  { SportName: "Table Tennis", Category: "Indoor Sports", baseUrl: "./sports/tabletennis.png" },
  { SportName: "Kabaddi", Category: "Combat / Traditional", baseUrl: "./sports/kabaddi.png" },
  { SportName: "Lawn Tennis", Category: "Court Sports", baseUrl: "./sports/tennis.png" },
  { SportName: "Basketball", Category: "Court Sports", baseUrl: "./sports/basketball.png" },
  { SportName: "Volleyball", Category: "Court Sports", baseUrl: "./sports/volleyball.png" },
  { SportName: "Wrestling (Kushti)", Category: "Combat Sports", baseUrl: "./sports/wrestling.png" },
  { SportName: "Archery", Category: "Precision Sports", baseUrl: "./sports/archery.png" }
];

const COMPLAINT_TYPES = [
  "Turf & Surface Degradation",
  "Floodlight & Electrical Outage",
  "Sanitation & Drinking Water",
  "Locker Room & Hygiene",
  "Equipment Replacement Needed",
  "Perimeter & Security Issue"
];

async function seed() {
  console.log("=================================================");
  console.log(" Connecting to MongoDB at:", MONGO_URI);
  console.log("=================================================");

  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 4000
    });
    console.log(" Connected to MongoDB successfully.\n");
  } catch (err) {
    console.error(" Could not connect to MongoDB:", err.message);
    console.log("\nIf you are using MongoDB locally, make sure mongod is running on port 27017,");
    console.log("or update MONGO_URI in sfic/.env with your MongoDB Atlas connection string:\n");
    console.log("  MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/sfic\n");
    process.exit(1);
  }

  try {
    // 1. Seed Districts
    console.log("1. Seeding Gujarat 33 Districts...");
    const districtDocs = {};
    for (const dist of GUJARAT_DISTRICTS) {
      let existing = await DistrictsModel.findOne({ District: dist });
      if (!existing) {
        existing = await DistrictsModel.create({ District: dist });
      }
      districtDocs[dist] = existing;
    }
    console.log(`   Seeded ${Object.keys(districtDocs).length} districts.`);

    // 2. Seed Sports
    console.log("2. Seeding Sports...");
    const sportDocs = {};
    for (const sp of SPORTS_DATA) {
      let existing = await SportModel.findOne({ SportName: sp.SportName });
      if (!existing) {
        existing = await SportModel.create(sp);
      }
      sportDocs[sp.SportName] = existing;
    }
    console.log(`   Seeded ${Object.keys(sportDocs).length} sports.`);

    // 3. Seed Complaint Types
    console.log("3. Seeding Complaint Categories...");
    for (const ct of COMPLAINT_TYPES) {
      let existing = await ComplaintTypeModel.findOne({ Type: ct });
      if (!existing) {
        await ComplaintTypeModel.create({ Type: ct });
      }
    }
    console.log(`   Seeded ${COMPLAINT_TYPES.length} complaint types.`);

    // 4. Seed Official Roles / Demo Users
    console.log("4. Seeding Official Users (Admin, DSO Authorities, Managers, Athletes)...");
    
    // State Admin
    let adminUser = await UserModel.findOne({ Email: "admin@sag.gujarat.gov.in" });
    if (!adminUser) {
      adminUser = await UserModel.create({
        Name: "Dr. Arvind Patel, IAS (Director General)",
        Email: "admin@sag.gujarat.gov.in",
        Password: hashPassword("admin"),
        ContactNum: "+91 79 2328 7411",
        DOB: "1975-04-12",
        Role: 5, // State Admin
        DistrictId: districtDocs["Gandhinagar"]?._id,
        IsActive: 1
      });
    }

    // DSO Ahmedabad (Role 4)
    let dsoAhmedabad = await UserModel.findOne({ Email: "dso.ahmedabad@sag.gujarat.gov.in" });
    if (!dsoAhmedabad) {
      dsoAhmedabad = await UserModel.create({
        Name: "Shri Bhavik Solanki (DSO Ahmedabad)",
        Email: "dso.ahmedabad@sag.gujarat.gov.in",
        Password: hashPassword("dso"),
        ContactNum: "+91 79 2216 4800",
        DOB: "1982-08-20",
        Role: 4, // District Authority
        DistrictId: districtDocs["Ahmedabad"]?._id,
        IsActive: 1
      });
      // Link district authorityID
      if (districtDocs["Ahmedabad"]) {
        districtDocs["Ahmedabad"].authorityID = dsoAhmedabad._id;
        await districtDocs["Ahmedabad"].save();
      }
    }

    // DSO Vadodara (Role 4)
    let dsoVadodara = await UserModel.findOne({ Email: "dso.vadodara@sag.gujarat.gov.in" });
    if (!dsoVadodara) {
      dsoVadodara = await UserModel.create({
        Name: "Shri K. L. Parmar (DSO Vadodara)",
        Email: "dso.vadodara@sag.gujarat.gov.in",
        Password: hashPassword("dso"),
        ContactNum: "+91 265 278 9120",
        DOB: "1980-03-15",
        Role: 4,
        DistrictId: districtDocs["Vadodara"]?._id,
        IsActive: 1
      });
      if (districtDocs["Vadodara"]) {
        districtDocs["Vadodara"].authorityID = dsoVadodara._id;
        await districtDocs["Vadodara"].save();
      }
    }

    // Complex Manager Khokhra (Role 3)
    let managerKhokhra = await UserModel.findOne({ Email: "manager.khokhra@sag.gujarat.gov.in" });
    if (!managerKhokhra) {
      managerKhokhra = await UserModel.create({
        Name: "Rajesh Vaghela (Complex Manager)",
        Email: "manager.khokhra@sag.gujarat.gov.in",
        Password: hashPassword("manager"),
        ContactNum: "+91 79 2216 4801",
        DOB: "1988-11-05",
        Role: 3, // Manager
        DistrictId: districtDocs["Ahmedabad"]?._id,
        IsActive: 1
      });
    }

    // Complex Manager Sama (Role 3)
    let managerSama = await UserModel.findOne({ Email: "manager.sama@sag.gujarat.gov.in" });
    if (!managerSama) {
      managerSama = await UserModel.create({
        Name: "Mehul Choksi (Complex Manager)",
        Email: "manager.sama@sag.gujarat.gov.in",
        Password: hashPassword("manager"),
        ContactNum: "+91 265 278 9121",
        DOB: "1986-07-22",
        Role: 3,
        DistrictId: districtDocs["Vadodara"]?._id,
        IsActive: 1
      });
    }

    // Citizen Athlete (Role 0)
    let athleteAarav = await UserModel.findOne({ Email: "athlete.aarav@gmail.com" });
    if (!athleteAarav) {
      athleteAarav = await UserModel.create({
        Name: "Aarav Trivedi (Badminton Athlete)",
        Email: "athlete.aarav@gmail.com",
        Password: hashPassword("athlete"),
        ContactNum: "+91 98980 12345",
        DOB: "2002-09-14",
        Role: 0,
        DistrictId: districtDocs["Ahmedabad"]?._id,
        IsActive: 1
      });
    }
    let coachKhokhra = await UserModel.findOne({ Email: "coach.khokhra@sag.gujarat.gov.in" });
    if (!coachKhokhra) {
      coachKhokhra = await UserModel.create({
        Name: "Nirav Joshi (Badminton Coach)",
        Email: "coach.khokhra@sag.gujarat.gov.in",
        Password: hashPassword("coach"),
        ContactNum: "+91 79 2216 4810",
        DOB: "1990-04-18",
        Role: 2,
        DistrictId: districtDocs["Ahmedabad"]?._id,
        IsActive: 1
      });
    }
    console.log("   Seeded 7 primary official and demo users.");

    // 5. Seed Sports Complexes across Gujarat with GIS Coords & Condition Assessments
    console.log("5. Seeding Gujarat Sports Complexes with GIS and FCI Ratings...");
    
    const complexesData = [
      {
        name: "SAG Khokhra Sports Complex",
        districtName: "Ahmedabad",
        taluka: "Maninagar",
        location: "Khokhra, Near Anupam Cinema, Ahmedabad, Gujarat 380008",
        latitude: "23.0035",
        longitude: "72.6105",
        area: "14.5",
        operationalSince: "2016",
        category: "SAG District Sports Complex",
        ownership: "Sports Authority of Gujarat (SAG)",
        contactPhone: "+91 79 2216 4800",
        contactEmail: "manager.khokhra@sag.gujarat.gov.in",
        conditionScore: 92,
        conditionGrade: "Grade A (Excellent)",
        lastInspectionDate: "2026-10-14",
        inspector: "DSO Ahmedabad (SAG Quality Cell)",
        maintenanceUrgency: "Normal / Routine",
        inspectionNotes: "Track resurfaced recently for Khel Mahakumbh. All indoor courts in top condition.",
        managerId: managerKhokhra._id,
        capacityDaily: 450,
        currentDailyFootfall: 360,
        utilisationRate: 80,
        picture: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80",
        sportsList: ["Badminton", "Table Tennis", "Athletics & Track", "Swimming"]
      },
      {
        name: "Sama Indoor Sports Complex",
        districtName: "Vadodara",
        taluka: "Vadodara Urban",
        location: "Sama-Savli Road, Vadodara, Gujarat 390024",
        latitude: "22.3275",
        longitude: "73.1942",
        area: "18.2",
        operationalSince: "2018",
        category: "SAG District Sports Complex",
        ownership: "Sports Authority of Gujarat (SAG)",
        contactPhone: "+91 265 278 9120",
        contactEmail: "manager.sama@sag.gujarat.gov.in",
        conditionScore: 89,
        conditionGrade: "Grade A (Excellent)",
        lastInspectionDate: "2026-09-22",
        inspector: "DSO Vadodara",
        maintenanceUrgency: "Normal / Routine",
        inspectionNotes: "Excellent maintenance. BWF wooden badminton flooring in pristine shape.",
        managerId: managerSama._id,
        capacityDaily: 500,
        currentDailyFootfall: 410,
        utilisationRate: 82,
        picture: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80",
        sportsList: ["Badminton", "Basketball", "Lawn Tennis", "Table Tennis"]
      },
      {
        name: "Swarnim Gujarat Sports University Arena",
        districtName: "Gandhinagar",
        taluka: "Gandhinagar",
        location: "Sector 15, Gandhinagar, Gujarat 382016",
        latitude: "23.2156",
        longitude: "72.6369",
        area: "35.0",
        operationalSince: "2015",
        category: "University / Institutional Ground",
        ownership: "Sports Authority of Gujarat (SAG) / SGSU",
        contactPhone: "+91 79 2328 7411",
        contactEmail: "nsc-sag@gujrat.gov.in",
        conditionScore: 96,
        conditionGrade: "Grade A (Excellent)",
        lastInspectionDate: "2026-10-28",
        inspector: "State Director SAG Inspection Panel",
        maintenanceUrgency: "Normal / Routine",
        inspectionNotes: "Olympic standard synthetic track, 50m heated pool, and sports science laboratory.",
        managerId: adminUser._id,
        capacityDaily: 800,
        currentDailyFootfall: 680,
        utilisationRate: 85,
        picture: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80",
        sportsList: ["Athletics & Track", "Football", "Archery", "Wrestling (Kushti)", "Swimming"]
      },
      {
        name: "Veer Narmad South Gujarat Sports Hub",
        districtName: "Surat",
        taluka: "Choryasi",
        location: "Udhna-Magdalla Road, Surat, Gujarat 395007",
        latitude: "21.1702",
        longitude: "72.8311",
        area: "16.0",
        operationalSince: "2019",
        category: "SAG District Sports Complex",
        ownership: "Sports Authority of Gujarat (SAG)",
        contactPhone: "+91 261 225 6112",
        contactEmail: "manager.surat@sag.gujarat.gov.in",
        conditionScore: 78,
        conditionGrade: "Grade B (Good)",
        lastInspectionDate: "2026-08-19",
        inspector: "DSO Surat",
        maintenanceUrgency: "Minor Attention Required",
        inspectionNotes: "Good condition, slight wear on outdoor volleyball court; floodlight maintenance scheduled.",
        managerId: adminUser._id,
        capacityDaily: 400,
        currentDailyFootfall: 290,
        utilisationRate: 72,
        picture: "https://images.unsplash.com/photo-1519766304817-4f37bda74a29?auto=format&fit=crop&w=800&q=80",
        sportsList: ["Badminton", "Volleyball", "Kabaddi", "Cricket"]
      },
      {
        name: "Racecourse Sports Complex",
        districtName: "Rajkot",
        taluka: "Rajkot Urban",
        location: "Racecourse Ring Road, Rajkot, Gujarat 360001",
        latitude: "22.3039",
        longitude: "70.8022",
        area: "22.0",
        operationalSince: "2012",
        category: "Municipal Stadium",
        ownership: "Rajkot Municipal Corporation & SAG",
        contactPhone: "+91 281 247 1823",
        contactEmail: "manager.rajkot@sag.gujarat.gov.in",
        conditionScore: 82,
        conditionGrade: "Grade B (Good)",
        lastInspectionDate: "2026-09-11",
        inspector: "DSO Rajkot",
        maintenanceUrgency: "Normal / Routine",
        inspectionNotes: "Cricket outfield well-mowed, tennis court resurfaced in 2025.",
        managerId: adminUser._id,
        capacityDaily: 480,
        currentDailyFootfall: 350,
        utilisationRate: 73,
        picture: "https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?auto=format&fit=crop&w=800&q=80",
        sportsList: ["Cricket", "Lawn Tennis", "Athletics & Track", "Table Tennis"]
      },
      {
        name: "Mehsana Taluka Sports Complex",
        districtName: "Mehsana",
        taluka: "Mehsana",
        location: "Modhera Road, Near Sports Hostel, Mehsana, Gujarat 384002",
        latitude: "23.5880",
        longitude: "72.3693",
        area: "9.5",
        operationalSince: "2014",
        category: "Taluka Sports Complex",
        ownership: "Sports Authority of Gujarat (SAG)",
        contactPhone: "+91 2762 230 450",
        contactEmail: "manager.mehsana@sag.gujarat.gov.in",
        conditionScore: 58,
        conditionGrade: "Grade C (Needs Maintenance)",
        lastInspectionDate: "2026-10-02",
        inspector: "DSO Mehsana",
        maintenanceUrgency: "High Priority Repair",
        inspectionNotes: "Outdoor pitch uneven; budget sanctioned under SAG District Modernisation 2026-27.",
        managerId: adminUser._id,
        capacityDaily: 250,
        currentDailyFootfall: 95,
        utilisationRate: 38,
        picture: "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=800&q=80",
        sportsList: ["Kabaddi", "Volleyball", "Athletics & Track"]
      }
    ];

    for (const cData of complexesData) {
      let complex = await SportsComplexModel.findOne({ name: cData.name });
      const sportsArray = cData.sportsList
        .filter((s) => sportDocs[s])
        .map((s) => ({
          sport: sportDocs[s]._id,
          fees: "120",
          capacity: "40",
          rating: 4.6,
          images: []
        }));

      const payload = {
        name: cData.name,
        location: cData.location,
        latitude: cData.latitude,
        longitude: cData.longitude,
        district: districtDocs[cData.districtName]?._id,
        taluka: cData.taluka,
        area: cData.area,
        operationalSince: cData.operationalSince,
        category: cData.category,
        ownership: cData.ownership,
        contactPhone: cData.contactPhone,
        contactEmail: cData.contactEmail,
        conditionScore: cData.conditionScore,
        conditionGrade: cData.conditionGrade,
        lastInspectionDate: cData.lastInspectionDate,
        inspector: cData.inspector,
        maintenanceUrgency: cData.maintenanceUrgency,
        inspectionNotes: cData.inspectionNotes,
        manager: cData.managerId,
        capacityDaily: cData.capacityDaily,
        currentDailyFootfall: cData.currentDailyFootfall,
        utilisationRate: cData.utilisationRate,
        picture: cData.picture,
        sports: sportsArray
      };

      if (!complex) {
        complex = await SportsComplexModel.create(payload);
      } else {
        await SportsComplexModel.updateOne({ _id: complex._id }, payload);
        complex = await SportsComplexModel.findById(complex._id);
      }
      if (cData.managerId) {
        const managerUser = await UserModel.findById(cData.managerId).select("Role");
        if (managerUser && managerUser.Role === 3) {
          await UserModel.updateOne(
            { _id: managerUser._id },
            { $set: { SportComplexId: complex._id } }
          );
        }
      }
    }
    const khokhraComplex = await SportsComplexModel.findOne({ name: "SAG Khokhra Sports Complex" });
    if (khokhraComplex && coachKhokhra) {
      await UserModel.updateOne(
        { _id: coachKhokhra._id },
        { $set: { SportComplexId: khokhraComplex._id } }
      );
    }
    console.log(`   Seeded ${complexesData.length} Gujarat Sports Complexes with GeoJSON coords.`);

    console.log("\n=================================================");
    console.log(" DATABASE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=================================================");
    console.log("Demo Credentials:");
    console.log("  • State Admin (SAG):   admin@sag.gujarat.gov.in    / admin");
    console.log("  • DSO Ahmedabad:       dso.ahmedabad@sag.gujarat.gov.in / dso");
    console.log("  • DSO Vadodara:        dso.vadodara@sag.gujarat.gov.in  / dso");
    console.log("  • Complex Manager:     manager.khokhra@sag.gujarat.gov.in / manager");
    console.log("  • Citizen Athlete:     athlete.aarav@gmail.com     / athlete");
    console.log("  • Facility Coach:      coach.khokhra@sag.gujarat.gov.in / coach");
    console.log("=================================================\n");

    process.exit(0);
  } catch (err) {
    console.error(" Error during seeding:", err);
    process.exit(1);
  }
}

seed();

