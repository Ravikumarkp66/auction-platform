const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Team = require("./models/Team");
const Player = require("./models/Player");

async function checkSpecificTeams() {
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

    // Get specific teams
    const royalChallengers = await Team.findOne({ 
      tournamentId: tournament._id,
      name: { $regex: /royal challengers/i }
    });
    
    const apexPredators = await Team.findOne({ 
      tournamentId: tournament._id,
      name: { $regex: /apex predators/i }
    });

    if (!royalChallengers) {
      console.log("❌ Royal Challengers team not found");
    } else {
      console.log(`🏏 Royal Challengers:`);
      console.log(`   ID: ${royalChallengers._id}`);
      
      const icons = await Player.find({
        tournamentId: tournament._id,
        isIcon: true,
        $or: [
          { team: royalChallengers._id },
          { teamName: { $regex: /royal challengers/i } }
        ]
      });
      
      console.log(`   ⭐ Icon Players: ${icons.length}`);
      if (icons.length > 0) {
        icons.forEach(p => {
          console.log(`      - ${p.name} (${p.iconRole}) - team: ${p.team ? 'ASSIGNED' : 'NULL'}, teamName: "${p.teamName}"`);
        });
      } else {
        console.log(`      ℹ️  No icon players found`);
      }
      console.log();
    }

    if (!apexPredators) {
      console.log("❌ Apex Predators team not found");
    } else {
      console.log(`🏏 Apex Predators:`);
      console.log(`   ID: ${apexPredators._id}`);
      
      const icons = await Player.find({
        tournamentId: tournament._id,
        isIcon: true,
        $or: [
          { team: apexPredators._id },
          { teamName: { $regex: /apex predators/i } }
        ]
      });
      
      console.log(`   ⭐ Icon Players: ${icons.length}`);
      if (icons.length > 0) {
        icons.forEach(p => {
          console.log(`      - ${p.name} (${p.iconRole}) - team: ${p.team ? 'ASSIGNED' : 'NULL'}, teamName: "${p.teamName}"`);
        });
      } else {
        console.log(`      ℹ️  No icon players found`);
      }
      console.log();
    }

    // Also check all icon players with these team names but no team assignment
    console.log(`🔍 Checking for unassigned icons with matching teamName...`);
    
    const unassignedRoyal = await Player.find({
      tournamentId: tournament._id,
      isIcon: true,
      teamName: { $regex: /royal challengers/i },
      team: null
    });
    
    const unassignedApex = await Player.find({
      tournamentId: tournament._id,
      isIcon: true,
      teamName: { $regex: /apex predators/i },
      team: null
    });
    
    if (unassignedRoyal.length > 0) {
      console.log(`\n⚠️  Found ${unassignedRoyal.length} unassigned Royal Challengers icons:`);
      unassignedRoyal.forEach(p => {
        console.log(`   - ${p.name} (${p.iconRole})`);
      });
    }
    
    if (unassignedApex.length > 0) {
      console.log(`\n⚠️  Found ${unassignedApex.length} unassigned Apex Predators icons:`);
      unassignedApex.forEach(p => {
        console.log(`   - ${p.name} (${p.iconRole})`);
      });
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

checkSpecificTeams();
