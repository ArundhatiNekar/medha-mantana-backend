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

/* ---------------- CREATE QUIZ ---------------- */
router.post("/", async (req, res) => {
  try {
    let {
      title,
      categories = ["all"],
      count = 10,
      duration = 600,
      createdBy,
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

    // Build filter
    let filter = {};
    if (!categories.includes("all")) filter.category = { $in: categories };

    // Fetch questions
    const pool = await Question.find(filter).select("_id").lean();
    if (!pool || pool.length === 0)
      return res
        .status(400)
        .json({ error: "No questions available for chosen categories" });

    // Shuffle & select
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const selectedIds = shuffled
      .slice(0, Math.min(count, pool.length))
      .map((q) => q._id);

    // Save quiz
    const quiz = new Quiz({
      title: title?.trim() || `Quiz (${categories.join(", ")})`,
      categories,
      numQuestions: selectedIds.length,
      questionIds: selectedIds,
      duration,
      createdBy,
      certificateEnabled,
      certificateTemplate,
      certificatePassingScore,
    });

    await quiz.save();

    console.log(`✅ Quiz Created: ${quiz.title} (${quiz._id}) with ${selectedIds.length} questions`);

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

/* ---------------- GET ALL QUIZZES ---------------- */
router.get("/", async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .select(
        "title numQuestions duration categories createdBy certificateEnabled certificatePassingScore"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.json({ quizzes });
  } catch (err) {
    console.error("❌ Error fetching all quizzes:", err);
    res.status(500).json({ error: "Server error while fetching quizzes" });
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

    console.log(`✅ Quiz found: ${quiz.title} (${quiz._id})`);

    // ✅ Handle both old & new schema (category vs categories)
    const categories = Array.isArray(quiz.categories)
      ? quiz.categories
      : quiz.category
      ? [quiz.category]
      : ["general"];

    // ✅ Fetch all questions linked to quiz
    const questionIds = quiz.questionIds?.map((id) =>
      new mongoose.Types.ObjectId(id)
    );

    console.log("🔍 Fetching questions for quiz:", questionIds);

    const questions = await Question.find({ _id: { $in: questionIds } })
      .select("question options answer explanation category")
      .lean();

    if (!questions.length) {
      console.warn(`⚠️ No questions found for quiz ${quiz._id}`);
      return res.status(404).json({ error: "No questions found for this quiz" });
    }

    // ✅ Order & shuffle
    const qById = new Map(questions.map((q) => [String(q._id), q]));
    const orderedQuestions = quiz.questionIds
      .map((id) => qById.get(String(id)))
      .filter(Boolean);
    const randomizedQuestions = [...orderedQuestions].sort(() => 0.5 - Math.random());

    // ✅ Capitalize categorieshttps://chatgpt.com/c/68f79849-cb68-8322-b921-9a3a1696fc35
    const displayCategories = categories.map(
      (c) => c.charAt(0).toUpperCase() + c.slice(1)
    );

    // ✅ Send final quiz
    console.log(`🚀 Sending ${randomizedQuestions.length} questions for quiz "${quiz.title}"`);
    res.json({
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        categories: displayCategories,
        numQuestions: quiz.numQuestions,
        duration: quiz.duration,
        createdBy: quiz.createdBy,
        questions: randomizedQuestions,
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
