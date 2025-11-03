import express from "express";
import Quiz from "../models/Quiz.js";
import Question from "../models/Question.js";
import mongoose from "mongoose"; // ✅ properly used

const router = express.Router();

// ✅ Allowed categories
const ALLOWED_CATEGORIES = [
  "all",
  "quantitative",
  "logical",
  "verbal",
  "numerical",
  "spatial",
  "mechanical",
  "technical",
  "reasoning",
  "general",
];

/* ---------------- GET ALL QUIZZES ---------------- */
router.get("/", async (req, res) => {
  try {
    const now = new Date();

    // Fetch all quizzes
    const quizzes = await Quiz.find().populate("questions");

    // Filter quizzes based on schedule
    const availableQuizzes = quizzes.filter((quiz) => {
      if (quiz.isScheduled) {
        // If scheduled, show only between start and end time
        return quiz.startTime && quiz.endTime
          ? now >= new Date(quiz.startTime) && now <= new Date(quiz.endTime)
          : false;
      } else {
        // Not scheduled = always available
        return true;
      }
    });

    res.json(availableQuizzes);
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({ message: error.message });
  }
});
/* ---------------- CREATE QUIZ ---------------- */
router.post("/", async (req, res) => {
  try {
    let {
      title,
      categories = ["all"],
      count = 10,
      duration = 600,
      createdBy,
      scheduledStart,
      scheduledEnd,
      certificateEnabled = false,
      certificateTemplate = "",
      certificatePassingScore = 0,
    } = req.body;

    // Ensure array
    if (!Array.isArray(categories)) categories = [categories];
    // Normalize to lowercase
    categories = categories.map((c) => c.toLowerCase().trim());

    // Validate
    const invalid = categories.filter((c) => !ALLOWED_CATEGORIES.includes(c));
    if (invalid.length > 0)
      return res
        .status(400)
        .json({ error: `Invalid categories: ${invalid.join(", ")}` });

    // ✅ Build filter properly
let filter = {};
if (categories.includes("all")) {
  // fetch all questions
  filter = {};
} else {
  // fetch only from selected categories
  filter.category = { $in: categories };
}

// ✅ Fetch all valid questions
const pool = await Question.find(filter).select("_id").lean();
if (!pool || pool.length === 0) {
  return res
    .status(400)
    .json({ error: "No questions available for chosen categories" });
}

// ✅ Correctly calculate number of questions
const requestedCount = parseInt(count) || 10;
const actualCount = Math.min(requestedCount, pool.length);

// ✅ Shuffle & pick exactly requestedCount questions
const shuffled = [...pool].sort(() => 0.5 - Math.random());
const selectedIds = shuffled.slice(0, actualCount).map((q) => q._id);

// ✅ Debug log
console.log(`📘 Category: ${categories.join(", ")}`);
console.log(`📋 Requested: ${requestedCount}, Selected: ${selectedIds.length}`);

    // Save quiz
    const quiz = new Quiz({
      title: title?.trim() || `Quiz (${categories.join(", ")})`,
      categories,
      numQuestions: selectedIds.length,
      questionIds: selectedIds,
      duration,
      createdBy,
      scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
      certificateEnabled,
      certificateTemplate,
      certificatePassingScore,
    });

    await quiz.save();

    console.log(
      `✅ Quiz Created: ${quiz.title} (${quiz._id}) with ${selectedIds.length} questions`
    );

    res.status(201).json({
      message: "✅ Quiz created successfully",
      quizId: quiz._id,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        numQuestions: quiz.numQuestions,
        duration: quiz.duration,
        categories: categories.map(
          (c) => c.charAt(0).toUpperCase() + c.slice(1)
        ),
        certificateEnabled,
        certificatePassingScore,
      },
    });
  } catch (err) {
    console.error("❌ Error creating quiz:", err);
    res.status(500).json({ error: "Server error while creating quiz" });
  }
});

/* ---------------- GET QUIZ (POPULATE) ---------------- */
// ✅ FIX: Avoid duplicate route name conflict (renamed this to /basic/:id)
router.get("/basic/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate("questionIds");
    if (!quiz) return res.status(404).json({ message: "Quiz not found" });

    res.json(quiz);
  } catch (err) {
    console.error("Error fetching quiz:", err);
    res.status(500).json({ error: "Error fetching quiz" });
  }
});

