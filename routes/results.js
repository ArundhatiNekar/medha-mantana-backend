// backend/routes/results.js
import express from "express";
import mongoose from "mongoose";
import Result from "../models/Result.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* ---------------- SAVE RESULT (Snapshot + Order) ---------------- */
router.post("/", authMiddleware, async (req, res) => {
  try {
    console.log("📥 Incoming result data:", req.body);

    const {
      quiz,
      answers,
      score,
      totalQuestions,
      correctAnswers,
      wrongAnswers,
      timeTaken,
      questionOrder,
    } = req.body;

    const user = req.user._id;
    const studentName = req.user.username;

    if (!quiz || !answers) {
      return res
        .status(400)
        .json({ error: "⚠️ Quiz ID and answers are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(quiz)) {
      return res.status(400).json({ error: "Invalid quiz ID" });
    }



    // ✅ Fetch all related questions from DB
    const questionDocs = await Question.find({
      _id: { $in: Object.keys(answers) },
    });

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

    // ✅ Ensure safe totals and percentage (robust)
    let totalQ = totalQuestions;

    // ✅ Fetch from quiz if totalQuestions missing
    if (!totalQ || isNaN(totalQ) || totalQ <= 0) {
      try {
        const quizDoc = await Quiz.findById(quiz).select(
          "numQuestions questionIds categories"
        );
        if (quizDoc) {
          if (
            quizDoc.categories?.includes("All") ||
            quizDoc.categories?.includes("all")
          ) {
            // Category 'All' — use actual number of answers as total
            totalQ = Object.keys(answers || {}).length;
          } else {
            totalQ =
              quizDoc.numQuestions ||
              (quizDoc.questionIds ? quizDoc.questionIds.length : 0);
          }
        }
      } catch (e) {
        console.warn("⚠️ Could not fetch quiz totalQuestions:", e.message);
        totalQ = Object.keys(answers || {}).length;
      }
    }

    // Fallback if still 0
    if (!totalQ || totalQ <= 0) {
      totalQ = Object.keys(answers || {}).length;
    }

    const correctQ =
      correctAnswers !== undefined
        ? correctAnswers
        : transformedAnswers.filter((a) => a.correct).length;

    const wrongQ =
      wrongAnswers !== undefined
        ? wrongAnswers
        : transformedAnswers.filter((a) => !a.correct).length;

    const computedScore = score !== undefined ? score : correctQ;

    // ✅ Prevent NaN in percentage
    const percentage =
      totalQ > 0 && !isNaN(correctQ)
        ? parseFloat(((correctQ / totalQ) * 100).toFixed(2))
        : 0;

    // ✅ Safely create result (mapped to schema fields)
    const newResult = new Result({
      quiz,
      user,
      studentName,
      answers: transformedAnswers,
      questionOrder: questionOrder || Object.keys(answers),
      score: computedScore,
      totalQuestions: totalQ,
      correctAnswers: correctQ,
      wrongAnswers: wrongQ,
      percentage, // ✅ fixed NaN issue
      timeTaken,
      attemptedAt: new Date(),
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

    // ✅ Add computed percentage fallback if missing
    const withPercent = results.map((r) => {
      const percent =
        r.totalQuestions > 0
          ? parseFloat(
              ((r.correctAnswers / r.totalQuestions) * 100).toFixed(2)
            )
          : 0;
      return {
        ...r._doc,
        percentage: !isNaN(r.percentage) ? r.percentage : percent,
      };
    });

    res.json({ results: withPercent });
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

    const withPercent = results.map((r) => {
      const percent =
        r.totalQuestions > 0
          ? parseFloat(
              ((r.correctAnswers / r.totalQuestions) * 100).toFixed(2)
            )
          : 0;
      return {
        ...r._doc,
        percentage: !isNaN(r.percentage) ? r.percentage : percent,
      };
    });

    res.json({ results: withPercent });
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

    const withPercent = results.map((r) => {
      const percent =
        r.totalQuestions > 0
          ? parseFloat(
              ((r.correctAnswers / r.totalQuestions) * 100).toFixed(2)
            )
          : 0;
      return {
        ...r._doc,
        percentage: !isNaN(r.percentage) ? r.percentage : percent,
      };
    });

    res.json({ results: withPercent });
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
      return res
        .status(404)
        .json({ error: "No details found for this attempt" });
    }

    const questionIds = result.questionOrder || [];
    const questions = await Question.find({ _id: { $in: questionIds } });

    const orderedQuestions = questionIds
      .map((id) => questions.find((q) => q._id.toString() === id.toString()))
      .filter(Boolean);

    const safePercent =
      result.totalQuestions > 0
        ? parseFloat(
            ((result.correctAnswers / result.totalQuestions) * 100).toFixed(2)
          )
        : 0;

    const resultWithQuiz = {
      ...result.toObject(),
      quiz: {
        ...result.quiz?.toObject(),
        questions: orderedQuestions,
      },
      percentage: !isNaN(result.percentage) ? result.percentage : safePercent,
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
