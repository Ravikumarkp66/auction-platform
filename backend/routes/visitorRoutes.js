const express = require('express');
const router = express.Router();
const Visitor = require('../models/Visitor');
const UserLog = require('../models/UserLog');

// Log a visit
router.post('/log', async (req, res) => {
  try {
    const { path, sessionID } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Don't log if it's an admin path
    if (path && path.startsWith('/admin')) {
      return res.status(200).json({ success: true, message: 'Admin visit ignored' });
    }

    const visitor = new Visitor({
      ip,
      userAgent,
      path,
      sessionID
    });

    await visitor.save();
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Visitor log error:', err);
    res.status(500).json({ error: 'Failed to log visit' });
  }
});

// Log a user login
router.post('/login-log', async (req, res) => {
  try {
    const { email, name, role } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    let userLog = await UserLog.findOne({ email: email.toLowerCase() });
    if (userLog) {
      userLog.loginCount += 1;
      userLog.lastLogin = Date.now();
      if (name) userLog.name = name;
      if (role) userLog.role = role;
      await userLog.save();
    } else {
      userLog = new UserLog({
        email: email.toLowerCase(),
        name,
        role
      });
      await userLog.save();
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('User log error:', err);
    res.status(500).json({ error: 'Failed to log user login' });
  }
});

// Get all user logs for admin
router.get('/user-logs', async (req, res) => {
  try {
    const logs = await UserLog.find().sort({ lastLogin: -1 });
    const totalUsers = await UserLog.countDocuments();
    res.json({ logs, totalUsers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user logs' });
  }
});

// Get visitor stats for admin
router.get('/stats', async (req, res) => {
  try {
    const totalVisits = await Visitor.countDocuments();
    
    // Unique visitors based on IP in the last 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentUnique = await Visitor.distinct('ip', { timestamp: { $gte: dayAgo } });
    
    // Total unique visitors (all time)
    const totalUnique = await Visitor.distinct('ip');

    // Hits per day for the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyStats = await Visitor.aggregate([
      { $match: { timestamp: { $gte: weekAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const totalUsers = await UserLog.countDocuments();

    res.json({
      totalVisits,
      recentUnique: recentUnique.length,
      totalUnique: totalUnique.length,
      dailyStats,
      totalUsers
    });
  } catch (err) {
    console.error('Visitor stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Get detailed reaches for analytics page
router.get('/reaches', async (req, res) => {
  try {
    const visitors = await Visitor.find().sort({ timestamp: -1 }).limit(500);
    const users = await UserLog.find().sort({ lastLogin: -1 }).limit(500);
    
    res.json({
      success: true,
      visitors,
      users
    });
  } catch (err) {
    console.error('Reaches fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch reaches' });
  }
});

module.exports = router;
