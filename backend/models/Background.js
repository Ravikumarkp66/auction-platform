const mongoose = require('mongoose');

const backgroundSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Background', backgroundSchema);
