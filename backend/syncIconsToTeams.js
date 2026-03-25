const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Team = require("./models/Team");
const Player = require("./models/Player");

async function syncIconsToTeams() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find BROWSE 2026 tournament
    const tournament = await Tournament.findOne({ 
      name: { $regex: /browse/i },
      status: "active"
    });
    
    if (!tournament) {
      console.error("❌ No active tournament found");
      return;
    }

    console.log(`📊 Tournament: ${tournament.name}`);
    console.log(`   ID: ${tournament._id}\n`);

    // Get all teams for this tournament
    const teams = await Team.find({ tournamentId: tournament._id });
    console.log(`📋 Found ${teams.length} teams\n`);

    let totalUpdated = 0;

    // Process each team
    for (const team of teams) {
      console.log(`🏏 Processing: ${team.name}`);
      
      // Find icon players with matching teamName
      const iconPlayers = await Player.find({
        tournamentId: tournament._id,
        isIcon: true,
        teamName: { $regex: new RegExp(`^${team.name}$`, 'i') }, // Case-insensitive exact match
        team: null // Only process players not yet assigned to a team
      });

      console.log(`   ⭐ Found ${iconPlayers.length} icon players with teamName="${team.name}"`);

      if (iconPlayers.length === 0) {
        console.log(`   ℹ️  No unassigned icon players for this team\n`);
        continue;
      }

      // Assign each player to this team
      for (const player of iconPlayers) {
        await Player.findByIdAndUpdate(player._id, {
          team: team._id,
          status: "sold",
          soldPrice: player.iconRole === "retained" ? 50 : 0
        });

        console.log(`   ✅ ${player.name} (${player.iconRole || 'icon'}) → ${team.name}`);
        
        totalUpdated++;
      }

      // Update team's player count
      await Team.findByIdAndUpdate(team._id, {
        $inc: { playerCount: iconPlayers.length }
      });

      console.log(`   📈 Team player count incremented by ${iconPlayers.length}\n`);
    }

    console.log("===========================================");
    console.log("📊 SUMMARY");
    console.log("===========================================");
    console.log(`✅ Successfully assigned: ${totalUpdated} icon players`);
    console.log(`📋 Teams processed: ${teams.length}`);
    console.log("===========================================\n");

    if (totalUpdated > 0) {
      console.log("🎉 All icon players with teamName are now assigned to their teams!");
      console.log("👉 Check the squad view to verify the icons appear correctly\n");
    } else {
      console.log("ℹ️  No unassigned icon players found with teamName");
      console.log("👉 All icon players may already be assigned, or teamName doesn't match any team");
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

syncIconsToTeams();
