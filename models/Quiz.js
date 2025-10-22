import mongoose from "mongoose";

const QuizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    // ✅ Store multiple categories (always lowercase for consistency)
    categories: {
      type: [String],
      default: ["all"],   // lowercase for DB
      required: true,
    },

    numQuestions: { type: Number, required: true },

    // ✅ Store referenced question IDs
    questionIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Question" }
    ],

    // ✅ Duration in SECONDS
    duration: { type: Number, required: true },

    createdBy: { type: String, required: true },

     // ---------- certificate fields ----------
    certificateEnabled: { type: Boolean, default: false }, // faculty toggles this
    certificateTemplate: { type: String, default: "" }, // optional path or template name
    certificatePassingScore: { type: Number, default: 0 }, // optional threshold
    // -----------------------------------------
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", QuizSchema);
