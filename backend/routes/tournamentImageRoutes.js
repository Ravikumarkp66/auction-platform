const express = require('express');
const router = express.Router();
const {
  getTournamentImages,
  createTournamentImage,
  updateTournamentImage,
  deleteTournamentImage
} = require('../controllers/tournamentImageController');

// GET /api/tournament-images - Get all tournament images
router.get('/', getTournamentImages);

// POST /api/tournament-images - Create new tournament image
router.post('/', createTournamentImage);

// PUT /api/tournament-images/:id - Update tournament image
router.put('/:id', updateTournamentImage);

// DELETE /api/tournament-images/:id - Delete tournament image
router.delete('/:id', deleteTournamentImage);

module.exports = router;
