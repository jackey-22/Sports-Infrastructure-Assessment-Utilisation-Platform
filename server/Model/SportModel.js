const mongoose = require("mongoose");

const SportSchema = new mongoose.Schema(
  {
    SportName: {
      type: String,
      required: [true, "Please Enter Sport name"],
      trim: true,
    },

    Category: {
      type: String,
      required: [true, "Please Enter Category name"],
      trim: true,
    },

    baseUrl: {
      type: String,
    },
    parameters: mongoose.Schema.Types.Mixed,
    description: { type: String, default: "" },
    formats: { type: [String], default: [] },
    defaultBookingMode: {
      type: String,
      enum: ["capacity", "court", "hybrid"],
      default: "capacity",
    },
    unitLabel: { type: String, default: "participants" },
    status: { type: String, enum: ["Active", "Inactive"], default: "Active" },
    maintenanceCycle: {
      enabled: { type: Boolean, default: false },
      frequencyDays: { type: Number, default: 30, min: 1, max: 365 },
      notifyDaysBefore: { type: Number, default: 3, min: 0, max: 30 },
      priority: {
        type: String,
        enum: ["Low", "Medium", "High", "Critical"],
        default: "Medium",
      },
      checklistTitle: { type: String, default: "", trim: true },
      checklistNotes: { type: String, default: "", trim: true },
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("sports", SportSchema);
