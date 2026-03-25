const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Team = require("./models/Team");
const Player = require("./models/Player");

async function diagnoseIconPlayers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const tournament = await Tournament.findOne({ 
      name: { $regex: /browse/i },
      status: "active"
    });
    
    if (!tournament) {
      // Fallback to any active tournament
      console.log("⚠️  No 'Browse' tournament found, checking all active tournaments...\n");
      const tournaments = await Tournament.find({ status: "active" });
      if (tournaments.length === 0) {
        console.error("❌ No active tournaments found");
        return;
      }
      
      for (const t of tournaments) {
        console.log(`📊 Found: ${t.name} (${t._id})`);
      }
      console.log();
      return; // Let user choose
    }

    console.log(`📊 Tournament: ${tournament.name}`);
    console.log(`   ID: ${tournament._id}\n`);

    // Get all teams
    const teams = await Team.find({ tournamentId: tournament._id });
    console.log(`📋 Teams (${teams.length}):`);
    teams.forEach(t => console.log(`   - ${t.name} (${t.shortName})`));
    console.log();

    // Get ALL icon players
    const allIcons = await Player.find({ 
      tournamentId: tournament._id, 
      isIcon: true 
    });

    console.log(`⭐ Total Icon Players: ${allIcons.length}\n`);

    // Group by team assignment
    const withTeam = allIcons.filter(p => p.team !== null);
    const withoutTeam = allIcons.filter(p => p.team === null);

    console.log(`✅ With team: ${withTeam.length}`);
    console.log(`❌ Without team: ${withoutTeam.length}\n`);

    if (withoutTeam.length > 0) {
      console.log("⚠️  Icon players WITHOUT team:");
      withoutTeam.forEach(p => {
        console.log(`   - ${p.name} (${p.iconRole}) - teamName: "${p.teamName || 'MISSING'}"`);
      });
      console.log();
    }

    if (withTeam.length > 0) {
      console.log("✅ Icon players WITH team:");
      
      // Group by team
      const teamIds = new Set(withTeam.map(p => p.team.toString()));
      
      for (const teamId of teamIds) {
        const team = teams.find(t => t._id.toString() === teamId);
        const teamName = team ? team.name : 'UNKNOWN';
        const teamIcons = withTeam.filter(p => p.team.toString() === teamId);
        
        console.log(`\n   🏏 ${teamName}:`);
        teamIcons.forEach(p => {
          console.log(`      • ${p.name} (${p.iconRole})`);
        });
      }
    }

    console.log("\n===========================================");
    console.log("🔍 DIAGNOSIS COMPLETE");
    console.log("===========================================\n");

    if (withTeam.length > 0 && withoutTeam.length === 0) {
      console.log("🎉 All icon players have team assignments!");
      console.log("💡 If they're still not showing in UI, check:\n");
      console.log("   1. Browser console logs for errors");
      console.log("   2. Network tab - check API response");
      console.log("   3. Verify team._id matches player.team");
      console.log();
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

diagnoseIconPlayers();
