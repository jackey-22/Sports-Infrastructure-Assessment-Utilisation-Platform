const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema({
  percent: { type: Number, min: 0, max: 100, required: true },
  amountUsed: { type: Number, min: 0, default: 0 },
  note: { type: String, trim: true, required: true },
  proofUrl: String,
  proofName: String,
  proofKey: String,
  proofSize: Number,
  proofMimeType: String,
  submittedBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users", required: true },
  submittedAt: { type: Date, default: Date.now },
  reviewStatus: { type: String, enum: ["Pending", "Verified", "Query Raised"], default: "Pending" },
  adminNote: { type: String, trim: true, default: "" },
  reviewedBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
  reviewedAt: Date,
});

const grantSchema = new mongoose.Schema({
  facility: { type: mongoose.SchemaTypes.ObjectId, ref: "sportscomplexes", required: true, index: true },
  title: { type: String, trim: true, required: true },
  purpose: { type: String, trim: true, required: true },
  allocatedAmount: { type: Number, min: 1, required: true },
  allocatedBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users", required: true },
  startDate: Date,
  dueDate: Date,
  status: { type: String, enum: ["Allocated", "In Progress", "Proof Submitted", "Query Raised", "Verified"], default: "Allocated", index: true },
  progressUpdates: [progressSchema],
}, { timestamps: true, optimisticConcurrency: true });

module.exports = mongoose.model("facilitygrants", grantSchema);
