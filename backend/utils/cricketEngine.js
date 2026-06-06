/**
 * Cricket Engine - Core Logic
 * Event-sourcing rebuild: replays all CricketBall documents to reconstruct complete match state.
 * Extended with: over summaries, partnership tracking, ball-by-ball commentary, maiden detection.
 */
const CricketMatch = require("../models/CricketMatch");
const CricketBall  = require("../models/CricketBall");
const { generateCommentaryText, getBallLabel, getBallEventType } = require("./cricketStatsEngine");

// ─── Commentary Trim Limit ────────────────────────────────────────────────────
const COMMENTARY_LIMIT = 100; // keep last 100 ball events per innings

// Rebuild the complete match state from the raw ball events.
// This implements Event Sourcing, ensuring 100% accuracy on Undo and edits.
async function rebuildMatchState(matchId) {
  const match = await CricketMatch.findById(matchId);
  if (!match) return null;

  const balls = await CricketBall.find({ matchId }).sort({ timestamp: 1 });

  // Reset match to initial 0 state
  match.innings.forEach(inning => {
    inning.totalRuns      = 0;
    inning.totalWickets   = 0;
    inning.totalBalls     = 0;
    inning.totalDeliveries = 0;
    inning.extras         = { wides: 0, noBalls: 0, byes: 0, legByes: 0, total: 0 };
    inning.fallOfWickets  = [];
    inning.partnerships   = [];
    inning.overSummaries  = [];
    inning.commentary     = [];
    inning.highestPartnership = 0;
    inning.currentPartnership = { batter1: "", batter2: "", runs: 0, balls: 0 };
    inning.isCompleted    = false;
    inning.completionReason = "";
  });

  [match.teamA, match.teamB].forEach(team => {
    team.players.forEach(p => {
      p.batting     = { runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, dotBalls: 0 };
      p.bowling     = { legalBalls: 0, overs: "0.0", maidens: 0, runs: 0, wickets: 0, economy: 0, wides: 0, noBalls: 0 };
      p.isOut       = false;
      p.dismissal   = "";
      p.dismissalType = "";
      p.dismissedBy = "";
      p.caughtBy    = "";
      p.battingPosition = 0;
    });
  });

  // Per-innings tracking helpers (keyed by innings index)
  const partnershipState = {}; // { inningIdx: { batter1, batter2, runs, balls, openingBall } }
  const overState        = {}; // { inningIdx: { [overNumber]: { bowler, balls[], totalRuns, wickets, extras } } }
  const battingPositions = {}; // { inningIdx: number }

  let striker    = match.currentStriker;
  let nonStriker = match.currentNonStriker;
  let bowler     = match.currentBowler;
  let awaitingBatsman = false;
  let awaitingBowler  = false;
  let currentInningsNumber = match.currentInnings || 1;

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    const inningIndex = ball.innings - 1;
    if (inningIndex < 0 || inningIndex >= match.innings.length) continue;

    const currentInning = match.innings[inningIndex];
    currentInningsNumber = ball.innings;

    const battingTeam = match.teamA.name === currentInning.battingTeam ? match.teamA : match.teamB;
    const bowlingTeam = match.teamA.name === currentInning.bowlingTeam ? match.teamA : match.teamB;

    // ── Find / create batsman player ──
    let batPlayer = battingTeam.players.find(p => p.name === ball.batsman);
    if (!batPlayer) {
      battingTeam.players.push({ name: ball.batsman, role: "Player" });
      batPlayer = battingTeam.players[battingTeam.players.length - 1];
    }
    // Track batting position (first time they face a ball)
    if (!batPlayer.didBat) {
      if (!battingPositions[inningIndex]) battingPositions[inningIndex] = 0;
      battingPositions[inningIndex] += 1;
      batPlayer.battingPosition = battingPositions[inningIndex];
    }
    batPlayer.didBat = true;

    // ── Find / create bowler player ──
    let bowlPlayer = bowlingTeam.players.find(p => p.name === ball.bowler);
    if (!bowlPlayer) {
      bowlingTeam.players.push({ name: ball.bowler, role: "Player" });
      bowlPlayer = bowlingTeam.players[bowlingTeam.players.length - 1];
    }
    bowlPlayer.didBowl = true;

    const runs      = ball.runsBat;
    const extraType = ball.extras.type;
    const extraRuns = ball.extras.runs;

    let isLegalBall  = true;
    let runsToBatsman = runs;
    let runsToBowler  = runs;

    if (extraType === "wd" || extraType === "nb") {
      isLegalBall   = false;
      runsToBowler += extraRuns;
    } else if (extraType === "b" || extraType === "lb") {
      runsToBowler = 0; // byes/leg-byes don't count against bowler
    }

    // ── Match Totals ──
    currentInning.totalDeliveries += 1;
    const totalRunsThisBall = runs + extraRuns;
    currentInning.totalRuns += totalRunsThisBall;
    if (isLegalBall) currentInning.totalBalls += 1;

    // ── Extras ──
    if (extraType !== "none") {
      currentInning.extras.total += extraRuns;
      if (extraType === "wd") { currentInning.extras.wides  += extraRuns; bowlPlayer.bowling.wides  += 1; }
      if (extraType === "nb") { currentInning.extras.noBalls += extraRuns; bowlPlayer.bowling.noBalls += 1; }
      if (extraType === "b")  currentInning.extras.byes   += extraRuns;
      if (extraType === "lb") currentInning.extras.legByes += extraRuns;
    }

    // ── Batsman Updates ──
    if (extraType !== "wd") {
      batPlayer.batting.balls += 1;
    }
    batPlayer.batting.runs += runsToBatsman;
    if (runsToBatsman === 4) batPlayer.batting.fours += 1;
    if (runsToBatsman === 6) batPlayer.batting.sixes += 1;
    if (runsToBatsman === 0 && extraType !== "wd" && !ball.isWicket) batPlayer.batting.dotBalls += 1;

    if (batPlayer.batting.balls > 0) {
      batPlayer.batting.strikeRate = Number(((batPlayer.batting.runs / batPlayer.batting.balls) * 100).toFixed(2));
    }

    // ── Bowler Updates ──
    if (isLegalBall) bowlPlayer.bowling.legalBalls += 1;
    bowlPlayer.bowling.runs += runsToBowler;

    // ── Wicket Processing ──
    if (ball.isWicket) {
      currentInning.totalWickets += 1;

      const dismissedPlayer = battingTeam.players.find(p => p.name === (ball.dismissedBatsman || ball.batsman));
      if (dismissedPlayer) {
        dismissedPlayer.isOut        = true;
        dismissedPlayer.dismissalType = ball.dismissalType;
        dismissedPlayer.dismissedBy  = ball.bowler;
        dismissedPlayer.caughtBy     = ball.fielder || "";

        if (ball.dismissalType === "bowled")
          dismissedPlayer.dismissal = `b ${ball.bowler}`;
        else if (ball.dismissalType === "caught")
          dismissedPlayer.dismissal = `c ${ball.fielder || "Sub"} b ${ball.bowler}`;
        else if (ball.dismissalType === "lbw")
          dismissedPlayer.dismissal = `lbw b ${ball.bowler}`;
        else if (ball.dismissalType === "run out")
          dismissedPlayer.dismissal = `run out (${ball.fielder || "Sub"})`;
        else if (ball.dismissalType === "stumped")
          dismissedPlayer.dismissal = `st ${ball.fielder || "WK"} b ${ball.bowler}`;
        else
          dismissedPlayer.dismissal = ball.dismissalType;
      }

      // Fall of Wickets
      currentInning.fallOfWickets.push({
        wicketNumber:  currentInning.totalWickets,
        runs:          currentInning.totalRuns,
        balls:         currentInning.totalBalls,
        batsman:       ball.dismissedBatsman || ball.batsman,
        dismissalType: ball.dismissalType,
        bowler:        ball.bowler,
        over:          `${Math.floor(currentInning.totalBalls / 6)}.${currentInning.totalBalls % 6}`,
      });

      if (
        ball.dismissalType !== "run out" &&
        ball.dismissalType !== "retired hurt" &&
        ball.dismissalType !== "obstructing the field"
      ) {
        bowlPlayer.bowling.wickets += 1;
      }

      awaitingBatsman = true;
    } else {
      awaitingBatsman = false;
    }

    // ── Bowler Overs / Economy / Maiden tracking ──
    const oversCount  = Math.floor(bowlPlayer.bowling.legalBalls / 6);
    const ballsInOver = bowlPlayer.bowling.legalBalls % 6;
    bowlPlayer.bowling.overs = `${oversCount}.${ballsInOver}`;
    const oversEq = oversCount + ballsInOver / 6;
    if (oversEq > 0) {
      bowlPlayer.bowling.economy = Number((bowlPlayer.bowling.runs / oversEq).toFixed(2));
    }

    // ── Over Summary Tracking ──
    const overNum = ball.overNumber; // 0-indexed, stored on ball doc
    if (!overState[inningIndex]) overState[inningIndex] = {};
    if (!overState[inningIndex][overNum]) {
      overState[inningIndex][overNum] = {
        overNumber: overNum,
        bowler:     ball.bowler,
        balls:      [],
        totalRuns:  0,
        wickets:    0,
        extras:     0,
        runsNoBye:  0, // runs excluding byes/legbyes for maiden calculation
      };
    }
    const overEntry = overState[inningIndex][overNum];
    const label = getBallLabel(ball);
    overEntry.balls.push({
      ball:       ball.ballNumber,
      runs:       runsToBatsman,
      extras:     extraType !== "none" ? extraType : "",
      isWicket:   ball.isWicket,
      isBoundary: runsToBatsman === 4,
      isSix:      runsToBatsman === 6,
      label,
    });
    overEntry.totalRuns += totalRunsThisBall;
    if (ball.isWicket) overEntry.wickets += 1;
    if (extraType !== "none") overEntry.extras += extraRuns;

    // Maiden: all legal deliveries in over = 0 runs to bowler (excludes byes/lbyes but includes wides/nb)
    overEntry.runsNoBye += runsToBowler;

    // ── Check if over just completed (6 legal balls) ──
    // Maiden detection on previous complete over
    if (isLegalBall && currentInning.totalBalls % 6 === 0) {
      // Mark maiden for the over that just completed
      const justFinishedOver = overNum;
      if (overState[inningIndex][justFinishedOver]) {
        const completedOver = overState[inningIndex][justFinishedOver];
        const isActualMaiden = completedOver.runsNoBye === 0 && completedOver.extras === 0;
        completedOver.isMaiden = isActualMaiden;
        if (isActualMaiden) {
          // Increment maiden for the bowler of that over
          const maidenBowlerName = completedOver.bowler;
          const maidenBowler = bowlingTeam.players.find(p => p.name === maidenBowlerName);
          if (maidenBowler) maidenBowler.bowling.maidens += 1;
        }
      }

      // New over
      [striker, nonStriker] = [nonStriker, striker];
      bowler = "";
      awaitingBowler = true;
      match.previousBowler = ball.bowler;
    } else {
      bowler = ball.bowler;
      awaitingBowler = false;
    }

    // ── Partnership Tracking ──
    if (!partnershipState[inningIndex]) {
      partnershipState[inningIndex] = {
        batter1:     ball.batsman,
        batter2:     "",
        runs:        0,
        balls:       0,
        openingBall: 0,
      };
    }

    const ps = partnershipState[inningIndex];
    // Set batter2 if not set
    if (!ps.batter2 && nonStriker) {
      ps.batter2 = nonStriker;
    }

    // Accumulate partnership runs
    if (isLegalBall) ps.balls += 1;
    ps.runs += totalRunsThisBall;

    // Update current partnership on inning
    currentInning.currentPartnership = {
      batter1: ps.batter1,
      batter2: ps.batter2,
      runs:    ps.runs,
      balls:   ps.balls,
    };
    if (ps.runs > (currentInning.highestPartnership || 0)) {
      currentInning.highestPartnership = ps.runs;
    }

    // If wicket: save completed partnership and reset
    if (ball.isWicket) {
      currentInning.partnerships.push({
        wicketNumber: currentInning.totalWickets,
        batter1:      ps.batter1,
        batter2:      ps.batter2,
        runs:         ps.runs,
        balls:        ps.balls,
        openingBall:  ps.openingBall,
        closingBall:  currentInning.totalBalls,
      });
      // Reset for next partnership — new batsman will be set on next ball
      partnershipState[inningIndex] = {
        batter1:     "", // incoming batsman (set on next ball)
        batter2:     ball.isWicket ? (ball.batsman === ps.batter1 ? ps.batter2 : ps.batter1) : "",
        runs:        0,
        balls:       0,
        openingBall: currentInning.totalBalls,
      };
    }

    // ── Commentary ──
    const overDisplay = `${ball.overNumber}.${ball.ballNumber}`;
    const commentaryText = generateCommentaryText(ball);
    const commentEntry = {
      over:       overDisplay,
      overNumber: ball.overNumber,
      ballNumber: ball.ballNumber,
      batsman:    ball.batsman,
      bowler:     ball.bowler,
      runs:       runsToBatsman,
      extraType:  extraType !== "none" ? extraType : "",
      isWicket:   ball.isWicket,
      isBoundary: runsToBatsman === 4,
      isSix:      runsToBatsman === 6,
      text:       commentaryText,
      eventType:  getBallEventType(ball),
    };
    currentInning.commentary.push(commentEntry);
    // Trim to last COMMENTARY_LIMIT entries
    if (currentInning.commentary.length > COMMENTARY_LIMIT) {
      currentInning.commentary = currentInning.commentary.slice(-COMMENTARY_LIMIT);
    }

    // ── Strike Rotation ──
    striker    = ball.batsman;
    nonStriker = ball.batsman === match.currentStriker ? match.currentNonStriker : match.currentStriker;

    const runsForRotation = runs + (extraType === "b" || extraType === "lb" ? extraRuns : 0);
    if (runsForRotation % 2 !== 0 && !ball.isWicket) {
      [striker, nonStriker] = [nonStriker, striker];
    }

    // ── Innings End Check ──
    if (
      currentInning.totalWickets >= 10 ||
      currentInning.totalBalls >= match.oversLimit * 6
    ) {
      currentInning.isCompleted   = true;
      currentInning.completionReason =
        currentInning.totalWickets >= 10 ? "all_out" : "overs_complete";

      if (match.innings.length === 1 && match.currentInnings === 1) {
        match.status     = "innings_break";
        awaitingBatsman  = true;
        awaitingBowler   = true;
      } else if (match.currentInnings === 2) {
        match.status = "completed";
      }
    }

    // ── Target Logic (2nd innings) ──
    if (currentInningsNumber === 2 && match.innings.length >= 2) {
      const target = match.innings[0].totalRuns + 1;
      if (currentInning.totalRuns >= target) {
        currentInning.isCompleted      = true;
        currentInning.completionReason = "target_achieved";
        match.status                   = "completed";
      }
    }
  }

  // ── Flush over summaries to innings ──
  match.innings.forEach((inning, idx) => {
    if (overState[idx]) {
      inning.overSummaries = Object.values(overState[idx])
        .sort((a, b) => a.overNumber - b.overNumber)
        .map(({ runsNoBye, ...rest }) => rest); // strip temp field
    }
  });

  // ── Update match-level current players ──
  match.currentStriker    = striker;
  match.currentNonStriker = nonStriker;
  match.currentBowler     = bowler;
  match.awaitingBatsman   = awaitingBatsman;
  match.awaitingBowler    = awaitingBowler;
  match.currentInnings    = currentInningsNumber;

  // ── Compute Match Result ──
  if (match.status === "completed" && match.innings.length === 2) {
    const i1 = match.innings[0];
    const i2 = match.innings[1];

    if (i2.totalRuns > i1.totalRuns) {
      match.result = {
        winner:      i2.battingTeam,
        margin:      10 - i2.totalWickets,
        marginType:  "wickets",
        description: `${i2.battingTeam} won by ${10 - i2.totalWickets} wickets`,
      };
    } else if (i1.totalRuns > i2.totalRuns) {
      match.result = {
        winner:      i1.battingTeam,
        margin:      i1.totalRuns - i2.totalRuns,
        marginType:  "runs",
        description: `${i1.battingTeam} won by ${i1.totalRuns - i2.totalRuns} runs`,
      };
    } else {
      match.result = { winner: "tie", margin: 0, marginType: "", description: "Match Tied" };
    }
  }

  // ── Compute Match Summary ──
  const { buildMatchSummary } = require("./cricketStatsEngine");
  const summaryData = buildMatchSummary(match);
  match.summary = {
    topScorer:           summaryData.topScorer,
    topScorerRuns:       summaryData.topScorerRuns,
    topScorerBalls:      summaryData.topScorerBalls,
    bestBowler:          summaryData.bestBowler,
    bestBowlerFigures:   summaryData.bestBowlerFigures,
    totalSixes:          summaryData.totalSixes,
    totalFours:          summaryData.totalFours,
    totalExtras:         summaryData.totalExtras,
    highestPartnership:  summaryData.highestPartnership,
  };

  await match.save();
  return match;
}

