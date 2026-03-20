const express = require("express");
const router = express.Router();
const Player = require("../models/Player");
const Team = require("../models/Team");

/**
 * Re-indexes all non-icon players to ensure no gaps in applicationId
 */
const reorderApplicationIds = async (tournamentId) => {
    try {
        const players = await Player.find({ tournamentId, isIcon: false }).sort({ applicationId: 1 });
        let current = 1;
        for (const p of players) {
            p.applicationId = current++;
            await p.save();
        }
        console.log(`[REORDER] Re-indexed ${players.length} players for tournament ${tournamentId}`);
    } catch (err) {
        console.error("[REORDER] Failed:", err.message);
    }
};

// Get all players (with populated teams)
router.get("/", async (req, res) => {
  try {
    const { status, tournamentId, isIcon } = req.query;
    const filter = {};
    if (status && status !== 'ALL') filter.status = status;
    if (tournamentId) filter.tournamentId = tournamentId;
    if (isIcon !== undefined) filter.isIcon = isIcon === 'true';
    
    // Default to sorting by applicationId for players, iconId for icons
    const sort = filter.isIcon ? { iconId: 1 } : { applicationId: 1 };
    
    const players = await Player.find(filter).populate("team").sort(sort);
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// STANDALONE Manual Add Player
router.post("/", async (req, res) => {
  try {
    const { name, role, basePrice, tournamentId, isIcon, teamId } = req.body;
    
    let nextId = null;
    let finalTeamId = teamId || null;
    let slotId = null;

    if (isIcon) {
       // Calculation for iconId (unique per auction icons range)
       const lastIcon = await Player.findOne({ tournamentId, isIcon: true }).sort({ iconId: -1 });
       nextId = lastIcon ? (lastIcon.iconId || 0) + 1 : 1;
       
       if (finalTeamId) {
          const team = await Team.findById(finalTeamId);
          if (team) {
             slotId = `${team.shortName}${team.playerCount + 1}`;
             team.playerCount += 1;
             await team.save();
          }
       }
    } else {
       // Calculation for applicationId
       const lastPlayer = await Player.findOne({ tournamentId, isIcon: false }).sort({ applicationId: -1 });
       nextId = lastPlayer ? (lastPlayer.applicationId || 0) + 1 : 1;
    }

    const player = new Player({
      ...req.body,
      iconId: isIcon ? nextId : null,
      applicationId: !isIcon ? nextId : null,
      teamSlotId: slotId,
      team: finalTeamId
    });

    await player.save();
    res.status(201).json(player);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Bulk Insert Players (from Excel)
router.post("/bulk", async (req, res) => {
  try {
    const players = req.body.players;
    const results = await Player.insertMany(players);
    res.status(201).json({ message: `${results.length} players added`, count: results.length });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Advanced Import with Duplicate Checking and Image Processing Trigger
const { startImageProcessing } = require('../utils/image-processor');
router.post("/import", async (req, res) => {
    try {
        const { players, tournamentId } = req.body;
        if (!players || !Array.isArray(players)) return res.status(400).json({ message: "Invalid players data" });

        let added = 0;
        let skipped = 0;

        // Get starting applicationId
        const lastPlayer = await Player.findOne({ tournamentId, isIcon: false }).sort({ applicationId: -1 });
        let nextAppId = lastPlayer ? (lastPlayer.applicationId || 0) + 1 : 1;

        // Deduplicate incoming list internally first
        const uniqueInSheet = [];
        const seenInSheet = new Set();
        
        for (const p of players) {
            const key = `${p.name?.trim().toLowerCase()}_${p.mobile?.trim()}`;
            if (seenInSheet.has(key)) continue;
            seenInSheet.add(key);
            uniqueInSheet.push(p);
        }

        for (const p of uniqueInSheet) {
            const cleanName = p.name?.trim();
            const cleanMobile = p.mobile?.trim();

            // ROBUST DUPLICATE CHECK: Name (Case-Insensitive) + Mobile
            const existing = await Player.findOne({
                tournamentId,
                name: { $regex: new RegExp(`^${cleanName}$`, "i") },
                mobile: cleanMobile
            });

            if (existing) {
                skipped++;
                continue;
            }

            const player = new Player({
                ...p,
                name: cleanName,
                mobile: cleanMobile,
                village: p.village?.trim(),
                tournamentId,
                applicationId: nextAppId++,
                photo: {
                    drive: p.imageUrl,
                    status: p.imageUrl ? "pending" : "done"
                }
            });

            await player.save();
            added++;
        }

        if (added > 0) {
            startImageProcessing(tournamentId).catch(err => console.error("Import Image Process Error:", err));
        }

        res.json({ added, skipped });
    } catch (err) {
        console.error("Import Error:", err);
        res.status(500).json({ message: err.message });
    }
});
// REMOVE EXISTING DUPLICATES (Cleanup Tool)
router.post("/cleanup-duplicates", async (req, res) => {
    try {
        const { tournamentId } = req.body;
        const players = await Player.find({ tournamentId, isIcon: false }).lean();
        
        const seen = new Map();
        const toDeleteIds = [];

        for (const p of players) {
            // Identifier: Trimmed Name + Mobile
            const id = `${p.name?.trim().toLowerCase()}_${p.mobile?.trim()}`;
            if (seen.has(id)) {
                toDeleteIds.push(p._id);
            } else {
                seen.set(id, p._id);
            }
        }

        if (toDeleteIds.length > 0) {
            await Player.deleteMany({ _id: { $in: toDeleteIds } });
            await reorderApplicationIds(tournamentId);
        }

        res.json({ removed: toDeleteIds.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// RESET TO BASELINE (Keep 1-94 only)
router.post("/reset-to-baseline", async (req, res) => {
    try {
        const { tournamentId } = req.body;
        const result = await Player.deleteMany({
            tournamentId,
            isIcon: false,
            applicationId: { $gt: 94 }
        });
        await reorderApplicationIds(tournamentId);
        res.json({ removed: result.deletedCount });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update player status (e.g., move to auction)
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const player = await Player.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json(player);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update player info (Advanced Slot Logic)
router.patch("/:id", async (req, res) => {
  try {
    const updates = req.body;
    const oldPlayer = await Player.findById(req.params.id);
    if (!oldPlayer) return res.status(404).json({ message: "Player not found" });

    // Handle Sold logic -> Assign slot if not yet assigned
    if (updates.status === 'sold' && (!oldPlayer.teamSlotId || oldPlayer.team?.toString() !== updates.team)) {
      if (updates.team) {
         const team = await Team.findById(updates.team);
         if (team) {
           updates.teamSlotId = `${team.shortName}${team.playerCount + 1}`;
           team.playerCount += 1;
           await team.save();
         }
      }
    } else if (updates.status === 'unsold') {
       // Clear slot/team if marked as unsold
       updates.teamSlotId = null;
       updates.team = null;
       updates.soldPrice = 0;

       // MOVE TO END: Assign next available applicationId
       if (oldPlayer.status !== 'unsold') {
          const lastPlayer = await Player.findOne({ 
              tournamentId: oldPlayer.tournamentId, 
              isIcon: false 
          }).sort({ applicationId: -1 });
          updates.applicationId = (lastPlayer ? (lastPlayer.applicationId || 0) : 0) + 1;
       }
    } else if (updates.status === 'available') {
       // Clear slot/team if moved back to available
       updates.teamSlotId = null;
       updates.team = null;
       updates.soldPrice = 0;
    }

    const player = await Player.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json(player);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// Delete player with re-indexing
router.delete("/:id", async (req, res) => {
    try {
        const player = await Player.findById(req.params.id);
        if (!player) return res.status(404).json({ message: "Player not found" });
        const tid = player.tournamentId;

        await Player.findByIdAndDelete(req.params.id);
        if (!player.isIcon) await reorderApplicationIds(tid);
        
        res.json({ message: "Player deleted and indices updated" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

