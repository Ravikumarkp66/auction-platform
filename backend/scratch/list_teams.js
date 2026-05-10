const mongoose = require('mongoose');
const Team = require('../models/Team');

const MONGODB_URI = "mongodb://localhost:27017/auction";

async function listTeams() {
  try {
    await mongoose.connect(MONGODB_URI);
    const teams = await Team.find({});
    console.log('--- TEAMS LIST ---');
    teams.forEach(t => console.log(`- ${t.name} (${t._id})`));
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

listTeams();
