const mongoose = require("mongoose");

/**
 * CricketTeamStats — aggregate win/loss/NRR foundation per team.
 * Updated via POST /api/cricket/:id/finalize after each completed match.
 */
const CricketTeamStatsSchema = new mongoose.Schema({
  teamName: { type: String, required: true, index: true },

  // ── Match Results ───────────────────────────────────────────────────────────
  matchesPlayed: { type: Number, default: 0 },
  wins:          { type: Number, default: 0 },
  losses:        { type: Number, default: 0 },
  ties:          { type: Number, default: 0 },
  noResults:     { type: Number, default: 0 },

  // ── Batting Aggregate ───────────────────────────────────────────────────────
  totalRunsScored:    { type: Number, default: 0 },
  totalBallsFaced:    { type: Number, default: 0 },  // for NRR
  totalWicketsLost:   { type: Number, default: 0 },
  totalFours:         { type: Number, default: 0 },
  totalSixes:         { type: Number, default: 0 },
  highestTeamScore:   { type: Number, default: 0 },
  lowestTeamScore:    { type: Number, default: 9999 },

  // ── Bowling Aggregate ───────────────────────────────────────────────────────
  totalRunsConceded:  { type: Number, default: 0 },
  totalBallsBowled:   { type: Number, default: 0 },  // for NRR
  totalWicketsTaken:  { type: Number, default: 0 },
  bestBowlingInnings: { type: String, default: "" }, // e.g. "5/23"

  // ── Net Run Rate Foundation ─────────────────────────────────────────────────
  // NRR = (totalRunsScored / totalBallsFaced * 6) - (totalRunsConceded / totalBallsBowled * 6)
  // Stored as raw numbers so NRR can be recomputed without recalculating everything.

  // ── Match history ───────────────────────────────────────────────────────────
  matchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "CricketMatch" }],

  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

CricketTeamStatsSchema.index({ teamName: 1 }, { unique: true });

// Virtual: Net Run Rate
CricketTeamStatsSchema.virtual("nrr").get(function () {
  const runRate  = this.totalBallsFaced   > 0 ? (this.totalRunsScored    / this.totalBallsFaced)   * 6 : 0;
  const conceded = this.totalBallsBowled  > 0 ? (this.totalRunsConceded  / this.totalBallsBowled)  * 6 : 0;
  return Number((runRate - conceded).toFixed(3));
});

CricketTeamStatsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("CricketTeamStats", CricketTeamStatsSchema);
