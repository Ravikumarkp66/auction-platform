const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortName: { type: String },
  logoUrl: { type: String },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
  remainingBudget: { type: Number, required: true },
  color: { type: String },
  playerCount: { type: Number, default: 0 },
  // Squad generation fields
  squadImageUrl: { type: String },
  squadPdfUrl: { type: String },
  yearDistribution: {
    type: Map,
    of: Number,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model("Team", teamSchema);
