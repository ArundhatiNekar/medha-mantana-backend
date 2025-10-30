// backend/routes/results.js
import express from "express";
import Result from "../models/Result.js";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";

const router = express.Router();

/* ---------------- SAVE RESULT (Snapshot + Order) ---------------- */
router.post("/", async (req, res) => {
  try {
    const { quizId, studentName, answers, score, total, timeTaken, questionOrder } = req.body;

    if (!quizId || !studentName || !answers) {
      return res.status(400).json({ error: "⚠️ Quiz ID, student name and answers are required" });
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

    // ✅ Save snapshot in DB (with question order)
    const newResult = new Result({
      quizId,
      studentName,
      answers: transformedAnswers,
      questionOrder: questionOrder || Object.keys(answers), // 🔥 keep question order
      score,
      total,
      timeTaken,
      date: new Date(),
    });

    await newResult.save();

    // ✅ Return saved snapshot result immediately
    res.status(201).json({
      message: "✅ Result saved",
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
      // ✅ Updated 'category' → 'categories' to match your Quiz model
      .populate("quizId", "title categories numQuestions duration createdAt")
      .sort({ date: -1 });

    res.json({ results });
  } catch (err) {
    console.error("❌ Error fetching results:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------------- GET RESULTS BY QUIZ ---------------- */
router.get("/quiz/:id", async (req, res) => {
  try {
    const results = await Result.find({ quizId: req.params.id })
      .populate("quizId", "title categories numQuestions duration") // ✅ fixed 'category' → 'categories'
      .sort({ score: -1, date: -1 }); // ✅ more accurate ranking order

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
      .populate("quizId", "title categories numQuestions duration createdAt") // ✅ fixed 'category' → 'categories'
      .sort({ date: -1 });

    // ⚙️ Instead of 404, return empty array (frontend expects results array)
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
      .populate("quizId", "title categories duration createdAt"); // ✅ fixed 'category' → 'categories' and added createdAt

    if (!result) {
      return res.status(404).json({ error: "No details found for this attempt" });
    }

    // ✅ Populate questions from questionOrder
    const questionIds = result.questionOrder;
    const questions = await Question.find({ _id: { $in: questionIds } });

    // ✅ Map questions in the order they were presented
    const orderedQuestions = questionIds.map(id =>
      questions.find(q => q._id.toString() === id.toString())
    ).filter(Boolean);

    // ✅ Attach ordered questions to result
    const resultWithQuiz = {
      ...result.toObject(),
      quiz: {
        ...result.quizId.toObject(),
        questions: orderedQuestions
      }
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
