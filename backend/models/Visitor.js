const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  ip: String,
  userAgent: String,
  path: String,
  timestamp: { type: Date, default: Date.now },
  sessionID: String // Optional: to group hits from same user
}, { timestamps: true });

// Index for faster queries
visitorSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Visitor', visitorSchema);
