const mongoose = require("mongoose");

const registrationDraftSchema = new mongoose.Schema({
    mobile: { type: String, required: true, index: true },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: "Tournament", required: true, index: true },
    step: { type: Number, default: 1 },
    formData: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ["saved", "saving", "unstable"], default: "saved" },
}, { timestamps: true });

// Pre-save hook to prevent large documents
registrationDraftSchema.pre("save", function(next) {
    try {
        const size = Buffer.byteLength(JSON.stringify(this));
        
        if (size > 500 * 1024) { // 500 KB limit
            const err = new Error("Draft document exceeds 500KB limit.");
            err.status = 413; // Payload Too Large
            return next(err);
        }
        
        if (size > 100 * 1024) { // 100 KB warning
            console.warn(`[WARNING] RegistrationDraft for mobile ${this.mobile} is approaching size limit (${(size / 1024).toFixed(2)} KB).`);
        }
        
        next();
    } catch (err) {
        next(err);
    }
});

// Indexes
registrationDraftSchema.index({ tournamentId: 1, mobile: 1 }, { unique: true });
registrationDraftSchema.index({ status: 1 });
// TTL Index: expire after 7 days (604800 seconds)
registrationDraftSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model("RegistrationDraft", registrationDraftSchema);
