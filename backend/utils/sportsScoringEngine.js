/**
 * Sports Scoring Engine for Multi-Sport Unified scoring.
 * Focuses on Kabaddi, but architecture supports events for other sports.
 *
 * ARCHITECTURE: Think "resolveRaid" not "addPoints".
 * Raids are compound events: simultaneous touch points, bonus, tackle,
 * revival logic, all-out detection, and turn management all happen atomically.
 */

/**
 * Initializes team active lineups if they are empty
 */
function initializeLineups(match) {
  if (match.teamA.activePlayerIds.length === 0 && match.teamA.outPlayerIds.length === 0) {
    const active = match.teamA.players.slice(0, 7).map(p => p.name);
    match.teamA.activePlayerIds = active;
    match.teamA.outPlayerIds = [];
  }
  if (match.teamB.activePlayerIds.length === 0 && match.teamB.outPlayerIds.length === 0) {
    const active = match.teamB.players.slice(0, 7).map(p => p.name);
    match.teamB.activePlayerIds = active;
    match.teamB.outPlayerIds = [];
  }
}

function statKey(teamKey, playerName) {
  return `${teamKey}:${playerName}`;
}

function getRosterPlayer(match, teamKey, playerName) {
  return match[teamKey]?.players?.find(player => player.name === playerName) || {};
}

function ensurePlayerStats(match) {
  if (!match.playerStats) {
    match.playerStats = new Map();
  }
}

function getPlayerStat(match, teamKey, playerName) {
  ensurePlayerStats(match);
  const key = statKey(teamKey, playerName);
  const existing = match.playerStats.get?.(key) || match.playerStats[key];
  if (existing) return existing;

  const rosterPlayer = getRosterPlayer(match, teamKey, playerName);
  const initial = {
    teamKey,
    playerName,
    jerseyNumber: rosterPlayer.jerseyNumber || "",
    role: rosterPlayer.role || "All Rounder",
    totalRaids: 0,
    successfulRaids: 0,
    emptyRaids: 0,
    unsuccessfulRaids: 0,
    doOrDieRaids: 0,
    doOrDieSuccessfulRaids: 0,
    touchPoints: 0,
    bonusPoints: 0,
    tacklePoints: 0,
    totalTacklesAttempted: 0,
    successfulTackles: 0,
    superRaids: 0,
    superTackles: 0,
    totalPoints: 0
  };
  if (match.playerStats.set) {
    match.playerStats.set(key, initial);
  } else {
    match.playerStats[key] = initial;
  }
  return initial;
}

function addPlayerPoints(stat, { touch = 0, bonus = 0, tackle = 0 } = {}) {
  stat.touchPoints += touch;
  stat.bonusPoints += bonus;
  stat.tacklePoints += tackle;
  stat.totalPoints += touch + bonus + tackle;
}

function recordRaiderStats(match, teamKey, playerName, context) {
  if (!playerName) return;
  const stat = getPlayerStat(match, teamKey, playerName);
  const touchPoints = context.touchPoints || 0;
  const bonusPoints = context.bonusPoints || 0;
  const raidPoints = touchPoints + bonusPoints;

  stat.totalRaids += 1;
  if (context.wasDoOrDie) stat.doOrDieRaids += 1;
  if (raidPoints > 0) {
    stat.successfulRaids += 1;
    if (context.wasDoOrDie) stat.doOrDieSuccessfulRaids += 1;
  } else if (context.isEmptyRaid) {
    stat.emptyRaids += 1;
  } else {
    stat.unsuccessfulRaids += 1;
  }
  if (context.isSuperRaid) stat.superRaids += 1;
  addPlayerPoints(stat, { touch: touchPoints, bonus: bonusPoints });
}

function recordTackleStats(match, teamKey, playerName, points, isSuperTackle) {
  if (!playerName || points <= 0) return;
  const stat = getPlayerStat(match, teamKey, playerName);
  stat.totalTacklesAttempted += 1;
  stat.successfulTackles += 1;
  if (isSuperTackle) stat.superTackles += 1;
  addPlayerPoints(stat, { tackle: points });
}

/**
 * Helper: revive N players from a team's out queue (FIFO order)
 * First player to go out is first to come back.
 */
