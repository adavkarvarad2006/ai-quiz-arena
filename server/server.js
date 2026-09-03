import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import attemptRoutes from "./routes/attemptRoutes.js";
import roomRoutes from "./routes/roomRoutes.js";
import { initQuizSocket } from "./sockets/quizSocket.js";

connectDB();

const app = express();
const httpServer = createServer(app);

// --------------------
// CORS Configuration
// --------------------

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((origin) => origin.trim())
  : [];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

// Express CORS
app.use(cors(corsOptions));

app.use(express.json());

// --------------------
// API Routes
// --------------------

app.use("/api/auth", authRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/rooms", roomRoutes);

// --------------------
// Health Check
// --------------------

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "AI Quiz Arena server is running",
  });
});

// --------------------
// Socket.IO
// --------------------

const io = new Server(httpServer, {
  cors: corsOptions,
});

initQuizSocket(io);

// --------------------
// Start Server
// --------------------

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});