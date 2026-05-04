const express = require("express");
const router = express.Router();
const Match = require("../models/Match");
const Player = require("../models/Player");
const { addBall, undoLastBall } = require("../utils/scoringEngine");

/**
 * Get all matches
 */
router.get("/", async (req, res) => {
  try {
    const matches = await Match.find().populate('teamA teamB').sort({ createdAt: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single match
 */
router.get("/:id", async (req, res) => {
  try {
    const match = await Match.findById(req.params.id)
      .populate('teamA teamB')
      .populate('innings.striker innings.nonStriker innings.bowler');
    if (!match) return res.status(404).json({ error: "Match not found" });
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Creates a new Match.
 */
router.post("/", async (req, res) => {
  try {
    const { 
      tournamentId, teamA, teamB, totalOvers, toss,
      venue, date, time, format, ballType, scorer 
    } = req.body;

    const newMatch = new Match({
      tournamentId,
      teamA,
      teamB,
      totalOvers,
      toss,
      venue,
      date,
      time,
      format,
      ballType,
      scorer,
      status: "scheduled",
      innings: [] // Innings will be created when match goes live
    });

    await newMatch.save();
    res.status(201).json(newMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update match (Status, Toss, etc)
 */
router.patch("/:id", async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    // Apply updates
    Object.assign(match, req.body);

    // If changing to live and no innings exist, create the first innings based on Toss
    if (req.body.status === "live" && match.innings.length === 0 && match.toss && match.toss.winner) {
      match.currentInnings = 1;
      
      const isWinnerTeamA = match.toss.winner.toString() === match.teamA.toString();
      const decision = match.toss.decision; // 'bat' or 'bowl'
      
      let battingTeam, bowlingTeam;
      if (decision === 'bat') {
        battingTeam = isWinnerTeamA ? match.teamA : match.teamB;
        bowlingTeam = isWinnerTeamA ? match.teamB : match.teamA;
      } else {
        battingTeam = isWinnerTeamA ? match.teamB : match.teamA;
        bowlingTeam = isWinnerTeamA ? match.teamA : match.teamB;
      }

      match.innings.push({
        battingTeam,
        bowlingTeam,
        striker: null,
        nonStriker: null,
        bowler: null,
        totalRuns: 0,
        wickets: 0,
        legalBalls: 0,
        ballsData: []
      });
    }

    await match.save();
    
    const updatedMatch = await Match.findById(match._id)
      .populate('teamA teamB')
      .populate('innings.striker innings.nonStriker innings.bowler');
    
    // Broadcast via socket if configured
    if (req.app.get("io")) {
      req.app.get("io").to(match._id.toString()).emit("match-started", updatedMatch);
    }
    
    res.json(updatedMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Starts the Match (creates first innings)
 */
router.post("/:id/start", async (req, res) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    const { battingTeam, bowlingTeam, striker, nonStriker, bowler } = req.body;

    match.status = "live";
    match.currentInnings = 1;
    match.innings.push({
      battingTeam,
      bowlingTeam,
      striker,
      nonStriker,
      bowler,
      totalRuns: 0,
      wickets: 0,
      legalBalls: 0,
      ballsData: []
    });

    await match.save();
    
    // Broadcast via socket if configured
    if (req.app.get("io")) {
      req.app.get("io").to(match._id.toString()).emit("match-started", match);
    }

    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Submit a new ball event
 */
router.post("/:id/score", async (req, res) => {
  try {
    let match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    if (match.status === "completed") {
      return res.status(400).json({ error: "Match is already completed" });
    }

    const { event } = req.body;

    // 1. Process ball through engine
    match = addBall(match, event);
    await match.save();

    // 2. Broadcast via Socket.IO
    if (req.app.get("io")) {
      req.app.get("io").to(match._id.toString()).emit("score-update", match);
    }

    // 3. (Optional) Auto-update player statistics here asynchronously
    updatePlayerStats(event);

    res.json(match);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Undo last ball
 */
router.post("/:id/undo", async (req, res) => {
  try {
    let match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Match not found" });

    match = undoLastBall(match);
    await match.save();

    if (req.app.get("io")) {
      req.app.get("io").to(match._id.toString()).emit("score-update", match);
    }

    // (Optional) Reverse player stats asynchronously

    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Async helper to update Player stats
 */
async function updatePlayerStats(event) {
  try {
    // Basic example: increment striker runs
    if (event.batsman && event.runs > 0) {
      await Player.findByIdAndUpdate(event.batsman, {
        $inc: { "tournamentStats.runs": event.runs }
      });
    }
    // Increment bowler wickets
    if (event.bowler && (event.type === "wicket" && event.wicketType !== "run-out")) {
      await Player.findByIdAndUpdate(event.bowler, {
        $inc: { "tournamentStats.wickets": 1 }
      });
    }
  } catch (err) {
    console.error("Failed to update player stats:", err);
  }
}

module.exports = router;
