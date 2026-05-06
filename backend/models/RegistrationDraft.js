const mongoose = require("mongoose");

const registrationDraftSchema = new mongoose.Schema({
    token: { type: String, required: true, index: true },
    mobile: { type: String, required: true, index: true },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
    tournamentName: { type: String },
    step: { type: Number, default: 1 },
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },
    previews: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["saved", "saving", "unstable"], default: "saved" },
}, { timestamps: true });

registrationDraftSchema.index({ tournamentId: 1, mobile: 1 }, { unique: true });

module.exports = mongoose.model("RegistrationDraft", registrationDraftSchema);
