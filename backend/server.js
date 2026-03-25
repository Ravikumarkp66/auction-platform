const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

// Middlewares
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1); // Trust Render Load Balancer
const server = http.createServer(app);

// Security and Performance
app.use(helmet({ 
  crossOriginResourcePolicy: false, // Allow images to be loaded from other origins if needed
  contentSecurityPolicy: false // Disable CSP if it causes issues with S3 images initially, but recommend configuring in prod
}));
app.use(compression());
app.use(morgan('dev'));

const allowedOrigins = [
  "http://localhost:3000",
  "https://auction-platform-beta.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

// CORS must come BEFORE rate limiter to ensure CORS headers on rate limit responses
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to allow but recommend strict in prod
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Production optimized Rate Limiter
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, 
  max: 600, // 600 requests per minute
  message: { message: "Too many requests from this IP, please try again after a minute" },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, origin);
      }
    },
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'], // Support both WebSocket and polling
  pingTimeout: 60000,
  pingInterval: 25000
});
const { setIo } = require("./utils/image-processor");
setIo(io);

// In-memory break status shared between admin and overlay
let currentBreak = null;

// In-memory auction state shared between admin and overlay
let currentAuctionState = null;

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

connectDB();

app.use(express.json());


// Root route
app.get("/", (req, res) => {
  res.send("CricArena Backend Running 🚀");
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected to Socket.io:", socket.id);

  // Handle playerSold event - broadcast to ALL clients (including admin)
  socket.on("playerSold", (data) => {
    console.log("📡 Broadcasting SOLD event:", data);
    io.emit("playerSold", data); // Use io.emit to send to everyone
  });

  // Handle playerUnsold event - broadcast to ALL clients
  socket.on("playerUnsold", (data) => {
    console.log("📡 Broadcasting UNSOLD event:", data);
    io.emit("playerUnsold", data);
  });

  // When admin sends an update, broadcast to all other clients (overlay)
  socket.on("auctionUpdate", (data) => {
    currentAuctionState = data; // Store latest auction state
    socket.broadcast.emit("auctionUpdate", data);
  });

  // Overlay asks for current auction state when it connects
  socket.on("getAuctionState", () => {
    if (currentAuctionState) {
      socket.emit("auctionUpdate", currentAuctionState);
    }
  });

  // Admin starts a break – broadcast to viewers and store state
  socket.on("breakTime", (data) => {
    const now = Date.now();
    // Prefer exact seconds from admin if provided
    const totalSeconds = data.totalSeconds || (data.duration * 60);
    const endTime = data.endTime || now + (totalSeconds * 1000);

    currentBreak = {
      type: data.type,
      duration: data.duration,
      totalSeconds,
      customReason: data.customReason || null,
      startTime: data.startTime || now,
      endTime,
      isActive: true,
    };

    io.emit("breakTime", currentBreak);
  });

  // Admin triggers a cinematic team draw event
  socket.on("teamDrawEvent", (data) => {
    socket.broadcast.emit("teamDrawEvent", data);
  });

  socket.on("togglePoolView", (data) => {
    socket.broadcast.emit("togglePoolView", data);
  });

  socket.on("resetPoolsDraw", () => {
    socket.broadcast.emit("resetPoolsDraw", {});
  });

  // Admin ends a break – clear state and notify viewers
  socket.on("breakTimeEnd", () => {
    currentBreak = null;
    io.emit("breakTimeEnd");
  });

  // Overlay asks for current break status when it connects
  socket.on("getBreakStatus", () => {
    if (currentBreak && currentBreak.endTime > Date.now()) {
      socket.emit("breakStatus", currentBreak);
    } else {
      currentBreak = null;
      socket.emit("breakStatus", { isActive: false });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Routes
const playerRoutes = require("./routes/playerRoutes");
const tournamentRoutes = require("./routes/tournamentRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const healthRoutes = require("./routes/healthRoutes");
const tournamentImageRoutes = require("./routes/tournamentImageRoutes");
const teamRoutes = require("./routes/teamRoutes");
const backgroundRoutes = require("./routes/backgroundRoutes");
const assetRoutes = require("./routes/assetRoutes");
const proxyImageRoute = require("./routes/proxyImage");
const rulesRoutes = require("./routes/rulesRoutes"); // Rule Engine API
const squadRoutes = require("./routes/squadRoutes"); // Squad generation API
app.use("/api/players", playerRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/tournament-images", tournamentImageRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/backgrounds", backgroundRoutes);
app.use("/api/assets", assetRoutes);
app.use("/api/proxy-image", proxyImageRoute);
app.use("/api/rules", rulesRoutes); // Rule Engine API
app.use("/api/squads", squadRoutes); // Squad generation API

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    } catch (err) {
      console.error('Error closing MongoDB connection:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
