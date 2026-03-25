const express = require("express");
const router = express.Router();
const Team = require("../models/Team");
const Player = require("../models/Player");
const Tournament = require("../models/Tournament");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY
  }
});

// Generate squad poster image and PDF for a team
router.post("/:teamId/generate-squad", upload.single("squadImage"), async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate("tournamentId");
    
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const tournament = team.tournamentId;
    
    // Get all players for this team
    const players = await Player.find({ team: teamId }).sort({ role: 1, name: 1 });
    
    // Calculate year distribution
    const yearDistribution = {
      "1st Year": 0,
      "2nd Year": 0,
      "3rd Year": 0,
      "4th Year": 0
    };
    
    players.forEach(player => {
      const yearCategory = player.yearCategory || "1st Year";
      if (yearDistribution[yearCategory] !== undefined) {
        yearDistribution[yearCategory]++;
      }
    });

    let squadImageUrl = null;
    let squadPdfUrl = null;

    // Upload squad image if provided
    if (req.file) {
      const fileName = `squads/${tournament._id}/${teamId}_${Date.now()}.png`;
      
      const uploadParams = {
        Bucket: process.env.S3_BUCKET,
        Key: fileName,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: "public-read"
      };

      await s3Client.send(new PutObjectCommand(uploadParams));
      squadImageUrl = `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    }

    // For now, we'll just store the URLs - actual PDF generation can be added later
    // You can use libraries like pdfkit or react-pdf to generate PDFs
    
    // Update team with squad data
    team.squadImageUrl = squadImageUrl;
    team.yearDistribution = yearDistribution;
    // team.squadPdfUrl = squadPdfUrl; // Add when PDF generation is implemented
    
    await team.save();

    res.json({
      success: true,
      team: {
        id: team._id,
        name: team.name,
        squadImageUrl: team.squadImageUrl,
        squadPdfUrl: team.squadPdfUrl,
        yearDistribution: Object.fromEntries(team.yearDistribution)
      }
    });

  } catch (error) {
    console.error("Error generating squad:", error);
    res.status(500).json({ 
      error: "Failed to generate squad data",
      message: error.message 
    });
  }
});

// Get squad data for a team
router.get("/:teamId/squad", async (req, res) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);
    
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({
      success: true,
      data: {
        name: team.name,
        logoUrl: team.logoUrl,
        squadImageUrl: team.squadImageUrl,
        squadPdfUrl: team.squadPdfUrl,
        yearDistribution: team.yearDistribution ? Object.fromEntries(team.yearDistribution) : {},
        remainingBudget: team.remainingBudget
      }
    });

  } catch (error) {
    console.error("Error fetching squad:", error);
    res.status(500).json({ error: "Failed to fetch squad data" });
  }
});

module.exports = router;
