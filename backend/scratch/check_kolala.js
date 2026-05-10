const mongoose = require('mongoose');
const Player = require('../models/Player');

const MONGODB_URI = "mongodb+srv://kplakshmisha:Amma%40123@cluster0.aimcgde.mongodb.net/auctionDB";

async function checkKolala() {
  try {
    await mongoose.connect(MONGODB_URI);
    const players = await Player.find({ 
      $or: [
        { name: /Kolala/i },
        { village: /Kolala/i }
      ]
    });
    console.log('--- KOLALA SEARCH RESULTS ---');
    players.forEach(p => console.log(`- ${p.name} (Village: ${p.village}, ID: ${p._id})`));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

checkKolala();
