const mongoose = require("mongoose");
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/sfic";

module.exports.getDbConnetion = function () {
  mongoose
    .connect(MONGO_URI, {
      serverSelectionTimeoutMS: 2500,
    })
    .then(async () => {
      console.log("MongoDB connected successfully at " + MONGO_URI);
      try {
        const UserModel = require("../Model/UsersModel");
        const count = await UserModel.countDocuments();
        if (count === 0) {
          console.log("Database is currently empty. Run 'npm run seed' to automatically populate Gujarat 33 districts, sports complexes, and official demo credentials.");
        }
      } catch (e) {
        // silent
      }
    })
    .catch((err) => {
      console.warn("MongoDB connection notice (continuing with built-in dataset fallback):", err.message);
    });
};
