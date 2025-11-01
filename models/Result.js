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
    // 🔥 Compatible with both old & new routes
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    studentName: { type: String, required: true },

    // ✅ snapshot & order
    answers: [answerSnapshotSchema],
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],

    // ✅ scoring & timing
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    correctAnswers: { type: Number },
    wrongAnswers: { type: Number },
    timeTaken: { type: Number, default: 0 },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Result", resultSchema);