function revivePlayers(match, teamKey, count) {
  const revived = [];
  for (let i = 0; i < count; i++) {
    if (match[teamKey].outPlayerIds.length > 0) {
      const player = match[teamKey].outPlayerIds.shift(); // FIFO: take the oldest-out player
      match[teamKey].activePlayerIds.push(player);
      revived.push(player);
    }
  }
  return revived;
}

/**
 * Helper: send specific players to the out bench
 */
function sendPlayersOut(match, teamKey, playerNames) {
  for (const name of playerNames) {
    if (match[teamKey].activePlayerIds.includes(name)) {
      match[teamKey].activePlayerIds = match[teamKey].activePlayerIds.filter(n => n !== name);
      if (!match[teamKey].outPlayerIds.includes(name)) {
        match[teamKey].outPlayerIds.push(name); // FIFO: append to tail
      }
    }
  }
}

/**
 * Helper: check and trigger All Out for a team.
 * If a team's active players list hits 0, the opposing team earns +2 and the wiped team is fully revived.
 * Returns { triggered: bool, team: teamKey that was wiped out }
 */
function checkAllOut(match, wipedTeamKey) {
  if (match[wipedTeamKey].activePlayerIds.length === 0) {
    const scoringTeamKey = wipedTeamKey === "teamA" ? "teamB" : "teamA";
    match[scoringTeamKey].score += 2; // +2 All Out points
    // Revive ALL players of the wiped team
    match[wipedTeamKey].activePlayerIds = match[wipedTeamKey].players.slice(0, 7).map(p => p.name);
    match[wipedTeamKey].outPlayerIds = [];
    return { triggered: true, wipedTeam: wipedTeamKey, scoringTeam: scoringTeamKey };
  }
  return { triggered: false };
}

/**
 * Helper: end the current raid cleanly, resetting all live raid state
 */
function getOtherTeam(teamKey) {
  return teamKey === "teamA" ? "teamB" : teamKey === "teamB" ? "teamA" : "";
}

function endRaidState(match, completedRaidingTeam = "") {
  match.kabaddiState.isRaidActive = false;
  match.kabaddiState.currentRaider = "";
  match.kabaddiState.raidingTeam = "";
  match.kabaddiState.raidTimer = 30;
  match.kabaddiState.doOrDie = false;
  match.kabaddiState.nextRaidingTeam = getOtherTeam(completedRaidingTeam);
}

function markEmptyRaid(match) {
  match.kabaddiState.emptyRaidStreak = (match.kabaddiState.emptyRaidStreak || 0) + 1;
}

function markScoringRaid(match) {
  match.kabaddiState.emptyRaidStreak = 0;
}

function ensureMatchClock(match) {
  if (!match.matchClock) {
    match.matchClock = {};
  }
  match.matchClock.firstHalfDuration = match.matchClock.firstHalfDuration || 600;
  match.matchClock.secondHalfDuration = match.matchClock.secondHalfDuration || 600;
  if (typeof match.matchClock.remaining !== "number") {
    match.matchClock.remaining = match.matchClock.firstHalfDuration;
  }
  match.matchClock.mode = match.matchClock.mode || "SMART_CLUTCH";
  match.matchClock.clutchThreshold = typeof match.matchClock.clutchThreshold === "number" ? match.matchClock.clutchThreshold : 120;
  match.matchClock.state = match.matchClock.state || "PAUSED";
  match.matchClock.running = Boolean(match.matchClock.running);
}

function resumeOfficialClock(match) {
  ensureMatchClock(match);
  if (match.matchClock.remaining > 0 && match.matchClock.state !== "COMPLETED") {
    match.matchClock.running = true;
    match.matchClock.state = "RUNNING";
  }
}

function pauseOfficialClock(match, state = "PAUSED") {
  ensureMatchClock(match);
  match.matchClock.running = false;
  match.matchClock.state = state;
}

function adjustOfficialClock(match, deltaSeconds = 0) {
  ensureMatchClock(match);
  const currentHalfDuration = match.kabaddiState.half === 1
    ? match.matchClock.firstHalfDuration
    : match.matchClock.secondHalfDuration;
  const nextRemaining = Number(match.matchClock.remaining || 0) + Number(deltaSeconds || 0);
  match.matchClock.remaining = Math.max(0, Math.min(currentHalfDuration, nextRemaining));
  if (match.matchClock.remaining === 0) {
    pauseOfficialClock(match, match.kabaddiState.half === 1 ? "HALFTIME" : "COMPLETED");
  }
}

