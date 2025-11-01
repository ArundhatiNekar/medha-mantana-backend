// backend/routes/results.js
import express from "express";
import Result from "../models/Result.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

const router = express.Router();

/* ---------------- SAVE RESULT (Snapshot + Order) ---------------- */
router.post("/", async (req, res) => {
  try {
    console.log("📥 Incoming result data:", req.body);

    const {
      quizId,
      studentName,
      answers,
      score,
      total,
      timeTaken,
      questionOrder,
      userId, // 🆕 ensure userId can also be passed for consistency
    } = req.body;

    if (!quizId || !studentName || !answers) {
      return res
        .status(400)
        .json({ error: "⚠️ Quiz ID, student name and answers are required" });
    }

    // ✅ Fetch all related questions from DB
    const questionDocs = await Question.find({ _id: { $in: Object.keys(answers) } });

    // ✅ Build snapshot answers
    const transformedAnswers = Object.entries(answers).map(([qId, chosen]) => {
      const q = questionDocs.find((doc) => doc._id.toString() === qId);
      const isCorrect = q && chosen?.trim() === q.answer?.trim();
      return {
        questionId: q?._id,
        question: q?.question || "Unknown question",
        options: q?.options || [],
        correctAnswer: q?.answer || "",
        explanation: q?.explanation || "No explanation provided",
        chosenAnswer: chosen,
        correct: isCorrect,
      };
    });

    // ✅ Safely create result (mapped to schema fields)
    const newResult = new Result({
      user: userId || null, // 🆕 if available
      quiz: quizId, // ✅ match schema (not quizId)
      score: score || 0,
      totalQuestions: total || transformedAnswers.length,
      correctAnswers: transformedAnswers.filter((a) => a.correct).length,
      wrongAnswers: transformedAnswers.filter((a) => !a.correct).length,
      attemptedAt: new Date(),
      answers: transformedAnswers, // 🔥 keep snapshot (no schema conflict)
      studentName, // 🆕 still stored for backward use
      questionOrder: questionOrder || Object.keys(answers),
      timeTaken,
    });

    await newResult.save();

    res.status(201).json({
      message: "✅ Result saved successfully",
      result: newResult,
    });
  } catch (err) {
    console.error("❌ Error saving result:", err);
    res.status(500).json({ error: "Server error while saving result" });
  }
});

/* ---------------- GET ALL RESULTS ---------------- */
router.get("/", async (req, res) => {
  try {
    const results = await Result.find()
      .populate({
        path: "quiz",
        select: "title categories numQuestions duration createdAt",
        strictPopulate: false,
      })
      .populate({
        path: "user",
        select: "username email role",
        strictPopulate: false,
      })
      .sort({ createdAt: -1 });

    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching results:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET RESULTS BY QUIZ ---------------- */
router.get("/quiz/:id", async (req, res) => {
  try {
    const results = await Result.find({ quiz: req.params.id })
      .populate({
        path: "quiz",
        select: "title categories numQuestions duration",
        strictPopulate: false,
      })
      .populate({
        path: "user",
        select: "username email role",
        strictPopulate: false,
      })
      .sort({ score: -1, attemptedAt: -1 });

    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching quiz results:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET RESULTS BY STUDENT ---------------- */
router.get("/student/:studentName", async (req, res) => {
  try {
    const results = await Result.find({ studentName: req.params.studentName })
      .populate({
        path: "quiz",
        select: "title categories numQuestions duration createdAt",
        strictPopulate: false,
      })
      .sort({ attemptedAt: -1 });

    if (!results || results.length === 0) {
      return res.json({ results: [] });
    }

    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching student results:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET SINGLE RESULT (with snapshot) ---------------- */
router.get("/:id", async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate({
        path: "quiz",
        select: "title categories duration createdAt",
        strictPopulate: false,
      })
      .populate({
        path: "user",
        select: "username email role",
        strictPopulate: false,
      });

    if (!result) {
      return res.status(404).json({ error: "No details found for this attempt" });
    }

    const questionIds = result.questionOrder || [];
    const questions = await Question.find({ _id: { $in: questionIds } });

    const orderedQuestions = questionIds
      .map((id) => questions.find((q) => q._id.toString() === id.toString()))
      .filter(Boolean);

    const resultWithQuiz = {
      ...result.toObject(),
      quiz: {
        ...result.quiz?.toObject(),
        questions: orderedQuestions,
      },
    };

    res.json({ result: resultWithQuiz });
  } catch (err) {
    console.error("❌ Error fetching result details:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- DELETE RESULT ---------------- */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Result.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "❌ Result not found" });
    res.json({ message: "✅ Result deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
