const mongoose = require("mongoose");

/**
 * TournamentRules — future rule-engine config per tournament.
 *
 * ⚠️  DO NOT enforce any rules yet.
 * The `config` field is a free-form JSON blob that will be populated
 * by the rule engine in a later phase (retention logic, increment steps,
 * category constraints, round-based auction, etc.).
 *
 * The system works perfectly fine even if no document exists for a
 * given tournament — callers must always treat a missing document as
 * "no rules defined → apply defaults".
 */
const tournamentRulesSchema = new mongoose.Schema(
  {
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
      unique: true,   // one rules doc per tournament
      index: true,
    },
    /**
     * Free-form JSON config for future rule engine.
     * Examples (NOT enforced yet):
     *   { retention: { maxPlayers: 5 }, increments: [100, 200, 500] }
     */
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("TournamentRules", tournamentRulesSchema);
