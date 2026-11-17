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
    memberCount: { type: Number, min: 1, default: 1 },
    reservedUnits: { type: Number, min: 1, default: 1 },
    totalAmount: { type: Number, min: 0, default: 0 },
    bookingReference: { type: String, index: true },
    bookingStatus: {
      type: String,
      enum: ["Pending Payment", "Confirmed", "Cancelled"],
      default: "Pending Payment",
    },
    priceBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Guest", GuestSchema);
