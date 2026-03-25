const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number },
  dob: { type: String },
  role: { type: String },
  battingStyle: { type: String },
  bowlingStyle: { type: String },
  village: { type: String },
  town: { type: String },
  taluk: { type: String },
  mobile: { type: String },
  category: { type: String },
  imageUrl: { type: String },
  photo: {
    drive: { type: String },
    s3: { type: String },
    status: { 
      type: String, 
      enum: ["pending", "done", "failed"], 
      default: "pending" 
    }
  },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", index: true },
  status: {
    type: String,
    enum: ["available", "auction", "sold", "unsold"],
    default: "available"
  },
  basePrice: { type: Number, default: 0 },
  soldPrice: { type: Number },
  isIcon: { type: Boolean, default: false },
  iconRole: {
    type: String,
    enum: ["captain", "viceCaptain", "retained", null],
    default: null,
  },
  applicationId: { type: Number },
  originalApplicationId: { type: Number },
  iconId: { type: Number },
  teamSlotId: { type: String },
  team: { type: mongoose.Schema.Types.ObjectId, ref: "Team", index: true },
  teamName: { type: String }, // Store team name for reference
  year: { type: Number } // Academic year (1, 2, 3, 4)
}, { timestamps: true });

module.exports = mongoose.model("Player", playerSchema);
