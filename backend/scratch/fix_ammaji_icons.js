const mongoose = require('mongoose');
const Player = require('../models/Player');
const Team = require('../models/Team');

const MONGODB_URI = "mongodb+srv://kplakshmisha:Amma%40123@cluster0.aimcgde.mongodb.net/auctionDB";

async function fixData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. List all teams to find Ammaji
    const teams = await Team.find({});
    console.log('Available Teams:', teams.map(t => t.name));

    const ammaji = await Team.findOne({ name: /Ammaji/i });
    if (!ammaji) {
      console.log('Team Ammaji not found');
      return;
    }
    console.log(`Found Ammaji Team: ${ammaji.name} (${ammaji._id})`);

    // 2. Find Pavan who is currently an Icon in Ammaji
    const pavan = await Player.findOne({ name: /Pavan/i, team: ammaji._id });
    if (pavan) {
      console.log(`Found Pavan in Ammaji: ${pavan.name}. Removing him from this team.`);
      pavan.team = null;
      pavan.status = 'available';
      pavan.isIcon = false; 
      await pavan.save();
    } else {
      console.log('Pavan not found specifically in Ammaji. Searching globally...');
      const pavanGlobal = await Player.findOne({ name: /Pavan/i });
      if (pavanGlobal) {
         console.log(`Found Pavan globally at team: ${pavanGlobal.team}. Name: ${pavanGlobal.name}`);
      }
    }

    // 3. Find "Kolala" player to assign to Ammaji
    // Note: Kolala might be a village name or part of name.
    const kolala = await Player.findOne({ name: /Kolala/i }) || await Player.findOne({ village: /Kolala/i });
    
    if (kolala) {
      console.log(`Found Kolala player/entry: ${kolala.name}. Assigning to Ammaji as Icon.`);
      kolala.team = ammaji._id;
      kolala.isIcon = true;
      kolala.status = 'sold';
      kolala.soldPrice = 0;
      await kolala.save();
      console.log('✅ Successfully updated Ammaji Icon to Kolala');
    } else {
      console.log('Kolala player not found in database.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

fixData();
