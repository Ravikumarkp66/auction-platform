const mongoose = require('mongoose');
require('dotenv').config();

const Player = require('./models/Player');
const Tournament = require('./models/Tournament');

const migrate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const tournaments = await Tournament.find();

        for (const t of tournaments) {
            console.log(`Processing tournament: ${t.name}`);
            
            // 1. Migrate Icons (Assign iconId 1, 2, 3...)
            const icons = await Player.find({ tournamentId: t._id, isIcon: true }).sort({ createdAt: 1 });
            console.log(`Found ${icons.length} Icons. Migrating iconIds...`);
            for (let i = 0; i < icons.length; i++) {
                icons[i].iconId = i + 1;
                icons[i].applicationId = null; // Ensure they have no appId
                await icons[i].save();
            }

            // 2. Migrate Players (Assign applicationId 1, 2, 3...)
            const players = await Player.find({ tournamentId: t._id, isIcon: { $ne: true } }).sort({ createdAt: 1 });
            console.log(`Found ${players.length} Regular Players. Migrating applicationIds...`);
            for (let i = 0; i < players.length; i++) {
                players[i].applicationId = i + 1;
                players[i].iconId = null; // Ensure they have no iconId
                await players[i].save();
            }
        }

        console.log('Dual ID Migration complete!');
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        mongoose.disconnect();
    }
};

migrate();
