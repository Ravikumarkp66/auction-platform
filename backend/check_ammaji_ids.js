const mongoose = require('mongoose');
require('dotenv').config();

const playerSchema = new mongoose.Schema({
    name: String,
    status: String,
    team: mongoose.Schema.Types.ObjectId,
}, { strict: false });

const Player = mongoose.model('Player', playerSchema);

async function checkAmmajiPlayers() {
    await mongoose.connect(process.env.MONGO_URI);
    // Team ID for Ammaji crickter's found earlier: 69f718536ea282495a19cb45
    const players = await Player.find({ team: new mongoose.Types.ObjectId('69f718536ea282495a19cb45') });
    console.log(`Players currently assigned to Ammaji:`);
    players.forEach(p => {
        console.log(`- ${p.name} (ID: ${p._id}, Status: ${p.status})`);
    });
    await mongoose.connection.close();
}
checkAmmajiPlayers();
