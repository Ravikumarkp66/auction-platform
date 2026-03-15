const mongoose = require('mongoose');

const tournamentImageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  location: {
    type: String,
    required: true
  },
  year: {
    type: String,
    required: true
  },
  teams: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('TournamentImage', tournamentImageSchema);
