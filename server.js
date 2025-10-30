import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

// Routes
import questionsRoute from "./routes/questions.js";
import authRoute from "./routes/auth.js";
import quizRoute from "./routes/quizzes.js";
import resultsRoute from "./routes/results.js";
import adminRoute from "./routes/admin.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000; // ✅ Added

// ✅ CORS configuration (important for Vercel frontend)
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "https://medha-mantana-frontend.vercel.app",
      "https://medha-mantana.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"], // ✅ Added
    credentials: true,
  })
);

// ✅ Middleware
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// ✅ Root route
app.get("/", (req, res) => {
  res.send("🚀 Medha Manthana Backend is running! Sharpen Your Medha, Master Every Mantana.");
});

// ✅ API Routes
app.use("/api/questions", questionsRoute);
app.use("/api/auth", authRoute);
app.use("/api/quizzes", quizRoute);
app.use("/api/results", resultsRoute);
app.use("/api/admin", adminRoute);

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "aptiquest",
  })
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Server running on port ${PORT}`)
    );
  })
  .catch((err) => console.error("❌ DB connection error:", err));
