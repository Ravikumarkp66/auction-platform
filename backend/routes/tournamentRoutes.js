const express = require("express");
const router = express.Router();
const Tournament = require("../models/Tournament");
const Team = require("../models/Team");
const Player = require("../models/Player");

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
      teams, players 
    } = req.body;

    // Check if an active one already exists with the same name to prevent duplicates
    const existing = await Tournament.findOne({ name, status: "active" });
    if (existing) {
      return res.json({ tournamentId: existing._id, message: "Existing active tournament found" });
    }
    
    // 1. Save Tournament
    const tournament = new Tournament({ 
      name, organizerName, organizerLogo, numTeams, iconsPerTeam,
      baseBudget, defaultBasePrice, squadSize, auctionSlots,
      status: "active" // Defaulting to active for simple flow, can be "draft" if needed
    });
    const savedTournament = await tournament.save();

    // 2. Save Teams
    const teamPromises = teams.map(team => {
      return new Team({
        name: team.name,
        shortName: team.shortName,
        logoUrl: team.logoUrl,
        tournamentId: savedTournament._id,
        remainingBudget: baseBudget,
        color: team.color
      }).save();
    });
    const savedTeams = await Promise.all(teamPromises);

    // 3. Save Players to this tournament
    const playerPromises = players.map(player => {
      let teamId = null;
      if (player.isIcon && player.team) {
        const foundTeam = savedTeams.find(t => t.name === player.team);
        if (foundTeam) teamId = foundTeam._id;
      }

      return new Player({
        ...player,
        tournamentId: savedTournament._id,
        team: teamId || player.team, // Use ID if icon, otherwise name (or null)
        status: player.isIcon ? "sold" : "available",
        soldPrice: player.isIcon ? 0 : (player.soldPrice || 0),
      }).save();
    });
    await Promise.all(playerPromises);

    res.status(201).json({
      tournamentId: savedTournament._id,
      shortId: savedTournament.shortId,
      message: "Tournament and data saved successfully"
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all past tournaments
router.get("/", async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 });
    
    // Fetch player counts for each tournament
    const tournamentsWithStats = await Promise.all(
      tournaments.map(async (tournament) => {
        const players = await Player.find({ tournamentId: tournament._id });
        return {
          ...tournament.toObject(),
          players: players,
          playerCount: players.length,
          iconCount: players.filter(p => p.isIcon).length
        };
      })
    );
    
    res.json(tournamentsWithStats);
  } catch (err) {
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
    } else if (id.length === 24) {
      tournament = await Tournament.findById(id);
    }

    if (!tournament) return res.status(404).json({ message: "Tournament not found" });

    // Important: Use the actual _id for fetching related teams/players
    const teams = await Team.find({ tournamentId: tournament._id });
    const players = await Player.find({ tournamentId: tournament._id });
    
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

module.exports = router;

