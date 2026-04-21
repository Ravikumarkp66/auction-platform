const express = require("express");
const router = express.Router();

// Professional Image Proxy - Bypasses CORS and security blocks for S3/Drive images
const fetchUrl = async (url, res, redirectCount = 0) => {
  if (redirectCount > 5) return res.status(500).send("Too many redirects");

  try {
    // Using native fetch (Node 18+) for better reliability and auto-redirect handling
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      }
    });

    if (!response.ok) {
      console.warn(`Proxy Fetch Status: ${response.status} for URL: ${url}`);
      return res.status(response.status).send(`Upstream returned ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/html")) {
      return res.status(403).send("Resource is a page, not an image");
    }

    // Set CORS headers to allow frontend canvas manipulation
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Proxy System Error:", error.message);
    if (!res.headersSent) res.status(500).send("Gateway Error");
  }
};

// Extracts Google Drive file ID from any Drive URL format
const extractDriveId = (url) => {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{10,})/,
    /id=([a-zA-Z0-9_-]{10,})/,
    /\/d\/([a-zA-Z0-9_-]{10,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

// GET /api/proxy-image?url=<encoded_url>
router.get("/", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing url");

  const decoded = decodeURIComponent(url);

  // Special Handling for Google Drive
  if (decoded.includes("drive.google.com")) {
    const fileId = extractDriveId(decoded);
    if (!fileId) return res.status(400).send("Invalid Drive URL");
    
    // If it's an export or download link, fetch the ACTUAL content
    if (decoded.includes("/export") || decoded.includes("export=download")) {
      return fetchUrl(decoded, res);
    }

    // Otherwise, default to high-res thumbnail for images
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=s1200`; 
    return fetchUrl(thumbnailUrl, res);
  }

  // Standard Proxy for S3 and other external hosts
  await fetchUrl(decoded, res);
});

module.exports = router;
