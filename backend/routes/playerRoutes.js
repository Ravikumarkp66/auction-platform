const express = require("express");
const router = express.Router();
const Player = require("../models/Player");

// Get all players
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const players = await Player.find(filter);
    res.json(players);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

// Update player info
router.patch("/:id", async (req, res) => {
  try {
    console.log(`Updating player ${req.params.id}:`, req.body);
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!player) return res.status(404).json({ message: "Player not found" });
    res.json(player);
  } catch (err) {
    console.error(`Error updating player ${req.params.id}:`, err);
    res.status(400).json({ message: err.message });
  }
});


module.exports = router;

