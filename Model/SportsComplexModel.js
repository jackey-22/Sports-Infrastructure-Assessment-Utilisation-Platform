const mongoose = require("mongoose");

const SportsComplexSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    latitude: { type: String, required: true },
    longitude: { type: String, required: true },
    district: { type: mongoose.SchemaTypes.ObjectId, ref: "districts" },
    taluka: String,
    area: String, // in acres
    operationalSince: String,
    category: {
      type: String,
      default: "SAG District Sports Complex"
    },
    ownership: {
      type: String,
      default: "Sports Authority of Gujarat (SAG)"
    },
    contactPhone: String,
    contactEmail: String,
    // Assessment & Condition Tracking (PS000012)
    conditionScore: { type: Number, default: 85 }, // 0 to 100
    conditionGrade: { type: String, default: "Grade A (Excellent)" },
    lastInspectionDate: { type: String, default: "2026-10-15" },
    inspector: { type: String, default: "DSO Quality Cell (SAG)" },
    maintenanceUrgency: { type: String, default: "Normal / Routine" },
    inspectionNotes: { type: String, default: "Facility in compliance with SAG standards." },
    amenities: {
      floodlights: { type: Boolean, default: true },
      drinkingWater: { type: Boolean, default: true },
      changingRooms: { type: Boolean, default: true },
      firstAid: { type: Boolean, default: true },
      parking: { type: Boolean, default: true },
      gym: { type: Boolean, default: false },
      divyangjanFriendly: { type: Boolean, default: true },
      canteen: { type: Boolean, default: false }
    },
    utilisationRate: { type: Number, default: 75 },
    capacityDaily: { type: Number, default: 400 },
    currentDailyFootfall: { type: Number, default: 300 },
    sports: [
      {
        sport: { type: mongoose.SchemaTypes.ObjectId, ref: "sports" },
        images: [String],
        rating: { type: Number, default: 4.5 },
        fees: String,
        capacity: String,
      },
    ],
    manager: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
    timings: {
      openingTime: { type: String, default: "06:00 AM" },
      closingTime: { type: String, default: "09:00 PM" }
    },
    picture: {
      type: String,
      default: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80"
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("sportscomplexes", SportsComplexSchema);
