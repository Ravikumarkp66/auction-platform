const express = require("express");
const router = express.Router();
const Asset = require("../models/Asset");

// Get all assets (optional filter by type)
router.get("/", async (req, res) => {
  try {
    const { type } = req.query;
    const filter = {};
    if (type) filter.type = type;
    const assets = await Asset.find(filter).sort({ createdAt: -1 });
    res.json(assets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Save a new asset to library
router.post("/", async (req, res) => {
  try {
    const asset = new Asset(req.body);
    await asset.save();
    res.status(201).json(asset);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete an asset
router.delete("/:id", async (req, res) => {
  try {
    const asset = await Asset.findByIdAndDelete(req.params.id);
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json({ message: "Asset deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
