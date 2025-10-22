// scripts/fixResults.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Result from "../models/Result.js";

dotenv.config();

async function fixResults() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to DB");

    const results = await Result.find();
    console.log(`Found ${results.length} results to check...`);

    for (let res of results) {
      // If answers is a Map/Object instead of Array
      if (!Array.isArray(res.answers)) {
        const fixedAnswers = Object.entries(res.answers).map(([qId, chosen]) => ({
          questionId: qId,
          chosenAnswer: chosen,
        }));

        res.answers = fixedAnswers;
        await res.save();
        console.log(`🔧 Fixed result for student: ${res.studentName}, quizId: ${res.quizId}`);
      }
    }

    console.log("🎉 Migration completed!");
    process.exit();
  } catch (err) {
    console.error("❌ Error fixing results:", err);
    process.exit(1);
  }
}

fixResults();
