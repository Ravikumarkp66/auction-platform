const mongoose = require('mongoose');
require('dotenv').config();
const Tournament = require('./models/Tournament');

async function migrate() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for migration...");

    const tournaments = await Tournament.find({ shortId: { $exists: false } }).sort({ createdAt: 1 });
    console.log(`Found ${tournaments.length} tournaments to migrate.`);

    for (let i = 0; i < tournaments.length; i++) {
        tournaments[i].shortId = i + 1;
        await tournaments[i].save();
        console.log(`Migrated tournament ${tournaments[i].name} to shortId: ${i + 1}`);
    }

    console.log("Migration complete.");
    process.exit(0);
}

migrate().catch(err => {
    console.error(err);
    process.exit(1);
});
