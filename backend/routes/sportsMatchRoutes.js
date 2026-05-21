const express = require("express");
const router = express.Router();
const SportsMatch = require("../models/SportsMatch");
const { applyEvent, rebuildMatchState } = require("../utils/sportsScoringEngine");

/**
 * Helper to emit socket event
 */
function broadcastMatchUpdate(req, match, cinematicEvent = null) {
  const io = req.app.get("io");
  if (io) {
    const matchIdStr = match._id.toString();
    console.log(`📡 Sockets broadcasting sports-score-update for match ${matchIdStr}`);
    io.to(matchIdStr).emit("sports-score-update", match);
    
    if (cinematicEvent) {
      console.log(`🎬 Sockets broadcasting sports-cinematic-event: ${cinematicEvent.type}`);
      io.to(matchIdStr).emit("sports-cinematic-event", cinematicEvent);
    }
  }
}

function buildUndoSnapshot(match) {
  const clean = (value) => value?.toObject?.() || JSON.parse(JSON.stringify(value || {}));
  return {
    teamA: clean(match.teamA),
    teamB: clean(match.teamB),
    kabaddiState: clean(match.kabaddiState),
    matchClock: clean(match.matchClock),
    playerStats: clean(match.playerStats),
    winner: match.winner,
    status: match.status
  };
}

function restoreUndoSnapshot(match, snapshot) {
  if (!snapshot) return match;
  match.teamA = snapshot.teamA;
  match.teamB = snapshot.teamB;
  match.kabaddiState = snapshot.kabaddiState;
  match.matchClock = snapshot.matchClock;
  match.playerStats = snapshot.playerStats || {};
  match.winner = snapshot.winner || "";
  match.status = snapshot.status || match.status;
  return match;
}

/**
 * Create a new sports match (Quick Match)
 */
