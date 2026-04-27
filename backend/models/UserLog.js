const mongoose = require('mongoose');

const userLogSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  role: { type: String },
  lastLogin: { type: Date, default: Date.now },
  loginCount: { type: Number, default: 1 }
}, { timestamps: true });

module.exports = mongoose.model('UserLog', userLogSchema);
