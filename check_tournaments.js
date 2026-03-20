const mongoose = require('mongoose');
require('dotenv').config();

const TournamentSchema = new mongoose.Schema({
  name: String,
  shortId: Number,
  status: String
});
const Tournament = mongoose.model('Tournament', TournamentSchema);

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const tournaments = await Tournament.find({});
  console.log('Tournaments in DB:', JSON.stringify(tournaments, null, 2));
  process.exit(0);
}
check();
