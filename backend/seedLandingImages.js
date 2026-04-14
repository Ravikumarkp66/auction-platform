const mongoose = require('mongoose');
const TournamentImage = require('./models/TournamentImage');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/auction-platform";

const images = [
  { imageUrl: "/tournaments/t1_v2.jpg", name: "Makenahalli Premier League", location: "Makenahalli", year: "2025", teams: "10 Teams", order: 1 },
  { imageUrl: "/tournaments/t2_v2.jpg", name: "Jakanachari Cup", location: "Tumkur", year: "2024", teams: "10 Teams", order: 2 },
  { imageUrl: "/tournaments/t3_v2.jpg", name: "Chettanahalli Premier League", location: "Chettanahalli", year: "2024", teams: "10 Teams", order: 3 },
  { imageUrl: "/tournaments/t4_v2.jpg", name: "Koratagere Premier League", location: "Koratagere", year: "2025", teams: "10 Teams", order: 4 },
  { imageUrl: "/tournaments/t5_v2.jpg", name: "Makenahalli Premier League", location: "Makenahalli", year: "2025", teams: "10 Teams", order: 5 }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // Clear existing landing images
    const deleteResult = await TournamentImage.deleteMany({ tournamentId: { $exists: false } });
    console.log(`Cleared ${deleteResult.deletedCount} existing landing images`);

    // Insert new images
    const insertResult = await TournamentImage.insertMany(images);
    console.log(`Seeded ${insertResult.length} images to the landing page`);

    process.exit(0);
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
}

seed();
