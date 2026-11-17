const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
  reviewer: { type: mongoose.SchemaTypes.ObjectId, ref: "users", required: true, index: true },
  targetType: { type: String, enum: ["facility", "sport", "coach"], required: true },
  facility: { type: mongoose.SchemaTypes.ObjectId, ref: "sportscomplexes", required: true, index: true },
  sport: { type: mongoose.SchemaTypes.ObjectId, ref: "sports", default: null },
  coach: { type: mongoose.SchemaTypes.ObjectId, ref: "instructors", default: null },
  rating: { type: Number, min: 1, max: 5, required: true },
  remarks: { type: String, trim: true, maxlength: 1000, default: "" },
}, { timestamps: true });

reviewSchema.index({ reviewer: 1, targetType: 1, facility: 1, sport: 1, coach: 1 }, { unique: true });
module.exports = mongoose.model("platformreviews", reviewSchema);
