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
router.get('/get-upload-url', async (req, res) => {
  if (!s3 || !process.env.S3_BUCKET || process.env.AWS_ACCESS_KEY === 'your_access_key_here') {
    return res.status(503).json({ error: 'S3 is not configured. Please set AWS credentials in .env' });
  }

  try {
    const { fileType = 'image/jpeg', folder = 'players' } = req.query;
    const ext = fileType.split('/')[1] || 'jpg';
    const key = `${folder}/${Date.now()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 }); // 5 minutes
    const fileUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    res.json({ uploadUrl, fileUrl });
  } catch (err) {
    console.error('S3 pre-sign error:', err);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

module.exports = router;
