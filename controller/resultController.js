// controller/resultController.js
import Result from "../models/Result.js";

export const getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .populate("user", "username email")
      .populate("quiz", "title");
    res.json(results);
  } catch (error) {
    console.error("Error fetching results:", error);
    res.status(500).json({ error: "Server error fetching results" });
  }
};
