const express = require("express");
const router = express.Router();
const Player = require("../models/Player");
const Team = require("../models/Team");
const TournamentRules = require("../models/TournamentRules");
const engine = require("../utils/ruleEngine");
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/authorizationMiddleware");
const { handleValidationErrors, validators } = require("../middleware/validationMiddleware");
const { sanitizeString, sanitizeObject } = require("../utils/sanitizer");
const { body, query } = require('express-validator');

const reorderApplicationIds = async (tournamentId) => {
    try {
        const players = await Player.find({ tournamentId, isIcon: { $ne: true }, isDeleted: { $ne: true } }).sort({ applicationId: 1 });
        if (!players.length) return;
        const bulkOps = players.map((p, index) => ({
            updateOne: {
                filter: { _id: p._id },
                update: { $set: { applicationId: index + 1 } }
            }
        }));
        await Player.bulkWrite(bulkOps);
    } catch (err) {
        console.error("[REORDER] Failed:", err.message);
    }
};

// Get all non-deleted players
router.get("/", async (req, res) => {
    try {
        const { status, tournamentId, isIcon } = req.query;
        const filter = { isDeleted: { $ne: true } };
        if (status && status !== 'ALL') filter.status = status;
        if (tournamentId) filter.tournamentId = tournamentId;
        if (isIcon !== undefined) filter.isIcon = isIcon === 'true' ? true : { $ne: true };
        const sort = filter.isIcon === true ? { iconId: 1 } : { applicationId: 1 };
        const players = await Player.find(filter).populate("team").sort(sort);
        res.json(players);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET Trashed Players (Admin Only)
router.get("/audit/trash",
    authMiddleware,
    authorize(['admin']),
    query('tournamentId').matches(/^[0-9a-fA-F]{24}$/).withMessage('Invalid tournament ID'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { tournamentId } = req.query;
            const players = await Player.find({ tournamentId, isDeleted: true }).sort({ deletedAt: -1 });
            res.json(players);
        } catch (err) {
            res.status(500).json({ message: "Failed to retrieve trash" });
        }
    });

// Restore a player (Admin Only)
router.put("/audit/restore/:id",
    authMiddleware,
    authorize(['admin']),
    async (req, res) => {
        try {
            const player = await Player.findById(req.params.id);
            if (!player) return res.status(404).json({ message: "Player not found" });

            player.isDeleted = false;
            player.deletedAt = null;
            await player.save();
            if (player.tournamentId) await reorderApplicationIds(player.tournamentId);

            res.json({ message: "Player restored successfully", player });
        } catch (err) {
            res.status(500).json({ message: "Failed to restore player" });
        }
    });

// Create a player (Admin Only)
router.post("/",
    authMiddleware,
    authorize(['admin']),
    validators.playerName(),
    validators.playerMobile(),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { isIcon, tournamentId, teamId } = req.body;
            let nextId = 1;
            let slotId = null;

            if (isIcon) {
                const lastIcon = await Player.findOne({ tournamentId, isIcon: true, isDeleted: { $ne: true } }).sort({ iconId: -1 });
                nextId = lastIcon ? (lastIcon.iconId || 0) + 1 : 1;
                if (teamId) {
                    const team = await Team.findById(teamId);
                    if (team) {
                        slotId = `${team.shortName}${team.playerCount + 1}`;
                        team.playerCount += 1;
                        await team.save();
                    }
                }
            } else {
                const lastPlayer = await Player.findOne({ tournamentId, isIcon: { $ne: true }, isDeleted: false }).sort({ applicationId: -1 });
                nextId = lastPlayer ? (lastPlayer.applicationId || 0) + 1 : 1;
            }

            const sanitizedData = sanitizeObject(req.body);

            const player = new Player({
                ...sanitizedData,
                applicationId: nextId,
                iconId: isIcon ? nextId : undefined,
                teamSlotId: slotId,
                team: teamId || null
            });

            await player.save();
            res.status(201).json(player);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    });

// Check Registration Status (Public)
router.get("/check", async (req, res) => {
    try {
        const { mobile, tournamentId } = req.query;
        if (!mobile || !tournamentId) return res.status(400).json({ message: "Mobile and Tournament ID required" });
        const player = await Player.findOne({ tournamentId, mobile: mobile.trim(), isDeleted: { $ne: true } });
        if (!player) return res.status(404).json({ message: "No registration found for this number." });
        res.json({
            name: player.name,
            status: player.status,
            applicationId: player.applicationId,
            message: player.status === 'pending' ? "Registration received. Awaiting admin approval." : "Registration Approved!",
            // Include full player details
            player: player
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Audit: Find Duplicates (Admin)
router.get("/audit/duplicates", async (req, res) => {
    try {
        const { tournamentId } = req.query;
        if (!tournamentId) return res.status(400).json({ message: "Tournament ID required" });

        const mobileDuplicates = await Player.aggregate([
            { $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId), isDeleted: { $ne: true } } },
            { $project: { mobileClean: { $trim: { input: { $toString: "$mobile" } } }, root: "$$ROOT" } },
            { $group: { _id: "$mobileClean", count: { $sum: 1 }, players: { $push: "$root" } } },
            {
                $match: {
                    count: { $gt: 1 },
                    _id: { $nin: [null, "", "-", "0", "undefined", "null"] },
                    $expr: { $gt: [{ $strLenCP: { $ifNull: ["$_id", ""] } }, 4] }
                }
            }
        ]);

        const aadhaarDuplicates = await Player.aggregate([
            { $match: { tournamentId: new mongoose.Types.ObjectId(tournamentId), isDeleted: { $ne: true } } },
            { $project: { aadhaarClean: { $trim: { input: { $toString: "$aadhaarNumber" } } }, root: "$$ROOT" } },
            { $group: { _id: "$aadhaarClean", count: { $sum: 1 }, players: { $push: "$root" } } },
            {
                $match: {
                    count: { $gt: 1 },
                    _id: { $nin: [null, "", "-", "0", "undefined", "null"] },
                    $expr: { $gt: [{ $strLenCP: { $ifNull: ["$_id", ""] } }, 4] }
                }
            }
        ]);

        res.json({ mobileConflicts: mobileDuplicates, aadhaarConflicts: aadhaarDuplicates });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Pre-check for duplicates (Public)
router.post("/check-duplicate", async (req, res) => {
    try {
        const { name, mobile, tournamentId, aadhaarNumber } = req.body;
        const duplicateCriteria = [{ name: { $regex: new RegExp(`^${name?.trim()}$`, "i") }, mobile: mobile?.trim() }];
        if (aadhaarNumber) duplicateCriteria.push({ aadhaarNumber: aadhaarNumber.trim() });
        const existing = await Player.findOne({ tournamentId, $or: duplicateCriteria, isDeleted: { $ne: true } });
        if (existing) {
            return res.status(409).json({ message: `Identity collision. Already registered to player: ${existing.name}.` });
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Public Player Registration
router.post("/register", async (req, res) => {
    try {
        const { tournamentId } = req.body;
        const lastPlayer = await Player.findOne({ tournamentId, isIcon: { $ne: true }, isDeleted: { $ne: true } }).sort({ applicationId: -1 });
        const nextId = lastPlayer ? (lastPlayer.applicationId || 0) + 1 : 1;
        const player = new Player({ ...req.body, applicationId: nextId, status: 'pending', isDeleted: false });
        await player.save();
        res.status(201).json(player);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Approve a player (Admin Only)
router.post("/:id/approve",
    authMiddleware,
    authorize(['admin']),
    async (req, res) => {
        try {
            const player = await Player.findById(req.params.id);
            if (!player) return res.status(404).json({ message: "Player not found" });

            player.status = "available";
            await player.save();

            res.json({ message: "Player approved and moved to auction pool", player });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });

// Public Player Poster Fetch (minimal info)
router.get("/public/:id", async (req, res) => {
    try {
        const player = await Player.findOne({ _id: req.params.id, isDeleted: { $ne: true } })
            .select("name imageUrl photo applicationId role basePrice village battingStyle tournamentId")
            .populate("tournamentId", "name");

        if (!player) return res.status(404).json({ message: "Player record not found." });

        const playerObj = player.toObject();
        if (playerObj.tournamentId && playerObj.tournamentId.name) {
            playerObj.tournamentName = playerObj.tournamentId.name;
            playerObj.tournamentId = playerObj.tournamentId._id;
        }

        res.json(playerObj);
    } catch (err) {
        res.status(500).json({ message: "Failed to retrieve player." });
    }
});

// Update a player (Admin Only)
router.patch("/:id",
    authMiddleware,
    authorize(['admin']),
    async (req, res) => {
        try {
            const sanitizedData = sanitizeObject(req.body);
            const player = await Player.findByIdAndUpdate(req.params.id, sanitizedData, { new: true });
            if (!player) return res.status(404).json({ message: "Player not found" });
            res.json(player);
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    });

// Delete a player (Admin Only)
router.delete("/:id",
    authMiddleware,
    authorize(['admin']),
    async (req, res) => {
        try {
            const player = await Player.findById(req.params.id);
            if (player) {
                player.isDeleted = true;
                player.deletedAt = new Date();
                await player.save();
                if (player.tournamentId) await reorderApplicationIds(player.tournamentId);
            }
            res.json({ message: "Player moved to recycle bin" });
        } catch (err) {
            res.status(500).json({ message: err.message });
        }
    });

// Import Players (Admin Only)
router.post("/import",
    authMiddleware,
    authorize(['admin']),
    body('players').isArray().withMessage('Players must be an array'),
    body('tournamentId').matches(/^[0-9a-fA-F]{24}$/).withMessage('Invalid tournament ID'),
    handleValidationErrors,
    async (req, res) => {
        try {
            const { players, tournamentId } = req.body;

            let added = 0;
            let skipped = 0;

            const lastPlayer = await Player.findOne({ tournamentId, isIcon: { $ne: true }, isDeleted: { $ne: true } }).sort({ applicationId: -1 });
            let nextId = lastPlayer ? (lastPlayer.applicationId || 0) + 1 : 1;

            for (const p of players) {
                const existing = await Player.findOne({
                    tournamentId,
                    $or: [
                        { name: { $regex: new RegExp(`^${p.name?.trim()}$`, "i") }, mobile: String(p.mobile).trim() },
                        { mobile: String(p.mobile).trim(), mobile: { $ne: "-" } }
                    ],
                    isDeleted: { $ne: true }
                });

                if (existing) {
                    skipped++;
                    continue;
                }

                const sanitizedPlayer = sanitizeObject(p);

                const newPlayer = new Player({
                    ...sanitizedPlayer,
                    tournamentId,
                    applicationId: nextId++,
                    status: "pending",
                    isDeleted: false
                });

                await newPlayer.save();
                added++;
            }

            res.json({ success: true, added, skipped });
        } catch (err) {
            console.error("[IMPORT ERROR]:", err);
            res.status(500).json({ message: err.message });
        }
    });

module.exports = router;
