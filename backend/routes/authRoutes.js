const express = require('express');
const router = express.Router();

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

    console.log(`[AUTH] Attempt for: ${normalizedEmail}`);
    console.log(`[AUTH] Admin Emails: ${JSON.stringify(adminEmails)}`);
    
    if (adminEmails.includes(normalizedEmail) && normalizedPassword === adminPassword) {
      return res.json({
        success: true,
        user: {
          id: normalizedEmail,
          email: normalizedEmail,
          name: "Admin",
          role: "admin"
        }
      });
    }

    return res.status(401).json({ success: false, message: "Invalid credentials" });
  } catch (err) {
    console.error("Backend auth error:", err);
    res.status(500).json({ success: false, message: "Server error during authentication" });
  }
});

module.exports = router;
