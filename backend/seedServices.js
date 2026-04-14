const mongoose = require('mongoose');
const Service = require('./models/Service');
require('dotenv').config();

const seedServices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear existing
    await Service.deleteMany({});

    const initialServices = [
      {
        title: "Player Auction Hosting",
        description: "Professional IPL-style auction experience with dynamic presentation, engaging bidding wars, and complete team squad management graphics.",
        price: "₹5,000 / day",
        icon: "⚖️",
        order: 1
      },
      {
        title: "Live Match Commentary",
        description: "High-energy commentary available in multiple languages including English, Hindi, and regional languages. Expert analysis and crowd engagement guaranteed.",
        price: "₹2,000 / match",
        icon: "🎙️",
        order: 2
      }
    ];

    await Service.insertMany(initialServices);
    console.log('Services seeded successfully! 🚀');
    process.exit();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
};

seedServices();
