const mongoose = require('mongoose');
require('dotenv').config();

const Player = require('./models/Player');
const Tournament = require('./models/Tournament');

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const tournaments = await Tournament.find();
        console.log(`Found ${tournaments.length} tournaments to migrate`);

        for (const t of tournaments) {
            console.log(`Processing tournament: ${t.name} (${t._id})`);
            const players = await Player.find({ tournamentId: t._id }).sort({ createdAt: 1 });
            
            console.log(`Found ${players.length} players. Assigning application IDs...`);
            
            let count = 1;
            for (const p of players) {
                p.applicationId = count++;
                await p.save();
            }
        }

        console.log('Migration complete!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        mongoose.disconnect();
    }
};

migrate();
