import mongoose from "mongoose";

const QuizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },

    // ✅ Store multiple categories (always lowercase for consistency)
    categories: {
      type: [String],
      default: ["all"],
      required: true,
    },

    numQuestions: { type: Number, required: true },

    // ✅ Store referenced question IDs
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],

    // ✅ Duration in SECONDS
    duration: { type: Number, required: true },

    // ✅ Optional description for quiz
    description: { type: String, default: "" },

    // ✅ Store creator name or user reference
    createdBy: { type: String, required: true },



    // ---------- certificate fields ----------
    certificateEnabled: { type: Boolean, default: false },
    certificateTemplate: { type: String, default: "" },
    certificatePassingScore: { type: Number, default: 0 },
    // -----------------------------------------
  },
  { timestamps: true }
);

/* ---------------------------------------------
✅  Additional Enhancements (unchanged)
----------------------------------------------*/

// 🆕 Virtual field to auto-populate question count if not manually given
QuizSchema.virtual("questionCount").get(function () {
  return this.questionIds?.length || 0;
});

// 🆕 Middleware to normalize category names to lowercase before saving
QuizSchema.pre("save", function (next) {
  if (this.categories && Array.isArray(this.categories)) {
    this.categories = this.categories.map((cat) => cat.toLowerCase());
  }

  next();
});

// 🆕 Static helper method to find quizzes by creator
QuizSchema.statics.findByCreator = function (creator) {
  return this.find({ createdBy: creator });
};

export default mongoose.model("Quiz", QuizSchema);
