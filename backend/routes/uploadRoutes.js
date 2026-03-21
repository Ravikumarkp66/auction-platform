const express = require('express');
const router = express.Router();

// ─── S3 Pre-signed URL ───────────────────────────────────────────────────
let s3, PutObjectCommand, getSignedUrl;
try {
  ({ s3 } = require('../config/s3'));
  ({ PutObjectCommand } = require('@aws-sdk/client-s3'));
  ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
} catch (e) {
  console.warn('AWS SDK not available, S3 uploads disabled');
}

/**
 * GET /api/upload/get-upload-url
 * Query params:
 *   fileType  — e.g. "image/jpeg"
 *   folder    — optional, one of: players | teams | backgrounds  (default: players)
 *
 * Returns { uploadUrl, fileUrl }
 */
// ─── Direct URL Proxy to S3 (Convert Drive to S3) ─────────────────────────
/**
 * Helper to process a single image URL:
 * 1. Parse Drive ID if needed
 * 2. Download from source
 * 3. Upload specifically to S3
 */
const processSingleImage = async (url, folder = "players") => {
  if (!url) return null;
  if (!s3 || !process.env.S3_BUCKET) throw new Error("S3 not configured");

  try {
    // 1. Convert Drive link to robust direct download link
    let directUrl = url;
    if (url.includes("drive.google.com")) {
      let fileId = "";
      if (url.includes("/d/")) {
        fileId = url.split("/d/")[1].split("/")[0].split("?")[0].split("#")[0];
      } else if (url.includes("id=")) {
        fileId = new URLSearchParams(url.split("?")[1]).get("id");
      }
      
      if (fileId) {
        directUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=s800`;
      }
    }

    // 2. Download Image (follows redirects)
    const fetchResponse = await fetch(directUrl);
    if (!fetchResponse.ok) {
       throw new Error(`Fetch failed: ${fetchResponse.statusText}`);
    }
    
    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = fetchResponse.headers.get("content-type") || "image/jpeg";
    const ext = contentType.split("/")[1] || "jpg";
    const key = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2,8)}_proxy.${ext}`;

    // 3. Upload to S3
    const uploadParams = {
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };

    await s3.send(new PutObjectCommand(uploadParams));
    
    const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    return { originalUrl: url, s3Url, success: true };
  } catch (err) {
    console.error(`[PROXY] Failed processing ${url}:`, err.message);
    return { originalUrl: url, error: err.message, success: false };
  }
};

/**
 * POST /api/upload/proxy-url
 * Body: { url, folder }
 * Returns { s3Url }
 */
router.post("/proxy-url", async (req, res) => {
  const { url, folder = "players" } = req.body;
  const result = await processSingleImage(url, folder);
  if (result.success) {
    res.json({ s3Url: result.s3Url });
  } else {
    res.status(500).json({ error: result.error });
  }
});

/**
 * POST /api/upload/proxy-batch
 * Body: { urls: [string], folder: string }
 * Batch process images (e.g. from Excel imports)
 */
router.post("/proxy-batch", async (req, res) => {
  const { urls, folder = "players" } = req.body;
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: "urls array is required" });
  }

  console.log(`[PROXY BATCH] Processing ${urls.length} images...`);

  // Increased concurrency to process batches faster (20 images at a time)
  const CONCURRENCY = 20;
  const results = [];
  
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const chunk = urls.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(url => processSingleImage(url, folder))
    );
    results.push(...chunkResults);
    console.log(`[PROXY BATCH] Progress: ${results.length}/${urls.length}`);
  }

  res.json({ results });
});

router.get("/get-upload-url", async (req, res) => {
  if (!s3 || !process.env.S3_BUCKET || process.env.AWS_ACCESS_KEY === "your_access_key_here") {
    return res.status(503).json({ error: "S3 is not configured. Please set AWS credentials in .env" });
  }

  try {
    const { fileType = "image/jpeg", folder = "players" } = req.query;
    const ext = fileType.split("/")[1] || "jpg";
    const key = `${folder}/${Date.now()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({ uploadUrl, fileUrl });
  } catch (err) {
    console.error("S3 pre-sign error:", err);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

router.get("/proxy-image", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send("URL is required");

  try {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const bucket = process.env.S3_BUCKET;
    const isOurS3 = url.includes(bucket) && s3;

    if (isOurS3) {
      try {
        const urlObj = new URL(url);
        const key = decodeURIComponent(urlObj.pathname.slice(1));
        const command = new GetObjectCommand({ Bucket: bucket, Key: key });
        const response = await s3.send(command);
        
        res.setHeader("Content-Type", response.ContentType || "image/jpeg");
        res.setHeader("Access-Control-Allow-Origin", "*");
        
        // AWS SDK v3 streams body
        if (response.Body.pipe) {
           return response.Body.pipe(res);
        } else {
           const buffer = Buffer.from(await response.Body.transformToUint8Array());
           return res.send(buffer);
        }
      } catch (s3Err) {
        console.error("[IMAGE PROXY S3 ERROR]:", s3Err.message);
        // Fallback to fetch if S3 fetch fails
      }
    }

    const fetchResponse = await fetch(url);
    if (!fetchResponse.ok) throw new Error(`Fetch failed: ${fetchResponse.statusText}`);

    const contentType = fetchResponse.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);

    // Allow CORS for this proxy
    res.setHeader("Access-Control-Allow-Origin", "*");
    
    const arrayBuffer = await fetchResponse.headers.get("content-type")?.includes("image") 
      ? await fetchResponse.arrayBuffer()
      : null;
      
    if (!arrayBuffer) {
       const stream = fetchResponse.body;
       if (stream && stream.pipe) return stream.pipe(res);
       const text = await fetchResponse.text();
       return res.send(text);
    }
    
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("[IMAGE PROXY] Failed:", err.message);
    res.status(500).send("Failed to proxy image");
  }
});

module.exports = router;
