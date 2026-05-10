const mongoose = require('mongoose');
const Player = require('../models/Player');

const MONGODB_URI = "mongodb+srv://kplakshmisha:Amma%40123@cluster0.aimcgde.mongodb.net/auctionDB";

async function checkRecentIcons() {
  try {
    await mongoose.connect(MONGODB_URI);
    const players = await Player.find({ isIcon: true, isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('--- RECENTLY ADDED ICONS ---');
    players.forEach(p => {
      console.log(`- ${p.name} (Team ID: ${p.team}, Created: ${p.createdAt})`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkRecentIcons();
