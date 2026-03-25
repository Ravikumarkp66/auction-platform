/**
 * Script to populate year distribution for all teams
 * Run this once to initialize squad data for existing teams
 */

const mongoose = require("mongoose");
require("dotenv").config();

const Team = require("../models/Team");
const Player = require("../models/Player");

async function populateYearDistribution() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Get all teams
    const teams = await Team.find({});
    console.log(`📊 Found ${teams.length} teams`);

    let updatedCount = 0;

    for (const team of teams) {
      // Get players for this team
      const players = await Player.find({ team: team._id });
      
      // Calculate year distribution
      const yearDistribution = {
        "1st Year": 0,
        "2nd Year": 0,
        "3rd Year": 0,
        "4th Year": 0
      };
      
      players.forEach(player => {
        const yearCategory = player.yearCategory || "1st Year";
        if (yearDistribution[yearCategory] !== undefined) {
          yearDistribution[yearCategory]++;
        }
      });

      // Update team
      team.yearDistribution = yearDistribution;
      await team.save();
      
      updatedCount++;
      console.log(`✓ Updated ${team.name}: ${players.length} players`);
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} teams with year distribution data`);
    mongoose.connection.close();
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

populateYearDistribution();