router.post("/", async (req, res) => {
  try {
    const { sport, name, venue, date, time, teamA, teamB, matchClock } = req.body;
    const firstHalfDuration = Math.max(Number(matchClock?.firstHalfDuration || 600), 60);
    const secondHalfDuration = Math.max(Number(matchClock?.secondHalfDuration || 600), 60);

    const newMatch = new SportsMatch({
      sport: sport || "kabaddi",
      name: name || "Quick Match",
      venue: venue || "Local Ground",
      date: date || new Date().toISOString().split("T")[0],
      time: time || new Date().toTimeString().slice(0, 5),
      status: "scheduled",
      teamA: {
        name: teamA.name || "Team A",
        logo: teamA.logo || "",
        color: teamA.color || "#ef4444",
        secondaryColor: teamA.secondaryColor || "#b91c1c",
        score: 0,
        players: teamA.players || [],
        activePlayerIds: [],
        outPlayerIds: []
      },
      teamB: {
        name: teamB.name || "Team B",
        logo: teamB.logo || "",
        color: teamB.color || "#3b82f6",
        secondaryColor: teamB.secondaryColor || "#1d4ed8",
        score: 0,
        players: teamB.players || [],
        activePlayerIds: [],
        outPlayerIds: []
      },
      matchClock: {
        firstHalfDuration,
        secondHalfDuration,
        remaining: firstHalfDuration,
        running: false,
        mode: matchClock?.mode || "SMART_CLUTCH",
        clutchThreshold: Math.max(Number(matchClock?.clutchThreshold ?? 120), 0),
        state: "PAUSED"
      },
      events: []
    });

    await newMatch.save();
    res.status(201).json(newMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all sports matches
 */
router.get("/", async (req, res) => {
  try {
    const matches = await SportsMatch.find().sort({ createdAt: -1 });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single sports match
 */
router.get("/:id", async (req, res) => {
  try {
    const match = await SportsMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Sports match not found" });
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update general details (e.g. going live, complete, name update)
 */
router.patch("/:id", async (req, res) => {
  try {
    const match = await SportsMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Sports match not found" });

    // Apply updates
    Object.assign(match, req.body);
    
    // Auto initialize lineages if match goes live
    if (req.body.status === "live") {
      if (match.teamA.activePlayerIds.length === 0) {
        match.teamA.activePlayerIds = match.teamA.players.slice(0, 7).map(p => p.name);
      }
      if (match.teamB.activePlayerIds.length === 0) {
        match.teamB.activePlayerIds = match.teamB.players.slice(0, 7).map(p => p.name);
      }
    }

    await match.save();
    broadcastMatchUpdate(req, match);
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Append event to event stream, compute new scores, save, and emit Socket updates
 */
router.post("/:id/event", async (req, res) => {
  try {
    const match = await SportsMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Sports match not found" });

    const { eventType, payload = {} } = req.body;
    if (!eventType) return res.status(400).json({ error: "eventType is required" });

    // Timer ticks are authoritative state updates, but not score-log events.
    const eventPayload = { ...payload };
    if (eventType !== "TIMER_TICK") {
      eventPayload.__beforeSnapshot = buildUndoSnapshot(match);
      match.events.push({ eventType, payload: eventPayload, timestamp: new Date() });
    }

    // Process event through the modular scoring engine rules
    const updatedMatch = applyEvent(match, { eventType, payload: eventPayload });

    // Extract rule engine metadata (not persisted) for cinematic overlays
    const meta = updatedMatch._eventMeta || {};
    delete updatedMatch._eventMeta;

    await updatedMatch.save();

    // Determine cinematic event overlay for stadium projector screen
    let cinematicEvent = null;

    if (eventType === "RESOLVE_RAID") {
      // RESOLVE_RAID: compound event — detect cinematics from engine metadata
      const defendersOut = Array.isArray(payload.defendersOut) ? payload.defendersOut : [];

      if (meta.allOutTriggered && meta.allOutTeams.length > 0) {
        const ao = meta.allOutTeams[0];
        cinematicEvent = { type: "ALL_OUT", message: `ALL OUT! +2 bonus points!`, team: ao.scored };
      } else if (meta.superTackle) {
        const defTeam = payload.team === "teamA" ? "teamB" : "teamA";
        cinematicEvent = { type: "SUPER_TACKLE", message: `SUPER TACKLE! +2 Points for ${updatedMatch[defTeam]?.name || "Defense"}!`, team: defTeam };
      } else if (meta.doOrDie) {
        const defTeam = payload.team === "teamA" ? "teamB" : "teamA";
        cinematicEvent = { type: "DO_OR_DIE", message: `DO OR DIE RAID FAILED! +${meta.totalRaidPoints || 1} to ${updatedMatch[defTeam]?.name || "Defense"}!`, team: defTeam };
      } else if (meta.superRaid || defendersOut.length >= 3) {
        cinematicEvent = { type: "SUPER_RAID", message: `SUPER RAID! ${defendersOut.length} defenders out!`, team: payload.team };
      }
    } else if (eventType === "ALL_OUT") {
      cinematicEvent = { type: "ALL_OUT", message: `${updatedMatch[payload.team]?.name || "Team"} awards +2 ALL OUT!`, team: payload.team };
    } else if (eventType === "SUPER_TACKLE") {
      cinematicEvent = { type: "SUPER_TACKLE", message: `SUPER TACKLE! +2 Points for ${updatedMatch[payload.team]?.name || "Defense"}`, team: payload.team };
    } else if (eventType === "SUPER_RAID") {
      cinematicEvent = { type: "SUPER_RAID", message: `SUPER RAID! ${payload.points} Points scored!`, team: payload.team };
    } else if (eventType === "TOUCH_POINT" && payload.points >= 3) {
      cinematicEvent = { type: "SUPER_RAID", message: `SUPER RAID! ${payload.points} Points scored!`, team: payload.team };
    } else if (eventType === "EMPTY_RAID" && meta.doOrDie) {
      const defTeam = updatedMatch.kabaddiState?.nextRaidingTeam || "";
      cinematicEvent = { type: "DO_OR_DIE", message: `DO OR DIE RAID FAILED! Defense earns the point!`, team: defTeam };
    }

    broadcastMatchUpdate(req, updatedMatch, cinematicEvent);
    res.json(updatedMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Undo last score event, re-evaluate sequential event-sourcing events stream, save, and emit socket updates
 */
router.post("/:id/undo", async (req, res) => {
  try {
    const match = await SportsMatch.findById(req.params.id);
    if (!match) return res.status(404).json({ error: "Sports match not found" });

    if (match.events.length === 0) {
      return res.status(400).json({ error: "No events to undo" });
    }

    // Remove the latest event
    const removedEvent = match.events.pop();
    const beforeSnapshot = removedEvent?.payload?.__beforeSnapshot;

    // Prefer exact event snapshot for new actions; fall back to event-source rebuild for older logs.
    const rebuiltMatch = beforeSnapshot ? restoreUndoSnapshot(match, beforeSnapshot) : rebuildMatchState(match);
    await rebuiltMatch.save();

    broadcastMatchUpdate(req, rebuiltMatch);
    res.json(rebuiltMatch);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
