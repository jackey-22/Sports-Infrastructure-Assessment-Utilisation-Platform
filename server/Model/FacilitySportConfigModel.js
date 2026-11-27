const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    days: { type: [String], default: [] },
    capacity: { type: Number, min: 1, required: true },
    audience: {
      type: String,
      enum: ["mixed", "women", "men", "children", "members"],
      default: "mixed",
    },
    purpose: {
      type: String,
      enum: ["open-play", "coaching", "competition"],
      default: "open-play",
    },
    coach: { type: mongoose.SchemaTypes.ObjectId, ref: "instructors", default: null },
    bookable: { type: Boolean, default: true },
  },
  { _id: true }
);

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    durationType: { type: String, enum: ["monthly", "yearly"], required: true },
    durationDays: { type: Number, min: 1, default: 30 },
    price: { type: Number, min: 1, required: true },
    slotId: { type: mongoose.SchemaTypes.ObjectId, default: null },
    description: { type: String, trim: true, default: "", maxlength: 400 },
    active: { type: Boolean, default: true },
  },
  { _id: true }
);

const facilitySportConfigSchema = new mongoose.Schema(
  {
    facility: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sportscomplexes",
      required: true,
      index: true,
    },
    sport: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sports",
      required: true,
      index: true,
    },
    images: { type: [String], default: [] },
    bookingMode: {
      type: String,
      enum: ["capacity", "court", "hybrid"],
      required: true,
    },
    unitLabel: { type: String, default: "participants" },
    unitCount: { type: Number, min: 1, default: 1 },
    capacityPerUnit: { type: Number, min: 1, default: 1 },
    price: {
      amount: { type: Number, min: 0, required: true },
      unit: {
        type: String,
        enum: ["slot", "hour", "person", "unit", "month"],
        default: "slot",
      },
      calculation: {
        type: String,
        enum: ["flat", "per-member", "base-plus-member"],
        default: "flat",
      },
      perMemberAmount: { type: Number, min: 0, default: 0 },
    },
    bookingPolicy: {
      reservationType: {
        type: String,
        enum: ["individual", "group"],
        default: "individual",
      },
      inventoryMode: {
        type: String,
        enum: ["shared-capacity", "exclusive-unit"],
        default: "shared-capacity",
      },
      minMembers: { type: Number, min: 1, default: 1 },
      maxMembers: { type: Number, min: 1, default: 1 },
    },
    slots: { type: [slotSchema], default: [] },
    subscriptionPlans: { type: [subscriptionPlanSchema], default: [] },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    notes: { type: String, default: "" },
    configuredBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
    lastMaintenanceNotifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

facilitySportConfigSchema.index({ facility: 1, sport: 1 }, { unique: true });

module.exports = mongoose.model("facilitysportconfigs", facilitySportConfigSchema);
