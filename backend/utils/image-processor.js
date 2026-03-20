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

/**
 * Process a single player's image
 */
const processPlayerImage = async (playerId, retries = 2) => {
  try {
    const player = await Player.findById(playerId);
    if (!player || !player.photo || !player.photo.drive || player.photo.status === "done") return true;

    const directUrl = getDirectUrl(player.photo.drive);

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const fetchResponse = await fetch(directUrl);
            if (!fetchResponse.ok) throw new Error(`Fetch failed: ${fetchResponse.status}`);

            const arrayBuffer = await fetchResponse.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const contentType = fetchResponse.headers.get("content-type") || "image/jpeg";
            const ext = contentType.split("/")[1]?.split(";")[0] || "jpg";
            const key = `players/${Date.now()}_${playerId}_${attempt}.${ext}`;

            const uploadParams = {
                Bucket: process.env.S3_BUCKET,
                Key: key,
                Body: buffer,
                ContentType: contentType,
            };

            await s3.send(new PutObjectCommand(uploadParams));
            const s3Url = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

            // Update DB
            player.photo.s3 = s3Url;
            player.photo.status = "done";
            player.imageUrl = s3Url; // Legacy support
            await player.save();

            if (ioInstance) {
                ioInstance.emit('playerUpdate', { 
                  id: player._id, 
                  photo: player.photo, 
                  imageUrl: s3Url 
                });
            }
            return true;
        } catch (err) {
            console.error(`[IMAGE PROCESSOR] Attempt ${attempt+1} failed for ${player.name}:`, err.message);
            if (attempt === retries) {
                player.photo.status = "failed";
                await player.save();
                return false;
            }
            // Small wait before retry
            await new Promise(r => setTimeout(r, 1000));
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
