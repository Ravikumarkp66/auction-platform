const mongoose = require('mongoose');
const Player = require('../models/Player');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const players = await Player.find({ dob: { $exists: true } }).limit(5);
        if (players.length === 0) {
            console.log("No players found with DOB");
            const anyPlayer = await Player.findOne().limit(1);
            console.log("Sample player:", anyPlayer);
        }
        players.forEach(p => {
            console.log(`Player: ${p.name}, DOB: ${p.dob}, DOB Type: ${typeof p.dob}, Age: ${p.age}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

check();
