const Tournament = require('../models/Tournament');
const Player = require('../models/Player');
const { s3, PutObjectCommand } = require('../config/s3');

let ioInstance = null;
const setIo = (instance) => { ioInstance = instance; };

/**
 * Robust Google Drive to direct URL converter
 */
const getDirectUrl = (url) => {
  if (!url || !url.includes("drive.google.com")) return url;
  
  let fileId = "";
  if (url.includes("/d/")) {
    fileId = url.split("/d/")[1].split("/")[0].split("?")[0].split("#")[0];
  } else if (url.includes("id=")) {
    // Correctly handle query parameters
    try {
        const parts = url.split("?");
        if (parts[1]) {
            const search = parts[1].split("&").find(p => p.startsWith("id="));
            if (search) fileId = search.split("=")[1];
        }
    } catch (e) {
        // Fallback
    }
  }
  
  return fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : url;
};

const fetchWithTimeout = async (url, options = {}) => {
  const { timeout = 15000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://drive.google.com/',
        ...options.headers
      }
    });
    return response;
  } finally {
    clearTimeout(id);
  }
};

/**
 * Process a single player's image
 */
const processPlayerImage = async (playerId, retries = 3) => {
  try {
    const player = await Player.findById(playerId);
    if (!player || !player.photo || !player.photo.drive || player.photo.status === "done") return true;

    // 1. Extract File ID and Build Download URL
    let directUrl = getDirectUrl(player.photo.drive);
    if (directUrl.includes("id=")) {
        const id = directUrl.split("id=")[1].split("&")[0];
        directUrl = `https://drive.google.com/uc?export=download&id=${id}&confirm=t`;
    }

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            console.log(`[IMAGE PROCESSOR] Processing ${player.name} (Attempt ${attempt+1})`);
            
            let response = await fetchWithTimeout(directUrl);
            
            // 2. Handle Google's "Confirm Download" / Virus Scan Page
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("text/html")) {
                const html = await response.text();
                // Find the confirm code or link (Google usually uses a confirm parameter in a form or link)
                const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/);
                if (confirmMatch && confirmMatch[1]) {
                    const confirmUrl = `${directUrl}&confirm=${confirmMatch[1]}`;
                    console.log(`[IMAGE PROCESSOR] Virus scan detected for ${player.name}, following confirm link...`);
                    response = await fetchWithTimeout(confirmUrl);
                } else {
                    throw new Error("Received HTML but could not find confirmation code");
                }
            }

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Validate buffer size (some drive links return very small error pages)
            if (buffer.length < 500) throw new Error("File too small - likely invalid response");

            const finalType = response.headers.get("content-type") || "image/jpeg";
            const ext = finalType.split("/")[1]?.split(";")[0] || "jpg";
            const key = `players/${Date.now()}_${playerId}.${ext}`;

            await s3.send(new PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: finalType,
            }));

            const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

            // Update DB
            player.photo.s3 = s3Url;
            player.photo.status = "done";
            player.imageUrl = s3Url;
            await player.save();

            if (ioInstance) {
                ioInstance.emit('playerUpdate', { id: player._id, photo: player.photo, imageUrl: s3Url });
            }
            return true;
        } catch (err) {
            console.error(`[IMAGE PROCESSOR] Failed ${player.name}:`, err.message);
            if (attempt === retries - 1) {
                player.photo.status = "failed";
                await player.save();
                return false;
            }
            // Exponential backoff
            await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
        }
    }
  } catch (err) {
    console.error(`[IMAGE PROCESSOR] Global error for player ${playerId}:`, err.message);
    return false;
  }
};

/**
 * Main tournament image processing loop
 */
const startImageProcessing = async (tournamentId) => {
  try {
    const players = await Player.find({ 
      tournamentId, 
      "photo.status": { $ne: "done" },
      "photo.drive": { $exists: true, $ne: null }
    });

    if (players.length === 0) {
      await Tournament.findByIdAndUpdate(tournamentId, { 
        "imageProcessing.status": "done" 
      });
      return;
    }

    // Set total count
    await Tournament.findByIdAndUpdate(tournamentId, {
      $set: {
        "imageProcessing.total": players.length,
        "imageProcessing.completed": 0,
        "imageProcessing.failed": 0,
        "imageProcessing.status": "processing"
      }
    });

    const CONCURRENCY = 5; // Start with 5 for safety
    const queue = [...players];
    let completedCount = 0;
    let failedCount = 0;

    const worker = async () => {
      while (queue.length > 0) {
        const player = queue.shift();
        if (!player) break;

        const success = await processPlayerImage(player._id);
        
        if (success) completedCount++;
        else failedCount++;

        // Batch update DB every few images to reduce load
        if ((completedCount + failedCount) % 5 === 0 || queue.length === 0) {
            await Tournament.findByIdAndUpdate(tournamentId, {
                $set: {
                    "imageProcessing.completed": completedCount,
                    "imageProcessing.failed": failedCount
                }
            });
        }
      }
    };

    // Parallel execution
    await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, players.length) }).map(() => worker())
    );

    // Final update
    await Tournament.findByIdAndUpdate(tournamentId, {
      $set: { "imageProcessing.status": "done" }
    });
    
    console.log(`[IMAGE PROCESSOR] Done: ${completedCount} success, ${failedCount} failed`);
  } catch (err) {
    console.error(`[IMAGE PROCESSOR] Tournament ${tournamentId} failed:`, err.message);
  }
};

module.exports = { startImageProcessing, setIo };
