const mongoose = require("mongoose");

const GuestSchema = new mongoose.Schema(
  {
    Name: {
      type: String,
      trim: true,
    },

    Email: {
      type: String,
      trim: true,
    },

    ContactNum: {
      type: String,
      trim: true,
    },
    citizenUser: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "users",
      default: null,
      index: true,
    },

    Role: {
      type: Number,
    },

    IsActive: {
      type: Number,
      default: 1,
    },
    timeslot: {
      from: String,
      to: String,
    },
    duration: Number,
    sport: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sports",
    },
    SportComplexId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sportscomplexes",
    },
    Startdate: {
      type: String,
      
    },
    Enddate: {
      type: String,
      
    },
    facilitySportConfig: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "facilitysportconfigs",
    },
    slotId: { type: mongoose.SchemaTypes.ObjectId },
    coach: { type: mongoose.SchemaTypes.ObjectId, ref: "instructors", default: null },
    memberCount: { type: Number, min: 1, default: 1 },
    reservedUnits: { type: Number, min: 1, default: 1 },
    totalAmount: { type: Number, min: 0, default: 0 },
    bookingReference: { type: String, index: true },
    bookingType: {
      type: String,
      enum: ["slot", "bulk", "subscription"],
      default: "slot",
    },
    bulkGroupId: { type: String, index: true, default: null },
    subscriptionPlan: {
      planId: { type: mongoose.SchemaTypes.ObjectId, default: null },
      name: { type: String, default: "" },
      durationType: { type: String, default: "" },
      durationDays: { type: Number, default: null },
    },
    bookingStatus: {
      type: String,
      enum: ["Pending Payment", "Confirmed", "Cancelled"],
      default: "Pending Payment",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed", "Refunded"],
      default: "Pending",
    },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String, index: true },
    paidAt: Date,
    priceBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
    isEvaluated: { type: Boolean, default: false },
    evaluatedAt: { type: Date, default: null },
    evaluationScore: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Guest", GuestSchema);
