const mongoose = require('mongoose');

async function checkPlayers() {
  const uri = "mongodb+srv://kplakshmisha:Amma%40123@cluster0.aimcgde.mongodb.net/auctionDB";
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected.");
    
    const Player = mongoose.model('Player', new mongoose.Schema({}, { strict: false }));
    
    const players = await Player.find({ isIcon: true }).limit(20);
    console.log("ICON PLAYERS SAMPLE:");
    players.forEach(p => {
      console.log(`- ${p.name}: imageUrl=${p.imageUrl}, photo.s3=${p.photo?.s3}, photo.drive=${p.photo?.drive}, photo.driveId=${p.photo?.driveId}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error:", err);
    process.exit(1);
  }
}

checkPlayers();
