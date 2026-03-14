const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: { type: String },
  logoUrl: { type: String },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
  remainingBudget: { type: Number, required: true },
  color: { type: String }
}, { timestamps: true });

module.exports = mongoose.model("Team", teamSchema);
