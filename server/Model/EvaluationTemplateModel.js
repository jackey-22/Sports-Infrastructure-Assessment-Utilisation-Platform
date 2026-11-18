const mongoose = require("mongoose");

const parameterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    weightage: { type: Number, required: true, min: 0, max: 100 },
    evaluationType: {
      type: String,
      enum: ["qualitative", "quantitative", "statistical"],
      required: true,
    },
    maxScore: { type: Number, min: 1, default: 5 },
    scoringMethod: { type: String, default: "higher_is_better" },
    benchmark: { type: mongoose.Schema.Types.Mixed, default: {} },
    instructions: { type: String, default: "" },
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

const recognitionSchema = new mongoose.Schema(
  {
    minScore: { type: Number, required: true, min: 0, max: 100 },
    label: { type: String, required: true, trim: true },
    badge: { type: String, default: "" },
  },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    sport: { type: mongoose.SchemaTypes.ObjectId, ref: "sports", required: true },
    version: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["Draft", "Published", "Archived"],
      default: "Draft",
    },
    parameters: { type: [parameterSchema], default: [] },
    recognitionLevels: { type: [recognitionSchema], default: [] },
    scoringFormula: { type: String, default: "weighted_sum" },
    createdBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users", required: true },
    publishedAt: Date,
  },
  { timestamps: true }
);

schema.index({ sport: 1, version: 1 }, { unique: true });
schema.index({ sport: 1, status: 1 });

module.exports = mongoose.model("evaluationtemplates", schema);
