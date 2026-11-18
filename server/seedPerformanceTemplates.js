const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const Sport = require("./Model/SportModel");
const User = require("./Model/UsersModel");
const Template = require("./Model/EvaluationTemplateModel");

const definitions = {
  Cricket: [["Batting", 30], ["Bowling", 25], ["Fielding", 20], ["Fitness", 15], ["Teamwork", 10]],
  Football: [["Passing", 20], ["Shooting", 20], ["Defending", 20], ["Speed and Stamina", 20], ["Teamwork", 20]],
  Swimming: [["Speed", 35], ["Stroke Technique", 25], ["Endurance", 20], ["Turns and Starts", 10], ["Consistency", 10]],
  "Athletics & Track": [["Sprint Timing", 40], ["Acceleration", 20], ["Running Technique", 15], ["Endurance", 15], ["Start Reaction", 10]],
  Badminton: [["Smash Accuracy", 20], ["Footwork", 20], ["Serve Accuracy", 15], ["Defensive Skills", 20], ["Stamina", 15], ["Game Strategy", 10]],
  Volleyball: [["Serving", 15], ["Spiking", 20], ["Blocking", 20], ["Passing", 15], ["Setting", 15], ["Team Coordination", 15]],
  Basketball: [["Shooting Accuracy", 25], ["Dribbling", 15], ["Passing", 15], ["Defence", 15], ["Rebounding", 15], ["Stamina", 15]],
  "Lawn Tennis": [["Serve Accuracy", 20], ["Forehand", 15], ["Backhand", 15], ["Footwork", 15], ["Rally Consistency", 20], ["Match Strategy", 15]],
  Weightlifting: [["Snatch Performance", 25], ["Clean and Jerk", 30], ["Lifting Technique", 20], ["Strength", 15], ["Consistency", 10]],
  Hockey: [["Ball Control", 20], ["Passing Accuracy", 15], ["Shooting", 20], ["Tackling", 15], ["Positioning", 15], ["Teamwork", 15]],
  Archery: [["Shooting Accuracy", 35], ["Consistency", 20], ["Shooting Technique", 20], ["Focus and Concentration", 15], ["Posture", 10]],
  Boxing: [["Punching Accuracy", 20], ["Defensive Skills", 20], ["Footwork", 15], ["Speed", 15], ["Stamina", 15], ["Technique", 15]],
  Gymnastics: [["Execution", 30], ["Difficulty", 25], ["Flexibility", 15], ["Balance", 15], ["Artistic Presentation", 15]],
};

const aliases = { Tennis: "Lawn Tennis", "Athletics (Sprint)": "Athletics & Track" };
const recognitionLevels = [
  { minScore: 90, label: "Outstanding", badge: "gold" },
  { minScore: 80, label: "Excellent", badge: "silver" },
  { minScore: 70, label: "Very Good", badge: "bronze" },
  { minScore: 60, label: "Good", badge: "blue" },
  { minScore: 0, label: "Needs Improvement", badge: "gray" },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const admin = await User.findOne({ Role: 5, IsActive: { $ne: 0 } }).select("_id").lean();
  if (!admin) throw new Error("An active admin account is required to create evaluation templates");

  for (const [requestedName, parameterDefinitions] of Object.entries(definitions)) {
    const sportName = aliases[requestedName] || requestedName;
    const sport = await Sport.findOne({ SportName: sportName }).select("_id SportName").lean();
    if (!sport) {
      console.log(`${requestedName}: skipped (sport does not exist)`);
      continue;
    }

    const latest = await Template.findOne({ sport: sport._id }).sort({ version: -1 }).lean();
    await Template.updateMany({ sport: sport._id, status: "Published" }, { $set: { status: "Archived" } });
    await Template.create({
      sport: sport._id,
      version: (latest?.version || 0) + 1,
      status: "Published",
      parameters: parameterDefinitions.map(([name, weightage]) => ({
        name,
        weightage,
        evaluationType: "qualitative",
        maxScore: 5,
        scoringMethod: "higher_is_better",
        instructions: "Rate this parameter from 1 (needs improvement) to 5 (exceptional).",
      })),
      recognitionLevels,
      scoringFormula: "weighted_sum",
      createdBy: admin._id,
      publishedAt: new Date(),
    });
    console.log(`${requestedName}: published ${sportName} template v${(latest?.version || 0) + 1}`);
  }
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
});
