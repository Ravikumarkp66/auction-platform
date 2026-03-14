const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'));

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Client connected to Socket.io:", socket.id);

  // When admin sends an update, broadcast to all other clients (overlay)
  socket.on("auctionUpdate", (data) => {
    socket.broadcast.emit("auctionUpdate", data);
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
app.use("/api/players", playerRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/health", healthRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
