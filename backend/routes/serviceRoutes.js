const express = require('express');
const router = express.Router();
const Service = require('../models/Service');

// GET all services
router.get('/', async (req, res) => {
  try {
    const services = await Service.find().sort({ order: 1 });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CREATE or UPDATE service (Admin only - simplified for now)
router.post('/', async (req, res) => {
  try {
    const { id, title, description, price, icon, order } = req.body;
    let service;
    if (id) {
      service = await Service.findByIdAndUpdate(id, { title, description, price, icon, order }, { new: true });
    } else {
      service = new Service({ title, description, price, icon, order });
      await service.save();
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE service
router.delete('/:id', async (req, res) => {
  try {
    await Service.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
