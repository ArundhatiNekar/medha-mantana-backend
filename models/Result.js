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
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    score: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    wrongAnswers: { type: Number, required: true },
    attemptedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);


export default mongoose.model("Result", resultSchema);
