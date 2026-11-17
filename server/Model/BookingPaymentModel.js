const mongoose = require("mongoose");

const bookingPaymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.SchemaTypes.ObjectId, ref: "Guest", required: true, unique: true },
    bookingReference: { type: String, required: true, index: true },
    facility: { type: mongoose.SchemaTypes.ObjectId, ref: "sportscomplexes", required: true, index: true },
    sport: { type: mongoose.SchemaTypes.ObjectId, ref: "sports", required: true },
    coach: { type: mongoose.SchemaTypes.ObjectId, ref: "instructors", default: null, index: true },
    amount: { type: Number, min: 0, required: true },
    currency: { type: String, default: "INR" },
    gateway: { type: String, default: "Razorpay" },
    status: {
      type: String,
      enum: ["Created", "Paid", "Failed", "Refunded"],
      default: "Created",
      index: true,
    },
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, sparse: true, unique: true },
    payer: {
      name: String,
      email: String,
      phone: String,
    },
    paidAt: Date,
    gatewayDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("bookingpayments", bookingPaymentSchema);
