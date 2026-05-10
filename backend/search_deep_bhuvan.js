const mongoose = require('mongoose');
require('dotenv').config();

const playerSchema = new mongoose.Schema({
    name: String,
    status: String,
    team: mongoose.Schema.Types.ObjectId,
}, { strict: false });

const Player = mongoose.model('Player', playerSchema);

async function searchDeep() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const players = await Player.find({ name: { $regex: /BHUVAN/i } });
        console.log(`Deep search found ${players.length} results:`);
        players.forEach(p => {
            console.log(`- ID: ${p._id}, Name: "${p.name}", Status: ${p.status}, Team: ${p.team}`);
        });
    } finally {
        await mongoose.connection.close();
    }
}
searchDeep();
