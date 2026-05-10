const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Player = require('./models/Player');

async function checkBhuvan() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const player = await Player.findOne({ name: /BHUVAN/i });
        if (player) {
            console.log('Found Player:', {
                id: player._id,
                name: player.name,
                isIcon: player.isIcon,
                tournamentId: player.tournamentId
            });
            
            // Move back to player pool
            player.isIcon = false;
            player.iconId = undefined;
            player.status = 'available'; // Set to available for auction pool
            await player.save();
            console.log('Updated player successfully');
        } else {
            console.log('Player not found');
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

checkBhuvan();
