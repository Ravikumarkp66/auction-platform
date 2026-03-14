const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  dob: { type: String },
  role: { type: String },
  battingStyle: { type: String },
  bowlingStyle: { type: String },
  village: { type: String },
  town: { type: String },
  imageUrl: { type: String },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" },
  status: {
    type: String,
    enum: ["available", "auction", "sold", "unsold"],
    default: "available"
  },
  basePrice: { type: Number, default: 0 },
  soldPrice: { type: Number },
  isIcon: { type: Boolean, default: false },
  team: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Player", playerSchema);
