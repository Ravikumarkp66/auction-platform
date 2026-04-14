const express = require("express");
const router = express.Router();
const Location = require("../models/Location");

// 1. Get List of Available States
router.get("/states", async (req, res) => {
  try {
    const states = await Location.distinct("state");
    res.json(states);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. Get Districts (Filtered by State)
router.get("/districts", async (req, res) => {
  try {
    const { state } = req.query;
    const districts = await Location.distinct("district", state ? { state } : {});
    res.json(districts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 3. Get Taluks (Filtered by District or All)
router.get("/taluks", async (req, res) => {
  try {
    const { district } = req.query;
    const filter = district ? { district } : {};
    
    // Use find().sort() instead of distinct() to preserve sequence order
    const docs = await Location.find(filter).sort({ sequence: 1, taluk: 1 });
    
    // Extract unique taluks while preserving sequence
    const taluks = [];
    const seen = new Set();
    docs.forEach(doc => {
        if (!seen.has(doc.taluk)) {
            seen.add(doc.taluk);
            taluks.push(doc.taluk);
        }
    });

    res.json(taluks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Get Hoblis (Filtered by Taluk)
router.get("/hoblis", async (req, res) => {
  try {
    const { taluk } = req.query;
    if (!taluk) return res.status(400).json({ message: "Taluk is required" });
    
    const docs = await Location.find({ taluk }).sort({ sequence: 1, hobli: 1 });
    
    const hoblis = [];
    const seen = new Set();
    docs.forEach(doc => {
        if (!seen.has(doc.hobli)) {
            seen.add(doc.hobli);
            hoblis.push(doc.hobli);
        }
    });

    res.json(hoblis);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Add New Location (Admin)
router.post("/", async (req, res) => {
  try {
    const { state, district, taluk, hobli } = req.body;
    if (!taluk || !hobli) {
      return res.status(400).json({ message: "Taluk and Hobli are required" });
    }
    
    // Check if combo already exists
    const existing = await Location.findOne({ taluk, hobli });
    if (existing) return res.status(409).json({ message: "This Hobli is already registered for this Taluk" });

    const newLocation = new Location({
       state: state || "Karnataka",
       district: district || "Custom",
       taluk,
       hobli
    });

    await newLocation.save();
    res.status(201).json(newLocation);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 6. Get All Locations (Admin)
router.get("/all", async (req, res) => {
    try {
        const locations = await Location.find().sort({ sequence: 1, taluk: 1, hobli: 1 });
        res.json(locations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 7. Update sequence (Admin)
router.put("/reorder", async (req, res) => {
    try {
        const { order } = req.body; // Array of IDs in the new order
        if (!Array.isArray(order)) return res.status(400).json({ message: "Order array required" });

        const bulkOps = order.map((id, index) => ({
            updateOne: {
                filter: { _id: id },
                update: { $set: { sequence: index } }
            }
        }));

        await Location.bulkWrite(bulkOps);
        res.json({ message: "Sequence updated successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 8. Delete Location (Admin)
router.delete("/:id", async (req, res) => {
    try {
        await Location.findByIdAndDelete(req.params.id);
        res.json({ message: "Location deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
