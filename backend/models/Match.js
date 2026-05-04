const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true },
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  toss: {
    winner: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    decision: { type: String, enum: ["bat", "bowl"] }
  },
  currentInnings: { type: Number, default: 1 },
  totalOvers: { type: Number, required: true },
  venue: { type: String, default: "" },
  date: { type: String, default: "" },
  time: { type: String, default: "" },
  format: { type: String, default: "T10" },
  ballType: { type: String, default: "Tennis Ball" },
  scorer: { type: String, default: "" },
  innings: [
    {
      battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
      bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
      totalRuns: { type: Number, default: 0 },
      wickets: { type: Number, default: 0 },
      legalBalls: { type: Number, default: 0 }, // Represents valid balls bowled
      
      striker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      bowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      
      ballsData: [
        {
          over: Number,
          ball: Number,
          type: { type: String, enum: ["run", "wicket", "wide", "no-ball", "leg-bye", "bye", "penalty"] },
          runs: { type: Number, default: 0 }, // runs off the bat
          extras: { type: Number, default: 0 }, // extra runs (wides, nbs, byes)
          batsman: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
          bowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
          wicketType: String, // "bowled", "caught", "run-out", etc.
          fielder: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // who took catch/runout
          previousStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // For easy undo
          previousNonStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }
        }
      ]
    }
  ],
  status: { type: String, enum: ["scheduled", "live", "completed", "abandoned"], default: "scheduled" },
  result: String 
}, { timestamps: true });

module.exports = mongoose.model("Match", matchSchema);
