const express = require('express');
const router = express.Router();
const Background = require('../models/Background');

// GET /api/backgrounds - Get all backgrounds
router.get('/', async (req, res) => {
  try {
    const backgrounds = await Background.find({ isActive: true });
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

// POST /api/backgrounds - Create new background (already S3 URL from frontend)
router.post('/', async (req, res) => {
  try {
    const { name, imageUrl } = req.body;
    
    // Check if background with same name exists
    let background = await Background.findOne({ name });
    
    if (background) {
      background.imageUrl = imageUrl;
      background.isActive = true;
      await background.save();
    } else {
      background = new Background({ name, imageUrl });
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
