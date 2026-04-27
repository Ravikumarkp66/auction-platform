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
  registrationTitle: { type: String, default: "JOIN THE BATTLE" },
  registrationDetails: { type: String, default: "" },
  registrationEndDate: { type: Date },
  registrationEndTime: { type: String, default: "23:59" },
  closedMessage: { type: String, default: "Registration is currently closed. Please contact the tournament organizer for more details." },
  status: { type: String, enum: ["draft", "active", "completed"], default: "draft" },

  // ─── Auction Engine fields (added for multi-tournament engine) ───────────
  // auctionMode: "money" (default / existing behaviour) or "points"
  // Old documents that don't have this field behave exactly as "money".
  auctionMode: {
    type: String,
    enum: ["money", "points"],
    default: "money",
  },
  currencyUnit: {
    type: String,
    default: "CR",
  },
  // budget mirrors baseBudget but carries the unit explicitly.
  // Kept in sync by the create route; existing reads of baseBudget still work.
  budget: {
    total: { type: Number, default: 0 },
    unit: { type: String, enum: ["INR", "POINTS"], default: "INR" },
  },
  // squad size constraints (minPlayers is a softer limit; maxPlayers replaces squadSize
  // once the rule engine is active — for now squadSize is still the operative field).
  squad: {
    minPlayers: { type: Number, default: 1 },
    maxPlayers: { type: Number, default: 20 },
  },
  // ────────────────────────────────────────────────────────────────────────

  assets: {
    splashUrl: { type: String },
    backgroundUrl: { type: String },
    teamCardBgUrl: { type: String },
    squadBgUrl: { type: String },
    badges: {
      leftBadge: { type: String },
      rightBadge: { type: String }
    }
  },
  imageProcessing: {
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    status: { type: String, enum: ["idle", "processing", "done"], default: "idle" }
  },
  pools: {
    poolA: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
    poolB: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }]
  }
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
