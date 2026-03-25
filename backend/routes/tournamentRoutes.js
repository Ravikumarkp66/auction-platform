const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Tournament = require("../models/Tournament");
const TournamentRules = require("../models/TournamentRules");
const Team = require("../models/Team");
const Player = require("../models/Player");
const { startImageProcessing } = require("../utils/image-processor");
const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

// Get current active tournament
router.get("/status/active", async (req, res) => {
  try {
    const tournament = await Tournament.findOne({ status: "active" }).sort({ updatedAt: -1 });
    if (!tournament) return res.json(null);
    
    // We also need the details to resume
    const teams = await Team.find({ tournamentId: tournament._id });
    const players = await Player.find({ tournamentId: tournament._id });
    res.json({ tournament, teams, players });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new tournament
router.post("/", async (req, res) => {
  try {
    const { 
      name, organizerName, organizerLogo, numTeams, iconsPerTeam, 
      baseBudget, defaultBasePrice, squadSize, auctionSlots, 
      // ── New auction-engine fields (all optional; fall back to money defaults) ──
      auctionMode = "money",
      squadMinPlayers,
      squadMaxPlayers,
      // ────────────────────────────────────────────────────────────────────────
      teams, players 
    } = req.body;

    // Check if an active one already exists with the same name to prevent duplicates
    const existing = await Tournament.findOne({ name, status: "active" });
    if (existing) {
      return res.json({ tournamentId: existing._id, message: "Existing active tournament found" });
    }

    // Derive budget unit from auction mode
    const budgetUnit = auctionMode === "points" ? "POINTS" : "INR";
    
    // 1. Save Tournament
    const tournament = new Tournament({ 
      name, organizerName, organizerLogo, numTeams, iconsPerTeam,
      baseBudget, defaultBasePrice, squadSize, auctionSlots,
      // New engine fields
      auctionMode,
      budget: { total: baseBudget || 0, unit: budgetUnit },
      squad: {
        minPlayers: squadMinPlayers || 1,
        maxPlayers: squadMaxPlayers || squadSize || 15,
      },
      status: "active" // Defaulting to active for simple flow, can be "draft" if needed
    });
    const savedTournament = await tournament.save();

    // 2. Save Teams
    const teamPromises = teams.map(team => {
      // Logic for points-based retention: 
      // If any of the players assigned to this team are "retained", deduct 50 pts.
      let initialBudget = baseBudget;
      if (auctionMode === "points") {
        const teamIcons = players.filter(p => p.isIcon && p.team === team.name);
        const hasRetained = teamIcons.some(p => p.iconRole === "retained");
        if (hasRetained) initialBudget -= 50;
      }

      return new Team({
        name: team.name,
        shortName: team.shortName,
        logoUrl: team.logoUrl,
        tournamentId: savedTournament._id,
        remainingBudget: initialBudget,
        color: team.color
      }).save();
    });
    const savedTeams = await Promise.all(teamPromises);

    // 3. Separate Icons and Regular Players
    const iconsList = players.filter(p => p.isIcon);
    const regularPlayersList = players.filter(p => !p.isIcon);

    // 4. Save Icons (Assigned iconId 1, 2, 3...)
    const iconPromises = iconsList.map(async (player, index) => {
      let teamId = null;
      let slotId = null;
      
      // ✅ CRITICAL FIX - Use teamName field from frontend
      const foundTeam = savedTeams.find(t => t.name === player.teamName);
      if (foundTeam) {
        teamId = foundTeam._id;  // ✅ Set the actual MongoDB ObjectId
        const currentCount = foundTeam.playerCount || 0;
        slotId = `${foundTeam.shortName}${currentCount + 1}`;
        foundTeam.playerCount += 1; // Increment for slots
      }

      return new Player({
        ...player,
        tournamentId: savedTournament._id,
        iconId: index + 1, // Separate ID system for icons
        applicationId: null, // No appId for icons
        team: teamId || null,  // ✅ Store as ObjectId reference, not string
        teamSlotId: slotId,
        status: "sold",
        // SOLD PRICE: 50 for retained players (per rule), 0 for CP/VC (pre-included in team)
        soldPrice: player.iconRole === "retained" ? 50 : 0,
        isIcon: true,
        iconRole: player.iconRole || null,
        photo: {
          drive: player.imageUrl || player.image,
          status: "pending"
        }
      }).save();
    });

    // 5. Save Regular Players (Assigned applicationId 1, 2, 3...)
    const regularPromises = regularPlayersList.map(async (player, index) => {
      return new Player({
        ...player,
        tournamentId: savedTournament._id,
        applicationId: index + 1, // Global serial from Excel order
        iconId: null,
        status: "available",
        isIcon: false,
        photo: {
          drive: player.imageUrl || player.image,
          status: "pending"
        }
      }).save();
    });
    
    await Promise.all([...iconPromises, ...regularPromises]);

    // 6. Finalize Team player counts (from slots assigned during icons)
    const updateTeamPromises = savedTeams.map(t => {
       return Team.findByIdAndUpdate(t._id, { playerCount: t.playerCount });
    });
    await Promise.all(updateTeamPromises);

    res.status(201).json({
      tournamentId: savedTournament._id,
      shortId: savedTournament.shortId,
      message: "Tournament and data saved successfully"
    });

    // Create an empty TournamentRules document (fire-and-forget, system works without it)
    TournamentRules.create({ tournamentId: savedTournament._id, config: {} })
      .catch(err => console.error("[TOURNAMENT RULES] Could not create rules doc:", err.message));

    // START BACKGROUND IMAGE PROCESSING (DO NOT AWAIT)
    startImageProcessing(savedTournament._id).catch(err => {
        console.error("[IMAGE BACKGROUND PROCESSOR] Immediate start failed:", err.message);
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Append players to an existing tournament (Excel upload)
router.post("/:id/append-players", async (req, res) => {
  try {
    const tournamentId = req.params.id;
    const { players: newPlayers } = req.body;

    if (!newPlayers || !Array.isArray(newPlayers)) {
      return res.status(400).json({ message: "No players provided" });
    }

    // 1. Get existing players for deduplication and counter
    const existingPlayers = await Player.find({ tournamentId });
    const existingMap = new Set(existingPlayers.map(p => `${p.name.toLowerCase()}_${p.mobile || ''}`));
    
    // Get highest applicationId
    const maxAppId = existingPlayers.reduce((max, p) => Math.max(max, p.applicationId || 0), 0);
    const maxIconId = existingPlayers.reduce((max, p) => Math.max(max, p.iconId || 0), 0);

    const addedCount = { regular: 0, icons: 0, skipped: 0 };
    const playersToSave = [];

    // 2. Identify new unique players
    for (const player of newPlayers) {
        const key = `${player.name.toLowerCase()}_${player.mobile || ''}`;
        if (existingMap.has(key)) {
            addedCount.skipped++;
            continue;
        }

        const isIconPlayer = player.isIcon || player.iconRole;
        const playerId = isIconPlayer ? (maxIconId + addedCount.icons + 1) : (maxAppId + addedCount.regular + 1);
        
        let teamId = null;
        let slotId = null;
        
        // ✅ CRITICAL FIX - Use teamName field and convert to ObjectId
        if (player.teamName) {
          const foundTeam = await Team.findOne({ tournamentId, name: player.teamName });
          if (foundTeam) {
            teamId = foundTeam._id;  // ✅ Store as ObjectId reference
            slotId = `${foundTeam.shortName}${(foundTeam.playerCount || 0) + 1}`;
          }
        }

        playersToSave.push(new Player({
          ...player,
          tournamentId,
          iconId: isIconPlayer ? playerId : null,
          applicationId: isIconPlayer ? null : playerId,
          team: teamId,  // ✅ Store ObjectId, not string
          teamSlotId: slotId,
          status: isIconPlayer ? "sold" : "available",
          soldPrice: isIconPlayer && player.iconRole === "retained" ? 50 : 0,
          isIcon: isIconPlayer || false,
          iconRole: player.iconRole || null,
          photo: {
            drive: player.imageUrl || player.image,
            status: player.imageUrl ? "pending" : "done"
          }
        }));

        if (isIconPlayer) {
          addedCount.icons++;
        } else {
          addedCount.regular++;
        }
    }

    // 3. Save all new players
    if (playersToSave.length > 0) {
      await Player.insertMany(playersToSave);
    }

    res.json({ added: addedCount, message: "Players appended successfully" });
  } catch (err) {
    console.error("Append players error:", err);
    res.status(400).json({ message: err.message });
  }
});

// Assign icon players to team squads
router.post("/:id/assign-icons-to-teams", async (req, res) => {
  try {
    const tournamentId = req.params.id;
    
    // 1. Get all icon players for this tournament
    const iconPlayers = await Player.find({ tournamentId, isIcon: true }).sort({ iconId: 1 });
    
    if (iconPlayers.length === 0) {
      return res.json({ message: "No icon players found", assigned: 0 });
    }
    
    // 2. Get all teams for this tournament
    const teams = await Team.find({ tournamentId });
    const teamMap = {};
    teams.forEach(t => {
      teamMap[t.name.toLowerCase().trim()] = t._id;
    });
    
    // 3. Assign each icon player to their team
    let assignedCount = 0;
    const updatePromises = [];
    
    for (const player of iconPlayers) {
      // Always update based on teamName to ensure team is set correctly
      const teamName = player.teamName?.toLowerCase().trim();
      const teamId = teamMap[teamName];
      
      if (teamId) {
        // Update player with team assignment
        updatePromises.push(
          Player.findByIdAndUpdate(player._id, {
            team: teamId,  // ✅ CRITICAL FIX - Set the team ObjectId reference
            status: "sold",
            soldPrice: player.iconRole === "retained" ? 50 : 0
          })
        );
        
        // Increment team's player count
        updatePromises.push(
          Team.findByIdAndUpdate(teamId, {
            $inc: { playerCount: 1 }
          })
        );
        
        assignedCount++;
      } else {
        console.error(`Team not found for player ${player.name}: teamName="${player.teamName}"`);
      }
    }
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    res.json({ 
      message: `Successfully assigned ${assignedCount} icon players to teams`,
      assigned: assignedCount,
      totalIcons: iconPlayers.length
    });
  } catch (err) {
    console.error("Assign icons error:", err);
    res.status(400).json({ message: err.message });
  }
});

// Get all past tournaments with optimized stat counting
router.get("/", async (req, res) => {
  try {
    // Optimization: Use aggregation to get counts without fetching all player data
    const tournamentsWithStats = await Tournament.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "players",
          localField: "_id",
          foreignField: "tournamentId",
          as: "playerStats"
        }
      },
      {
        $project: {
          name: 1,
          organizerName: 1,
          organizerLogo: 1,
          numTeams: 1,
          iconsPerTeam: 1,
          baseBudget: 1,
          defaultBasePrice: 1,
          squadSize: 1,
          auctionSlots: 1,
          status: 1,
          createdAt: 1,
          shortId: 1,
          assets: 1,
          imageProcessing: 1,
          // ── Auction engine fields ──
          auctionMode: 1,
          budget: 1,
          squad: 1,
          // ─────────────────────────
          playerCount: { $size: "$playerStats" },
          players: { $literal: [] }, // Dummy for frontend compatibility in list view
          iconCount: {
            $size: {
              $filter: {
                input: "$playerStats",
                as: "p",
                cond: { $eq: ["$$p.isIcon", true] }
              }
            }
          }
        }
      }
    ]);
    
    res.json(tournamentsWithStats);
  } catch (err) {
    console.error("Fetch tournaments error:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/tournaments/status/active - Get the current active tournament
router.get("/status/active", async (req, res) => {
  try {
    const tournament = await Tournament.findOne({ status: "active" }).lean();
    if (!tournament) return res.status(404).json({ message: "No live tournament found" });

    const teams = await Team.find({ tournamentId: tournament._id }).lean();
    const players = await Player.find({ tournamentId: tournament._id }).sort({ applicationId: 1 }).lean();
    
    res.json({ tournament, teams, players });
  } catch (err) {
    console.error("Fetch active tournament error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get full details of a tournament (teams + players)
router.get("/:id", async (req, res) => {
  try {
    let tournament;
    const { id } = req.params;

    // Check if id is a numeric shortId or a 24-char ObjectID
    if (!isNaN(id)) {
      tournament = await Tournament.findOne({ shortId: parseInt(id) });
    } else {
      // Validate ObjectID format before querying
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "Invalid tournament ID format" });
      }
      tournament = await Tournament.findById(id);
    }

    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    // Optimization: Use lean() and specific queries
    const teams = await Team.find({ tournamentId: tournament._id }).lean();
    const players = await Player.find({ tournamentId: tournament._id }).sort({ applicationId: 1 }).lean();
    
    res.json({ tournament, teams, players });
  } catch (err) {
    console.error("Fetch full details error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Update a team
router.patch("/teams/:id", async (req, res) => {
  try {
    console.log(`Updating team ${req.params.id}:`, req.body);
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!team) return res.status(404).json({ message: "Team not found" });
    res.json(team);
  } catch (err) {
    console.error(`Error updating team ${req.params.id}:`, err);
    res.status(400).json({ message: err.message });
  }
});

// Reset auction - reset sold players to available, keep icon players
router.post("/:id/reset", async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    // Get all players for this tournament
    const players = await Player.find({ tournamentId: req.params.id });
    
    // Get all teams for this tournament
    const teams = await Team.find({ tournamentId: req.params.id });

    // Reset each player
    let iconPlayersCount = 0;
    let auctionPlayersCount = 0;

    for (const player of players) {
      if (player.isIcon) {
        // Keep icon players as is (already assigned to teams)
        iconPlayersCount++;
      } else {
        // Reset auction players
        player.status = "available";
        player.soldPrice = 0;
        player.team = null;
        await player.save();
        auctionPlayersCount++;
      }
    }

    // Reset team budgets to base budget
    for (const team of teams) {
      team.remainingBudget = tournament.baseBudget;
      await team.save();
    }

    res.json({
      message: "Auction reset successfully",
      iconPlayersRetained: iconPlayersCount,
      auctionPlayersReset: auctionPlayersCount,
      teamsReset: teams.length
    });
  } catch (err) {
    console.error("Error resetting auction:", err);
    res.status(500).json({ message: err.message });
  }
});

// Set tournament as active (Go Live) - Archives other active auctions
router.post("/:id/go-live", async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Mark target as active
    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    
    // 2. Set ALL other active tournaments to completed
    await Tournament.updateMany(
      { _id: { $ne: id }, status: "active" },
      { $set: { status: "completed" } }
    );
    
    // 3. Mark selected one as active
    tournament.status = "active";
    await tournament.save();
    
    res.json({ message: `${tournament.name} is now LIVE. Other auctions archived.` });
  } catch (err) {
    console.error("Go Live error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Archive / Set to Completed manually
router.post("/:id/archive", async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id, 
      { $set: { status: "completed" } }, 
      { new: true }
    );
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    res.json({ message: "Auction archived successfully", tournament });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.patch("/:id/assets", async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id, 
      { $set: { assets: req.body } }, 
      { new: true }
    );
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    res.json(tournament);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update Tournament Pools
router.patch("/:id/pools", async (req, res) => {
  try {
    const { poolA, poolB } = req.body;
    const tournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      { $set: { "pools.poolA": poolA, "pools.poolB": poolB } },
      { new: true }
    );
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });
    res.json(tournament);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete tournament permanently (requires password)
router.delete("/:id", async (req, res) => {
  try {
    const { password } = req.body;
    
    // Verify password matching hardcoded admin or env admin
    if (password !== "15FEBLSRBP" && password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid password for deletion." });
    }

    const { id } = req.params;
    const tournament = await Tournament.findById(id);
    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    // Collect S3 URLs to delete
    const players = await Player.find({ tournamentId: id });
    const teams = await Team.find({ tournamentId: id });
    
    const s3Urls = [];
    players.forEach(p => {
      if (p.photo?.s3) s3Urls.push(p.photo.s3);
      if (p.imageUrl && p.imageUrl.includes('amazonaws.com')) s3Urls.push(p.imageUrl);
    });
    teams.forEach(t => {
      if (t.logoUrl && t.logoUrl.includes('amazonaws.com')) s3Urls.push(t.logoUrl);
    });
    if (tournament.organizerLogo && tournament.organizerLogo.includes('amazonaws.com')) {
      s3Urls.push(tournament.organizerLogo);
    }

    // Delete connected data from MongoDB
    await Player.deleteMany({ tournamentId: id });
    await Team.deleteMany({ tournamentId: id });
    await Tournament.findByIdAndDelete(id);

    // Delete images from AWS S3
    if (s3Urls.length > 0 && process.env.S3_BUCKET) {
      const bucket = process.env.S3_BUCKET;
      for (const url of s3Urls) {
        try {
          const urlObj = new URL(url);
          const key = decodeURIComponent(urlObj.pathname.slice(1));
          
          const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
          await s3.send(command);
        } catch(e) {
          console.error(`Failed to delete S3 object: ${url}`, e);
        }
      }
    }

    res.json({ message: "Tournament and all related data completely deleted" });
  } catch (err) {
    console.error("Delete tournament error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

