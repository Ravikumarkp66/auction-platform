const mongoose = require("mongoose");

const playerRosterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  jerseyNumber: { type: String, default: "" },
  role: { type: String, default: "All Rounder" } // Raider, Defender, All Rounder
});

const teamRosterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, default: "" },
  color: { type: String, default: "#3b82f6" }, // primary color
  secondaryColor: { type: String, default: "#1d4ed8" },
  score: { type: Number, default: 0 },
  players: [playerRosterSchema],
  activePlayerIds: [{ type: String }], // Array of player names (or composite unique identifiers) currently active on mat
  outPlayerIds: [{ type: String }] // Array of player names currently out
});

const matchEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true }, // e.g., 'TOUCH_POINT', 'BONUS_POINT', 'TACKLE_POINT', 'SUPER_TACKLE', 'SUPER_RAID', 'ALL_OUT', 'TIMEOUT', 'HALF_END', 'DO_OR_DIE', 'REVIVE'
  payload: { type: mongoose.Schema.Types.Mixed, default: {} }, // Event parameters (e.g. player name, score value, etc.)
  timestamp: { type: Date, default: Date.now }
});

const playerMatchStatsSchema = new mongoose.Schema({
  teamKey: { type: String, enum: ["teamA", "teamB"], required: true },
  playerName: { type: String, required: true },
  jerseyNumber: { type: String, default: "" },
  role: { type: String, default: "All Rounder" },
  totalRaids: { type: Number, default: 0 },
  successfulRaids: { type: Number, default: 0 },
  emptyRaids: { type: Number, default: 0 },
  unsuccessfulRaids: { type: Number, default: 0 },
  doOrDieRaids: { type: Number, default: 0 },
  doOrDieSuccessfulRaids: { type: Number, default: 0 },
  touchPoints: { type: Number, default: 0 },
  bonusPoints: { type: Number, default: 0 },
  tacklePoints: { type: Number, default: 0 },
  totalTacklesAttempted: { type: Number, default: 0 },
  successfulTackles: { type: Number, default: 0 },
  superRaids: { type: Number, default: 0 },
  superTackles: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 }
}, { _id: false });

const sportsMatchSchema = new mongoose.Schema({
  sport: { type: String, default: "kabaddi" }, // "kabaddi", "cricket", "volleyball", "football"
  name: { type: String, default: "Quick Match" },
  venue: { type: String, default: "Local Stadium" },
  date: { type: String, default: "" },
  time: { type: String, default: "" },
  status: { type: String, enum: ["scheduled", "live", "completed"], default: "scheduled" },
  teamA: { type: teamRosterSchema, required: true },
  teamB: { type: teamRosterSchema, required: true },
  kabaddiState: {
    raidTimer: { type: Number, default: 30 },
    isRaidActive: { type: Boolean, default: false },
    currentRaider: { type: String, default: "" },
    raidingTeam: { type: String, enum: ["teamA", "teamB", ""], default: "" },
    nextRaidingTeam: { type: String, enum: ["teamA", "teamB", ""], default: "" },
    emptyRaidStreak: { type: Number, default: 0 },
    half: { type: Number, default: 1 },
    timeoutsLeft: {
      teamA: { type: Number, default: 2 },
      teamB: { type: Number, default: 2 }
    },
    doOrDie: { type: Boolean, default: false }
  },
  matchClock: {
    firstHalfDuration: { type: Number, default: 600 },
    secondHalfDuration: { type: Number, default: 600 },
    remaining: { type: Number, default: 600 },
    running: { type: Boolean, default: false },
    mode: { type: String, enum: ["CONTINUOUS", "STOP_EVERY_RAID", "SMART_CLUTCH"], default: "SMART_CLUTCH" },
    clutchThreshold: { type: Number, default: 120 },
    state: { type: String, enum: ["PAUSED", "RUNNING", "HALFTIME", "TIMEOUT", "COMPLETED"], default: "PAUSED" }
  },
  playerStats: {
    type: Map,
    of: playerMatchStatsSchema,
    default: {}
  },
  events: [matchEventSchema],
  winner: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model("SportsMatch", sportsMatchSchema);
