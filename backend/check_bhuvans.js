const mongoose = require('mongoose');
require('dotenv').config();

const playerSchema = new mongoose.Schema({
    name: String,
    isIcon: Boolean,
    status: String,
    team: mongoose.Schema.Types.ObjectId,
    soldPrice: Number,
    tournamentId: mongoose.Schema.Types.ObjectId
}, { strict: false });

const Player = mongoose.model('Player', playerSchema);

async function checkBhuvans() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const bhuvans = await Player.find({ name: /Bhuvan/i });
        console.log(`Found ${bhuvans.length} players matching Bhuvan:`);
        
        bhuvans.forEach(p => {
            console.log(`- ID: ${p._id}, Name: ${p.name}, Status: ${p.status}, Team: ${p.team}, IsIcon: ${p.isIcon}, SoldPrice: ${p.soldPrice}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

checkBhuvans();
