const mongoose = require('mongoose');
const URI = 'mongodb+srv://kplakshmisha:Amma%40123@cluster0.aimcgde.mongodb.net/auctionDB';

async function fix() {
  await mongoose.connect(URI);
  const db = mongoose.connection.db;
  const tournamentId = new mongoose.Types.ObjectId('69bd60c8942ce0bfe5230020');
  
  const falcon = await db.collection('teams').findOne({ name: /Falcon Fighters/i, tournamentId });
  const siddara = await db.collection('players').findOne({ name: /SIDDARA/i, tournamentId });

  if (falcon && siddara) {
    console.log('Found Falcon:', falcon._id, 'Siddara:', siddara._id);
    
    // Fix player
    await db.collection('players').updateOne(
      { _id: siddara._id },
      { $set: { status: 'sold', team: falcon._id, soldPrice: 300, teamSlotId: 'FF2' } }
    );
    console.log('Updated Player SIDDARAJU A');

    // Fix team (ensure playerCount is correct - 1 Icon + 1 Sold = 2)
    await db.collection('teams').updateOne(
      { _id: falcon._id },
      { $set: { playerCount: 2 } }
    );
    console.log('Fixed Team Falcon Fighters playerCount');
  } else {
    console.log('Falcon or Siddara not found!');
  }
  process.exit();
}

fix();
