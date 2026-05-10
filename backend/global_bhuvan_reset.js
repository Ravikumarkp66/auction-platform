const mongoose = require('mongoose');
require('dotenv').config();

const playerSchema = new mongoose.Schema({
    name: String,
    status: String,
    team: mongoose.Schema.Types.ObjectId,
    soldPrice: Number,
    isIcon: Boolean
}, { strict: false });

const Player = mongoose.model('Player', playerSchema);

async function globalBhuvanReset() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const result = await Player.updateMany(
            { name: { $regex: /BHUVAN/i } },
            { 
                $set: { 
                    status: 'available', 
                    team: null, 
                    soldPrice: 0, 
                    isIcon: false 
                } 
            }
        );
        console.log(`Reset ${result.modifiedCount} players with 'Bhuvan' in name.`);
    } finally {
        await mongoose.connection.close();
    }
}
globalBhuvanReset();
