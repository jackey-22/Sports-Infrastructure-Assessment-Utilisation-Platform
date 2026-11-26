const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    Name: {
      type: String,
      // required: [true, "Please Enter your name"],
      trim: true,
    },

    Email: {
      type: String,
      // required: [true, "Please Enter your email"],
      trim: true,
      // validate: [validator.isEmail, "please enter a valid email"],
    },

    Password: {
      type: String,
      trim: true,
      // Never selected by default; login explicitly asks for it.
      select: false,
    },

    resetCodeHash: { type: String, select: false },
    resetCodeExpires: { type: Date, select: false },

    ContactNum: {
      type: String,
      // required: [true, "Please Enter your contactnumber"],
      trim: true,
    },

    DOB: {
      type: String,
      // required: [true, "Please Enter your date of birth"],
    },

    Role: {
      type: Number,
    },

    IsActive: {
      type: Number,
      default: 1,
    },
    notificationtoken: { type: String, default: "" },
    DistrictId: { type: mongoose.SchemaTypes.ObjectId, ref: "districts" },
    SportComplexId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sportscomplexes",
    },
    createdBy: { type: mongoose.SchemaTypes.ObjectId, ref: "users" },
    institution: {
      name: { type: String, trim: true, default: "" },
      type: {
        type: String,
        enum: ["School", "College / University", "Sports Academy", "Other", ""],
        default: "",
      },
      registrationNumber: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("users", UserSchema);
