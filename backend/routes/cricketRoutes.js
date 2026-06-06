const express = require("express");
const router  = express.Router();
const CricketMatch      = require("../models/CricketMatch");
const CricketBall       = require("../models/CricketBall");
const CricketCareerStats = require("../models/CricketCareerStats");
const CricketTeamStats   = require("../models/CricketTeamStats");
const { rebuildMatchState, buildMatchPayload } = require("../utils/cricketEngine");
const {
  buildFullScorecard,
  buildMatchSummary,
  buildPlayerMatchStats,
  computeCareerDelta,
  computeTeamDelta,
} = require("../utils/cricketStatsEngine");

// ─── Emit socket events ───────────────────────────────────────────────────────
function emitMatchUpdate(io, match, currentInning, eventName = "match:update") {
  if (!io) return;
  const payload = buildMatchPayload(match, currentInning);
  io.to(match._id.toString()).emit(eventName, payload);
}

// ═════════════════════════════════════════════════════════════════════════════
// CORE MATCH CRUD
// ═════════════════════════════════════════════════════════════════════════════

// GET /api/cricket — list all matches
router.get("/", async (req, res) => {
  try {
    const { limit = 20, skip = 0, status, tournamentId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (tournamentId) filter.tournamentId = tournamentId;

    const matches = await CricketMatch.find(filter)
      .select("name venue matchDate matchFormat status teamA teamB result summary toss createdAt oversLimit")
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await CricketMatch.countDocuments(filter);
    res.json({ matches, total, limit: parseInt(limit), skip: parseInt(skip) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cricket/recent — recent completed matches (for dashboards)
router.get("/recent", async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const matches = await CricketMatch.find({ status: "completed" })
      .select("name venue matchDate matchFormat teamA teamB result summary createdAt")
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit));
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// CAREER & TEAM STATS — must be BEFORE /:id to avoid route conflict
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/cricket/stats/player/:name — player career stats
 */
router.get("/stats/player/:name", async (req, res) => {
  try {
    const stats = await CricketCareerStats.findOne({ playerName: req.params.name });
    if (!stats) return res.status(404).json({ error: "No career stats found for this player" });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cricket/stats/team/:name — team stats
 */
router.get("/stats/team/:name", async (req, res) => {
  try {
    const stats = await CricketTeamStats.findOne({ teamName: req.params.name });
    if (!stats) return res.status(404).json({ error: "No stats found for this team" });

    const nrr = stats.totalBallsFaced > 0 && stats.totalBallsBowled > 0
      ? Number(
          (stats.totalRunsScored / stats.totalBallsFaced * 6) -
          (stats.totalRunsConceded / stats.totalBallsBowled * 6)
        ).toFixed(3)
      : "0.000";

    res.json({ ...stats.toObject(), nrr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/cricket/:id — full match + last 12 balls (initial load / recovery)
router.get("/:id", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });
    const balls = await CricketBall.find({ matchId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(12);
    res.json({ match, recentBalls: balls });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cricket — create match
router.post("/", async (req, res) => {
  try {
    const newMatch = new CricketMatch(req.body);
    await newMatch.save();
    res.status(201).json(newMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/cricket/:id/start — start match / update players / start 2nd innings
router.patch("/:id/start", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    if (match.status === "scheduled" && match.innings.length === 0) {
      const { tossWinner, tossDecision, striker, nonStriker, bowler } = req.body;
      let battingTeam = tossWinner;
      let bowlingTeam = tossWinner === match.teamA.name ? match.teamB.name : match.teamA.name;
      if (tossDecision === "bowl") [battingTeam, bowlingTeam] = [bowlingTeam, battingTeam];

      match.toss   = { winner: tossWinner, decision: tossDecision };
      match.status = "live";
      match.currentStriker    = striker    || "";
      match.currentNonStriker = nonStriker || "";
      match.currentBowler     = bowler     || "";
      match.awaitingBatsman   = false;
      match.awaitingBowler    = false;

      match.innings.push({
        inningsNumber: 1,
        battingTeam, bowlingTeam,
        totalRuns: 0, totalWickets: 0, totalBalls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      });
    } else if (match.status === "innings_break") {
      const { striker, nonStriker, bowler } = req.body;
      const firstInning = match.innings[0];

      match.currentInnings    = 2;
      match.status            = "live";
      match.currentStriker    = striker    || "";
      match.currentNonStriker = nonStriker || "";
      match.currentBowler     = bowler     || "";
      match.awaitingBatsman   = false;
      match.awaitingBowler    = false;

      match.innings.push({
        inningsNumber: 2,
        battingTeam:  firstInning.bowlingTeam,
        bowlingTeam:  firstInning.battingTeam,
        totalRuns: 0, totalWickets: 0, totalBalls: 0,
        extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 },
      });
    } else {
      if (req.body.striker    !== undefined) match.currentStriker    = req.body.striker;
      if (req.body.nonStriker !== undefined) match.currentNonStriker = req.body.nonStriker;
      if (req.body.bowler     !== undefined) match.currentBowler     = req.body.bowler;
      if (req.body.status)                   match.status            = req.body.status;

      if (req.body.striker && req.body.nonStriker) match.awaitingBatsman = false;
      if (req.body.bowler)                          match.awaitingBowler  = false;
    }

    await match.save();
    const io = req.app.get("io");
    const currentInning = match.innings[match.currentInnings - 1];
    emitMatchUpdate(io, match, currentInning, "match:update");
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cricket/:id/ball — add a ball
router.post("/:id/ball", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match)                                     return res.status(404).json({ error: "Match not found" });
    if (match.status !== "live")                    return res.status(400).json({ error: "Match is not live" });
    if (match.awaitingBatsman || match.awaitingBowler)
      return res.status(400).json({ error: "Awaiting next batsman or bowler selection" });
    if (!match.currentStriker || !match.currentBowler)
      return res.status(400).json({ error: "Striker and bowler must be set" });

    const currentInning = match.innings[match.currentInnings - 1];
    const { runs, extraType, isWicket, dismissalType, dismissedBatsman, fielder } = req.body;

    const legalBalls = currentInning.totalBalls;
    const overNumber = Math.floor(legalBalls / 6);
    let   ballNumber = (legalBalls % 6) + 1;

    let runsScored = parseInt(runs) || 0;
    let extraRuns  = 0;

    if (extraType === "wd" || extraType === "nb") {
      extraRuns   = 1 + runsScored;
      runsScored  = 0;
      ballNumber -= 1; // wide/no-ball doesn't increment legal ball
    } else if (extraType === "b" || extraType === "lb") {
      extraRuns  = runsScored;
      runsScored = 0;
    }

    const ball = new CricketBall({
      matchId:    match._id,
      innings:    match.currentInnings,
      overNumber,
      ballNumber,
      deliverySeq:     currentInning.totalDeliveries + 1,
      batsman:         match.currentStriker,
      bowler:          match.currentBowler,
      runsBat:         runsScored,
      extras:          { type: extraType || "none", runs: extraRuns },
      isWicket:        !!isWicket,
      dismissalType:   dismissalType   || "",
      dismissedBatsman: dismissedBatsman || "",
      fielder:         fielder          || "",
      isLegalDelivery: extraType !== "wd" && extraType !== "nb",
      isBoundary:      runsScored === 4 || runsScored === 6,
      isSix:           runsScored === 6,
      isDotBall:       runsScored === 0 && !isWicket && extraType !== "wd",
    });

    await ball.save();

    const rebuiltMatch = await rebuildMatchState(match._id);
    const io           = req.app.get("io");
    const updatedInning = rebuiltMatch.innings[rebuiltMatch.currentInnings - 1];

    emitMatchUpdate(io, rebuiltMatch, updatedInning, "match:update");
    if (io) {
      io.to(match._id.toString()).emit("ball:add", ball);
      if (rebuiltMatch.status === "completed")
        io.to(match._id.toString()).emit("match:end", rebuiltMatch.result);
      else if (rebuiltMatch.status === "innings_break")
        io.to(match._id.toString()).emit("innings:end", { innings: rebuiltMatch.currentInnings });
    }

    res.json({ match: rebuiltMatch, ball });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cricket/:id/undo — undo last ball
router.post("/:id/undo", async (req, res) => {
  try {
    const lastBall = await CricketBall.findOne({ matchId: req.params.id }).sort({ timestamp: -1 });
    if (!lastBall) return res.status(400).json({ error: "No balls to undo" });

    await CricketBall.findByIdAndDelete(lastBall._id);

    const rebuiltMatch  = await rebuildMatchState(req.params.id);
    const io            = req.app.get("io");
    const updatedInning = rebuiltMatch.innings[rebuiltMatch.currentInnings - 1];

    emitMatchUpdate(io, rebuiltMatch, updatedInning, "match:update");
    if (io) io.to(req.params.id).emit("ball:undo", { undoneBalId: lastBall._id });

    res.json({ message: "Last ball undone.", match: rebuiltMatch });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cricket/:id — delete match
router.delete("/:id", async (req, res) => {
  try {
    await CricketMatch.findByIdAndDelete(req.params.id);
    await CricketBall.deleteMany({ matchId: req.params.id });
    const io = req.app.get("io");
    if (io) io.emit("match:end", { matchId: req.params.id, deleted: true });
    res.json({ message: "Match deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// SCORECARD & STATS APIs
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/cricket/:id/scorecard
 * Full structured scorecard for all innings.
 * Served from already-rebuilt match document — no extra computation.
 */
router.get("/:id/scorecard", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const scorecard = buildFullScorecard(match);
    res.json(scorecard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cricket/:id/summary
 * Match summary: top scorer, best bowler, result, key stats.
 */
router.get("/:id/summary", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const summary = buildMatchSummary(match);
    res.json({
      ...summary,
      matchId:      match._id,
      name:         match.name,
      venue:        match.venue,
      matchDate:    match.matchDate,
      matchFormat:  match.matchFormat,
      oversLimit:   match.oversLimit,
      toss:         match.toss,
      teamA:        { name: match.teamA.name, logo: match.teamA.logo },
      teamB:        { name: match.teamB.name, logo: match.teamB.logo },
      innings:      match.innings.map(inn => ({
        inningsNumber: inn.inningsNumber,
        battingTeam:   inn.battingTeam,
        totalRuns:     inn.totalRuns,
        totalWickets:  inn.totalWickets,
        overs: `${Math.floor(inn.totalBalls / 6)}.${inn.totalBalls % 6}`,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cricket/:id/commentary?innings=1&page=1&limit=20
 * Ball-by-ball commentary (newest first, paginated).
 */
router.get("/:id/commentary", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const inningsNum = parseInt(req.query.innings) || match.currentInnings;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;

    const inning = match.innings.find(inn => inn.inningsNumber === inningsNum);
    if (!inning) return res.status(404).json({ error: "Innings not found" });

    // Commentary is stored oldest-first; return newest-first for UI
    const allCommentary = (inning.commentary || []).slice().reverse();
    const total  = allCommentary.length;
    const offset = (page - 1) * limit;
    const items  = allCommentary.slice(offset, offset + limit);

    res.json({
      commentary: items,
      total,
      page,
      limit,
      inningsNumber: inningsNum,
      battingTeam:   inning.battingTeam,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cricket/:id/partnerships?innings=1
 * Full partnership history for an innings.
 */
router.get("/:id/partnerships", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const inningsNum = parseInt(req.query.innings) || match.currentInnings;
    const inning = match.innings.find(inn => inn.inningsNumber === inningsNum);
    if (!inning) return res.status(404).json({ error: "Innings not found" });

    res.json({
      partnerships:       inning.partnerships || [],
      currentPartnership: inning.currentPartnership || {},
      highestPartnership: inning.highestPartnership || 0,
      inningsNumber:      inningsNum,
      battingTeam:        inning.battingTeam,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cricket/:id/overs?innings=1
 * Over-by-over summary for an innings.
 */
router.get("/:id/overs", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const inningsNum = parseInt(req.query.innings) || match.currentInnings;
    const inning = match.innings.find(inn => inn.inningsNumber === inningsNum);
    if (!inning) return res.status(404).json({ error: "Innings not found" });

    res.json({
      overSummaries:  inning.overSummaries || [],
      inningsNumber:  inningsNum,
      battingTeam:    inning.battingTeam,
      bowlingTeam:    inning.bowlingTeam,
      totalOvers:     `${Math.floor(inning.totalBalls / 6)}.${inning.totalBalls % 6}`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/cricket/:id/player-stats?player=PlayerName
 * Player match stats from this specific match.
 */
router.get("/:id/player-stats", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const playerName = req.query.player;
    if (!playerName) return res.status(400).json({ error: "player query param required" });

    const stats = buildPlayerMatchStats(match, playerName);
    if (!stats) return res.status(404).json({ error: "Player not found in this match" });

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// (stats routes moved above /:id — see top of file)

/**
 * POST /api/cricket/:id/finalize
 * Trigger career & team stats update after match completion.
 * Safe to call multiple times (uses upsert).
 */
router.post("/:id/finalize", async (req, res) => {
  try {
    const match = await CricketMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });
    if (match.status !== "completed") return res.status(400).json({ error: "Match must be completed before finalizing stats" });

    const matchId    = match._id;
    const updatedPlayers = [];
    const updatedTeams   = [];

    // ── Collect all players ──
    const allPlayers = new Set();
    [match.teamA, match.teamB].forEach(team => {
      team.players.forEach(p => {
        if (p.didBat || p.didBowl) allPlayers.add(p.name);
      });
    });

    // ── Update player career stats ──
    for (const playerName of allPlayers) {
      const delta = computeCareerDelta(match, playerName, matchId);
      if (!delta) continue;

      const existing = await CricketCareerStats.findOne({ playerName });

      if (!existing) {
        // Create new career stats document
        const newStats = new CricketCareerStats({
          playerName,
          matchIds: [matchId],
          batting: {
            matches:      delta.batting.matches,
            innings:      delta.batting.innings,
            notOuts:      delta.batting.notOuts,
            runs:         delta.batting.runs,
            balls:        delta.batting.balls,
            fours:        delta.batting.fours,
            sixes:        delta.batting.sixes,
            dotBalls:     delta.batting.dotBalls,
            fifties:      delta.batting.fifties,
            hundreds:     delta.batting.hundreds,
            ducks:        delta.batting.ducks,
            highestScore: delta.batting.highestScore,
            highestScoreNotOut: delta.batting.highestScoreNotOut,
          },
          bowling: {
            matches:      delta.bowling.matches,
            innings:      delta.bowling.innings,
            balls:        delta.bowling.balls,
            runs:         delta.bowling.runs,
            wickets:      delta.bowling.wickets,
            maidens:      delta.bowling.maidens,
            wides:        delta.bowling.wides,
            noBalls:      delta.bowling.noBalls,
            fourWickets:  delta.bowling.fourWickets,
            fiveWickets:  delta.bowling.fiveWickets,
            bestBowlingWickets: delta.bowling.bestBowlingWickets,
            bestBowlingRuns:    delta.bowling.bestBowlingRuns,
          },
        });
        // Compute averages
        _recomputeCareerAverages(newStats);
        await newStats.save();
      } else {
        // Check if already finalized for this match
        if (existing.matchIds.some(id => id.toString() === matchId.toString())) {
          updatedPlayers.push({ playerName, status: "already_finalized" });
          continue;
        }
        // Accumulate
        existing.matchIds.push(matchId);
        existing.batting.matches   += delta.batting.matches;
        existing.batting.innings   += delta.batting.innings;
        existing.batting.notOuts   += delta.batting.notOuts;
        existing.batting.runs      += delta.batting.runs;
        existing.batting.balls     += delta.batting.balls;
        existing.batting.fours     += delta.batting.fours;
        existing.batting.sixes     += delta.batting.sixes;
        existing.batting.dotBalls  += delta.batting.dotBalls;
        existing.batting.fifties   += delta.batting.fifties;
        existing.batting.hundreds  += delta.batting.hundreds;
        existing.batting.ducks     += delta.batting.ducks;
        if (delta.batting.highestScore > existing.batting.highestScore) {
          existing.batting.highestScore = delta.batting.highestScore;
          existing.batting.highestScoreNotOut = delta.batting.highestScoreNotOut;
        }
        existing.bowling.matches   += delta.bowling.matches;
        existing.bowling.innings   += delta.bowling.innings;
        existing.bowling.balls     += delta.bowling.balls;
        existing.bowling.runs      += delta.bowling.runs;
        existing.bowling.wickets   += delta.bowling.wickets;
        existing.bowling.maidens   += delta.bowling.maidens;
        existing.bowling.wides     += delta.bowling.wides;
        existing.bowling.noBalls   += delta.bowling.noBalls;
        existing.bowling.fourWickets += delta.bowling.fourWickets;
        existing.bowling.fiveWickets += delta.bowling.fiveWickets;
        // Best bowling
        if (
          delta.bowling.bestBowlingWickets > existing.bowling.bestBowlingWickets ||
          (delta.bowling.bestBowlingWickets === existing.bowling.bestBowlingWickets &&
           delta.bowling.bestBowlingRuns    <  existing.bowling.bestBowlingRuns)
        ) {
          existing.bowling.bestBowlingWickets = delta.bowling.bestBowlingWickets;
          existing.bowling.bestBowlingRuns    = delta.bowling.bestBowlingRuns;
        }
        _recomputeCareerAverages(existing);
        await existing.save();
      }
      updatedPlayers.push({ playerName, status: "updated" });
    }

    // ── Update team stats ──
    for (const teamName of [match.teamA.name, match.teamB.name]) {
      const delta = computeTeamDelta(match, teamName, matchId);

      const existing = await CricketTeamStats.findOne({ teamName });
      if (!existing) {
        const newTeam = new CricketTeamStats({
          teamName,
          matchIds: [matchId],
          ...delta,
        });
        await newTeam.save();
      } else {
        if (existing.matchIds.some(id => id.toString() === matchId.toString())) {
          updatedTeams.push({ teamName, status: "already_finalized" });
          continue;
        }
        existing.matchIds.push(matchId);
        existing.matchesPlayed    += 1;
        existing.wins             += delta.wins;
        existing.losses           += delta.losses;
        existing.ties             += delta.ties;
        existing.totalRunsScored  += delta.totalRunsScored;
        existing.totalBallsFaced  += delta.totalBallsFaced;
        existing.totalWicketsLost += delta.totalWicketsLost;
        existing.totalRunsConceded += delta.totalRunsConceded;
        existing.totalBallsBowled += delta.totalBallsBowled;
        existing.totalWicketsTaken += delta.totalWicketsTaken;
        existing.totalFours        += delta.totalFours;
        existing.totalSixes        += delta.totalSixes;
        if (delta.highestTeamScore > existing.highestTeamScore)
          existing.highestTeamScore = delta.highestTeamScore;
        await existing.save();
      }
      updatedTeams.push({ teamName, status: "updated" });
    }

    res.json({
      message:        "Match finalized. Career and team stats updated.",
      matchId,
      updatedPlayers,
      updatedTeams,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Helper: recompute batting/bowling averages ────────────────────────────────
function _recomputeCareerAverages(doc) {
  const bat  = doc.batting;
  const bowl = doc.bowling;

  const dismissals = bat.innings - bat.notOuts;
  bat.average     = dismissals > 0 ? Number((bat.runs / dismissals).toFixed(2)) : bat.runs;
  bat.strikeRate  = bat.balls  > 0 ? Number(((bat.runs / bat.balls) * 100).toFixed(2)) : 0;

  bowl.average    = bowl.wickets > 0 ? Number((bowl.runs / bowl.wickets).toFixed(2)) : 0;
  bowl.economy    = bowl.balls   > 0 ? Number(((bowl.runs / bowl.balls) * 6).toFixed(2)) : 0;
  bowl.strikeRate = bowl.wickets > 0 ? Number((bowl.balls / bowl.wickets).toFixed(2)) : 0;
}

module.exports = router;
