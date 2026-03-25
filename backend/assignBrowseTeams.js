const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Team = require("./models/Team");
const Player = require("./models/Player");

async function assignBrowseTeams() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find BROWSE 2026 tournament
    const tournament = await Tournament.findOne({ 
      name: { $regex: /browse/i },
      status: "active"
    });
    
    if (!tournament) {
      console.error("❌ Browse 2026 tournament not found");
      return;
    }

    console.log(`📊 Tournament: ${tournament.name}`);
    console.log(`   ID: ${tournament._id}\n`);

    // Get all teams for this tournament
    const teams = await Team.find({ tournamentId: tournament._id });
    console.log(`📋 Found ${teams.length} teams:`);
    
    const teamMap = {};
    teams.forEach(t => {
      const normalizedName = t.name.toLowerCase().trim();
      teamMap[normalizedName] = t._id;
      console.log(`   • ${t.name} (${t.shortName})`);
    });
    console.log();

    // Get all icon players without team
    const iconPlayers = await Player.find({ 
      tournamentId: tournament._id, 
      isIcon: true,
      team: null 
    });

    console.log(`⭐ Found ${iconPlayers.length} icon players without team\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Group players by their position in the list (every 3 = same team)
    // Assuming CSV was: Team | Captain | VC | Retained pattern
    for (let i = 0; i < iconPlayers.length; i += 3) {
      const captain = iconPlayers[i];
      const vc = iconPlayers[i + 1];
      const retained = iconPlayers[i + 2];

      if (!captain || !vc) continue;

      // Try to determine team from player's teamName field or position
      let teamName = "";
      
      // Check if any of them has teamName
      if (captain.teamName) teamName = captain.teamName;
      else if (vc?.teamName) teamName = vc.teamName;
      else if (retained?.teamName) teamName = retained.teamName;
      
      if (!teamName) {
        console.log(`⚠️  Skipping players at index ${i}-${i+2} - No team name found`);
        skippedCount++;
        continue;
      }

      const normalizedTeamName = teamName.toLowerCase().trim();
      const teamId = teamMap[normalizedTeamName];

      if (!teamId) {
        console.log(`⚠️  Team "${teamName}" not found in database`);
        skippedCount++;
        continue;
      }

      // Update all three players
      const playersToUpdate = [captain];
      if (vc) playersToUpdate.push(vc);
      if (retained) playersToUpdate.push(retained);

      for (const player of playersToUpdate) {
        await Player.findByIdAndUpdate(player._id, {
          team: teamId,
          teamName: teamName,  // Store the team name for reference
          status: "sold",
          soldPrice: player.iconRole === "retained" ? 50 : 0
        });
        
        console.log(`✅ ${player.name} (${player.iconRole}) → ${teamName}`);
        
        // Increment team count
        await Team.findByIdAndUpdate(teamId, {
          $inc: { playerCount: 1 }
        });
        
        updatedCount++;
      }
      console.log();
    }

    console.log("===========================================");
    console.log("📊 SUMMARY");
    console.log("===========================================");
    console.log(`✅ Successfully assigned: ${updatedCount} players`);
    console.log(`⚠️  Skipped: ${skippedCount} groups`);
    console.log(`📈 Total processed: ${iconPlayers.length} players`);
    console.log("===========================================\n");

    if (updatedCount > 0) {
      console.log("🎉 Icon players now have team assignments!");
      console.log("👉 Check 'Browse 2026' squad view to verify\n");
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

assignBrowseTeams();
