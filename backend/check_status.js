const mongoose = require('mongoose');
require('dotenv').config();

// Use existing model
const Tournament = require('./models/Tournament');

async function check() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    const tournaments = await Tournament.find({}, { name: 1, status: 1, shortId: 1 }).lean();
    console.log('--- TOURNAMENTS LIST ---');
    console.log(JSON.stringify(tournaments, null, 2));
    console.log('------------------------');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
check();
