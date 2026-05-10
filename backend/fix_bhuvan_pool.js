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

async function fixBhuvan() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const bhuvan = await Player.findOne({ name: /Bhuvan/i });
        if (!bhuvan) {
            console.log("Bhuvan not found");
            return;
        }

        console.log("Found Bhuvan:", bhuvan.name, "Status:", bhuvan.status, "IsIcon:", bhuvan.isIcon);

        // Reset to available
        bhuvan.status = 'available';
        bhuvan.team = null;
        bhuvan.soldPrice = 0;
        bhuvan.isIcon = false; // Just in case
        
        await bhuvan.save();
        console.log("Bhuvan successfully returned to auction pool (available)");

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

fixBhuvan();
