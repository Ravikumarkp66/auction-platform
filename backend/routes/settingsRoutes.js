const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorizationMiddleware');

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

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Invalid file type'));
    }
    cb(null, true);
  }
});

// Get all general settings (Public read)
router.get('/', async (req, res) => {
  try {
    const settingsList = await Settings.find();
    const settings = settingsList.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings" });
  }
});

// Update a setting (Admin Only)
router.post('/',
  authMiddleware,
  authorize(['admin']),
  async (req, res) => {
    try {
      const { key, value } = req.body;

      // Validate key format
      if (!key || typeof key !== 'string' || key.length > 100) {
        return res.status(400).json({ message: "Invalid setting key" });
      }

      const setting = await Settings.findOneAndUpdate(
        { key },
        { key, value },
        { upsert: true, new: true }
      );
      res.json(setting);
    } catch (err) {
      res.status(500).json({ message: "Failed to update setting" });
    }
  }
);

// Handle logo upload (Admin Only)
router.post('/upload-logo',
  authMiddleware,
  authorize(['admin']),
  upload.single('logo'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const logoUrl = `/uploads/brand/${req.file.filename}`;

      // Update setting in database
      await Settings.findOneAndUpdate(
        { key: 'brandLogo' },
        { key: 'brandLogo', value: logoUrl },
        { upsert: true }
      );

      res.json({ success: true, logoUrl });
    } catch (err) {
      res.status(500).json({ message: "Failed to upload logo" });
    }
  }
);

module.exports = router;
