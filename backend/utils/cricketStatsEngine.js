/**
 * cricketStatsEngine.js — Pure utility functions for scorecard & stats generation.
 * These are stateless — they accept already-rebuilt match data and return formatted outputs.
 * No DB writes here — called from cricketRoutes.js after rebuildMatchState().
 */

// ─── Commentary Text Generator ────────────────────────────────────────────────

function generateCommentaryText(ball) {
  const { batsman, bowler, runsBat, extras, isWicket, dismissalType, dismissedBatsman, fielder } = ball;
  const extraType = extras?.type || "none";
  const extraRuns = extras?.runs || 0;
  const dismissed = dismissedBatsman || batsman;

  if (isWicket) {
    switch (dismissalType) {
      case "bowled":
        return `WICKET! Bowled him! ${dismissed} is out for ${ball.runsBat}. Clean bowled by ${bowler}!`;
      case "caught":
        return `CAUGHT! Excellent catch by ${fielder || "the fielder"}! ${dismissed} departs. c ${fielder || "Sub"} b ${bowler}.`;
      case "lbw":
        return `LBW! Plumb in front! The finger goes up. ${dismissed} is out lbw b ${bowler}.`;
      case "run out":
        return `RUN OUT! Brilliant fielding! ${dismissed} is short of the crease.`;
      case "stumped":
        return `STUMPED! Quick work by the keeper! ${dismissed} is out st ${fielder || "WK"} b ${bowler}.`;
      case "hit wicket":
        return `HIT WICKET! ${dismissed} has hit his own wicket! Bizarre dismissal.`;
      default:
        return `WICKET! ${dismissed} is out — ${dismissalType || "dismissed"}.`;
    }
  }

  if (extraType === "wd") {
    return `Wide ball. ${extraRuns > 1 ? `${extraRuns} runs including wide penalty.` : "Extra run."}`;
  }
  if (extraType === "nb") {
    return `No ball! Free hit coming up. ${ball.runsBat > 0 ? `${ball.runsBat} run(s) off the bat as well.` : ""}`;
  }

  const runs = ball.runsBat || 0;

  if (runs === 6) {
    const shouts = [
      `SIX! Massive hit by ${batsman}! That's gone all the way!`,
      `SIX! ${batsman} launches it over the ropes for a maximum!`,
      `SIX! What a strike! ${batsman} sends it into the stands!`,
    ];
    return shouts[Math.floor(Math.random() * shouts.length)];
  }
  if (runs === 4) {
    const shouts = [
      `FOUR! Beautifully timed through the gap by ${batsman}!`,
      `FOUR! ${batsman} finds the boundary with a cracking drive!`,
      `FOUR! Streaky or deliberate — it doesn't matter, 4 runs!`,
    ];
    return shouts[Math.floor(Math.random() * shouts.length)];
  }
  if (extraType === "b") return `Bye! ${runs} run(s) taken as byes.`;
  if (extraType === "lb") return `Leg bye! ${runs} run(s) taken off the pads.`;
  if (runs === 0) {
    return `Dot ball. ${bowler} beats ${batsman} outside off.`;
  }
  if (runs === 1) return `1 run taken. Comfortable running between the wickets.`;
  if (runs === 2) return `2 runs! Good running from ${batsman} and partner.`;
  if (runs === 3) return `3 runs! Excellent running — they come back for the third.`;
  return `${runs} runs off this delivery.`;
}

// ─── Display label for a ball (over timeline) ─────────────────────────────────

function getBallLabel(ball) {
  if (ball.isWicket) return "W";
  if (ball.extras?.type === "wd") return "wd";
  if (ball.extras?.type === "nb") return "nb";
  if (ball.extras?.type === "b") return `${ball.extras.runs}b`;
  if (ball.extras?.type === "lb") return `${ball.extras.runs}lb`;
  return String(ball.runsBat || 0);
}

