// backend/models/Result.js
import mongoose from "mongoose";

const answerSnapshotSchema = new mongoose.Schema({
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question", required: true },
  question: { type: String, required: true },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true },
  explanation: { type: String, default: "No explanation provided" },
  chosenAnswer: { type: String, required: true },
  correct: { type: Boolean, default: false },
});

const resultSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    studentName: { type: String, required: true, trim: true },
    answers: [answerSnapshotSchema],

    // 🔑 NEW: Preserve shuffled order of questions
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],

    score: { type: Number, required: true },
    total: { type: Number, required: true },
    timeTaken: { type: Number, required: true },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Result", resultSchema);
