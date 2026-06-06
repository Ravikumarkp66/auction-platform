const mongoose = require("mongoose");

/**
 * CricketCareerStats — lifetime aggregate stats per player.
 * Updated via POST /api/cricket/:id/finalize after each completed match.
 */
const CricketCareerStatsSchema = new mongoose.Schema({
  playerName: { type: String, required: true, index: true },

  // ── Batting Career ──────────────────────────────────────────────────────────
  batting: {
    matches:      { type: Number, default: 0 },
    innings:      { type: Number, default: 0 },
    notOuts:      { type: Number, default: 0 },
    runs:         { type: Number, default: 0 },
    balls:        { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    highestScoreNotOut: { type: Boolean, default: false },
    fours:        { type: Number, default: 0 },
    sixes:        { type: Number, default: 0 },
    dotBalls:     { type: Number, default: 0 },
    fifties:      { type: Number, default: 0 },  // 50–99
    hundreds:     { type: Number, default: 0 },  // 100+
    ducks:        { type: Number, default: 0 },  // out for 0
    // Computed (recalculated on every finalize)
    average:      { type: Number, default: 0 },  // runs / (innings - notOuts)
    strikeRate:   { type: Number, default: 0 },  // (runs / balls) * 100
  },

  // ── Bowling Career ──────────────────────────────────────────────────────────
  bowling: {
    matches:      { type: Number, default: 0 },
    innings:      { type: Number, default: 0 },  // innings where bowled
    balls:        { type: Number, default: 0 },  // legal deliveries
    runs:         { type: Number, default: 0 },
    wickets:      { type: Number, default: 0 },
    maidens:      { type: Number, default: 0 },
    wides:        { type: Number, default: 0 },
    noBalls:      { type: Number, default: 0 },
    bestBowlingWickets: { type: Number, default: 0 },
    bestBowlingRuns:    { type: Number, default: 999 },
    fourWickets:  { type: Number, default: 0 },  // 4-wicket hauls
    fiveWickets:  { type: Number, default: 0 },  // 5-wicket hauls
    // Computed
    average:      { type: Number, default: 0 },  // runs / wickets
    economy:      { type: Number, default: 0 },  // runs / (balls / 6)
    strikeRate:   { type: Number, default: 0 },  // balls / wickets
  },

  // ── Match history references ────────────────────────────────────────────────
  matchIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "CricketMatch" }],

  updatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

CricketCareerStatsSchema.index({ playerName: 1 }, { unique: true });

CricketCareerStatsSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("CricketCareerStats", CricketCareerStatsSchema);