function setOfficialClock(match, remainingSeconds = 0) {
  ensureMatchClock(match);
  const currentHalfDuration = match.kabaddiState.half === 1
    ? match.matchClock.firstHalfDuration
    : match.matchClock.secondHalfDuration;
  const nextRemaining = Number(remainingSeconds || 0);
  match.matchClock.remaining = Math.max(0, Math.min(currentHalfDuration, nextRemaining));
  if (match.matchClock.remaining === 0) {
    pauseOfficialClock(match, match.kabaddiState.half === 1 ? "HALFTIME" : "COMPLETED");
  }
}

function shouldPauseOfficialClockAfterRaid(match, isEmptyRaid) {
  ensureMatchClock(match);
  if (match.matchClock.mode === "CONTINUOUS") return false;
  if (match.matchClock.mode === "STOP_EVERY_RAID") return true;
  if (match.matchClock.mode === "SMART_CLUTCH") {
    return !isEmptyRaid && match.matchClock.remaining <= match.matchClock.clutchThreshold;
  }
  return false;
}

/**
 * Applies a single event to the match document
 * @param {Object} match - The Mongoose Match Document
 * @param {Object} event - The Event object { eventType, payload }
 * @returns {Object} Mutated match + metadata { allOutTriggered, allOutTeams, superTackle, totalRaidPoints }
 */
