require("dotenv").config();
const path = require("path");
// Ensure it looks for the .env in current directory
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Team = require("../models/Team");

async function renameTeam() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error("❌ MONGO_URI not found in environment variables");
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    const oldName = "Friends Koratagere";
    const newName = "KGR Brothers Koratagere";

    // Search for the team with NEW name
    const team = await Team.findOne({ name: newName });

    if (team) {
      const actualOldName = team.name;
      const logoUrl = team.logoUrl;
      const shortName = team.shortName;
      team.name = newName;
      // Maybe also update shortName if it was "FRIENDS" or "FK"
      if (shortName === "FRIENDS") {
        team.shortName = "KGR";
      }
      await team.save();
      console.log(`✅ Successfully renamed "${actualOldName}" to "${newName}"`);
      console.log(`🖼️ Team logo URL: ${logoUrl}`);
      console.log(`🏷️ Team shortName: ${shortName}`);
    } else {
      console.log(`⚠️ Team "${oldName}" not found in database.`);
      
      // List all teams to see what we have
      const allTeams = await Team.find({}, "name");
      console.log("Available teams in database:");
      allTeams.forEach(t => console.log(` - ${t.name}`));
    }

  } catch (error) {
    console.error("❌ Error renaming team:", error);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Connection closed");
  }
}

renameTeam();
