import mongoose from "mongoose";

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: {
    type: [String],
    validate: [arr => arr.length > 0, "At least one option is required"],
  },
  answer: { type: String, required: true },

  // 🔥 Unified categories
  category: {
    type: String,
    enum: [
      "quantitative",
      "logical",
      "verbal",
      "numerical",
      "spatial",
      "mechanical",
      "technical",
      "reasoning",
      "general",
    ],
    required: true,
  },

  // ✅ Track source
  source: {
    type: String,
    enum: ["manual", "csv"],
    default: "manual",
  },

  // Optional explanation for answers
  explanation: { type: String, default: "" },

  // 🔥 CSV tracking
  batchId: { type: String, default: null },
  csvFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CSVUpload",
    default: null,
  },
}, { timestamps: true }); // ✅ adds createdAt, updatedAt automatically

export default mongoose.model("Question", questionSchema);
