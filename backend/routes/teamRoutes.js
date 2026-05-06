const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const Player = require("../models/Player");

// Get all teams
router.get("/", async (req, res) => {
  try {
    const { tournamentId } = req.query;
    const filter = tournamentId ? { tournamentId } : {};
    const teams = await Team.find(filter);
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new team
router.post("/", async (req, res) => {
  try {
    const { name, shortName, location, tournamentId, remainingBudget, logoUrl } = req.body;
    
    const newTeam = new Team({
      name,
      shortName,
      location,
      tournamentId,
      logoUrl,
      remainingBudget: remainingBudget || 1000000
    });
    
    const savedTeam = await newTeam.save();
    res.status(201).json(savedTeam);
  } catch (err) {
    console.error("Error creating team:", err);
    res.status(400).json({ message: err.message });
  }
});

// Bulk create teams
router.post("/bulk", async (req, res) => {
  try {
    const { teams } = req.body;
    if (!Array.isArray(teams)) {
      return res.status(400).json({ message: "Teams must be an array" });
    }

    const savedTeams = await Team.insertMany(teams);
    res.status(201).json(savedTeams);
  } catch (err) {
    console.error("Error bulk creating teams:", err);
    res.status(400).json({ message: err.message });
  }
});

// Get teams by tournament ID
router.get("/tournament/:tournamentId", async (req, res) => {
  try {
    const teams = await Team.find({ tournamentId: req.params.tournamentId });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single team by ID with squad details
router.get("/:id", async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    
    // Get players assigned to this team
    const players = await Player.find({ team: req.params.id });
    
    // Format response with logo and squad
    const teamWithSquad = {
      ...team.toObject(),
      logo: team.logoUrl,
      purse: team.remainingBudget,
      squad: players
    };
    
    res.json(teamWithSquad);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update team logo
router.patch("/:id/logo", async (req, res) => {
  try {
    const { logoUrl } = req.body;
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      { logoUrl },
      { new: true }
    );
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json(team);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


// Update team (general update endpoint)
router.patch("/:id", async (req, res) => {
  try {
    console.log(`Updating team ${req.params.id}:`, req.body);
    const team = await Team.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    res.json(team);
  } catch (err) {
    console.error(`Error updating team ${req.params.id}:`, err);
    res.status(400).json({ message: err.message });
  }
});

// Delete a team
router.delete("/:id", async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);
    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }
    // Also clear team reference from players
    await Player.updateMany({ team: req.params.id }, { $set: { team: null, status: 'available' } });
    res.json({ message: "Team deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Bulk delete teams (by ID list)
router.post("/bulk-delete", async (req, res) => {
  try {
    const { teamIds } = req.body;
    if (!Array.isArray(teamIds)) {
      return res.status(400).json({ message: "teamIds must be an array" });
    }
    await Team.deleteMany({ _id: { $in: teamIds } });
    await Player.updateMany({ team: { $in: teamIds } }, { $set: { team: null, status: 'available' } });
    res.json({ message: `${teamIds.length} teams deleted successfully` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
