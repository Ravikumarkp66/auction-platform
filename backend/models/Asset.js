const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ["splash", "background", "team_bg", "squad_bg", "badge", "other"],
    required: true 
  },
  name: { type: String, required: true },
  url: { type: String, required: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" } // Optional trace
}, { timestamps: true });

module.exports = mongoose.model("Asset", assetSchema);
