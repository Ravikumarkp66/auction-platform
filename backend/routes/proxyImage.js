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

    // CORS already set at router level, but reinforcing for clarity
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
    /uc\?export=download&id=([a-zA-Z0-9_-]{10,})/,
    /open\?id=([a-zA-Z0-9_-]{10,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

// Standard Proxy for S3 and other external hosts
router.get("/", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("Missing url");

  const decoded = decodeURIComponent(url);

  // 1. Special Handling for Google Drive
  if (decoded.includes("drive.google.com")) {
    const fileId = extractDriveId(decoded);
    if (!fileId) return res.status(400).send("Invalid Drive URL");
    
    if (decoded.includes("/export") || decoded.includes("export=download")) {
      return fetchUrl(decoded, res);
    }

    const thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}=s1200`; 
    return fetchUrl(thumbnailUrl, res);
  }

  // 2. Optimized Handling for Our Own S3 Bucket
  const bucket = process.env.S3_BUCKET;
  const isOurS3 = bucket && (decoded.includes(`${bucket}.s3.`) || decoded.includes(`s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${bucket}`));
  
  if (isOurS3) {
    try {
      const { s3 } = require('../config/s3');
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      
      if (s3) {
        const urlObj = new URL(decoded);
        let key = decodeURIComponent(urlObj.pathname);
        
        // Handle virtual-host style (bucket.s3.region...)
        if (decoded.includes(`${bucket}.s3.`)) {
          key = key.startsWith('/') ? key.slice(1) : key;
        } 
        // Handle path style (s3.region.../bucket/...)
        else {
          const parts = key.split('/').filter(Boolean);
          if (parts[0] === bucket) {
            key = parts.slice(1).join('/');
          } else {
            key = key.startsWith('/') ? key.slice(1) : key;
          }
        }
        
        console.log(`[PROXY-S3] Attempting authenticated fetch for Bucket: ${bucket}, Key: ${key}`);
        
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await s3.send(command);

        console.log(`[PROXY-S3] Success: ${key} (${response.ContentType})`);
        res.setHeader("Content-Type", response.ContentType || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=86400");

        if (response.Body.transformToUint8Array) {
          const buffer = Buffer.from(await response.Body.transformToUint8Array());
          return res.send(buffer);
        } else if (response.Body.pipe) {
          return response.Body.pipe(res);
        } else {
          // Fallback for other stream types
          const chunks = [];
          for await (const chunk of response.Body) {
            chunks.push(chunk);
          }
          return res.send(Buffer.concat(chunks));
        }
      }
    } catch (s3Err) {
      console.error(`[PROXY-S3] Auth Error for ${decoded}:`, s3Err.message);
      // If it's a 403 from S3, it means the keys are likely wrong or insufficient
      if (s3Err.name === 'NoSuchKey') {
         return res.status(404).send("Image not found in S3");
      }
    }
  }

  // 3. Standard Public Proxy (Fallback)
  console.log(`[PROXY] Falling back to public fetch for: ${decoded}`);
  await fetchUrl(decoded, res);
});

module.exports = router;