function getBallEventType(ball) {
  if (ball.isWicket) return "wicket";
  if (ball.isSix || ball.runsBat === 6) return "six";
  if (ball.isBoundary || ball.runsBat === 4) return "four";
  if (ball.extras?.type === "wd") return "wide";
  if (ball.extras?.type === "nb") return "noball";
  if (ball.isDotBall || (ball.runsBat === 0 && ball.extras?.type === "none")) return "dot";
  return "normal";
}

// ─── Full Scorecard Builder ───────────────────────────────────────────────────

/**
 * Build a full structured scorecard from the rebuilt match document.
 * Returns batting, bowling, fow, partnerships, overSummaries, commentary for each innings.
 */
function buildFullScorecard(match) {
  const result = {
    matchId: match._id,
    status: match.status,
    matchFormat: match.matchFormat,
    oversLimit: match.oversLimit,
    venue: match.venue,
    matchDate: match.matchDate,
    toss: match.toss,
    result: match.result,
    teamA: { name: match.teamA.name, logo: match.teamA.logo, color: match.teamA.color },
    teamB: { name: match.teamB.name, logo: match.teamB.logo, color: match.teamB.color },
    innings: [],
    summary: match.summary,
  };

  for (const inning of match.innings) {
    const battingTeamObj = match.teamA.name === inning.battingTeam ? match.teamA : match.teamB;
    const bowlingTeamObj = match.teamA.name === inning.bowlingTeam ? match.teamA : match.teamB;

    // ── Batting Scorecard ──
    const battedPlayers = battingTeamObj.players
      .filter(p => p.didBat)
      .sort((a, b) => (a.battingPosition || 99) - (b.battingPosition || 99));

    const didNotBat = battingTeamObj.players.filter(p => !p.didBat);

    const battingCard = battedPlayers.map(p => ({
      name: p.name,
      dismissal: p.isOut ? p.dismissal : "not out",
      isOut: p.isOut,
      runs: p.batting.runs,
      balls: p.batting.balls,
      fours: p.batting.fours,
      sixes: p.batting.sixes,
      strikeRate: p.batting.strikeRate,
      dotBalls: p.batting.dotBalls,
    }));

    // ── Bowling Scorecard ──
    const bowlingCard = bowlingTeamObj.players
      .filter(p => p.didBowl)
      .map(p => {
        const legalBalls = p.bowling.legalBalls || 0;
        const oversInt   = Math.floor(legalBalls / 6);
        const ballsRem   = legalBalls % 6;
        const oversDisplay = `${oversInt}.${ballsRem}`;
        const oversEq    = oversInt + ballsRem / 6;
        const economy    = oversEq > 0 ? Number((p.bowling.runs / oversEq).toFixed(2)) : 0;
        return {
          name: p.name,
          overs: oversDisplay,
          legalBalls,
          maidens: p.bowling.maidens,
          runs: p.bowling.runs,
          wickets: p.bowling.wickets,
          economy,
          wides: p.bowling.wides,
          noBalls: p.bowling.noBalls,
        };
      });

    // ── Totals row ──
    const legalBalls = inning.totalBalls || 0;
    const oversInt   = Math.floor(legalBalls / 6);
    const ballsRem   = legalBalls % 6;

    result.innings.push({
      inningsNumber:  inning.inningsNumber,
      battingTeam:    inning.battingTeam,
      bowlingTeam:    inning.bowlingTeam,
      totalRuns:      inning.totalRuns,
      totalWickets:   inning.totalWickets,
      overs:          `${oversInt}.${ballsRem}`,
      extras:         inning.extras,
      isCompleted:    inning.isCompleted,
      completionReason: inning.completionReason,
      batting:        battingCard,
      didNotBat:      didNotBat.map(p => p.name),
      bowling:        bowlingCard,
      fallOfWickets:  inning.fallOfWickets || [],
      partnerships:   inning.partnerships   || [],
      currentPartnership: inning.currentPartnership || {},
      highestPartnership: inning.highestPartnership  || 0,
      overSummaries:  inning.overSummaries  || [],
      commentary:     (inning.commentary || []).slice().reverse(), // newest first
    });
  }

  return result;
}

