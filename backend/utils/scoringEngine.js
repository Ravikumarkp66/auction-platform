/**
 * scoringEngine.js
 * Advanced Cricket Scoring Logic
 * Pure logic for processing a ball event and updating match state.
 */

function addBall(match, event) {
  const inningsIndex = match.currentInnings - 1;
  const innings = match.innings[inningsIndex];

  let isLegalBall = true;
  let runValue = Number(event.runs) || 0;
  let extraValue = Number(event.extras) || 0;

  // Track state before modifying for easy undo
  const previousStriker = innings.striker;
  const previousNonStriker = innings.nonStriker;

  // Determine legality and automatic penalty runs
  if (event.type === "wide" || event.type === "no-ball") {
    isLegalBall = false;
    extraValue += 1; // Standard 1 run penalty
  }

  // Update total runs
  innings.totalRuns += runValue + extraValue;

  // Handle wickets
  if (event.type === "wicket" || event.wicketType) {
    innings.wickets += 1;
  }

  // Handle legal balls
  if (isLegalBall) {
    innings.legalBalls = (innings.legalBalls || 0) + 1;
  }

  // Calculate over and ball numbers
  const completeOvers = Math.floor((innings.legalBalls || 0) / 6);
  const ballsInCurrentOver = (innings.legalBalls || 0) % 6;

  // Record the ball
  innings.ballsData.push({
    ...event,
    over: completeOvers,
    ball: isLegalBall ? ballsInCurrentOver || 6 : null, // 6 instead of 0 if over just ended
    runs: runValue,
    extras: extraValue,
    previousStriker,
    previousNonStriker,
    timestamp: new Date()
  });

  // ── Strike Rotation Logic ──
  
  // Batsmen physically cross the pitch on: runs off bat, byes, leg-byes, and wides (if they stole a run)
  let runsRan = runValue + (["bye", "leg-bye"].includes(event.type) ? extraValue : 0) + (event.type === "wide" ? extraValue - 1 : 0);

  // If run out, the strike change depends on whether they crossed.
  // For simplicity, we assume they didn't cross on a run-out unless explicitly sent by UI.
  if (runsRan % 2 === 1 && event.wicketType !== "run-out") {
    [innings.striker, innings.nonStriker] = [innings.nonStriker, innings.striker];
  }

  // Over complete? Rotate strike
  if (isLegalBall && ballsInCurrentOver === 0 && completeOvers > 0) {
    [innings.striker, innings.nonStriker] = [innings.nonStriker, innings.striker];
  }

  // ── Match State Evaluation ──

  // Is the innings over?
  const allOut = innings.wickets >= 10; // Might vary if squad is smaller
  const oversDone = completeOvers >= match.totalOvers;

  if (allOut || oversDone) {
    if (match.currentInnings === 1) {
      // Setup second innings
      match.currentInnings = 2;
      match.innings.push({
        battingTeam: innings.bowlingTeam,
        bowlingTeam: innings.battingTeam,
        totalRuns: 0,
        wickets: 0,
        legalBalls: 0,
        ballsData: []
      });
    } else {
      // Match Over!
      match.status = "completed";
      const target = match.innings[0].totalRuns + 1;
      
      if (innings.totalRuns >= target) {
         match.result = `${match.innings[1].battingTeam} won by ${10 - innings.wickets} wickets`;
      } else if (innings.totalRuns < target - 1) {
         match.result = `${match.innings[0].battingTeam} won by ${target - 1 - innings.totalRuns} runs`;
      } else {
         match.result = "Match Tied!";
      }
    }
  } else if (match.currentInnings === 2) {
    // Check if chasing team chased down the target mid-over
    const target = match.innings[0].totalRuns + 1;
    if (innings.totalRuns >= target) {
      match.status = "completed";
      match.result = `${innings.battingTeam} won by ${10 - innings.wickets} wickets`;
    }
  }

  return match;
}

/**
 * Reverts the last ball in case of a scoring mistake.
 */
function undoLastBall(match) {
  const inningsIndex = match.currentInnings - 1;
  const innings = match.innings[inningsIndex];

  if (innings.ballsData.length === 0) {
    // If we're at ball 0 of innings 2, we must revert back to innings 1
    if (match.currentInnings === 2) {
      match.currentInnings = 1;
      match.status = "live";
      match.result = null;
      match.innings.pop(); // Delete the empty 2nd innings
      // Fall down to undo the last ball of the 1st innings
    } else {
      return match; // At very beginning, nothing to undo
    }
  }

  const currentInnings = match.innings[match.currentInnings - 1];
  const lastBall = currentInnings.ballsData.pop();

  if (!lastBall) return match;

  // 1. Revert Runs
  currentInnings.totalRuns -= (lastBall.runs + lastBall.extras);

  // 2. Revert Wicket
  if (lastBall.type === "wicket" || lastBall.wicketType) {
    currentInnings.wickets -= 1;
  }

  // 3. Revert Balls
  let isLegalBall = !["wide", "no-ball"].includes(lastBall.type);
  if (isLegalBall) {
    currentInnings.legalBalls -= 1;
  }

  // 4. Restore Strike
  currentInnings.striker = lastBall.previousStriker;
  currentInnings.nonStriker = lastBall.previousNonStriker;
  
  // 5. Restore Match State (if it was completed)
  match.status = "live"; 
  match.result = null;

  return match;
}

module.exports = {
  addBall,
  undoLastBall
};
