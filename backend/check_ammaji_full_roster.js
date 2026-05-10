const mongoose = require('mongoose');
require('dotenv').config();

const playerSchema = new mongoose.Schema({
    name: String,
    status: String,
    team: mongoose.Schema.Types.ObjectId,
    tournamentId: mongoose.Schema.Types.ObjectId
}, { strict: false });

const Player = mongoose.model('Player', playerSchema);

async function checkAmmajiRoster() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const players = await Player.find({ 
            tournamentId: new mongoose.Types.ObjectId('69f718536ea282495a19cb38'),
            team: new mongoose.Types.ObjectId('69f718536ea282495a19cb45'),
            isDeleted: { $ne: true }
        });
        
        console.log(`Roster for Ammaji in tournament 69f...:`);
        players.forEach(p => {
            console.log(`- ${p.name} (Status: ${p.status}, Icon: ${p.isIcon})`);
        });
    } finally {
        await mongoose.connection.close();
    }
}
checkAmmajiRoster();
