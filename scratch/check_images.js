const mongoose = require('mongoose');
require('dotenv').config();
const Player = require('../../backend/models/Player');

async function check() {
    await mongoose.connect(process.env.MONGO_URI);
    const count = await Player.countDocuments({ 
        $or: [
            { imageUrl: { $ne: "", $exists: true } },
            { "photo.s3": { $ne: "", $exists: true } }
        ]
    });
    console.log('Players with images:', count);
    if(count > 0) {
        const p = await Player.findOne({ 
            $or: [
                { imageUrl: { $ne: "", $exists: true } },
                { "photo.s3": { $ne: "", $exists: true } }
            ]
        });
        console.log('Sample data:', JSON.stringify({
            name: p.name,
            imageUrl: p.imageUrl,
            photo: p.photo
        }, null, 2));
    }
    process.exit(0);
}

check();
