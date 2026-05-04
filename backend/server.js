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

// ===== SECURITY HEADERS & MIDDLEWARE =====

// Helmet - Secure HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],  // ✅ NO unsafe-inline, unsafe-eval
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.amazonaws.com", "https://ui-avatars.com"],
      connectSrc: ["'self'", "https://*.amazonaws.com", "wss://localhost:*"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'DENY'  // Prevent clickjacking
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  }
}));

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined', {
  skip: (req, res) => req.originalUrl === '/api/players' && req.method === 'GET'
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ===== CORS CONFIGURATION =====
// Only allow specific frontends - NO wildcard domains
const allowedOrigins = [
  process.env.NODE_ENV === 'development' && "http://localhost:3000",
  process.env.NODE_ENV === 'development' && "http://127.0.0.1:3000",
  "https://auction-platform-beta.vercel.app",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or direct API calls)
    if (!origin) return callback(null, true);

    // Check if origin is in whitelist
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma", "Expires"],
  maxAge: 86400  // 24 hours
}));

// ===== RATE LIMITING =====
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  message: {
    success: false,
    message: "Too many requests, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,  // 5 attempts per window
  message: {
    success: false,
    message: "Too many login attempts, please try again later"
  },
  skipSuccessfulRequests: true
});

app.use("/api/", apiLimiter);
app.use("/api/auth/", authLimiter);

// ===== SOCKET.IO WITH AUTHENTICATION =====
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6  // 1MB max message size
});

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  // Public socket events (no auth required for viewing)
  const publicEvents = ['playerSold', 'playerUnsold', 'auctionUpdate', 'breakTime', 'teamDrawEvent', 'togglePoolView'];

  // For now, allow all socket connections but validate on sensitive events
  // In production, verify JWT token here
  if (token) {
    // TODO: Verify token
    // const decoded = verifyToken(token);
    // if (!decoded) return next(new Error('Invalid token'));
    // socket.userId = decoded.userId;
  }

  next();
});
const { setIo } = require("./utils/image-processor");
setIo(io);

// Make io accessible to Express routes via req.app.get("io")
app.set("io", io);

// In-memory break status shared between admin and overlay
let currentBreak = null;

// In-memory auction state shared between admin and overlay
let currentAuctionState = null;

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
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
app.use("/uploads", express.static("uploads"));


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
const matchRoutes = require("./routes/matchRoutes"); // Advanced scoring match API
// Test route to verify API mounting
app.get("/api/test", (req, res) => res.json({ success: true, message: "API test working" }));

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
app.use("/api/location", require("./routes/locationRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/matches", matchRoutes);
app.use("/api/settings", require("./routes/settingsRoutes"));
app.use("/api/visitors", require("./routes/visitorRoutes"));

// ===== ERROR HANDLING MIDDLEWARE =====
  // Global error handler - must be last
  app.use((err, req, res, next) => {
    console.error('Error:', {
      message: err.message,
      path: req.path,
      method: req.method,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });

    // Default to 500
    let status = err.status || 500;
    let message = 'Internal Server Error';

    // Handle specific error types
    if (err.message.includes('CORS')) {
      status = 403;
      message = 'Cross-Origin Request Blocked';
    } else if (err.message.includes('Unauthorized')) {
      status = 401;
      message = 'Unauthorized';
    } else if (err.message.includes('Forbidden')) {
      status = 403;
      message = 'Forbidden';
    } else if (err.message.includes('Validation')) {
      status = 400;
      message = err.message;
    }

    // Don't expose sensitive error details in production
    const errorResponse = {
      success: false,
      message
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.error = err.message;
      errorResponse.stack = err.stack;
    }

    res.status(status).json(errorResponse);
  });

// 404 handler
app.use((req, res) => {
  console.log('404 hit for:', req.originalUrl || req.url);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5050;

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
process.on('SIGINT', () => shutdown('SIGINT'));
