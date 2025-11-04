import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { stringify } from "csv-stringify";
import { v4 as uuidv4 } from "uuid";
import Question from "../models/Question.js";
import CSVUpload from "../models/CSVUpload.js";
import UploadedCSV from "../models/UploadedCSV.js";
import Quiz from "../models/Quiz.js";
import { Parser } from "json2csv";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ✅ Allowed categories (consistent lowercase)
const categories = [
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

/* ------------------ GET ALL QUESTIONS ------------------ */
router.get("/", async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== "all" ? { category: category.toLowerCase() } : {};
    const questions = await Question.find(filter).sort({ createdAt: -1 });
    res.json(questions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ MANUAL ADD QUESTION ------------------ */
router.post("/", async (req, res) => {
  try {
    const { question, options, answer, category, source, explanation } = req.body;

    if (!question || !answer || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: "⚠️ Provide question, at least two options, and the correct answer." });
    }

    const normalizedCategory = category?.toLowerCase().trim() || "general";
    const ALLOWED_CATEGORIES = ["all", ...categories];

    if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
      return res.status(400).json({ error: `⚠️ Invalid category: ${normalizedCategory}` });
    }

    const exists = await Question.findOne({ question: question.trim() });
    if (exists) {
      return res.status(400).json({ error: "❌ Question already exists" });
    }

    const newQuestion = new Question({
      question: question.trim(),
      options: options.map((opt) => opt?.trim()).filter(Boolean),
      answer: answer.trim(),
      explanation: explanation?.trim() || "",
      category: normalizedCategory,
      source: source || "manual",
    });

    await newQuestion.save();
    res.status(201).json({ message: "✅ Question added successfully", question: newQuestion });
  } catch (err) {
    console.error("❌ Error adding question:", err);
    res.status(500).json({ error: "Server error while adding question" });
  }
});

/* ------------------ UPDATE QUESTION ------------------ */
router.put("/:id", async (req, res) => {
  try {
    const cat = req.body.category?.toLowerCase();
    if (cat && !categories.includes(cat)) {
      return res.status(400).json({ error: "⚠️ Invalid category" });
    }

    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        category: cat || "general",
        explanation: req.body.explanation?.trim() || "",
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "❌ Question not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------ DELETE SINGLE QUESTION ------------------ */
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "❌ Question not found" });
    res.json({ message: "✅ Question deleted" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ------------------ DELETE ALL QUESTIONS ------------------ */
router.delete("/", async (req, res) => {
  try {
    await Question.deleteMany({});
    await CSVUpload.deleteMany({});
    res.json({ message: "✅ All questions and CSV uploads deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ UPLOAD CSV ------------------ */
router.post("/upload-csv", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "⚠️ No file uploaded" });

  const batchId = uuidv4();
  let tempFilePath = req.file.path;

  try {
    const fileData = fs.readFileSync(tempFilePath, "utf8");

    const results = await new Promise((resolve, reject) => {
      Papa.parse(fileData, {
        header: true,
        skipEmptyLines: true,
        complete: (output) => resolve(output),
        error: (err) => reject(err),
      });
    });

    let inserted = 0, skipped = 0;

    const csvFile = await CSVUpload.create({
      filename: req.file.filename,
      originalname: req.file.originalname,
      batchId,
      uploadedBy: "faculty123", // can be changed later to user info
    });

    for (const row of results.data) {
      if (!row.question || !row.answer) {
        skipped++;
        continue;
      }

      const category = row.category?.toLowerCase() || "general";
      if (!categories.includes(category)) {
        skipped++;
        continue;
      }

      const exists = await Question.findOne({ question: row.question.trim() });
      if (exists) {
        skipped++;
        continue;
      }

      const options = [
        row.option1?.trim(),
        row.option2?.trim(),
        row.option3?.trim(),
        row.option4?.trim(),
      ].filter(Boolean);

      if (options.length < 2) {
        skipped++;
        continue;
      }

      await Question.create({
        question: row.question.trim(),
        options,
        answer: row.answer.trim(),
        category,
        explanation: row.explanation?.trim() || "",
        source: "csv",
        batchId,
        csvFileId: csvFile._id,
      });

      inserted++;
    }

    // ✅ Move file to permanent location
    const permanentPath = path.join("uploads", req.file.filename);
    fs.renameSync(tempFilePath, permanentPath);
    tempFilePath = null;

    res.json({
      message: "✅ CSV processed successfully",
      inserted,
      skipped,
      batchId,
      csvFileId: csvFile._id,
    });
  } catch (err) {
    console.error("❌ CSV processing failed:", err);
    res.status(500).json({ error: "❌ CSV processing failed: " + err.message });
  } finally {
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
});


/* ------------------ LIST CSV FILES ------------------ */
router.get("/csv-files", async (req, res) => {
  try {
    const files = await CSVUpload.find().sort({ createdAt: -1 });
    res.status(200).json(files || []);
  } catch (err) {
    console.error("❌ Error fetching CSV files:", err);
    res.status(500).json({ error: "Error fetching CSV files" });
  }
});

/* ------------------ DOWNLOAD ORIGINAL UPLOADED CSV ------------------ */
router.get("/download-csv/:id", async (req, res) => {
  try {
    const file = await UploadedCSV.findById(req.params.id);

    if (!file) {
      return res.status(404).json({ error: "CSV metadata not found" });
    }

    const filePath = path.join(process.cwd(), "uploads", file.filename);

    // ✅ Check if file actually exists on the server
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: "File not found on server. It might have been deleted after deployment.",
      });
    }

    // ✅ Send file to browser
    res.download(filePath, file.originalname);
  } catch (err) {
    console.error("❌ Error downloading CSV file:", err.message);
    res.status(500).json({ error: "Server error while downloading file" });
  }
});

/* ------------------ DELETE CSV FILE & RELATED QUESTIONS ------------------ */
router.delete("/delete-csv/:id", async (req, res) => {
  try {
    const file = await CSVUpload.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "CSV file not found" });

    const result = await Question.deleteMany({
      $or: [{ csvFileId: req.params.id }, { batchId: file.batchId }],
    });

    const filePath = path.join(process.cwd(), "uploads", file.filename);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.warn("⚠️ Unable to remove file:", e.message);
      }
    }

    await file.deleteOne();

    res.json({
      message: "✅ CSV file and related questions deleted",
      deleted: result.deletedCount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ------------------ SAMPLE CSV DOWNLOAD ------------------ */
router.get("/sample-csv", (req, res) => {
  const data = [
    ["question", "option1", "option2", "option3", "option4", "answer", "category", "explanation"],
    ["What is 2+2?", "2", "3", "4", "5", "4", "quantitative", "Because 2+2 = 4"],
    ["Which planet is red?", "Earth", "Mars", "Jupiter", "Saturn", "Mars", "general", "Mars looks red due to iron oxide"],
  ];
  const csvStream = stringify(data);
  res.setHeader("Content-Disposition", "attachment; filename=sample_questions.csv");
  res.set("Content-Type", "text/csv");
  csvStream.pipe(res);
});

/* ------------------ FETCH ALL UPLOADED CSV FILES ------------------ */
router.get("/uploaded-csvs", async (req, res) => {
  try {
    const files = await CSVUpload.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    console.error("❌ Error fetching uploaded CSVs:", err);
    res.status(500).json({ error: "Failed to fetch uploaded CSVs" });
  }
});


export default router;