// ─── Match Summary Builder ────────────────────────────────────────────────────

function buildMatchSummary(match) {
  let topScorer = null, topRuns = -1;
  let bestBowler = null, bestWickets = -1, bestRuns = 9999;
  let totalSixes = 0, totalFours = 0, totalExtras = 0;

  [match.teamA, match.teamB].forEach(team => {
    team.players.forEach(p => {
      if (p.didBat && p.batting.runs > topRuns) {
        topRuns = p.batting.runs;
        topScorer = p;
      }
      if (p.didBowl) {
        if (
          p.bowling.wickets > bestWickets ||
          (p.bowling.wickets === bestWickets && p.bowling.runs < bestRuns)
        ) {
          bestWickets = p.bowling.wickets;
          bestRuns = p.bowling.runs;
          bestBowler = p;
        }
        totalSixes += p.batting.sixes || 0;
        totalFours += p.batting.fours || 0;
      }
      totalSixes += p.batting.sixes || 0;
      totalFours += p.batting.fours || 0;
    });
  });

  // Deduplicate (since we added batting stats twice above, fix)
  totalSixes = 0; totalFours = 0;
  [match.teamA, match.teamB].forEach(team => {
    team.players.forEach(p => {
      totalSixes += p.batting.sixes || 0;
      totalFours += p.batting.fours || 0;
    });
  });

  match.innings.forEach(inn => {
    totalExtras += inn.extras?.total || 0;
  });

  const highestPartnership = Math.max(
    ...match.innings.map(inn => inn.highestPartnership || 0), 0
  );

  return {
    topScorer:      topScorer ? topScorer.name : "",
    topScorerRuns:  topRuns > 0 ? topRuns : 0,
    topScorerBalls: topScorer ? topScorer.batting.balls : 0,
    bestBowler:     bestBowler ? bestBowler.name : "",
    bestBowlerFigures: bestBowler ? `${bestWickets}/${bestRuns}` : "",
    totalSixes,
    totalFours,
    totalExtras,
    highestPartnership,
    result: match.result,
    status: match.status,
  };
}

// ─── Player Match Stats ───────────────────────────────────────────────────────

function buildPlayerMatchStats(match, playerName) {
  let playerData = null;
  let inningsContext = null;

  for (const team of [match.teamA, match.teamB]) {
    const found = team.players.find(p => p.name === playerName);
    if (found) { playerData = found; break; }
  }

  if (!playerData) return null;

  const legalBalls = playerData.bowling.legalBalls || 0;
  const oversInt   = Math.floor(legalBalls / 6);
  const ballsRem   = legalBalls % 6;
  const oversEq    = oversInt + ballsRem / 6;

  return {
    name: playerName,
    batting: {
      runs:       playerData.batting.runs,
      balls:      playerData.batting.balls,
      fours:      playerData.batting.fours,
      sixes:      playerData.batting.sixes,
      strikeRate: playerData.batting.strikeRate,
      dotBalls:   playerData.batting.dotBalls,
      dismissal:  playerData.isOut ? playerData.dismissal : "not out",
      didBat:     playerData.didBat,
    },
    bowling: {
      overs:   `${oversInt}.${ballsRem}`,
      maidens: playerData.bowling.maidens,
      runs:    playerData.bowling.runs,
      wickets: playerData.bowling.wickets,
      economy: oversEq > 0 ? Number((playerData.bowling.runs / oversEq).toFixed(2)) : 0,
      wides:   playerData.bowling.wides,
      noBalls: playerData.bowling.noBalls,
      didBowl: playerData.didBowl,
    },
  };
}

// ─── Career Stats Updater (logic only — DB write in route) ────────────────────

/**
 * Returns an object describing delta changes to apply to a player's career stats.
 * The route handler does the actual upsert.
 */
