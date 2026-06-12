const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Player = require('./models/Player');
  const players = await Player.find({status: 'pending', isDeleted: {$ne: true}});
  console.log('Pending Player:', players);
  mongoose.disconnect();
});
