const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Admin login verification endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map(e => e.trim());
    const adminPassword = (process.env.ADMIN_PASSWORD || "").trim();

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedPassword = password.trim();

    if (adminEmails.includes(normalizedEmail) && normalizedPassword === adminPassword) {
      const token = jwt.sign(
        { userId: normalizedEmail, email: normalizedEmail, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        success: true,
        token,
        user: {
          id: normalizedEmail,
          email: normalizedEmail,
          name: "Admin",
          role: "admin",
          token // Also attach to user object for NextAuth
        }
      });
    }

    return res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error("Backend auth error:", err);
    res.status(500).json({ success: false, message: "Server error during authentication" });
  }
});

// Sync Google Login with Backend JWT
router.post('/google-sync', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const adminEmails = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map(e => e.trim());
    const normalizedEmail = email.toLowerCase().trim();

    if (adminEmails.includes(normalizedEmail)) {
      const token = jwt.sign(
        { userId: normalizedEmail, email: normalizedEmail, role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({ success: true, token, role: "admin" });
    }

    return res.json({ success: true, role: "user" }); // No token for non-admins
  } catch (err) {
    console.error("Google sync error:", err);
    res.status(500).json({ message: "Sync failed" });
  }
});

module.exports = router;
