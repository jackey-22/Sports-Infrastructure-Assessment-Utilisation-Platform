const mongoose = require("mongoose");

const selectionSchema = new mongoose.Schema({
  facilitySportConfig: { type: mongoose.SchemaTypes.ObjectId, ref: "facilitysportconfigs", required: true },
  sport: { type: mongoose.SchemaTypes.ObjectId, ref: "sports", required: true },
  slotId: { type: mongoose.SchemaTypes.ObjectId, required: true },
  date: { type: String, required: true },
  participantCount: { type: Number, min: 1, required: true },
  requestedUnits: { type: Number, min: 1, required: true },
  reservedUnits: { type: Number, min: 1, required: true },
  estimatedAmount: { type: Number, min: 0, default: 0 },
}, { _id: true });

const institutionEventBookingSchema = new mongoose.Schema({
  bookingReference: { type: String, required: true, unique: true, index: true },
  institution: { type: mongoose.SchemaTypes.ObjectId, ref: "users", required: true, index: true },
  facility: { type: mongoose.SchemaTypes.ObjectId, ref: "sportscomplexes", required: true, index: true },
  eventName: { type: String, required: true, trim: true },
  eventType: { type: String, enum: ["Annual Sports Meet", "Tournament", "Training Camp", "Trials", "Other"], default: "Annual Sports Meet" },
  purpose: { type: String, required: true, trim: true },
  requirements: { type: String, trim: true, default: "" },
  selections: {
    type: [selectionSchema],
    validate: { validator: (items) => Array.isArray(items) && items.length > 0, message: "Select at least one sport slot" },
  },
  startDate: { type: String, required: true, index: true },
  endDate: { type: String, required: true, index: true },
  estimatedAmount: { type: Number, min: 0, default: 0 },
  quotedAmount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ["Submitted", "Approved", "Confirmed", "Rejected", "Cancelled"], default: "Submitted", index: true },
  managerNote: { type: String, trim: true, default: "" },
  reviewedBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
  reviewedAt: Date,
  paymentStatus: { type: String, enum: ["Not Required", "Pending", "Paid", "Failed", "Refunded"], default: "Not Required", index: true },
  razorpayOrderId: { type: String, index: true, sparse: true },
  razorpayPaymentId: { type: String, index: true, sparse: true },
  paidAt: Date,
  confirmedAt: Date,
}, { timestamps: true, optimisticConcurrency: true });

institutionEventBookingSchema.index({ facility: 1, status: 1, "selections.date": 1 });

module.exports = mongoose.model("institutioneventbookings", institutionEventBookingSchema);
