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

async function fixAllBhuvans() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB");

        const result = await Player.updateMany(
            { name: /Bhuvan/i },
            { 
                $set: { 
                    status: 'available', 
                    team: null, 
                    soldPrice: 0, 
                    isIcon: false 
                } 
            }
        );

        console.log(`Successfully updated ${result.modifiedCount} Bhuvan records to 'available'.`);

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

fixAllBhuvans();
