const mongoose = require('mongoose');
require('dotenv').config();

const playerSchema = new mongoose.Schema({
    name: String,
    tournamentId: mongoose.Schema.Types.ObjectId
}, { strict: false });

const Player = mongoose.model('Player', playerSchema);

async function checkTournaments() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const bhuvans = await Player.find({ name: /Bhuvan/i });
        bhuvans.forEach(p => {
            console.log(`- Name: ${p.name}, Tournament ID: ${p.tournamentId}`);
        });
    } finally {
        await mongoose.connection.close();
    }
}
checkTournaments();
