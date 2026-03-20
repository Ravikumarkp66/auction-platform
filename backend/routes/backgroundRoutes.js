const express = require('express');
const router = express.Router();
const Background = require('../models/Background');

// GET /api/backgrounds - Get all backgrounds
router.get('/', async (req, res) => {
  try {
    const { tournamentId } = req.query;
    const filter = { isActive: true };
    if (tournamentId) filter.tournamentId = tournamentId;
    
    const backgrounds = await Background.find(filter);
    res.json(backgrounds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/backgrounds/:name - Get background by name
router.get('/:name', async (req, res) => {
  try {
    const background = await Background.findOne({ name: req.params.name, isActive: true });
    if (!background) return res.status(404).json({ message: 'Background not found' });
    res.json(background);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/backgrounds - Create new background
router.post('/', async (req, res) => {
  try {
    const { name, imageUrl, tournamentId } = req.body;
    
    // Check if background with same name exists in this auction context
    const filter = { name };
    if (tournamentId) filter.tournamentId = tournamentId;
    
    let background = await Background.findOne(filter);
    
    if (background) {
      background.imageUrl = imageUrl;
      background.isActive = true;
      if (tournamentId) background.tournamentId = tournamentId;
      await background.save();
    } else {
      background = new Background({ name, imageUrl, tournamentId });
      await background.save();
    }
    
    res.status(201).json(background);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/backgrounds/:id - Deactivate background
router.delete('/:id', async (req, res) => {
  try {
    const background = await Background.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!background) return res.status(404).json({ message: 'Background not found' });
    res.json({ message: 'Background deactivated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
