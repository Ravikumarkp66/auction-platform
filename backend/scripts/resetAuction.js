/**
 * Reset Auction Script
 * 
 * This script resets the auction while keeping icon players assigned to teams.
 * - Icon players (isIcon: true) remain with their teams (status: "sold", soldPrice: 0)
 * - All other players are reset to auction pool (status: "available", soldPrice: 0, team: null)
 * - Team budgets are reset to base budget minus icon player costs (which is 0)
 */

const mongoose = require("mongoose");
const Player = require("../models/Player");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");

require("dotenv").config();

async function resetAuction(tournamentId) {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get tournament details
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      console.error("Tournament not found");
      process.exit(1);
    }
    console.log(`Resetting auction for: ${tournament.name}`);

    // Get all players for this tournament
    const players = await Player.find({ tournamentId });
    console.log(`Total players: ${players.length}`);

    // Get all teams for this tournament
    const teams = await Team.find({ tournamentId });
    console.log(`Total teams: ${teams.length}`);

    // Reset each player
    let iconPlayersCount = 0;
    let auctionPlayersCount = 0;

    for (const player of players) {
      if (player.isIcon) {
        // Keep icon players as is (already assigned to teams)
        iconPlayersCount++;
        console.log(`Keeping icon player: ${player.name} -> ${player.team}`);
      } else {
        // Reset auction players
        player.status = "available";
        player.soldPrice = 0;
        player.team = null;
        await player.save();
        auctionPlayersCount++;
        console.log(`Reset auction player: ${player.name}`);
      }
    }

    // Reset team budgets to base budget
    for (const team of teams) {
      team.remainingBudget = tournament.baseBudget;
      await team.save();
      console.log(`Reset budget for ${team.name}: ₹${team.remainingBudget}`);
    }

    console.log("\n=== Auction Reset Complete ===");
    console.log(`Icon players (retained): ${iconPlayersCount}`);
    console.log(`Auction players (reset): ${auctionPlayersCount}`);
    console.log(`Total: ${iconPlayersCount + auctionPlayersCount}`);
    console.log("\nYou can now start the auction from the first player!");

  } catch (err) {
    console.error("Error resetting auction:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Get tournament ID from command line
const tournamentId = process.argv[2];

if (!tournamentId) {
  console.log("Usage: node resetAuction.js <tournamentId>");
  console.log("Example: node resetAuction.js 65abc123def456");
  process.exit(1);
}

resetAuction(tournamentId);
