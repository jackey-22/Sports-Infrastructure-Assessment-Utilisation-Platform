const mongoose = require("mongoose");

const UpdatesModel = new mongoose.Schema(
  {
    title: String,
    description: String,
    image: String,
    level: Number, //0:For All (Admin),1:For Particular District (Authority), 2:For Paticular Complex (manager)
    sportComplexId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sportscomplexes",
    },
    sportId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "sports",
      default: null,
    },
    category: {
      type: String,
      enum: ["general", "slot", "camp", "maintenance"],
      default: "general",
    },
    active: { type: String, default: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("updates", UpdatesModel);
