const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const Tournament = require("./models/Tournament");
const Team = require("./models/Team");
const Player = require("./models/Player");

async function fixIconPlayersTeamAssignment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("✅ Connected to MongoDB");

    // Get the active tournament
    const tournament = await Tournament.findOne({ status: "active" });
    if (!tournament) {
      console.error("❌ No active tournament found");
      return;
    }

    console.log(`📊 Processing tournament: ${tournament.name}`);
    console.log(`   Tournament ID: ${tournament._id}`);

    // Get all teams for this tournament
    const teams = await Team.find({ tournamentId: tournament._id });
    console.log(`📋 Found ${teams.length} teams`);

    // Create team name to ID map
    const teamMap = {};
    teams.forEach(team => {
      teamMap[team.name.toLowerCase().trim()] = team._id;
    });

    // Get all icon players without team assignment
    const iconPlayers = await Player.find({ 
      tournamentId: tournament._id, 
      isIcon: true,
      team: null 
    });

    console.log(`🎯 Found ${iconPlayers.length} icon players without team assignment`);

    let updatedCount = 0;
    let notFoundCount = 0;

    // Update each icon player
    for (const player of iconPlayers) {
      const teamName = player.teamName?.toLowerCase().trim();
      
      if (!teamName) {
        console.warn(`⚠️  Player "${player.name}" has no teamName field`);
        notFoundCount++;
        continue;
      }

      const teamId = teamMap[teamName];
      
      if (!teamId) {
        console.warn(`⚠️  Team "${teamName}" not found for player "${player.name}"`);
        notFoundCount++;
        continue;
      }

      // Update player with team
      await Player.findByIdAndUpdate(player._id, {
        team: teamId,
        status: "sold",
        soldPrice: player.iconRole === "retained" ? 50 : 0
      });

      // Increment team player count
      await Team.findByIdAndUpdate(teamId, {
        $inc: { playerCount: 1 }
      });

      updatedCount++;
      console.log(`✅ Updated: ${player.name} (${player.iconRole}) → ${teamName}`);
    }

    console.log("\n===========================================");
    console.log("📊 SUMMARY");
    console.log("===========================================");
    console.log(`✅ Successfully updated: ${updatedCount} players`);
    console.log(`⚠️  Could not update: ${notFoundCount} players`);
    console.log(`📈 Total processed: ${iconPlayers.length} players`);
    console.log("===========================================\n");

    if (updatedCount > 0) {
      console.log("🎉 Icon players now have proper team assignments!");
      console.log("👉 You can now view them in the squad view UI\n");
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run the fix
fixIconPlayersTeamAssignment();
