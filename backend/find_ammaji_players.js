const mongoose = require('mongoose');
require('dotenv').config();

const playerSchema = new mongoose.Schema({
    name: String,
    status: String,
    team: mongoose.Schema.Types.ObjectId,
    tournamentId: mongoose.Schema.Types.ObjectId
}, { strict: false });

const teamSchema = new mongoose.Schema({
    name: String
}, { strict: false });

const Player = mongoose.model('Player', playerSchema);
const Team = mongoose.model('Team', teamSchema);

async function findSoldPlayers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        
        const team = await Team.findOne({ name: /AMMAJI/i });
        if (!team) {
            console.log("Team Ammaji not found");
            return;
        }
        
        console.log("Found Team:", team.name, "ID:", team._id);
        
        const players = await Player.find({ team: team._id, isDeleted: { $ne: true } });
        console.log(`Found ${players.length} players sold to ${team.name}:`);
        players.forEach(p => {
            console.log(`- ${p.name} (Status: ${p.status}, Icon: ${p.isIcon})`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.connection.close();
    }
}

findSoldPlayers();