/* ---------------- DEMO QUIZ (Practice) ---------------- */
router.get("/demo/:category", async (req, res) => {
  try {
    let { category } = req.params;
    const normalizedCategory = category.toLowerCase().trim();

    if (!ALLOWED_CATEGORIES.includes(normalizedCategory))
      return res.status(400).json({ error: "Invalid category" });

    const filter =
      normalizedCategory !== "all" ? { category: normalizedCategory } : {};

    const pool = await Question.find(filter)
      .select("question options answer explanation category")
      .lean();

    if (!pool || pool.length === 0)
      return res
        .status(404)
        .json({ error: "No questions available in this category" });

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    res.json({
      quiz: {
        _id: "demo_" + Date.now(),
        title: `Demo Quiz (${category})`,
        categories: [normalizedCategory],
        numQuestions: selected.length,
        duration: 300,
        createdBy: "system",
        questions: selected,
        demo: true,
        certificateEnabled: false,
        certificatePassingScore: 0,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching demo quiz:", err);
    res.status(500).json({ error: "Server error while fetching demo quiz" });
  }
});

/* ---------------- GET QUIZ BY ID ---------------- */
router.get("/:id", async (req, res) => {
  try {
    const rawId = req.params.id.trim();

    console.log("📥 Fetch request for quiz ID:", rawId);

    // ✅ Handle demo quiz IDs
    if (rawId.startsWith("demo_")) {
      return res.status(400).json({ error: "Demo quizzes are not stored in DB" });
    }

    // ✅ Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(rawId)) {
      console.error("❌ Invalid ObjectId:", rawId);
      return res.status(400).json({ error: "Invalid quiz ID format" });
    }

    // ✅ Fetch quiz safely
    const quiz = await Quiz.findById(new mongoose.Types.ObjectId(rawId)).lean();
    if (!quiz) {
      console.error("❌ Quiz not found for ID:", rawId);
      return res.status(404).json({ error: "Quiz not found" });
    }

    // ✅ Check scheduling constraints: only enforce if both start and end are set
    const now = new Date();
    console.log(`🔍 Checking scheduling for quiz ${quiz._id}: now=${now}, scheduledStart=${quiz.scheduledStart}, scheduledEnd=${quiz.scheduledEnd}`);
    if (quiz.scheduledStart && quiz.scheduledEnd) {
      if (now < new Date(quiz.scheduledStart)) {
        console.log(`🚫 Quiz has not started yet`);
        return res.status(403).json({ error: "Quiz has not started yet" });
      }
      if (now > new Date(quiz.scheduledEnd)) {
        console.log(`🚫 Quiz has ended`);
        return res.status(403).json({ error: "Quiz has ended" });
      }
    }

    console.log(`✅ Quiz found: ${quiz.title} (${quiz._id})`);

    // ✅ Handle both old & new schema (category vs categories)
    const categories = Array.isArray(quiz.categories)
      ? quiz.categories
      : quiz.category
      ? [quiz.category]
      : ["general"];

    // ✅ Fetch all questions linked to quiz
    const questionIds = (quiz.questionIds || [])
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    console.log("🔍 Fetching questions for quiz:", questionIds);

    const questions = await Question.find({ _id: { $in: questionIds } })
      .select("question options answer explanation category")
      .lean();

    // ✅ FIX: If fewer than expected questions found, log warning
    if (questions.length < quiz.numQuestions) {
      console.warn(
        `⚠️ Expected ${quiz.numQuestions} questions but found only ${questions.length} in DB for quiz ${quiz._id}`
      );
    }

    if (!questions.length) {
      console.warn(`⚠️ No questions found for quiz ${quiz._id}`);
      return res.status(404).json({ error: "No questions found for this quiz" });
    }

    // ✅ FIX: Preserve question order if faculty uploaded via CSV
    const qById = new Map(questions.map((q) => [String(q._id), q]));
    const orderedQuestions = quiz.questionIds
      .map((id) => qById.get(String(id)))
      .filter(Boolean);

    // ✅ FIX: Ensure we always send correct number of questions
    const randomizedQuestions = orderedQuestions.concat(questions).slice(0, quiz.numQuestions).sort(() => 0.5 - Math.random());

    // ✅ Capitalize categories
    const displayCategories = categories.map(
      (c) => c.charAt(0).toUpperCase() + c.slice(1)
    );

    // ✅ Send final quiz
    console.log(
      `🚀 Sending ${randomizedQuestions.length} questions for quiz "${quiz.title}"`
    );
    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        categories: displayCategories,
        numQuestions: quiz.numQuestions,
        duration: quiz.duration,
        createdBy: quiz.createdBy,
        questions: randomizedQuestions,
        scheduledStart: quiz.scheduledStart,
        scheduledEnd: quiz.scheduledEnd,
        certificateEnabled: quiz.certificateEnabled || false,
        certificateTemplate: quiz.certificateTemplate || "",
        certificatePassingScore: quiz.certificatePassingScore || 0,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching quiz:", err);
    res.status(500).json({ error: "Server error while fetching quiz" });
  }
});

/* ---------------- DELETE QUIZ ---------------- */
router.delete("/:id", async (req, res) => {
  try {
    const cleanId = req.params.id.trim();
    if (!mongoose.Types.ObjectId.isValid(cleanId)) {
      return res.status(400).json({ error: "Invalid quiz ID format" });
    }

    const quiz = await Quiz.findByIdAndDelete(cleanId);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    res.json({ message: "✅ Quiz deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting quiz:", err);
    res.status(500).json({ error: "Server error while deleting quiz" });
  }
});

export default router;
