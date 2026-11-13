
import "dotenv/config";

import express from "express";
import cors from "cors";
import mongoose from "mongoose";

// ======================================
// ROUTE IMPORTS
// ======================================

import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import classRoutes from "./routes/classRoutes.js";
import academicRoutes from "./routes/academicRoutes.js";
import marksRoutes from "./routes/marksRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import reportCardRoutes from "./routes/reportCardRoutes.js";

// ======================================
// APP CONFIGURATION
// ======================================

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const CLIENT_URL =
  process.env.CLIENT_URL || "http://localhost:5173";

const MONGODB_URI = process.env.MONGODB_URI;

// ======================================
// MIDDLEWARE
// ======================================

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(express.urlencoded({ extended: true }));

// ======================================
// API ROUTES
// ======================================

// Authentication
app.use("/api/auth", authRoutes);

// Admin dashboard and read-only monitoring
app.use("/api/admin", adminRoutes);

// Student management
app.use("/api/students", studentRoutes);

// Classes and subjects
app.use("/api/class-management", classRoutes);

// Academic sessions and examinations
app.use("/api/academic", academicRoutes);

// Marks entry
app.use("/api/marks", marksRoutes);

// Results generation and viewing
app.use("/api/results", resultRoutes);

// Report card PDF downloads
app.use("/api/report-cards", reportCardRoutes);

// ======================================
// HEALTH CHECK
// GET /api/health
// ======================================

app.get("/api/health", (req, res) => {
  const databaseStates = [
    "disconnected",
    "connected",
    "connecting",
    "disconnecting",
  ];

  const databaseStatus =
    databaseStates[mongoose.connection.readyState] ||
    "unknown";

  return res.status(200).json({
    success: true,
    message: "AnkSetu API is running",
    database: databaseStatus,
    timestamp: new Date().toISOString(),
  });
});

// ======================================
// HOME ROUTE
// GET /
// ======================================

app.get("/", (req, res) => {
  return res.status(200).send(
    "AnkSetu API is running. Try /api/health"
  );
});

// ======================================
// 404 HANDLER
// ======================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ======================================
// GLOBAL ERROR HANDLER
// ======================================

app.use((err, req, res, next) => {
  console.error("API Error:", err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    err.status ||
    err.statusCode ||
    500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "An internal server error occurred."
        : err.message || "Request failed.",
  });
});

// ======================================
// MONGODB CONNECTION EVENTS
// ======================================

mongoose.connection.on("connected", () => {
  console.log("MongoDB connection established");
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB connection lost");
});

mongoose.connection.on("error", (error) => {
  console.error("MongoDB error:", error.message);
});

// ======================================
// START SERVER
// ======================================

const startServer = async () => {
  try {
    if (!MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing from the server .env file."
      );
    }

    if (
      !Number.isInteger(PORT) ||
      PORT < 1 ||
      PORT > 65535
    ) {
      throw new Error("Invalid server PORT configuration.");
    }

    await mongoose.connect(MONGODB_URI);

    console.log("MongoDB connected successfully");

    const server = app.listen(PORT, () => {
      console.log("------------------------------------");
      console.log("ANKSETU BACKEND STARTED");
      console.log("------------------------------------");
      console.log(
        `Server: http://localhost:${PORT}`
      );
      console.log(
        `Health: http://localhost:${PORT}/api/health`
      );
      console.log(
        `Frontend: ${CLIENT_URL}`
      );
      console.log("------------------------------------");
    });

    // Graceful shutdown.
    const shutdown = async (signal) => {
      console.log(`${signal} received. Closing server...`);

      server.close(async () => {
        try {
          await mongoose.disconnect();

          console.log(
            "MongoDB disconnected successfully"
          );

          process.exit(0);
        } catch (error) {
          console.error(
            "Shutdown error:",
            error.message
          );

          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    console.error(
      "Server startup failed:",
      error.message
    );

    process.exit(1);
  }
};

startServer();

export default app;
