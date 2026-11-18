const mongoose = require("mongoose");

const detailSchema = new mongoose.Schema(
  {
    parameterId: { type: mongoose.SchemaTypes.ObjectId, required: true },
    parameterName: { type: String, required: true },
    actualValue: { type: mongoose.Schema.Types.Mixed, required: true },
    normalizedScore: { type: Number, required: true, min: 0, max: 100 },
    weightedScore: { type: Number, required: true, min: 0, max: 100 },
    remarks: { type: String, default: "" },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    athlete: { type: mongoose.SchemaTypes.ObjectId, ref: "athletes", required: true },
    sport: { type: mongoose.SchemaTypes.ObjectId, ref: "sports", required: true },
    coach: { type: mongoose.SchemaTypes.ObjectId, ref: "users", required: true },
    template: { type: mongoose.SchemaTypes.ObjectId, ref: "evaluationtemplates", required: true },
    templateVersion: { type: Number, required: true },
    totalScore: { type: Number, required: true, min: 0, max: 100 },
    recognition: {
      label: { type: String, default: "" },
      badge: { type: String, default: "" },
    },
    remarks: { type: String, default: "" },
    evaluationDate: { type: Date, required: true, default: Date.now },
    details: { type: [detailSchema], required: true },
    status: { type: String, enum: ["Submitted", "Revised"], default: "Submitted" },
  },
  { timestamps: true }
);

schema.index({ athlete: 1, sport: 1, evaluationDate: -1 });

module.exports = mongoose.model("performanceevaluations", schema);
