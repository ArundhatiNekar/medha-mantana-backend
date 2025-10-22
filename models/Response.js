import mongoose from "mongoose";

const resultSchema = new mongoose.Schema({
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz" },
  studentName: String,
  answers: Object,
  score: Number,
  total: Number,
  timeTaken: { type: Number, default: 0 }, // ✅ seconds
  date: { type: Date, default: Date.now },
});

export default mongoose.model("Result", resultSchema);
