const mongoose = require("mongoose");

const instructorSchema = new mongoose.Schema(
  {
    SportComplexId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sportscomplexes",
    },
    userId: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
    createdBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
    qualification: { type: String, default: "" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    sports: [
      {
        sport: { type: mongoose.SchemaTypes.ObjectId, ref: "sports" },
        timeSlot: [{ from: String, to: String }],
        experience: Number, //in years
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("instructors", instructorSchema);
