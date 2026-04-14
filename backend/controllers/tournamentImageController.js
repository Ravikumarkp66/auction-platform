const TournamentImage = require('../models/TournamentImage');

const getTournamentImages = async (req, res) => {
  try {
    const { tournamentId, all } = req.query;
    const filter = {};
    if (all !== 'true') filter.isActive = true;

    if (tournamentId === 'landing') {
      filter.$or = [{ tournamentId: { $exists: false } }, { tournamentId: null }];
    } else if (tournamentId) {
      filter.tournamentId = tournamentId;
    }
    
    const images = await TournamentImage.find(filter).sort({ order: 1 });
    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching tournament images',
      error: error.message
    });
  }
};

// Create new tournament image
const createTournamentImage = async (req, res) => {
  try {
    const { name, location, year, teams, imageUrl, order, tournamentId } = req.body;
    
    const newImage = new TournamentImage({
      name,
      location,
      year,
      teams,
      imageUrl,
      order: order || 0,
      tournamentId
    });

    const savedImage = await newImage.save();
    res.status(201).json({
      success: true,
      data: savedImage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating tournament image',
      error: error.message
    });
  }
};

// Update tournament image
const updateTournamentImage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedImage = await TournamentImage.findByIdAndUpdate(
      id, 
      updates, 
      { new: true, runValidators: true }
    );
    
    if (!updatedImage) {
      return res.status(404).json({
        success: false,
        message: 'Tournament image not found'
      });
    }
    
    res.json({
      success: true,
      data: updatedImage
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating tournament image',
      error: error.message
    });
  }
};

// Delete tournament image (Hard Delete)
const deleteTournamentImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedImage = await TournamentImage.findByIdAndDelete(id);
    
    if (!deletedImage) {
      return res.status(404).json({
        success: false,
        message: 'Tournament image not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Tournament image deleted permanently from database'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting tournament image',
      error: error.message
    });
  }
};

module.exports = {
  getTournamentImages,
  createTournamentImage,
  updateTournamentImage,
  deleteTournamentImage
};
