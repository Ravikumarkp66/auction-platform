const TournamentImage = require('../models/TournamentImage');

// Get all tournament images
const getTournamentImages = async (req, res) => {
  try {
    const images = await TournamentImage.find({ isActive: true }).sort({ order: 1 });
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
    const { name, location, year, teams, imageUrl, order } = req.body;
    
    const newImage = new TournamentImage({
      name,
      location,
      year,
      teams,
      imageUrl,
      order: order || 0
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

// Delete tournament image
const deleteTournamentImage = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedImage = await TournamentImage.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    
    if (!deletedImage) {
      return res.status(404).json({
        success: false,
        message: 'Tournament image not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Tournament image deleted successfully'
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
