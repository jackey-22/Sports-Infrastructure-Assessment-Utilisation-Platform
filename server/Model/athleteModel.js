const mongoose = require("mongoose");

const athleteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
    SportComplexId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sportscomplexes",
    },
    createdBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
    bloodGroup: String,
    disability: Number,
    healthIssue: String,
    weight: String, //in kg
    height: String, //in feets
    isApproved: Number,
    isActive: Number,
    address: String,
    emergencyNumber: String,
    baseUrl: {
      type: String,
    },
    goals: [
      {
        title: String,
        description: String,
        sport: { type: mongoose.SchemaTypes.ObjectId, ref: "sports", default: null },
        goalType: {
          type: String,
          enum: ["attendance", "skill_score", "custom"],
          default: "custom",
        },
        targetValue: { type: Number, default: 1 },
        currentValue: { type: Number, default: 0 },
        unit: { type: String, default: "sessions" },
        assignedBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users", default: null },
        assignedByRole: { type: String, enum: ["athlete", "coach"], default: "athlete" },
        status: {
          type: String,
          enum: ["Active", "Completed", "Overdue"],
          default: "Active",
        },
        startdate: {
          type: Date,
          default: Date.now,
        },
        targetdate: Date, //useful for reminder
        actualdate: Date,
        achieved: {
          type: String,
          default: "0",
        },
      },
    ],
    badges: [
      {
        badgeKey: { type: String, required: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        category: { type: String, enum: ["milestone", "tier"], default: "milestone" },
        tier: { type: String, default: "bronze" },
        points: { type: Number, default: 0 },
        awardedAt: { type: Date, default: Date.now },
      },
    ],
    xpPoints: { type: Number, default: 0 },
    payments: [{ type: mongoose.SchemaTypes.ObjectId, ref: "payments" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("athletes", athleteSchema);