// ─── Extract lean payload for Socket.IO viewers ───────────────────────────────
function buildMatchPayload(match, currentInning) {
  const totalBalls      = currentInning?.totalBalls || 0;
  const oversCompleted  = Math.floor(totalBalls / 6);
  const ballsInOver     = totalBalls % 6;
  const totalOversFloat = oversCompleted + ballsInOver / 10;

  const crr = totalBalls > 0
    ? Number(((currentInning.totalRuns / totalBalls) * 6).toFixed(2))
    : 0;

  const battingTeamObj = currentInning
    ? (match.teamA.name === currentInning.battingTeam ? match.teamA : match.teamB)
    : null;
  const bowlingTeamObj = currentInning
    ? (match.teamA.name === currentInning.bowlingTeam ? match.teamA : match.teamB)
    : null;

  const strikerPlayer    = battingTeamObj?.players?.find(p => p.name === match.currentStriker);
  const nonStrikerPlayer = battingTeamObj?.players?.find(p => p.name === match.currentNonStriker);
  const bowlerPlayer     = bowlingTeamObj?.players?.find(p => p.name === match.currentBowler);

  let target = null, requiredRuns = null, requiredBalls = null, rrr = null;
  if (match.currentInnings === 2 && match.innings.length >= 2) {
    target        = match.innings[0].totalRuns + 1;
    requiredRuns  = target - (currentInning?.totalRuns || 0);
    const totalAllowedBalls = match.oversLimit * 6;
    requiredBalls = totalAllowedBalls - totalBalls;
    rrr = requiredBalls > 0 ? Number(((requiredRuns / requiredBalls) * 6).toFixed(2)) : 0;
  }

  // Last 6 balls of the current over for live timeline
  const lastOver = (currentInning?.overSummaries || []).slice(-1)[0];
  const currentOverBalls = lastOver?.balls || [];

  return {
    matchId:         match._id,
    status:          match.status,
    currentInnings:  match.currentInnings,
    teamA: { name: match.teamA.name },
    teamB: { name: match.teamB.name },
    score: {
      runs:      currentInning?.totalRuns || 0,
      wickets:   currentInning?.totalWickets || 0,
      overs:     totalOversFloat,
      oversStr:  `${oversCompleted}.${ballsInOver}`,
      extras:    currentInning?.extras || {},
      crr,
    },
    batting: {
      striker:         match.currentStriker,
      nonStriker:      match.currentNonStriker,
      strikerStats:    strikerPlayer    ? strikerPlayer.batting    : null,
      nonStrikerStats: nonStrikerPlayer ? nonStrikerPlayer.batting : null,
    },
    bowling: {
      bowler:      match.currentBowler,
      bowlerStats: bowlerPlayer ? bowlerPlayer.bowling : null,
    },
    partnership: currentInning?.currentPartnership || {},
    currentOverBalls,
    flags: {
      awaitingBatsman: match.awaitingBatsman,
      awaitingBowler:  match.awaitingBowler,
    },
    result:        match.result,
    target,
    requiredRuns,
    requiredBalls,
    rrr,
  };
}

module.exports = { rebuildMatchState, buildMatchPayload };
