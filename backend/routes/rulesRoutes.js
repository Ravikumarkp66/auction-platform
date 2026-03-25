/**
 * Rules API — CRUD for TournamentRules.config
 *
 * Endpoints:
 *   GET  /api/rules/:tournamentId          → fetch config (+ engine analysis)
 *   PUT  /api/rules/:tournamentId          → upsert full config
 *   PATCH /api/rules/:tournamentId         → merge-patch partial config
 *   POST /api/rules/:tournamentId/validate → validate a bid against the rule engine
 *   GET  /api/rules/:tournamentId/analysis → sanity-check config & return issues
 */

"use strict";

const express = require("express");
const router  = express.Router();
const TournamentRules = require("../models/TournamentRules");
const Tournament      = require("../models/Tournament");
const Team            = require("../models/Team");
const Player          = require("../models/Player");
const engine          = require("../utils/ruleEngine");

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rules/:tournamentId
//   Returns rules config plus metadata about the tournament.
//   If no rules document exists → returns empty config (not 404).
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:tournamentId", async (req, res) => {
  try {
    const { tournamentId } = req.params;

    // Fetch the rules doc (may not exist for old tournaments)
    const rulesDoc = await TournamentRules.findOne({ tournamentId }).lean();

    // Fetch tournament so the frontend can show context
    const tournament = await Tournament.findById(tournamentId)
      .select("name auctionMode baseBudget squadSize squad budget")
      .lean();

    if (!tournament) {
      return res.status(404).json({ message: "Tournament not found" });
    }

    const config = rulesDoc?.config ?? {};

    // Run sanity analysis
    const issues = engine.detectConfigIssues(config);

    res.json({
      tournamentId,
      tournamentName: tournament.name,
      auctionMode: tournament.auctionMode ?? "money",
      config,
      issues,
      ruleEngineActive: engine.isRuleEngineActive(config),
      _id: rulesDoc?._id ?? null,
    });
  } catch (err) {
    console.error("[RULES GET]", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/rules/:tournamentId
//   Replace the full config object.
// ─────────────────────────────────────────────────────────────────────────────
router.put("/:tournamentId", async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { config } = req.body;

    if (!config || typeof config !== "object") {
      return res.status(400).json({ message: "config must be an object" });
    }

    // Sanity check before saving
    const issues = engine.detectConfigIssues(config);

    const rulesDoc = await TournamentRules.findOneAndUpdate(
      { tournamentId },
      { $set: { config } },
      { new: true, upsert: true }
    );

    res.json({
      message: "Rules saved",
      config: rulesDoc.config,
      issues, // Return warnings (not errors — let the admin decide)
    });
  } catch (err) {
    console.error("[RULES PUT]", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/rules/:tournamentId
//   Deep-merge a partial config — useful for updating individual sections.
//   e.g. PATCH { retention: { enabled: true } } leaves all other keys intact.
// ─────────────────────────────────────────────────────────────────────────────
router.patch("/:tournamentId", async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const partial = req.body.config ?? req.body; // accept both shapes

    if (!partial || typeof partial !== "object") {
      return res.status(400).json({ message: "config patch must be an object" });
    }

    // Fetch existing config
    const existing = await TournamentRules.findOne({ tournamentId }).lean();
    const baseConfig = existing?.config ?? {};

    // Shallow-merge at top level (callers may send nested objects per section)
    const merged = { ...baseConfig };
    for (const [key, val] of Object.entries(partial)) {
      if (val && typeof val === "object" && !Array.isArray(val)) {
        merged[key] = { ...(baseConfig[key] ?? {}), ...val };
      } else {
        merged[key] = val;
      }
    }

    const issues = engine.detectConfigIssues(merged);

    const rulesDoc = await TournamentRules.findOneAndUpdate(
      { tournamentId },
      { $set: { config: merged } },
      { new: true, upsert: true }
    );

    res.json({ message: "Rules patched", config: rulesDoc.config, issues });
  } catch (err) {
    console.error("[RULES PATCH]", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/rules/:tournamentId/validate-bid
//   Validates a bid in real-time against all active rules.
//   Request body:
//     { teamId, bidAmount, player: { role, category } }
//   Response:
//     { ok, errors[], basePrice, incrementStep }
// ─────────────────────────────────────────────────────────────────────────────
router.post("/:tournamentId/validate-bid", async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { teamId, bidAmount, player: playerCtx = {} } = req.body;

    // Load rules (graceful if missing)
    const rulesDoc = await TournamentRules.findOne({ tournamentId }).lean();
    const config   = rulesDoc?.config ?? {};

    // If rule engine is not active → everything is allowed
    if (!engine.isRuleEngineActive(config)) {
      return res.json({
        ok: true,
        errors: [],
        basePrice: playerCtx.basePrice ?? 0,
        incrementStep: 1,
        ruleEngineActive: false,
      });
    }

    // Fetch live team data
    const team = await Team.findById(teamId).lean();
    if (!team) return res.status(404).json({ message: "Team not found" });

    // Fetch current squad for this team
    const squad = await Player.find({ team: teamId, tournamentId }).lean();

    // Category count for the player's category
    const category     = playerCtx.category;
    const categoryCount = category
      ? squad.filter((p) => p.category === category).length
      : 0;

    const ctx = {
      bidAmount,
      teamRemainingBudget: team.remainingBudget,
      retainedCount: team.retainedCount ?? 0,
      retainedPlayers: team.retainedPlayers ?? [],
      currentPlayerCount: squad.length,
      category,
      categoryCount,
      player: playerCtx,
    };

    const result       = engine.validateBid(config, ctx);
    const incrementStep = engine.getIncrementStep(config, bidAmount);
    const basePrice    = engine.getBasePrice(config, playerCtx);

    res.json({
      ok: result.ok,
      errors: result.errors,
      basePrice,
      incrementStep,
      effectiveBudget: engine.getEffectiveBudget(config, {
        remainingBudget: team.remainingBudget,
        retainedCount: team.retainedCount ?? 0,
      }),
      ruleEngineActive: true,
    });
  } catch (err) {
    console.error("[RULES VALIDATE-BID]", err.message);
    res.status(500).json({ message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/rules/:tournamentId/analysis
//   Run sanity checks + return rich metadata for the admin's rules panel.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:tournamentId/analysis", async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const rulesDoc = await TournamentRules.findOne({ tournamentId }).lean();
    const config   = rulesDoc?.config ?? {};

    const issues        = engine.detectConfigIssues(config);
    const totalRounds   = engine.getTotalRounds(config);
    const ruleEngineActive = engine.isRuleEngineActive(config);

    res.json({ config, issues, totalRounds, ruleEngineActive });
  } catch (err) {
    console.error("[RULES ANALYSIS]", err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