function computeCareerDelta(match, playerName, matchId) {
  const stats = buildPlayerMatchStats(match, playerName);
  if (!stats) return null;

  const bat = stats.batting;
  const bowl = stats.bowling;
  const legalBalls = bowl.overs.split(".").reduce((o, b, i) => i === 0 ? parseInt(o) * 6 : parseInt(o) + parseInt(b), 0);

  const delta = {
    playerName,
    matchId,
    batting: {
      matches:  1,
      innings:  bat.didBat ? 1 : 0,
      notOuts:  bat.didBat && bat.dismissal === "not out" ? 1 : 0,
      runs:     bat.runs,
      balls:    bat.balls,
      fours:    bat.fours,
      sixes:    bat.sixes,
      dotBalls: bat.dotBalls,
      fifties:  bat.runs >= 50 && bat.runs < 100 ? 1 : 0,
      hundreds: bat.runs >= 100 ? 1 : 0,
      ducks:    bat.didBat && bat.runs === 0 && bat.dismissal !== "not out" ? 1 : 0,
      highestScore: bat.runs,
      highestScoreNotOut: bat.dismissal === "not out",
    },
    bowling: {
      matches:  bowl.didBowl ? 1 : 0,
      innings:  bowl.didBowl ? 1 : 0,
      balls:    legalBalls,
      runs:     bowl.runs,
      wickets:  bowl.wickets,
      maidens:  bowl.maidens,
      wides:    bowl.wides,
      noBalls:  bowl.noBalls,
      fourWickets: bowl.wickets >= 4 && bowl.wickets < 5 ? 1 : 0,
      fiveWickets: bowl.wickets >= 5 ? 1 : 0,
      bestBowlingWickets: bowl.wickets,
      bestBowlingRuns: bowl.runs,
    },
  };

  return delta;
}

/**
 * Compute career stats for a team
 */
function computeTeamDelta(match, teamName, matchId) {
  const isTeamA = match.teamA.name === teamName;
  const teamObj = isTeamA ? match.teamA : match.teamB;

  // Determine win/loss/tie
  const result = match.result;
  let win = 0, loss = 0, tie = 0;
  if (result?.winner === teamName) win = 1;
  else if (result?.winner === "tie") tie = 1;
  else if (match.status === "completed") loss = 1;

  // Batting stats (innings where this team batted)
  const battingInnings = match.innings.filter(inn => inn.battingTeam === teamName);
  const bowlingInnings  = match.innings.filter(inn => inn.bowlingTeam === teamName);

  let totalRunsScored = 0, totalBallsFaced = 0, totalWicketsLost = 0;
  let highestTeamScore = 0;
  battingInnings.forEach(inn => {
    totalRunsScored += inn.totalRuns || 0;
    totalBallsFaced += inn.totalBalls || 0;
    totalWicketsLost += inn.totalWickets || 0;
    if (inn.totalRuns > highestTeamScore) highestTeamScore = inn.totalRuns;
  });

  let totalRunsConceded = 0, totalBallsBowled = 0, totalWicketsTaken = 0;
  bowlingInnings.forEach(inn => {
    totalRunsConceded += inn.totalRuns || 0;
    totalBallsBowled  += inn.totalBalls || 0;
    totalWicketsTaken += inn.totalWickets || 0;
  });

  let totalFours = 0, totalSixes = 0;
  teamObj.players.forEach(p => {
    totalFours += p.batting.fours || 0;
    totalSixes += p.batting.sixes || 0;
  });

  return {
    teamName,
    matchId,
    matchesPlayed: 1,
    wins: win, losses: loss, ties: tie,
    totalRunsScored, totalBallsFaced, totalWicketsLost, highestTeamScore,
    totalRunsConceded, totalBallsBowled, totalWicketsTaken,
    totalFours, totalSixes,
  };
}

module.exports = {
  generateCommentaryText,
  getBallLabel,
  getBallEventType,
  buildFullScorecard,
  buildMatchSummary,
  buildPlayerMatchStats,
  computeCareerDelta,
  computeTeamDelta,
};
