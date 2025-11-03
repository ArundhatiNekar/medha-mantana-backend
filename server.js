import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

// Routes
import questionsRoute from "./routes/questions.js";
import authRoute from "./routes/auth.js";
import quizRoute from "./routes/quizzes.js";
import resultsRoute from "./routes/results.js";
import adminRoutes from "./routes/admin.js"; // ✅ Admin routes

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000; // ✅ Added

// ✅ CORS configuration (important for Vercel frontend)
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5175",
      "https://medha-mantana-frontend.vercel.app",
      "https://medha-mantana.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"], // ✅ Important for protected routes
    credentials: true,
  })
);

// ✅ Middleware
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ✅ Root route
app.get("/", (req, res) => {
  res.send(
    "🚀 Medha Manthana Backend is running! Sharpen Your Medha, Master Every Mantana."
  );
});

// ✅ API Routes
app.use("/api/questions", questionsRoute);
app.use("/api/auth", authRoute);
app.use("/api/quizzes", quizRoute);
app.use("/api/results", resultsRoute);

// ✅ Admin Routes (Added for quiz management by admin)
app.use("/api/admin", adminRoutes);

// ✅ Debug Route - Check Admin Results Route Health
app.get("/api/admin/test-results-route", (req, res) => {
  res.json({ message: "✅ Admin Results Route is reachable!" });
});

// ✅ MongoDB Connection with robust options
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "aptiquest",
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    maxPoolSize: 10, // Maintain up to 10 socket connections
    family: 4, // Use IPv4, skip trying IPv6
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");

    // ✅ Start server
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err);
    console.error("❌ Error details:", {
      name: err.name,
      message: err.message,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      hostname: err.hostname,
    });
    process.exit(1); // Exit on connection failure
  });

// ✅ Optional: Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});
