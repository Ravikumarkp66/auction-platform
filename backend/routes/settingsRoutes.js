const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for local storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = 'uploads/brand';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ storage });

// Get all general settings
router.get('/', async (req, res) => {
  try {
    const settingsList = await Settings.find();
    const settings = settingsList.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    successResponse(res, settings);
  } catch (err) {
    errorResponse(res, err.message);
  }
});

// Update a setting
router.post('/', async (req, res) => {
  try {
    const { key, value } = req.body;
    const setting = await Settings.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    );
    successResponse(res, setting);
  } catch (err) {
    errorResponse(res, err.message);
  }
});

// Handle logo upload
router.post('/upload-logo', upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded');
    
    const logoUrl = `/uploads/brand/${req.file.filename}`;
    
    // Update setting in database
    await Settings.findOneAndUpdate(
      { key: 'brandLogo' },
      { key: 'brandLogo', value: logoUrl },
      { upsert: true }
    );
    
    successResponse(res, { logoUrl });
  } catch (err) {
    errorResponse(res, err.message);
  }
});

// Helper functions (simplified for this route)
function successResponse(res, data) {
  res.json({ success: true, data });
}

function errorResponse(res, message) {
  res.status(500).json({ success: false, message });
}

module.exports = router;
