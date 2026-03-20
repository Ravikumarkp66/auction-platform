const express = require("express");
const router = express.Router();
const https = require("https");

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

const fetchUrl = (url, res, redirectCount = 0) => {
  if (redirectCount > 5) return res.status(500).send("Too many redirects");

  const req = https.get(url, {
    headers: {
      // Pretend to be a browser — this bypasses Drive's server-block
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://drive.google.com/",
    }
  }, (imgRes) => {
    // Follow redirects
    if ([301, 302, 303, 307, 308].includes(imgRes.statusCode)) {
      const location = imgRes.headers.location;
      if (!location) return res.status(500).send("Bad redirect");
      imgRes.resume(); // drain the response
      return fetchUrl(location, res, redirectCount + 1);
    }

    const contentType = imgRes.headers["content-type"] || "";

    // If Drive returned HTML (virus warning page), it means the ID didn't work
    if (contentType.includes("text/html")) {
      return res.status(404).send("Image not accessible");
    }

    res.setHeader("Content-Type", contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    imgRes.pipe(res);
  });

  req.on("error", (e) => {
    console.error("Proxy error:", e.message);
    if (!res.headersSent) res.status(500).send("Fetch failed");
  });

  req.setTimeout(10000, () => {
    req.destroy();
    if (!res.headersSent) res.status(504).send("Timeout");
  });
};

// GET /api/proxy-image?url=<encoded_url>
router.get("/", (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing url");

  const decoded = decodeURIComponent(url);

  // For Google Drive: use the thumbnail API — this NEVER triggers virus scan
  if (decoded.includes("drive.google.com")) {
    const fileId = extractDriveId(decoded);
    if (!fileId) return res.status(400).send("Could not extract Drive file ID");

    // sz=s800 = 800px size, good quality for player cards
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=s800`;
    return fetchUrl(thumbnailUrl, res);
  }

  // Non-Drive URLs: proxy directly
  fetchUrl(decoded, res);
});

module.exports = router;
