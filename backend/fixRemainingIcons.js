const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Team = require("./models/Team");
const Player = require("./models/Player");

async function fixRemainingIcons() {
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
    const teamMap = {};
    teams.forEach(t => {
      // Normalize team name (remove extra spaces, lowercase)
      const normalizedName = t.name.toLowerCase().trim();
      teamMap[normalizedName] = t._id;
    });

    console.log(`📋 Found ${teams.length} teams\n`);

    let updatedCount = 0;

    // Fix Royal Challengers
    const royalTeam = teams.find(t => t.name.toLowerCase().includes('royal challenger'));
    if (royalTeam) {
      console.log(`🏏 Fixing Royal Challengers icons...`);
      
      const royalIcons = await Player.find({
        tournamentId: tournament._id,
        isIcon: true,
        teamName: { $regex: /royal challengers/i },
        team: null
      });

      console.log(`   Found ${royalIcons.length} unassigned icons`);

      for (const player of royalIcons) {
        await Player.findByIdAndUpdate(player._id, {
          team: royalTeam._id,
          status: "sold",
          soldPrice: player.iconRole === "retained" ? 50 : 0
        });
        
        console.log(`   ✅ ${player.name} (${player.iconRole}) → ${royalTeam.name}`);
        updatedCount++;
      }

      // Update team player count
      await Team.findByIdAndUpdate(royalTeam._id, {
        $inc: { playerCount: royalIcons.length }
      });
      
      console.log(`   📈 Team player count incremented by ${royalIcons.length}\n`);
    }

    // Fix Apex Predators
    const apexTeam = teams.find(t => t.name.toLowerCase().includes('apex predator'));
    if (apexTeam) {
      console.log(`🏏 Fixing Apex Predators icons...`);
      
      const apexIcons = await Player.find({
        tournamentId: tournament._id,
        isIcon: true,
        teamName: { $regex: /apex predators/i },
        team: null
      });

      console.log(`   Found ${apexIcons.length} unassigned icons`);

      for (const player of apexIcons) {
        await Player.findByIdAndUpdate(player._id, {
          team: apexTeam._id,
          status: "sold",
          soldPrice: player.iconRole === "retained" ? 50 : 0
        });
        
        console.log(`   ✅ ${player.name} (${player.iconRole}) → ${apexTeam.name}`);
        updatedCount++;
      }

      // Update team player count
      await Team.findByIdAndUpdate(apexTeam._id, {
        $inc: { playerCount: apexIcons.length }
      });
      
      console.log(`   📈 Team player count incremented by ${apexIcons.length}\n`);
    }

    console.log("===========================================");
    console.log("📊 SUMMARY");
    console.log("===========================================");
    console.log(`✅ Successfully assigned: ${updatedCount} icon players`);
    console.log("===========================================\n");

    if (updatedCount > 0) {
      console.log("🎉 Royal Challengers and Apex Predators icons are now assigned!");
      console.log("👉 Check the admin auction panel and overlay to verify\n");
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

fixRemainingIcons();
