const mongoose = require('mongoose');
const Player = require('../models/Player');

const MONGODB_URI = "mongodb+srv://kplakshmisha:Amma%40123@cluster0.aimcgde.mongodb.net/auctionDB";

async function checkKolalaIcons() {
  try {
    await mongoose.connect(MONGODB_URI);
    const players = await Player.find({ 
      $or: [
        { name: /Kolala/i },
        { village: /Kolala/i }
      ]
    });
    console.log('--- KOLALA PLAYERS ---');
    players.forEach(p => {
      console.log(`- ${p.name} (Village: ${p.village}, isIcon: ${p.isIcon}, Team: ${p.team})`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkKolalaIcons();
