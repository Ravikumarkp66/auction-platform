/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              AUCTION RULE ENGINE  – ruleEngine.js            ║
 * ║                                                              ║
 * ║  Pure, stateless functions.  No DB calls.  No side-effects. ║
 * ║  Every function accepts (config, context) and returns a      ║
 * ║  result object { ok, reason }.                               ║
 * ║                                                              ║
 * ║  IF config is null / undefined / empty  → treat as           ║
 * ║  "no rules" and return ok:true everywhere.                   ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

"use strict";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if the config activates the rule engine (points mode). */
const isRuleEngineActive = (config) =>
  config && config.budget && config.budget.type === "points";

/** Safe nested get — returns undefined rather than throwing. */
const get = (obj, path, fallback = undefined) => {
  try {
    return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj) ?? fallback;
  } catch {
    return fallback;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. BUDGET ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates effective team budget after applying retention costs.
 *
 * @param {object} config  – TournamentRules.config
 * @param {object} team    – { remainingBudget, retainedPlayers: [{cost?}] }
 * @returns {number}       – effective spendable budget
 */
const getEffectiveBudget = (config, team) => {
  if (!isRuleEngineActive(config)) return team.remainingBudget ?? 0;

  const retention = get(config, "retention");
  if (!retention || !retention.enabled) return team.remainingBudget ?? 0;

  const retainedCount = Array.isArray(team.retainedPlayers)
    ? team.retainedPlayers.length
    : (team.retainedCount || 0);

  const costPerPlayer = retention.costPerPlayer ?? 0;
  const totalRetentionCost = retainedCount * costPerPlayer;
  return Math.max(0, (team.remainingBudget ?? 0) - totalRetentionCost);
};

/**
 * Validates that a bid amount is within the team's remaining budget.
 *
 * @param {object} config
 * @param {object} ctx    – { bidAmount, teamRemainingBudget, retainedPlayers }
 * @returns {{ ok: boolean, reason?: string }}
 */
const validateBudget = (config, ctx) => {
  // For money-based auctions the frontend already handles this — always allow.
  if (!isRuleEngineActive(config)) return { ok: true };

  const effective = getEffectiveBudget(config, {
    remainingBudget: ctx.teamRemainingBudget,
    retainedPlayers: ctx.retainedPlayers,
    retainedCount: ctx.retainedCount,
  });

  if (ctx.bidAmount > effective) {
    return {
      ok: false,
      reason: `Bid of ${ctx.bidAmount} pts exceeds available budget of ${effective} pts`,
    };
  }
  return { ok: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. BASE PRICE ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise role strings to config keys */
const ROLE_KEY_MAP = {
  batsman: "batsman",
  batter: "batsman",
  batting: "batsman",
  bowler: "bowler",
  bowling: "bowler",
  "all-rounder": "allRounder",
  allrounder: "allRounder",
  "all rounder": "allRounder",
  ar: "allRounder",
  "wicket keeper": "wicketKeeper",
  wicketkeeper: "wicketKeeper",
  wk: "wicketKeeper",
  keeper: "wicketKeeper",
  "wk-batsman": "wkBatsman",
  "wk batsman": "wkBatsman",
};

const roleToKey = (role) => {
  const k = (role || "").toLowerCase().trim();
  return ROLE_KEY_MAP[k] || "allRounder";
};

/**
 * Returns the base price for a player given their role and config.
 * Falls back to player.basePrice (existing field) when rules aren't active.
 *
 * @param {object} config
 * @param {object} player  – { role, basePrice }
 * @returns {number}
 */
const getBasePrice = (config, player) => {
  if (!isRuleEngineActive(config)) return player.basePrice ?? 0;

  const bp = get(config, "basePrice");
  if (!bp) return player.basePrice ?? 0;

  const key = roleToKey(player.role);
  return bp[key] ?? bp.allRounder ?? player.basePrice ?? 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. INCREMENT ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the bid increment step for a given current bid amount.
 *
 * Example config.increments:
 *   [{ min: 0, max: 10, step: 1 }, { min: 10, max: 20, step: 2 }, ...]
 *
 * @param {object} config
 * @param {number} currentBid
 * @returns {number}  increment step (defaults to 1)
 */
const getIncrementStep = (config, currentBid) => {
  if (!isRuleEngineActive(config)) return 1; // existing behaviour

  const increments = get(config, "increments");
  if (!Array.isArray(increments) || increments.length === 0) return 1;

  for (const band of increments) {
    const min = band.min ?? 0;
    const max = band.max; // null means no upper bound
    if (currentBid >= min && (max === null || max === undefined || currentBid < max)) {
      return band.step ?? 1;
    }
  }

  // Fallback: use the last band's step
  return increments[increments.length - 1].step ?? 1;
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. SQUAD SIZE VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Checks whether a team can still accept one more player.
 *
 * @param {object} config
 * @param {object} ctx  – { currentPlayerCount }
 * @returns {{ ok: boolean, reason?: string }}
 */
const validateSquadMax = (config, ctx) => {
  if (!isRuleEngineActive(config)) return { ok: true };

  const maxPlayers = get(config, "squad.maxPlayers");
  if (maxPlayers == null) return { ok: true };

  if ((ctx.currentPlayerCount ?? 0) >= maxPlayers) {
    return {
      ok: false,
      reason: `Squad full — maximum ${maxPlayers} players per team`,
    };
  }
  return { ok: true };
};

/**
 * Checks whether a team's current squad meets the minimum at close of auction.
 *
 * @param {object} config
 * @param {object} ctx  – { currentPlayerCount }
 * @returns {{ ok: boolean, reason?: string, warn?: boolean }}
 */
const validateSquadMin = (config, ctx) => {
  if (!isRuleEngineActive(config)) return { ok: true };

  const minPlayers = get(config, "squad.minPlayers");
  if (minPlayers == null) return { ok: true };

  if ((ctx.currentPlayerCount ?? 0) < minPlayers) {
    return {
      ok: false,
      warn: true,
      reason: `Team has ${ctx.currentPlayerCount} players — minimum ${minPlayers} required`,
    };
  }
  return { ok: true };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. CATEGORY (YEAR-WISE) CONSTRAINT ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validates that adding a player of category `category` to a team
 * does not exceed the max for that category.
 *
 * @param {object} config
 * @param {object} ctx  – { category: "year1"|"year2"|..., categoryCount: number }
 * @returns {{ ok: boolean, reason?: string }}
 */
const validateCategoryMax = (config, ctx) => {
  if (!isRuleEngineActive(config)) return { ok: true };

  const constraints = get(config, `categoryConstraints.${ctx.category}`);
  if (!constraints || constraints.max == null) return { ok: true };

  if ((ctx.categoryCount ?? 0) >= constraints.max) {
    return {
      ok: false,
      reason: `Category ${ctx.category} is full — max ${constraints.max} players`,
    };
  }
  return { ok: true };
};

/**
 * Checks that category minimums can still be satisfied at end of auction.
 * Returns a list of warnings/violations.
 *
 * @param {object} config
 * @param {object} teamCategoryCounts  – { year1: n, year2: n, ... }
 * @returns {Array<{ ok: boolean, category: string, reason: string }>}
 */
const validateCategoryMins = (config, teamCategoryCounts) => {
  if (!isRuleEngineActive(config)) return [];

  const constraints = get(config, "categoryConstraints", {});
  const results = [];

  for (const [cat, rule] of Object.entries(constraints)) {
    if (rule.min == null) continue;
    const current = teamCategoryCounts[cat] ?? 0;
    if (current < rule.min) {
      results.push({
        ok: false,
        category: cat,
        reason: `${cat}: needs at least ${rule.min} players, has ${current}`,
      });
    }
  }

  return results;
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. SPECIAL ADJUSTMENTS (Captain / Vice-captain / Retained)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies special role adjustments (captain/vice-captain/retention) to the
 * effective category constraints for a team.
 *
 * Returns a COPY of categoryConstraints with adjusted maxes — does NOT mutate.
 *
 * @param {object} config
 * @param {object} ctx
 *   - captainCategory:     "year1" | null
 *   - viceCaptainCategory: "year1" | null
 *   - retainedCategories:  ["year1", "year2", ...]  (one entry per retained player)
 * @returns {object}  adjusted category constraints
 */
const applySpecialAdjustments = (config, ctx) => {
  if (!isRuleEngineActive(config)) return {};

  const adj = get(config, "specialAdjustments", {});
  const constraints = get(config, "categoryConstraints", {});

  // Deep clone
  const adjusted = JSON.parse(JSON.stringify(constraints));

  const decrement = (cat) => {
    if (!cat || !adjusted[cat]) return;
    if (adjusted[cat].max != null) adjusted[cat].max = Math.max(0, adjusted[cat].max - 1);
  };

  if (adj.captainReducesMax && ctx.captainCategory)        decrement(ctx.captainCategory);
  if (adj.viceCaptainReducesMax && ctx.viceCaptainCategory) decrement(ctx.viceCaptainCategory);

  if (adj.retainedPlayerReducesMax && Array.isArray(ctx.retainedCategories)) {
    ctx.retainedCategories.forEach(decrement);
  }

  return adjusted;
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. ROUND ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the current round definition (name + category filter).
 *
 * @param {object} config
 * @param {number} roundIndex  – 0-based
 * @returns {{ name: string, category: string|null }|null}
 */
const getCurrentRound = (config, roundIndex) => {
  if (!isRuleEngineActive(config)) return null;

  const rounds = get(config, "rounds");
  if (!Array.isArray(rounds) || rounds.length === 0) return null;

  return rounds[roundIndex] ?? null;
};

/**
 * Filters a player list to only those belonging to the current round's category.
 * If no round config exists → returns original list (no filtering).
 *
 * @param {object} config
 * @param {number} roundIndex
 * @param {Array}  players   – array of player objects with a `category` field
 * @returns {Array}
 */
const filterPlayersForRound = (config, roundIndex, players) => {
  const round = getCurrentRound(config, roundIndex);
  if (!round || !round.category) return players;

  return players.filter((p) => p.category === round.category);
};

/**
 * Returns total number of rounds.
 *
 * @param {object} config
 * @returns {number}
 */
const getTotalRounds = (config) => {
  if (!isRuleEngineActive(config)) return 1;
  const rounds = get(config, "rounds");
  return Array.isArray(rounds) && rounds.length > 0 ? rounds.length : 1;
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. COMPOSITE BID VALIDATOR
//    Call this before confirming any bid purchase.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs ALL validation checks before confirming a player purchase.
 *
 * @param {object} config
 * @param {object} ctx
 *   - bidAmount:            number
 *   - teamRemainingBudget:  number
 *   - retainedPlayers:      array (or retainedCount: number)
 *   - retainedCount:        number
 *   - currentPlayerCount:   number  (squad size before this purchase)
 *   - player:               { role, basePrice, category }
 *   - category:             string  (player's category, e.g. "year1")
 *   - categoryCount:        number  (team's current count in that category)
 *
 * @returns {{ ok: boolean, errors: string[] }}
 */
const validateBid = (config, ctx) => {
  if (!isRuleEngineActive(config)) return { ok: true, errors: [] };

  const errors = [];

  const budgetCheck = validateBudget(config, ctx);
  if (!budgetCheck.ok) errors.push(budgetCheck.reason);

  const squadCheck = validateSquadMax(config, { currentPlayerCount: ctx.currentPlayerCount });
  if (!squadCheck.ok) errors.push(squadCheck.reason);

  if (ctx.category) {
    const catCheck = validateCategoryMax(config, {
      category: ctx.category,
      categoryCount: ctx.categoryCount ?? 0,
    });
    if (!catCheck.ok) errors.push(catCheck.reason);
  }

  return { ok: errors.length === 0, errors };
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. SANITY CHECK — detect impossible configurations before auction starts
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects impossible rule configurations (min > max etc.).
 * Returns an array of warning strings. Empty array == all clear.
 *
 * @param {object} config
 * @returns {string[]}
 */
const detectConfigIssues = (config) => {
  if (!isRuleEngineActive(config)) return [];

  const issues = [];

  // Squad min vs max
  const sqMin = get(config, "squad.minPlayers", 0);
  const sqMax = get(config, "squad.maxPlayers", Infinity);
  if (sqMin > sqMax) issues.push(`squad.minPlayers (${sqMin}) > squad.maxPlayers (${sqMax})`);

  // Budget vs min squad cost
  const totalBudget = get(config, "budget.total", 0);
  const retention   = get(config, "retention");
  const retainedCost = retention?.enabled
    ? (retention.maxPlayers ?? 0) * (retention.costPerPlayer ?? 0)
    : 0;
  const bpConfig = get(config, "basePrice", {});
  const lowestBP = Object.values(bpConfig).length > 0
    ? Math.min(...Object.values(bpConfig))
    : 0;
  const minCost = retainedCost + sqMin * lowestBP;
  if (minCost > totalBudget) {
    issues.push(
      `Budget (${totalBudget}) may be insufficient for minimum squad ` +
      `(${sqMin} × ${lowestBP} + ${retainedCost} retention = ${minCost})`
    );
  }

  // Category constraints: sum of maxes must cover squad min
  const constraints = get(config, "categoryConstraints", {});
  const totalMaxes = Object.values(constraints).reduce(
    (s, c) => s + (c.max ?? Infinity),
    0
  );
  if (isFinite(totalMaxes) && totalMaxes < sqMin) {
    issues.push(
      `Sum of category maxes (${totalMaxes}) < squad.minPlayers (${sqMin}) — ` +
      "impossible to fill minimum squad"
    );
  }

  return issues;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
module.exports = {
  isRuleEngineActive,
  getEffectiveBudget,
  validateBudget,
  getBasePrice,
  getIncrementStep,
  validateSquadMax,
  validateSquadMin,
  validateCategoryMax,
  validateCategoryMins,
  applySpecialAdjustments,
  getCurrentRound,
  filterPlayersForRound,
  getTotalRounds,
  validateBid,
  detectConfigIssues,
};
