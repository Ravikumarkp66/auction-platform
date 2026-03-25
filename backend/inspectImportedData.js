const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Player = require("./models/Player");

async function inspectImportedData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    const tournament = await Tournament.findOne({ 
      name: { $regex: /browse/i },
      status: "active"
    });
    
    if (!tournament) {
      console.error("❌ Browse 2026 tournament not found");
      return;
    }

    console.log(`📊 Tournament: ${tournament.name}\n`);

    // Get first 5 icon players to inspect
    const samplePlayers = await Player.find({ 
      tournamentId: tournament._id, 
      isIcon: true 
    }).limit(5);

    console.log("📋 SAMPLE ICON PLAYERS (First 5):\n");
    
    samplePlayers.forEach((p, i) => {
      console.log(`${i + 1}. ${p.name}`);
      console.log(`   iconRole: "${p.iconRole}"`);
      console.log(`   teamName: "${p.teamName || 'MISSING'}"`);
      console.log(`   team: ${p.team ? 'ObjectId(' + p.team + ')' : 'null'}`);
      console.log(`   category: "${p.category}"`);
      console.log(`   mobile: "${p.mobile}"`);
      console.log();
    });

    console.log("\n💡 INSIGHT:");
    if (samplePlayers[0] && !samplePlayers[0].teamName) {
      console.log("   ⚠️  The 'teamName' field is missing from imported data!");
      console.log("   📝 This means the CSV column name doesn't match what the code expects.");
      console.log("\n   🔍 Expected column names:");
      console.log("      - TEAM NAME");
      console.log("      - team name");
      console.log("      - name");
      console.log("      - team");
      console.log("      - ತಂಡ (Kannada)");
      console.log("\n   💡 SOLUTION: Either:");
      console.log("      1. Rename your CSV column to exactly 'TEAM NAME', OR");
      console.log("      2. I can manually assign teams based on the order");
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

inspectImportedData();
