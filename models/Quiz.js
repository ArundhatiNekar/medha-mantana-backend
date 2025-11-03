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

    // ✅ Store referenced question IDs (consistent name used across routes)
    questionIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Question" }
    ],

    // ✅ Duration in SECONDS
    duration: { type: Number, required: true },

    // ✅ Optional description for quiz
    description: { type: String, default: "" }, // 🆕 Added safely

    // ✅ Store creator name or user reference
    createdBy: { type: String, required: true }, // keeping your format intact

    // ---------- scheduling fields ----------
    scheduledStart: { type: Date, default: null }, // faculty sets start time
    scheduledEnd: { type: Date, default: null }, // faculty sets end time
    // -----------------------------------------

    // ---------- certificate fields ----------
    certificateEnabled: { type: Boolean, default: false }, // faculty toggles this
    certificateTemplate: { type: String, default: "" }, // optional path or template name
    certificatePassingScore: { type: Number, default: 0 }, // optional threshold
    // -----------------------------------------
  },
  { timestamps: true }
);

/* ---------------------------------------------
✅  Additional Enhancements (without removing anything)
----------------------------------------------*/

// 🆕 Virtual field to auto-populate question count if not manually given
QuizSchema.virtual("questionCount").get(function () {
  return this.questionIds?.length || 0;
});

// 🆕 Middleware to normalize category names to lowercase before saving
QuizSchema.pre("save", function (next) {
  if (this.categories && Array.isArray(this.categories)) {
    this.categories = this.categories.map(cat => cat.toLowerCase());
  }
  next();
});

// 🆕 Static helper method to find quizzes by creator (useful for faculty dashboard)
QuizSchema.statics.findByCreator = function (creator) {
  return this.find({ createdBy: creator });
};

export default mongoose.model("Quiz", QuizSchema);
