/**
 * Safe first-run bootstrap.
 *
 * Adds only missing Gujarat districts and the documented demo Admin account.
 * Existing records are never updated or deleted.
 */
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const District = require("./Model/DistrictsModel");
const User = require("./Model/UsersModel");
const { hashPassword } = require("./Utils/password");
const { ROLE } = require("./Utils/roles");

const DISTRICTS = [
  "Ahmedabad", "Amreli", "Anand", "Aravalli", "Banaskantha", "Bharuch",
  "Bhavnagar", "Botad", "Chhotaudepur", "Dahod", "Dang", "Devbhumi Dwarka",
  "Gandhinagar", "Gir Somnath", "Jamnagar", "Junagadh", "Kheda", "Kutch",
  "Mahisagar", "Mehsana", "Morbi", "Narmada", "Navsari", "Panchmahal",
  "Patan", "Porbandar", "Rajkot", "Sabarkantha", "Surat", "Surendranagar",
  "Tapi", "Vadodara", "Valsad",
];

async function bootstrap() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from server/.env");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 12000 });

  let districtsCreated = 0;
  const districtByName = {};
  for (const name of DISTRICTS) {
    let district = await District.findOne({ District: name });
    if (!district) {
      district = await District.create({ District: name });
      districtsCreated += 1;
    }
    districtByName[name] = district;
  }

  const adminEmail = "admin@sag.gujarat.gov.in";
  let adminCreated = false;
  if (!(await User.exists({ Email: adminEmail }))) {
    await User.create({
      Name: "Dr. Arvind Patel, IAS (Director General)",
      Email: adminEmail,
      Password: hashPassword("admin"),
      ContactNum: "+91 79 2328 7411",
      DOB: "1975-04-12",
      Role: ROLE.ADMIN,
      DistrictId: districtByName.Gandhinagar._id,
      IsActive: 1,
    });
    adminCreated = true;
  }

  console.log(
    `Bootstrap complete: ${districtsCreated} districts added; admin ${adminCreated ? "created" : "already existed"}.`
  );
}

bootstrap()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
