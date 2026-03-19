const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const BackgroundSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  imageUrl: { type: String, required: true },
  isActive: { type: Boolean, default: true }
});

const Background = mongoose.models.Background || mongoose.model('Background', BackgroundSchema);

async function saveBadge() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const badge = {
      name: 'squad-badge',
      imageUrl: '/backgrounds/squad-badge.jpg',
      isActive: true
    };

    await Background.findOneAndUpdate(
      { name: badge.name },
      badge,
      { upsert: true, new: true }
    );

    console.log('Squad badge saved/updated successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error saving squad badge:', err);
    process.exit(1);
  }
}

saveBadge();
