/**
 * Migration Script: Convert player.category (string) to player.year (number)
 * 
 * Usage: node backend/scripts/migratePlayerYear.js
 * 
 * BEFORE RUNNING:
 * 1. Backup your database: mongodump --db yourDB
 * 2. Ensure .env file exists with MONGODB_URI
 * 3. Test on development data first
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Player Model Schema (minimal for migration)
const playerSchema = new mongoose.Schema({
  name: String,
  category: String,
  year: Number,
  yearCategory: String
});

const Player = mongoose.model('Player', playerSchema);

async function migratePlayerYear() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/auction');
    console.log('✅ Connected to MongoDB');

    // Get all players
    const players = await Player.find({});
    console.log(`📊 Found ${players.length} players`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const player of players) {
      try {
        // Skip if already has year field
        if (player.year && [1, 2, 3, 4].includes(player.year)) {
          console.log(`⏭️  Skipped "${player.name}" - already has year: ${player.year}`);
          skipped++;
          continue;
        }

        // Get year from category field
        const category = player.category || player.yearCategory;
        
        if (!category) {
          console.log(`⚠️  Skipped "${player.name}" - no category field`);
          skipped++;
          continue;
        }

        // Parse year from category string
        let year = null;
        const catLower = category.toLowerCase();

        if (catLower.includes('year1')) year = 1;
        else if (catLower.includes('year2')) year = 2;
        else if (catLower.includes('year3')) year = 3;
        else if (catLower.includes('year4')) year = 4;
        // Fallback for generic formats
        else if (catLower.includes('1st') || catLower.includes('1')) year = 1;
        else if (catLower.includes('2nd') || catLower.includes('2')) year = 2;
        else if (catLower.includes('3rd') || catLower.includes('3')) year = 3;
        else if (catLower.includes('4th') || catLower.includes('4')) year = 4;

        if (!year) {
          console.log(`❌ Error parsing "${player.name}" - category: "${category}"`);
          errors++;
          continue;
        }

        // Update player
        await Player.updateOne(
          { _id: player._id },
          { $set: { year } }
        );

        console.log(`✅ Updated "${player.name}": "${category}" → year ${year}`);
        updated++;

      } catch (err) {
        console.error(`❌ Error updating "${player.name}":`, err.message);
        errors++;
      }
    }

    // Summary
    console.log('\n🎉 Migration Complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Updated: ${updated} players`);
    console.log(`⏭️  Skipped: ${skipped} players`);
    console.log(`❌ Errors: ${errors} players`);
    console.log(`📊 Total: ${players.length} players`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Optional: Remove old category field (uncomment if needed)
    // console.log('\n🗑️  Removing old category field...');
    // await Player.updateMany({}, { $unset: { category: "", yearCategory: "" } });
    // console.log('✅ Old fields removed');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

// Run migration
migratePlayerYear();
