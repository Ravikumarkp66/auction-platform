const mongoose = require('mongoose');
require('dotenv').config();
const Tournament = require('./models/Tournament');

async function test() {
  try {
    console.log("Connecting to:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected!");
    
    console.log("Running aggregation...");
    const stats = await Tournament.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "players",
          localField: "_id",
          foreignField: "tournamentId",
          as: "playerStats"
        }
      },
      {
        $project: {
          name: 1,
          playerCount: { $size: "$playerStats" }
        }
      }
    ]);
    console.log("Stats found:", stats.length);
    console.log("First stat:", stats[0]);
    
    process.exit(0);
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  }
}

test();
