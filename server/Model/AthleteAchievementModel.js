const mongoose = require("mongoose");

const schema = new mongoose.Schema(
  {
    athlete: { type: mongoose.SchemaTypes.ObjectId, ref: "athletes", required: true },
    sport: { type: mongoose.SchemaTypes.ObjectId, ref: "sports", required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", maxlength: 4000 },
    category: {
      type: String,
      enum: [
        "Tournament Participation",
        "Gold Medal",
        "Silver Medal",
        "Bronze Medal",
        "Competition Winner",
        "Championship",
        "Personal Record",
        "Other",
      ],
      required: true,
    },
    eventName: { type: String, default: "", trim: true, maxlength: 200 },
    achievementDate: { type: Date, required: true },
    rank: { type: String, default: "", trim: true, maxlength: 50 },
    supportingDocuments: [
      {
        url: { type: String, required: true },
        name: { type: String, default: "" },
      },
    ],
    verificationStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected"],
      default: "Pending",
    },
    verifiedBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
    verificationRemarks: { type: String, default: "" },
  },
  { timestamps: true }
);

schema.index({ athlete: 1, sport: 1, achievementDate: -1 });

module.exports = mongoose.model("athleteachievements", schema);
