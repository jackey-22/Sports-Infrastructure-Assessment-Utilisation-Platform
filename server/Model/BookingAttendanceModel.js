const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  booking: { type: mongoose.SchemaTypes.ObjectId, ref: "Guest", required: true, unique: true },
  facility: { type: mongoose.SchemaTypes.ObjectId, ref: "sportscomplexes", required: true, index: true },
  citizenUser: { type: mongoose.SchemaTypes.ObjectId, ref: "users", default: null, index: true },
  date: { type: String, required: true, index: true },
  entryAt: { type: Date, required: true }, exitAt: { type: Date, default: null },
  entryBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users", required: true },
  exitBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users", default: null },
  members: { type: Number, default: 1 },
}, { timestamps: true });
module.exports = mongoose.model("bookingattendances", schema);
