const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Team = require("./models/Team");
const Player = require("./models/Player");

async function updateRetainedTeamBudgets() {
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

    console.log(`📊 Tournament: ${tournament.name}`);
    console.log(`   Base Budget: ${tournament.baseBudget} points`);
    console.log(`   Auction Mode: ${tournament.auctionMode}\n`);

    // Get all teams
    const teams = await Team.find({ tournamentId: tournament._id });
    console.log(`📋 Processing ${teams.length} teams\n`);

    let updatedCount = 0;

    for (const team of teams) {
      // Get icon players for this team
      const iconPlayers = await Player.find({
        tournamentId: tournament._id,
        isIcon: true,
        team: team._id
      });

      // Check if team has 3 icon players (C + VC + Retained)
      if (iconPlayers.length === 3) {
        const roles = iconPlayers.map(p => p.iconRole);
        const hasRetained = roles.includes('retained');
        
        if (hasRetained) {
          // Calculate new budget: base budget - 50 for retained player
          const originalBudget = tournament.baseBudget;
          const newBudget = originalBudget - 50;
          
          console.log(`🏏 ${team.name}:`);
          console.log(`   📊 Icon Players: ${iconPlayers.length} (C + VC + Retained)`);
          console.log(`   💰 Original Budget: ${originalBudget}`);
          console.log(`   💰 New Budget: ${newBudget} (-50 for retained)`);
          
          // Update team's remaining budget
          await Team.findByIdAndUpdate(team._id, {
            remainingBudget: newBudget
          });
          
          console.log(`   ✅ Budget updated!\n`);
          updatedCount++;
        }
      }
    }

    console.log("===========================================");
    console.log("📊 SUMMARY");
    console.log("===========================================");
    console.log(`✅ Updated budgets for: ${updatedCount} teams`);
    console.log(`💡 Teams with 3 icons now have max budget of ${tournament.baseBudget - 50} points`);
    console.log("===========================================\n");

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

updateRetainedTeamBudgets();
