import Result from "../models/Result.js";

export const getAllResults = async (req, res) => {
  try {
    const results = await Result.find()
      .populate("user", "username email role")
      .populate("quiz", "title")
      .sort({ createdAt: -1 });

    if (!results.length) {
      return res.status(404).json({ message: "No results found" });
    }

    res.status(200).json({ results });
  } catch (err) {
    console.error("Error fetching results:", err);
    res.status(500).json({ error: "Server error fetching results" });
  }
};
