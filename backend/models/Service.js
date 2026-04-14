const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: String, required: true },
  icon: { type: String, default: "💡" },
  order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
