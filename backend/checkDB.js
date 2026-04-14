const mongoose = require('mongoose');
const TournamentImage = require('./models/TournamentImage');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/auction-platform";

async function check() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const allImages = await TournamentImage.find({});
    console.log(`Total images in DB: ${allImages.length}`);
    
    const landingImages = await TournamentImage.find({ tournamentId: { $exists: false } });
    console.log(`Landing images (tournamentId exists: false): ${landingImages.length}`);
    
    const landingImagesNull = await TournamentImage.find({ tournamentId: null });
    console.log(`Landing images (tournamentId: null): ${landingImagesNull.length}`);

    if (allImages.length > 0) {
      console.log("Sample Image:", JSON.stringify(allImages[0], null, 2));
    }

    process.exit(0);
  } catch (error) {
    console.error("Check error:", error);
    process.exit(1);
  }
}

check();
