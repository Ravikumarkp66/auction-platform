const mongoose = require('mongoose');
require('dotenv').config();
const Tournament = require('./models/Tournament');
const Player = require('./models/Player');

async function test() {
  try {
    console.log("Connecting to:", process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected!");
    
    const t = await Tournament.findOne();
    console.log("Tournament found:", t ? t.name : "NONE");
    
    const p = await Player.findOne();
    console.log("Player found:", p ? p.name : "NONE");
    
    process.exit(0);
  } catch (err) {
    console.error("TEST FAILED:", err);
    process.exit(1);
  }
}

test();
