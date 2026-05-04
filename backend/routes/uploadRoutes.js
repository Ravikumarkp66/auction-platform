const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/authorizationMiddleware');
const { validateImageUrl } = require('../utils/sanitizer');

// ─── S3 Pre-signed URL ───────────────────────────────────────────────────
let s3, PutObjectCommand, getSignedUrl;
try {
  ({ s3 } = require('../config/s3'));
  ({ PutObjectCommand } = require('@aws-sdk/client-s3'));
  ({ getSignedUrl } = require('@aws-sdk/s3-request-presigner'));
} catch (e) {
  console.warn('AWS SDK not available, S3 uploads disabled');
}

// ✅ Allowed file types for security
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_FOLDERS = ['players', 'teams', 'backgrounds', 'squads'];

// ✅ Whitelist of image sources to prevent SSRF
const ALLOWED_IMAGE_SOURCES = [
  'drive.google.com',
  'lh3.googleusercontent.com',
  `${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com`
];

/**
 * Helper to process a single image URL with SSRF protection
 * 1. Validate URL against whitelist
 * 2. Download from source
 * 3. Upload specifically to S3
 */
const processSingleImage = async (url, folder = "players") => {
  if (!url) return null;
  if (!s3 || !process.env.S3_BUCKET) throw new Error("S3 not configured");

  try {
    // ✅ Validate URL to prevent SSRF
    validateImageUrl(url);

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

    // 2. Download Image with timeout (follows redirects)
    const fetchResponse = await fetch(directUrl, {
      timeout: 10000 // 10 second timeout
    });
    if (!fetchResponse.ok) {
      throw new Error(`Fetch failed: ${fetchResponse.statusText}`);
    }

    // ✅ Check file size (max 5MB)
    const contentLength = fetchResponse.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      throw new Error("File size exceeds 5MB limit");
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = fetchResponse.headers.get("content-type") || "image/jpeg";

    // ✅ Validate content type
    if (!ALLOWED_FILE_TYPES.includes(contentType)) {
      throw new Error(`File type not allowed: ${contentType}`);
    }

    const ext = contentType.split("/")[1] || "jpg";
    const key = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}_proxy.${ext}`;

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
router.post("/proxy-url",
  authMiddleware,
  authorize(['admin']),
  body('url').isURL().withMessage('Invalid URL format'),
  body('folder').isIn(ALLOWED_FOLDERS).withMessage('Invalid folder'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { url, folder = "players" } = req.body;
    const result = await processSingleImage(url, folder);
    if (result.success) {
      res.json({ s3Url: result.s3Url });
    } else {
      res.status(500).json({ error: result.error });
    }
  }
);

/**
 * POST /api/upload/proxy-batch
 * Body: { urls: [string], folder: string }
 * Batch process images (e.g. from Excel imports)
 */
router.post("/proxy-batch",
  authMiddleware,
  authorize(['admin']),
  body('urls').isArray().withMessage('urls must be an array'),
  body('folder').isIn(ALLOWED_FOLDERS).withMessage('Invalid folder'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { urls, folder = "players" } = req.body;

    console.log(`[PROXY BATCH] Processing ${urls.length} images...`);

    // Concurrency limit to prevent resource exhaustion
    const CONCURRENCY = 10;
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
  }
);

router.get("/get-upload-url",
  authMiddleware,
  async (req, res) => {
    if (!s3 || !process.env.S3_BUCKET) {
      return res.status(503).json({ error: "S3 is not configured" });
    }

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fileType = "image/jpeg", folder = "players" } = req.query;

      // ✅ Validate file type and folder
      if (!ALLOWED_FILE_TYPES.includes(fileType)) {
        return res.status(400).json({ error: "File type not allowed" });
      }
      if (!ALLOWED_FOLDERS.includes(folder)) {
        return res.status(400).json({ error: "Invalid folder" });
      }

      const ext = fileType.split("/")[1] || "jpg";
      const key = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
      const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

      res.json({ uploadUrl, fileUrl });
    } catch (err) {
      console.error("S3 pre-sign error:", err);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  }
);

router.get("/proxy-image", async (req, res) => {
  const { url } = req.query;
  console.log(`[PROXY-IMAGE REQUEST]: ${url}`);
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
