const mongoose = require('mongoose');
require('dotenv').config();
const Player = require('./models/Player');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const players = await Player.find({ name: { $in: ['DEVID', 'CHINNI', 'SHANMUKHA'] } });
  console.log(JSON.stringify(players.map(p => ({
    name: p.name,
    isIcon: p.isIcon,
    status: p.status,
    soldPrice: p.soldPrice
  })), null, 2));
  process.exit(0);
});
