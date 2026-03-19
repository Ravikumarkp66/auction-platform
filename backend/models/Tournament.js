const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  shortId: { type: Number, unique: true }, // Simple human-readable ID
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

// Auto-increment shortId logic
tournamentSchema.pre('save', async function() {
  if (!this.isNew || this.shortId) return;
  try {
    const lastTournament = await this.constructor.findOne({}, { shortId: 1 }).sort({ shortId: -1 });
    this.shortId = (lastTournament && lastTournament.shortId) ? lastTournament.shortId + 1 : 1;
  } catch (err) {
    console.error("ShortId Generate Error:", err);
  }
});

module.exports = mongoose.model("Tournament", tournamentSchema);
