const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Team = require("./models/Team");
const Player = require("./models/Player");

async function fixIconRoles() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const tournament = await Tournament.findOne({ status: "active" });
    if (!tournament) {
      console.error("❌ No active tournament found");
      return;
    }

    console.log(`📊 Tournament: ${tournament.name}\n`);

    // Get all teams with their names
    const teams = await Team.find({ tournamentId: tournament._id });
    const teamMap = {};
    teams.forEach(t => {
      teamMap[t._id.toString()] = t.name;
    });

    // Get all icon players
    const iconPlayers = await Player.find({ 
      tournamentId: tournament._id, 
      isIcon: true 
    });

    console.log(`⭐ Found ${iconPlayers.length} icon players\n`);

    let fixedCount = 0;

    // Group by team
    for (const [teamId, teamName] of Object.entries(teamMap)) {
      const teamIcons = iconPlayers.filter(p => p.team?.toString() === teamId);
      
      if (teamIcons.length > 0) {
        console.log(`🏏 ${teamName}:`);
        
        // Sort by name to ensure consistent ordering
        teamIcons.sort((a, b) => a.name.localeCompare(b.name));
        
        // Assign roles based on position (first = captain, second = vc, third = retained)
        for (let i = 0; i < teamIcons.length; i++) {
          const player = teamIcons[i];
          let expectedRole;
          
          if (i === 0) expectedRole = 'captain';
          else if (i === 1) expectedRole = 'vice-captain';
          else expectedRole = 'retained';
          
          if (!player.iconRole || player.iconRole !== expectedRole) {
            await Player.findByIdAndUpdate(player._id, {
              iconRole: expectedRole,
              soldPrice: expectedRole === 'retained' ? 50 : 0
            });
            
            console.log(`   ✅ ${player.name} → ${expectedRole}`);
            fixedCount++;
          } else {
            console.log(`   • ${player.name} → ${player.iconRole} (OK)`);
          }
        }
        console.log();
      }
    }

    console.log("===========================================");
    console.log(`🔧 Fixed ${fixedCount} icon players`);
    console.log("===========================================\n");

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

fixIconRoles();
