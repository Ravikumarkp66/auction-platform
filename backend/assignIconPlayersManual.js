const mongoose = require("mongoose");
require("dotenv").config();

const Tournament = require("./models/Tournament");
const Player = require("./models/Player");

async function assignIconPlayersToTeams() {
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

    // Player to Team mapping (from your data)
    const PLAYER_TEAM_DATA = [
      // DIVINE XI
      { name: "CHANCHLESH KUMAR", teamName: "DIVINE XI", teamId: "69c2a0417cb0ef61d6bb6e76" },
      { name: "PRIYANSHU KUMAR", teamName: "DIVINE XI", teamId: "69c2a0417cb0ef61d6bb6e76" },
      { name: "AMAN KUMAR", teamName: "DIVINE XI", teamId: "69c2a0417cb0ef61d6bb6e76" },

      // DRAGONS XI
      { name: "Tanush Datta", teamName: "DragonsXI", teamId: "69c2a0417cb0ef61d6bb6e77" },
      { name: "Vittal", teamName: "DragonsXI", teamId: "69c2a0417cb0ef61d6bb6e77" },
      { name: "Rohit Biral", teamName: "DragonsXI", teamId: "69c2a0417cb0ef61d6bb6e77" },

      // 11 DHURANDAR
      { name: "Piyush", teamName: "11 Dhurandar", teamId: "69c2a0417cb0ef61d6bb6e78" },
      { name: "Hemant kumar harsh", teamName: "11 Dhurandar", teamId: "69c2a0417cb0ef61d6bb6e78" },

      // CAMPUS XI
      { name: "Sudeep T.M", teamName: "Campus XI", teamId: "69c2a0407cb0ef61d6bb6e73" },
      { name: "Vinay H.U", teamName: "Campus XI", teamId: "69c2a0407cb0ef61d6bb6e73" },
      { name: "Tejas K.S", teamName: "Campus XI", teamId: "69c2a0407cb0ef61d6bb6e73" },

      // VULCANO RISERS
      { name: "Prince kumar Singh", teamName: "Vulcano Risers", teamId: "69c2a0417cb0ef61d6bb6e7c" },
      { name: "Praneeth JR", teamName: "Vulcano Risers", teamId: "69c2a0417cb0ef61d6bb6e7c" },

      // APEX PREDATORS
      { name: "VAIBHAV JP", teamName: "APEX PREDATORS", teamId: "69c2a0417cb0ef61d6bb6e7b" },
      { name: "HRISHIKESH G MAHULI", teamName: "APEX PREDATORS", teamId: "69c2a0417cb0ef61d6bb6e7b" },

      // FEARLESS FIGHTERS
      { name: "Kiran G E", teamName: "Fearless Fighters", teamId: "69c2a0417cb0ef61d6bb6e7f" },
      { name: "Pramod G", teamName: "Fearless Fighters", teamId: "69c2a0417cb0ef61d6bb6e7f" },
      { name: "Vedamurthy M S", teamName: "Fearless Fighters", teamId: "69c2a0417cb0ef61d6bb6e7f" },

      // BENCH WARMERS XI
      { name: "Rishav sharma", teamName: "Bench Warmers XI", teamId: "69c2a0417cb0ef61d6bb6e7d" },
      { name: "Aniket Keshri", teamName: "Bench Warmers XI", teamId: "69c2a0417cb0ef61d6bb6e7d" },
      { name: "Kumar Anurag", teamName: "Bench Warmers XI", teamId: "69c2a0417cb0ef61d6bb6e7d" },

      // ROYAL CHALLENGERS
      { name: "Pranav S", teamName: "Royal Challengers", teamId: "69c2a0417cb0ef61d6bb6e7e" },
      { name: "Nagesh V", teamName: "Royal Challengers", teamId: "69c2a0417cb0ef61d6bb6e7e" },
      { name: "Shashank K M", teamName: "Royal Challengers", teamId: "69c2a0417cb0ef61d6bb6e7e" }
    ];

    let updatedCount = 0;
    let notFoundCount = 0;
    let alreadyCorrectCount = 0;

    console.log(`📋 Processing ${PLAYER_TEAM_DATA.length} players...\n`);

    for (const playerData of PLAYER_TEAM_DATA) {
      // Find player by name (case-insensitive)
      const player = await Player.findOne({
        tournamentId: tournament._id,
        isIcon: true,
        name: { $regex: new RegExp(`^${playerData.name}$`, 'i') }
      });

      if (!player) {
        console.log(`⚠️  NOT FOUND: ${playerData.name}`);
        notFoundCount++;
        continue;
      }

      // Check if already correctly assigned
      const currentTeamId = player.team?.toString();
      const expectedTeamId = playerData.teamId;

      if (currentTeamId === expectedTeamId && player.teamName === playerData.teamName) {
        console.log(`✅ ALREADY CORRECT: ${playerData.name} (${playerData.teamName})`);
        alreadyCorrectCount++;
        continue;
      }

      // Update player with team
      await Player.findByIdAndUpdate(player._id, {
        team: playerData.teamId,
        teamName: playerData.teamName,
        status: "sold",
        soldPrice: playerData.iconRole === "retained" ? 50 : 0
      });

      console.log(`✅ UPDATED: ${playerData.name} → ${playerData.teamName}`);
      updatedCount++;
    }

    console.log("\n===========================================");
    console.log("📊 SUMMARY");
    console.log("===========================================");
    console.log(`✅ Successfully updated: ${updatedCount} players`);
    console.log(`✅ Already correct: ${alreadyCorrectCount} players`);
    console.log(`⚠️  Not found: ${notFoundCount} players`);
    console.log(`📈 Total processed: ${PLAYER_TEAM_DATA.length} players`);
    console.log("===========================================\n");

    if (updatedCount > 0 || alreadyCorrectCount > 0) {
      console.log("🎉 Icon players now have proper team assignments!");
      console.log("👉 Next steps:");
      console.log("   1. Run: node assignBrowseTeams.js (to increment team player counts)");
      console.log("   2. Check Browse 2026 squad view in UI");
      console.log();
    }

  } catch (err) {
    console.error("❌ Error:", err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

assignIconPlayersToTeams();
