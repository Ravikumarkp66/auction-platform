const mongoose = require('mongoose');
require('dotenv').config();

const playerSchema = new mongoose.Schema({
    name: String,
    status: String,
    team: mongoose.Schema.Types.ObjectId,
}, { strict: false });

const Player = mongoose.model('Player', playerSchema);

async function verify() {
    await mongoose.connect(process.env.MONGO_URI);
    const p = await Player.findById('69f9fa97a3bea39e97783ea0');
    console.log('PLAYER ID 69f...3ea0 (K r bhuvan):', JSON.stringify(p, null, 2));
    await mongoose.connection.close();
}
verify();
