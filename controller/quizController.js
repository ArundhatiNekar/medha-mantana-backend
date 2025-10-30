// controller/quizController.js
import Quiz from "../models/Quiz.js";

/* -------------------------------------------------------------------------- */
/*                            📋 Get All Quizzes                              */
/* -------------------------------------------------------------------------- */
export const getAllQuizzes = async (req, res) => {
  try {
    const quizzes = await Quiz.find()
      .populate("createdBy", "username email")
      .sort({ createdAt: -1 });
    res.status(200).json(quizzes);
  } catch (err) {
    console.error("❌ Error fetching quizzes:", err);
    res.status(500).json({ error: "Server error fetching quizzes" });
  }
};

/* -------------------------------------------------------------------------- */
/*                            ➕ Create a New Quiz                             */
/* -------------------------------------------------------------------------- */
export const createQuiz = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    const newQuiz = new Quiz({
      title,
      description,
      createdBy: req.user._id,
    });

    await newQuiz.save();
    res.status(201).json({ message: "✅ Quiz created successfully", quiz: newQuiz });
  } catch (err) {
    console.error("❌ Error creating quiz:", err);
    res.status(500).json({ error: "Server error creating quiz" });
  }
};

/* -------------------------------------------------------------------------- */
/*                             ✏️ Update a Quiz                                */
/* -------------------------------------------------------------------------- */
export const updateQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const updatedQuiz = await Quiz.findByIdAndUpdate(
      id,
      { title, description },
      { new: true }
    );

    if (!updatedQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.json({ message: "✅ Quiz updated successfully", quiz: updatedQuiz });
  } catch (err) {
    console.error("❌ Error updating quiz:", err);
    res.status(500).json({ error: "Server error updating quiz" });
  }
};

/* -------------------------------------------------------------------------- */
/*                             ❌ Delete a Quiz                                */
/* -------------------------------------------------------------------------- */
export const deleteQuiz = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedQuiz = await Quiz.findByIdAndDelete(id);

    if (!deletedQuiz) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    res.json({ message: "✅ Quiz deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting quiz:", err);
    res.status(500).json({ error: "Server error deleting quiz" });
  }
};
