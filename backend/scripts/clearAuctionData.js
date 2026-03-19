const mongoose = require("mongoose");
require("dotenv").config();

const Player = require("../models/Player");
const Team = require("../models/Team");
const Tournament = require("../models/Tournament");
const TournamentImage = require("../models/TournamentImage");

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error("MONGO_URI is not set in .env");
      process.exit(1);
    }

    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log("Connected to MongoDB, clearing auction data...");

    const [playersRes, teamsRes, tournamentsRes, imagesRes] = await Promise.all([
      Player.deleteMany({}),
      Team.deleteMany({}),
      Tournament.deleteMany({}),
      TournamentImage.deleteMany({}),
    ]);

    console.log(`Players removed: ${playersRes.deletedCount}`);
    console.log(`Teams removed: ${teamsRes.deletedCount}`);
    console.log(`Tournaments removed: ${tournamentsRes.deletedCount}`);
    console.log(`Tournament images removed: ${imagesRes.deletedCount}`);

    await mongoose.disconnect();
    console.log("Done. All auction-related data has been cleared.");
    process.exit(0);
  } catch (err) {
    console.error("Error while clearing auction data:", err);
    process.exit(1);
  }
}

run();

