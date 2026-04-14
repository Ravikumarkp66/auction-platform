const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  state: { type: String, default: "Karnataka", index: true },
  district: { type: String, default: "Custom", index: true },
  taluk: { type: String, required: true, index: true },
  hobli: { type: String, required: true, index: true },
  sequence: { type: Number, default: 0 }
});

// Compound index for fast hierarchical lookups
locationSchema.index({ state: 1, district: 1, taluk: 1, hobli: 1 });

module.exports = mongoose.model("Location", locationSchema);
