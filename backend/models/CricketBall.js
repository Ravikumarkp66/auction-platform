const mongoose = require("mongoose");

const CricketBallSchema = new mongoose.Schema({
  matchId:  { type: mongoose.Schema.Types.ObjectId, ref: "CricketMatch", required: true, index: true },
  innings:  { type: Number, required: true },

  // Over / ball position (legal ball count based)
  overNumber:  { type: Number, required: true },  // 0-indexed
  ballNumber:  { type: Number, required: true },  // 1-indexed within over (legal only)
  deliverySeq: { type: Number, default: 0 },      // sequential counter of ALL deliveries (incl. wides/noballs)

  batsman: { type: String, required: true },
  bowler:  { type: String, required: true },

  // Runs
  runsBat: { type: Number, default: 0 },          // runs credited to batsman

  // Extras
  extras: {
    type: { type: String, enum: ["none", "wd", "nb", "b", "lb"], default: "none" },
    runs: { type: Number, default: 0 }            // extra runs (always 1 for wd/nb + any additional)
  },

  // Wicket
  isWicket:      { type: Boolean, default: false },
  dismissalType: {
    type: String,
    enum: ["", "bowled", "caught", "run out", "lbw", "stumped", "hit wicket", "obstructing the field", "timed out", "handled the ball"],
    default: ""
  },
  dismissedBatsman: { type: String, default: "" },
  fielder:          { type: String, default: "" },  // catcher / fielder for run-out

  // Computed flags (for quick querying)
  isLegalDelivery: { type: Boolean, default: true },
  isBoundary:      { type: Boolean, default: false },
  isSix:           { type: Boolean, default: false },
  isDotBall:       { type: Boolean, default: false },

  timestamp: { type: Date, default: Date.now }
});

// Compound index for efficient over-by-over querying
CricketBallSchema.index({ matchId: 1, innings: 1, overNumber: 1, ballNumber: 1 });
CricketBallSchema.index({ matchId: 1, timestamp: 1 });

module.exports = mongoose.model("CricketBall", CricketBallSchema);
