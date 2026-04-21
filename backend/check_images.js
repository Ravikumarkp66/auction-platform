const mongoose = require('mongoose');
require('dotenv').config();
const Player = require('./models/Player');

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
        const p = await Player.find({ 
            $or: [
                { imageUrl: { $ne: "", $exists: true } },
                { "photo.s3": { $ne: "", $exists: true } }
            ]
        }).limit(5);
        
        const data = p.map(x => ({
            name: x.name,
            imageUrl: x.imageUrl,
            s3: x.photo?.s3
        }));
        
        console.log('Sample data:', JSON.stringify(data, null, 2));
    }
    process.exit(0);
}

check();
