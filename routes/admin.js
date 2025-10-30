import express from "express";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Quiz from "../models/Quiz.js";
import Result from "../models/Result.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                        🧱 Middleware: Verify Admin                        */
/* -------------------------------------------------------------------------- */
const adminOnly = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }
    next();
  } catch (err) {
    console.error("❌ Error verifying admin:", err);
    return res.status(500).json({ error: "Server error verifying admin" });
  }
};

/* -------------------------------------------------------------------------- */
/*                              👥 Get All Users                              */
/* -------------------------------------------------------------------------- */
router.get("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json({ users });
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Server error fetching users" });
  }
});

/* -------------------------------------------------------------------------- */
/*                              ➕ Add a New User                              */
/* -------------------------------------------------------------------------- */
router.post("/users", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      role,
    });

    await newUser.save();
    res.status(201).json({ message: "✅ User added successfully", user: newUser });
  } catch (err) {
    console.error("❌ Error adding user:", err);
    res.status(500).json({ error: "Server error adding user" });
  }
});

/* -------------------------------------------------------------------------- */
/*                              ✏️ Update a User                              */
/* -------------------------------------------------------------------------- */
router.put("/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { username, email, role } = req.body;
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { username, email, role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "✅ User updated successfully", user: updatedUser });
  } catch (err) {
    console.error("❌ Error updating user:", err);
    res.status(500).json({ error: "Server error updating user" });
  }
});

/* -------------------------------------------------------------------------- */
/*                              ❌ Delete a User                              */
/* -------------------------------------------------------------------------- */
router.delete("/users/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("🗑️ Deleting user with ID:", userId);

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    if (req.user && req.user._id.toString() === userId) {
      return res.status(400).json({ error: "You cannot delete your own admin account." });
    }

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      console.log("⚠️ User not found in DB.");
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ User deleted successfully:", user.email);
    res.json({ message: "✅ User deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ error: err.message || "Server error deleting user" });
  }
});

/* -------------------------------------------------------------------------- */
/*                             📊 Get All Results                             */
/* -------------------------------------------------------------------------- */
router.get("/results", authMiddleware, adminOnly, async (req, res) => {
  try {
    const results = await Result.find()
      .populate("studentId", "username email")
      .populate("quizId", "title")
      .sort({ date: -1 });

    res.json({
      results,
      message: results.length ? "✅ Results fetched" : "No results found",
    });
  } catch (err) {
    console.error("❌ Error fetching results:", err);
    res.status(500).json({ error: "Server error fetching results" });
  }
});

/* -------------------------------------------------------------------------- */
/*                              ❌ Delete Result                              */
/* -------------------------------------------------------------------------- */
router.delete("/results/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const resultId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(resultId)) {
      return res.status(400).json({ error: "Invalid result ID format" });
    }

    const result = await Result.findByIdAndDelete(resultId);
    if (!result) {
      return res.status(404).json({ error: "Result not found" });
    }

    res.json({ message: "✅ Result deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting result:", err);
    res.status(500).json({ error: "Server error deleting result" });
  }
});

/* -------------------------------------------------------------------------- */
/*                              🧩 Get All Quizzes                            */
/* -------------------------------------------------------------------------- */
router.get("/quizzes", authMiddleware, adminOnly, async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .select("title duration numQuestions createdBy createdAt")
      .populate("createdBy", "username")
      .sort({ createdAt: -1 });

    res.json({
      quizzes,
      message: quizzes.length ? "✅ Quizzes fetched" : "No quizzes found",
    });
  } catch (err) {
    console.error("❌ Error fetching quizzes:", err);
    res.status(500).json({ error: "Server error fetching quizzes" });
  }
});

/* -------------------------------------------------------------------------- */
/*                              ❌ Delete a Quiz                              */
/* -------------------------------------------------------------------------- */
router.delete("/quizzes/:id", authMiddleware, adminOnly, async (req, res) => {
  try {
    const quizId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return res.status(400).json({ error: "Invalid quiz ID format" });
    }

    const quiz = await Quiz.findByIdAndDelete(quizId);
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.json({ message: "✅ Quiz deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting quiz:", err);
    res.status(500).json({ error: "Server error deleting quiz" });
  }
});

/* -------------------------------------------------------------------------- */
/*                             🧠 Admin Summary API                           */
/* -------------------------------------------------------------------------- */
router.get("/summary", authMiddleware, adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalFaculties, totalStudents, totalAdmins, totalQuizzes, totalResults] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: "faculty" }),
        User.countDocuments({ role: "student" }),
        User.countDocuments({ role: "admin" }),
        Quiz.countDocuments(),
        Result.countDocuments(),
      ]);

    res.json({
      message: "✅ Admin Summary",
      stats: {
        totalUsers,
        totalAdmins,
        totalFaculties,
        totalStudents,
        totalQuizzes,
        totalResults,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching summary:", err);
    res.status(500).json({ error: "Server error fetching summary" });
  }
});

export default router;
