const mongoose = require("mongoose");

const FacilityAssessmentSchema = new mongoose.Schema(
  {
    facilityId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sportscomplexes",
      required: true,
      index: true,
    },
    facilityName: { type: String, default: "" },
    districtName: { type: String, default: "" },
    submittedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "users",
      required: true,
    },
    inspectorName: { type: String, default: "" },
    assessmentDate: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Analysed", "Submitted"],
      default: "Analysed",
    },
    managerObservations: { type: String, default: "" },
    questionnaire: { type: mongoose.Schema.Types.Mixed, default: null },
    photos: { type: [mongoose.Schema.Types.Mixed], default: [] },
    ai: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("facilityassessments", FacilityAssessmentSchema);
