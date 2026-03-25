const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Team = require("./models/Team");
const Player = require("./models/Player");

async function verifyIconAssignments() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find BROWSE 2026 tournament
    const tournament = await Tournament.findOne({ 
      name: { $regex: /browse/i },
      status: "active"
    });
    
    if (!tournament) {
      console.error("❌ BROWSE 2026 tournament not found");
      return;
    }

    console.log(`📊 Tournament: ${tournament.name}\n`);

    // Get all teams
    const teams = await Team.find({ tournamentId: tournament._id });
    console.log(`📋 Checking icon assignments for ${teams.length} teams\n`);

    for (const team of teams) {
      // Get all icon players for this team
      const iconPlayers = await Player.find({
        tournamentId: tournament._id,
        isIcon: true,
        team: team._id
      }).sort({ iconId: 1 });

      if (iconPlayers.length === 0) {
        continue;
      }

      console.log(`🏏 ${team.name}: ${iconPlayers.length} icon player(s)`);
      
      iconPlayers.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name} - Role: ${p.iconRole || 'N/A'}`);
      });

      // Validate the assignment
      if (iconPlayers.length === 2) {
        // Should be C + VC only
        const hasRetained = iconPlayers.some(p => p.iconRole === 'retained');
        if (hasRetained) {
          console.log(`   ⚠️  WARNING: 2 players but one is marked as retained!`);
        } else {
          console.log(`   ✅ Correct: Captain + Vice Captain only`);
        }
      } else if (iconPlayers.length === 3) {
        // Should be C + VC + Retained
        const roles = iconPlayers.map(p => p.iconRole);
        const hasC = roles.includes('captain');
        const hasVC = roles.includes('viceCaptain');
        const hasRetained = roles.includes('retained');
        
        if (hasC && hasVC && hasRetained) {
          console.log(`   ✅ Correct: Captain + Vice Captain + Retained`);
        } else {
          console.log(`   ⚠️  WARNING: 3 players but missing proper role distribution`);
          console.log(`      Has C: ${hasC}, VC: ${hasVC}, Retained: ${hasRetained}`);
        }
      } else {
        console.log(`   ⚠️  Unexpected count: ${iconPlayers.length} players`);
      }
      
      console.log();
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

verifyIconAssignments();