function applyEvent(match, event) {
  initializeLineups(match);
  ensureMatchClock(match);
  ensurePlayerStats(match);

  const { eventType, payload } = event;
  const raidingTeamKey = match.kabaddiState.raidingTeam; // "teamA" or "teamB"
  const defendingTeamKey = raidingTeamKey === "teamA" ? "teamB" : "teamA";

  // Metadata returned alongside the mutated match for cinematic event decisions
  let meta = { allOutTriggered: false, allOutTeams: [], superTackle: false, superRaid: false, doOrDie: false, totalRaidPoints: 0 };

  switch (eventType) {

    // ─────────────────────────────────────────────────────────────────────
    // CORE: RESOLVE_RAID — The primary compound event for any raid outcome
    // ─────────────────────────────────────────────────────────────────────
    case "RESOLVE_RAID": {
      const {
        team,          // Raiding team key: "teamA" or "teamB"
        raider,        // Raider player name (string)
        defendersOut,  // Array of defender player names eliminated
        bonus,         // Boolean: bonus point earned
        raiderOut,     // Boolean: raider was tackled / eliminated
        tackler,       // Defender credited with the successful tackle
      } = payload;

      if (!team) break;

      const raidingTeam = team;
      const defendingTeam = raidingTeam === "teamA" ? "teamB" : "teamA";
      const wasDoOrDie = Boolean(match.kabaddiState.doOrDie);

      let raidTeamPoints = 0;
      let defenseTeamPoints = 0;
      let raidTeamRevives = 0;
      let defenseRevives = 0;
      let creditedTacklePoints = 0;
      let creditedSuperTackle = false;
      const touchedDefenders = Array.isArray(defendersOut) ? defendersOut : [];
      const preRaidDefenderCount = match[defendingTeam].activePlayerIds.length;
      const bonusAwarded = Boolean(bonus) && preRaidDefenderCount >= 6;

      // 1. BONUS POINT — does not eliminate anyone or trigger revival
      if (bonusAwarded) {
        raidTeamPoints += 1;
      }

      // 2. TOUCH POINTS — defenders are eliminated, raiding team is revived (FIFO)
      if (touchedDefenders.length > 0) {
        raidTeamPoints += touchedDefenders.length;
        raidTeamRevives += touchedDefenders.length;
        sendPlayersOut(match, defendingTeam, touchedDefenders);
      }
      meta.superRaid = touchedDefenders.length >= 3;

      // 3. RAIDER OUT / TACKLE POINT
      //    Super Tackle auto-detect: if the defending team had ≤3 active players
      //    *before* any touch-outs were applied, it counts as Super Tackle (+2)
      const doOrDieFailed = wasDoOrDie && !bonusAwarded && touchedDefenders.length === 0 && !raiderOut;

      if (raiderOut || doOrDieFailed) {
        // Reconstruct defender count before this raid's touch-outs
        const preRaidTackleDefenderCount = match[defendingTeam].activePlayerIds.length + touchedDefenders.length;
        const isSuperTackle = raiderOut && preRaidTackleDefenderCount <= 3;
        meta.superTackle = isSuperTackle;
        meta.doOrDie = doOrDieFailed;

        if (isSuperTackle) {
          defenseTeamPoints += 2;
          creditedTacklePoints = 2;
          creditedSuperTackle = true;
        } else {
          defenseTeamPoints += 1;
          creditedTacklePoints = 1;
        }
        defenseRevives += 1;

        // Send raider to out bench
        if (raider) {
          sendPlayersOut(match, raidingTeam, [raider]);
        }
      }

      const isEmptyRaid = !bonusAwarded && touchedDefenders.length === 0 && !raiderOut && !doOrDieFailed;
      recordRaiderStats(match, raidingTeam, raider, {
        touchPoints: touchedDefenders.length,
        bonusPoints: bonusAwarded ? 1 : 0,
        wasDoOrDie,
        isEmptyRaid,
        isSuperRaid: touchedDefenders.length >= 3
      });
      recordTackleStats(match, defendingTeam, tackler, creditedTacklePoints, creditedSuperTackle);

      if (isEmptyRaid) {
        markEmptyRaid(match);
      } else {
        markScoringRaid(match);
      }

      // 4. APPLY SCORES
      match[raidingTeam].score += raidTeamPoints;
      match[defendingTeam].score += defenseTeamPoints;
      meta.totalRaidPoints = raidTeamPoints + defenseTeamPoints;

      // 5. APPLY REVIVALS (FIFO ORDER)
      revivePlayers(match, raidingTeam, raidTeamRevives);
      revivePlayers(match, defendingTeam, defenseRevives);

      // 6. ALL OUT AUTO-DETECTION (after all lineup changes)
      const defAllOut = checkAllOut(match, defendingTeam);
      if (defAllOut.triggered) {
        meta.allOutTriggered = true;
        meta.allOutTeams.push({ wiped: defendingTeam, scored: raidingTeam });
      }

      const raidAllOut = checkAllOut(match, raidingTeam);
      if (raidAllOut.triggered) {
        meta.allOutTriggered = true;
        meta.allOutTeams.push({ wiped: raidingTeam, scored: defendingTeam });
      }

      // 7. END RAID STATE
      endRaidState(match, raidingTeam);
      if (shouldPauseOfficialClockAfterRaid(match, isEmptyRaid)) {
        pauseOfficialClock(match, "PAUSED");
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────
    // START_RAID — Record the start of a live raid
    // ─────────────────────────────────────────────────────────────────────
    case "START_RAID": {
      const { raider } = payload;
      const team = payload.team || match.kabaddiState.nextRaidingTeam || "teamA";
      const isDoOrDie = (match.kabaddiState.emptyRaidStreak || 0) >= 2;
      match.kabaddiState.isRaidActive = true;
      match.kabaddiState.currentRaider = raider;
      match.kabaddiState.raidingTeam = team;
      match.kabaddiState.nextRaidingTeam = "";
      match.kabaddiState.raidTimer = 30;
      match.kabaddiState.doOrDie = isDoOrDie;
      resumeOfficialClock(match);
      break;
    }

    case "SET_FIRST_RAID": {
      const { team } = payload;
      if (team === "teamA" || team === "teamB") {
        match.kabaddiState.nextRaidingTeam = team;
      }
      break;
    }

    case "OVERRIDE_RAID_TURN": {
      const { team } = payload;
      if ((team === "teamA" || team === "teamB") && !match.kabaddiState.isRaidActive) {
        match.kabaddiState.nextRaidingTeam = team;
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────
    // EMPTY_RAID — Raider crosses back safely, no points, no eliminations
    // ─────────────────────────────────────────────────────────────────────
    case "EMPTY_RAID": {
      const wasDoOrDie = Boolean(match.kabaddiState.doOrDie);
      if (wasDoOrDie) {
        applyEvent(match, {
          eventType: "RESOLVE_RAID",
          payload: {
            team: raidingTeamKey,
            raider: match.kabaddiState.currentRaider,
            defendersOut: [],
            bonus: false,
            raiderOut: false
          }
        });
        meta = match._eventMeta || meta;
      } else {
        markEmptyRaid(match);
        endRaidState(match, raidingTeamKey);
        if (shouldPauseOfficialClockAfterRaid(match, true)) {
          pauseOfficialClock(match, "PAUSED");
        }
      }
      break;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Legacy individual events (preserved for backward-compat / undo rebuild)
    // ─────────────────────────────────────────────────────────────────────
    case "END_RAID": {
      endRaidState(match, raidingTeamKey);
      break;
    }

    case "TOUCH_POINT": {
      const points = payload.points || 1;
      const team = payload.team || raidingTeamKey;
      if (!team) break;
      const defTeam = team === "teamA" ? "teamB" : "teamA";

      match[team].score += points;

      // Eliminate defending players (first N active players, FIFO)
      for (let i = 0; i < points; i++) {
        if (match[defTeam].activePlayerIds.length > 0) {
          const removed = match[defTeam].activePlayerIds.shift();
          match[defTeam].outPlayerIds.push(removed);
        }
      }

      // Revive raiding team players (FIFO)
      revivePlayers(match, team, points);

      // Check All Out
      const ao = checkAllOut(match, defTeam);
      if (ao.triggered) { meta.allOutTriggered = true; meta.allOutTeams.push({ wiped: defTeam, scored: team }); }

      endRaidState(match, team);
      break;
    }

    case "BONUS_POINT": {
      const team = payload.team || raidingTeamKey;
      if (!team) break;
      match[team].score += 1;
      break;
    }

    case "TACKLE_POINT": {
      const defendingTeam = payload.team || defendingTeamKey;
      if (!defendingTeam) break;
      const raidingTeam = defendingTeam === "teamA" ? "teamB" : "teamA";
      const raider = match.kabaddiState.currentRaider || payload.raider;

      match[defendingTeam].score += 1;
      revivePlayers(match, defendingTeam, 1);

      if (raider) {
        sendPlayersOut(match, raidingTeam, [raider]);
      } else if (match[raidingTeam].activePlayerIds.length > 0) {
        const removed = match[raidingTeam].activePlayerIds.shift();
        match[raidingTeam].outPlayerIds.push(removed);
      }

      const ao = checkAllOut(match, raidingTeam);
      if (ao.triggered) { meta.allOutTriggered = true; meta.allOutTeams.push({ wiped: raidingTeam, scored: defendingTeam }); }

      endRaidState(match, raidingTeam);
      markScoringRaid(match);
      break;
    }

    case "SUPER_TACKLE": {
      const defendingTeam = payload.team || defendingTeamKey;
      if (!defendingTeam) break;
      const raidingTeam = defendingTeam === "teamA" ? "teamB" : "teamA";
      const raider = match.kabaddiState.currentRaider || payload.raider;

      match[defendingTeam].score += 2; // Super Tackle = +2
      revivePlayers(match, defendingTeam, 1);
      meta.superTackle = true;

      if (raider) {
        sendPlayersOut(match, raidingTeam, [raider]);
      } else if (match[raidingTeam].activePlayerIds.length > 0) {
        const removed = match[raidingTeam].activePlayerIds.shift();
        match[raidingTeam].outPlayerIds.push(removed);
      }

      const ao = checkAllOut(match, raidingTeam);
      if (ao.triggered) { meta.allOutTriggered = true; meta.allOutTeams.push({ wiped: raidingTeam, scored: defendingTeam }); }

      endRaidState(match, raidingTeam);
      markScoringRaid(match);
      break;
    }

    case "ALL_OUT": {
      const team = payload.team; // Team that earns the All Out bonus
      if (!team) break;
      const defTeam = team === "teamA" ? "teamB" : "teamA";

      match[team].score += 2;
      match[defTeam].activePlayerIds = match[defTeam].players.slice(0, 7).map(p => p.name);
      match[defTeam].outPlayerIds = [];

      meta.allOutTriggered = true;
      meta.allOutTeams.push({ wiped: defTeam, scored: team });
      markScoringRaid(match);
      break;
    }

    case "SUPER_RAID": {
      const points = payload.points || 3;
      const team = payload.team || raidingTeamKey;
      if (!team) break;
      const defTeam = team === "teamA" ? "teamB" : "teamA";

      match[team].score += points;

      for (let i = 0; i < points; i++) {
        if (match[defTeam].activePlayerIds.length > 0) {
          const removed = match[defTeam].activePlayerIds.shift();
          match[defTeam].outPlayerIds.push(removed);
        }
      }
      revivePlayers(match, team, points);

      const ao = checkAllOut(match, defTeam);
      if (ao.triggered) { meta.allOutTriggered = true; meta.allOutTeams.push({ wiped: defTeam, scored: team }); }

      endRaidState(match, team);
      markScoringRaid(match);
      break;
    }

    case "DO_OR_DIE": {
      match.kabaddiState.doOrDie = payload.active !== undefined ? payload.active : true;
      break;
    }

    case "TIMEOUT": {
      const team = payload.team;
      if ((team === "teamA" || team === "teamB") && match.kabaddiState.timeoutsLeft[team] > 0) {
        match.kabaddiState.timeoutsLeft[team] -= 1;
        pauseOfficialClock(match, "TIMEOUT");
      }
      break;
    }

    case "PAUSE_OFFICIAL_CLOCK": {
      pauseOfficialClock(match, "PAUSED");
      break;
    }

    case "RESUME_OFFICIAL_CLOCK": {
      resumeOfficialClock(match);
      break;
    }

    case "ADJUST_OFFICIAL_CLOCK": {
      adjustOfficialClock(match, payload.seconds);
      break;
    }

    case "SET_OFFICIAL_CLOCK": {
      setOfficialClock(match, payload.remaining);
      break;
    }

    case "HALF_END": {
      match.kabaddiState.half = match.kabaddiState.half === 1 ? 2 : 1;
      endRaidState(match);
      match.matchClock.remaining = match.kabaddiState.half === 1
        ? match.matchClock.firstHalfDuration
        : match.matchClock.secondHalfDuration;
      pauseOfficialClock(match, "HALFTIME");
      break;
    }

    case "REVIVE_PLAYER": {
      const { team, player } = payload;
      if (match[team].outPlayerIds.includes(player)) {
        match[team].outPlayerIds = match[team].outPlayerIds.filter(n => n !== player);
        if (!match[team].activePlayerIds.includes(player)) {
          match[team].activePlayerIds.push(player);
        }
      }
      break;
    }

    case "OUT_PLAYER": {
      const { team, player } = payload;
      if (match[team].activePlayerIds.includes(player)) {
        match[team].activePlayerIds = match[team].activePlayerIds.filter(n => n !== player);
        if (!match[team].outPlayerIds.includes(player)) {
          match[team].outPlayerIds.push(player);
        }
      }
      break;
    }

    case "TIMER_TICK": {
      if (match.kabaddiState.isRaidActive && match.kabaddiState.raidTimer > 0) {
        match.kabaddiState.raidTimer -= 1;
      }
      if (match.matchClock.running && match.matchClock.remaining > 0) {
        match.matchClock.remaining -= 1;
        if (match.matchClock.remaining <= 0) {
          match.matchClock.remaining = 0;
          pauseOfficialClock(match, match.kabaddiState.half === 1 ? "HALFTIME" : "COMPLETED");
        }
      }
      break;
    }

    default:
      console.warn("Unknown event type applied in scoring engine:", eventType);
      break;
  }

  // Attach metadata to match for route handler to use (not persisted)
  match._eventMeta = meta;
  return match;
}

/**
 * Rebuilds the entire match state from its event stream.
 * Used for Undo operations or restoring state integrity.
 */
function rebuildMatchState(match) {
  match.teamA.score = 0;
  match.teamA.activePlayerIds = [];
  match.teamA.outPlayerIds = [];

  match.teamB.score = 0;
  match.teamB.activePlayerIds = [];
  match.teamB.outPlayerIds = [];

  match.kabaddiState = {
    raidTimer: 30,
    isRaidActive: false,
    currentRaider: "",
    raidingTeam: "",
    nextRaidingTeam: "",
    emptyRaidStreak: 0,
    half: 1,
    timeoutsLeft: { teamA: 2, teamB: 2 },
    doOrDie: false
  };
  match.matchClock = {
    firstHalfDuration: match.matchClock?.firstHalfDuration || 600,
    secondHalfDuration: match.matchClock?.secondHalfDuration || 600,
    remaining: match.matchClock?.firstHalfDuration || 600,
    running: false,
    mode: match.matchClock?.mode || "SMART_CLUTCH",
    clutchThreshold: typeof match.matchClock?.clutchThreshold === "number" ? match.matchClock.clutchThreshold : 120,
    state: "PAUSED"
  };
  match.playerStats = new Map();

  initializeLineups(match);

  const events = [...match.events];
  for (const event of events) {
    applyEvent(match, event);
  }

  return match;
}

module.exports = { applyEvent, rebuildMatchState };
