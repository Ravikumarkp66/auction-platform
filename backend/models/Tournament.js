const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  organizerName: { type: String },
  organizerLogo: { type: String },
  numTeams: { type: Number, required: true },
  iconsPerTeam: { type: Number, default: 0 },
  baseBudget: { type: Number, required: true },
  defaultBasePrice: { type: Number, default: 0 },
  squadSize: { type: Number, default: 11 },
  auctionSlots: { type: Number, default: 9 },
  status: { type: String, enum: ["draft", "active", "completed"], default: "draft" },
}, { timestamps: true });

module.exports = mongoose.model("Tournament", tournamentSchema);
