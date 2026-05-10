const mongoose = require('mongoose');
require('dotenv').config();

const tournamentSchema = new mongoose.Schema({
    name: String,
    iconsPerTeam: Number
}, { strict: false });

const Tournament = mongoose.model('Tournament', tournamentSchema);

async function checkTournament() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const t = await Tournament.findOne({ status: { $ne: 'deleted' } }).sort({ createdAt: -1 });
        if (t) {
            console.log(`Tournament: ${t.name}, IconsPerTeam: ${t.iconsPerTeam}`);
            if (!t.iconsPerTeam || t.iconsPerTeam === 0) {
                t.iconsPerTeam = 2;
                await t.save();
                console.log("Updated IconsPerTeam to 2");
            }
        } else {
            console.log("No tournament found");
        }
    } finally {
        await mongoose.connection.close();
    }
}
checkTournament();
