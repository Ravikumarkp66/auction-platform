/**
 * Fix Team Budgets Script
 * 
 * This script resets all team budgets to the base budget (₹10,000)
 * Use this when team budgets are incorrect
 */

const mongoose = require("mongoose");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");

require("dotenv").config();

async function fixTeamBudgets(tournamentId) {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.error("Tournament not found");
      process.exit(1);
    }
    console.log(`Fixing budgets for: ${tournament.name}`);
    console.log(`Base Budget: ₹${tournament.baseBudget}`);

    // Get all teams for this tournament
    const teams = await Team.find({ tournamentId });
    console.log(`\nTotal teams: ${teams.length}\n`);

    // Reset each team's budget to base budget
    for (const team of teams) {
      const oldBudget = team.remainingBudget;
      team.remainingBudget = tournament.baseBudget;
      await team.save();
      console.log(`${team.name}: ₹${oldBudget} → ₹${team.remainingBudget}`);
    }

    console.log("\n=== Team Budgets Fixed ===");
    console.log(`All teams now have ₹${tournament.baseBudget} budget`);

  } catch (err) {
    console.error("Error fixing team budgets:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Get tournament ID from command line
const tournamentId = process.argv[2];

if (!tournamentId) {
  console.log("Usage: node fixTeamBudgets.js <tournamentId>");
  console.log("Example: node fixTeamBudgets.js 65abc123def456");
  process.exit(1);
}

fixTeamBudgets(tournamentId);
