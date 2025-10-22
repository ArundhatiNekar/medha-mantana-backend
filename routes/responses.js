import express from "express";
import Result from "../models/Response.js"; // ✅ MongoDB model
import Quiz from "../models/Quiz.js";

const router = express.Router();

/**
 * ✅ Save a student's quiz response
 */
router.post("/", async (req, res) => {
  try {
    const { quizId, studentId, studentName, answers } = req.body;

    if (!quizId || !studentId || !studentName || !answers) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Fetch quiz + questions
    const quiz = await Quiz.findById(quizId).populate("questions");
    if (!quiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    // Score calculation
    let score = 0;
    quiz.questions.forEach((q) => {
      if (answers[q._id] && answers[q._id] === q.answer) {
        score++;
      }
    });

    // Save result in DB
    const newResult = new Result({
      quizId,
      studentId,
      studentName,
      answers,
      score,
      total: quiz.questions.length,
      date: new Date(),
    });

    await newResult.save();

    res.status(201).json({
      message: "✅ Response saved successfully",
      result: newResult,
    });
  } catch (err) {
    console.error("❌ Error saving response:", err);
    res.status(500).json({ error: "Server error while saving response" });
  }
});

/**
 * ✅ Get all responses (for faculty dashboard)
 */
router.get("/", async (req, res) => {
  try {
    const results = await Result.find().populate("quizId", "title");
    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching responses:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ✅ Get responses for a specific quiz
 */
router.get("/quiz/:quizId", async (req, res) => {
  try {
    const results = await Result.find({ quizId: req.params.quizId }).populate(
      "quizId",
      "title"
    );
    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching quiz responses:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * ✅ Get results for a specific student
 */
router.get("/student/:studentId", async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.params.studentId })
      .populate("quizId", "title")
      .sort({ date: -1 });
    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching student responses:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
