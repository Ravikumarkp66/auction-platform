const mongoose = require("mongoose");

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

const BattingStatsSchema = new mongoose.Schema({
  runs:        { type: Number, default: 0 },
  balls:       { type: Number, default: 0 },
  fours:       { type: Number, default: 0 },
  sixes:       { type: Number, default: 0 },
  strikeRate:  { type: Number, default: 0 },
  dotBalls:    { type: Number, default: 0 }
}, { _id: false });

// ─── Over Summary ─────────────────────────────────────────────────────────────
// One entry per completed (or current) over in an innings
const BallEventSchema = new mongoose.Schema({
  ball:       { type: Number },    // ball number within over (1-6)
  runs:       { type: Number, default: 0 },
  extras:     { type: String, default: "" },  // "wd", "nb", "b", "lb", or ""
  isWicket:   { type: Boolean, default: false },
  isBoundary: { type: Boolean, default: false },
  isSix:      { type: Boolean, default: false },
  label:      { type: String, default: "" }  // display: "W", "4", "6", "wd", etc.
}, { _id: false });

const OverSummarySchema = new mongoose.Schema({
  overNumber:   { type: Number },   // 0-indexed
  bowler:       { type: String, default: "" },
  balls:        [BallEventSchema],
  totalRuns:    { type: Number, default: 0 },
  wickets:      { type: Number, default: 0 },
  extras:       { type: Number, default: 0 },
  isMaiden:     { type: Boolean, default: false }
}, { _id: false });

// ─── Commentary ───────────────────────────────────────────────────────────────
const CommentarySchema = new mongoose.Schema({
  over:         { type: String, default: "" },  // e.g. "12.4"
  overNumber:   { type: Number, default: 0 },
  ballNumber:   { type: Number, default: 0 },
  batsman:      { type: String, default: "" },
  bowler:       { type: String, default: "" },
  runs:         { type: Number, default: 0 },
  extraType:    { type: String, default: "" },
  isWicket:     { type: Boolean, default: false },
  isBoundary:   { type: Boolean, default: false },
  isSix:        { type: Boolean, default: false },
  text:         { type: String, default: "" },  // auto-generated commentary text
  eventType:    { type: String, default: "normal" } // "six" | "four" | "wicket" | "wide" | "noball" | "dot" | "normal"
}, { _id: false });

// ─── Partnership History ──────────────────────────────────────────────────────
const PartnershipHistorySchema = new mongoose.Schema({
  wicketNumber: { type: Number },
  batter1:      { type: String, default: "" },
  batter2:      { type: String, default: "" },
  runs:         { type: Number, default: 0 },
  balls:        { type: Number, default: 0 },
  openingBall:  { type: Number, default: 0 },  // total legal balls when partnership started
  closingBall:  { type: Number, default: 0 }   // total legal balls when partnership ended
}, { _id: false });

const BowlingStatsSchema = new mongoose.Schema({
  legalBalls:  { type: Number, default: 0 }, // legal deliveries only
  overs:       { type: String, default: "0.0" }, // display e.g. "3.2"
  maidens:     { type: Number, default: 0 },
  runs:        { type: Number, default: 0 },
  wickets:     { type: Number, default: 0 },
  economy:     { type: Number, default: 0 },
  wides:       { type: Number, default: 0 },
  noBalls:     { type: Number, default: 0 }
}, { _id: false });

const FallOfWicketSchema = new mongoose.Schema({
  wicketNumber: { type: Number },
  runs:         { type: Number },
  balls:        { type: Number }, // total legal balls at fall
  batsman:      { type: String },
  dismissalType:{ type: String },
  bowler:       { type: String },
  over:         { type: String } // e.g. "4.2"
}, { _id: false });

const PartnershipSchema = new mongoose.Schema({
  batter1:  { type: String },
  batter2:  { type: String },
  runs:     { type: Number, default: 0 },
  balls:    { type: Number, default: 0 }
}, { _id: false });

const ExtrasSchema = new mongoose.Schema({
  wides:    { type: Number, default: 0 },
  noBalls:  { type: Number, default: 0 },
  byes:     { type: Number, default: 0 },
  legByes:  { type: Number, default: 0 },
  total:    { type: Number, default: 0 }
}, { _id: false });

const CricketPlayerSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  role:        { type: String, default: "Player" }, // Batsman | Bowler | All-Rounder | WK
  battingOrder:{ type: Number, default: 0 },
  batting:     { type: BattingStatsSchema, default: () => ({}) },
  bowling:     { type: BowlingStatsSchema, default: () => ({}) },
  isOut:       { type: Boolean, default: false },
  dismissal:   { type: String, default: "" },         // full description
  dismissalType:{ type: String, default: "" },        // bowled | caught | run out | lbw | stumped | hit wicket
  dismissedBy: { type: String, default: "" },         // bowler name
  caughtBy:    { type: String, default: "" },         // fielder name
  didBat:      { type: Boolean, default: false },
  didBowl:     { type: Boolean, default: false },
  battingPosition: { type: Number, default: 0 }       // order they came in to bat (1 = opener)
}, { _id: false });

const InningsSchema = new mongoose.Schema({
  inningsNumber:  { type: Number },
  battingTeam:    { type: String },
  bowlingTeam:    { type: String },
  totalRuns:      { type: Number, default: 0 },
  totalWickets:   { type: Number, default: 0 },
  totalBalls:     { type: Number, default: 0 },     // legal deliveries
  totalDeliveries:{ type: Number, default: 0 },     // all deliveries incl. wides/noballs
  extras:         { type: ExtrasSchema, default: () => ({}) },
  fallOfWickets:  [FallOfWicketSchema],
  currentPartnership: { type: PartnershipSchema, default: () => ({}) },
  partnerships:   [PartnershipHistorySchema],        // full partnership history
  highestPartnership: { type: Number, default: 0 }, // highest partnership runs in this innings
  overSummaries:  [OverSummarySchema],               // per-over breakdown
  commentary:     [CommentarySchema],                // ball-by-ball commentary (last 100)
  isDeclared:     { type: Boolean, default: false },
  isCompleted:    { type: Boolean, default: false },
  completionReason: { type: String, default: "" }  // "all_out" | "overs_complete" | "target_achieved" | "declared"
}, { _id: false });

const MatchSummarySchema = new mongoose.Schema({
  topScorer:          { type: String, default: "" },
  topScorerRuns:      { type: Number, default: 0 },
  topScorerBalls:     { type: Number, default: 0 },
  bestBowler:         { type: String, default: "" },
  bestBowlerFigures:  { type: String, default: "" },
  totalSixes:         { type: Number, default: 0 },
  totalFours:         { type: Number, default: 0 },
  totalExtras:        { type: Number, default: 0 },
  highestPartnership: { type: Number, default: 0 },
  highestPartnershipPair: { type: String, default: "" },
  playerOfMatch:      { type: String, default: "" }
}, { _id: false });

const CricketTeamSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  logo:    { type: String, default: "" },
  color:   { type: String, default: "#3b82f6" },
  players: [CricketPlayerSchema]
}, { _id: false });

// ─── Main Match Schema ────────────────────────────────────────────────────────

const CricketMatchSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament" },
  name:         { type: String, default: "" },
  venue:        { type: String, default: "" },
  matchDate:    { type: String, default: "" },
  matchFormat:  { type: String, enum: ["T20", "ODI", "Test", "Custom"], default: "T20" },
  oversLimit:   { type: Number, default: 20 },

  teamA: { type: CricketTeamSchema, required: true },
  teamB: { type: CricketTeamSchema, required: true },

  toss: {
    winner:   { type: String, default: "" },
    decision: { type: String, enum: ["bat", "bowl", ""], default: "" }
  },

  // ── Innings tracking ───────────────────────────────────────────────────────
  currentInnings:  { type: Number, default: 1 },
  innings:         [InningsSchema],

  // ── Match flow state ───────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ["scheduled", "live", "innings_break", "completed"],
    default: "scheduled"
  },

  // Scoring pause: waiting for next batsman after a wicket
  awaitingBatsman: { type: Boolean, default: false },

  // Scoring pause: waiting for new bowler after over ends
  awaitingBowler: { type: Boolean, default: false },

  // Current active players
  currentStriker:    { type: String, default: "" },
  currentNonStriker: { type: String, default: "" },
  currentBowler:     { type: String, default: "" },
  previousBowler:    { type: String, default: "" }, // to prevent consecutive overs

  // ── Result ─────────────────────────────────────────────────────────────────
  result: {
    winner:       { type: String, default: "" },    // team name or "tie"
    margin:       { type: Number, default: 0 },
    marginType:   { type: String, default: "" },    // "runs" | "wickets"
    description:  { type: String, default: "" }     // human readable
  },

  // ── Summary ────────────────────────────────────────────────────────────────
  summary: { type: MatchSummarySchema, default: () => ({}) },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto-update updatedAt
CricketMatchSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("CricketMatch", CricketMatchSchema);
