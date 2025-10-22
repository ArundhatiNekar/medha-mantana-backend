import mongoose from "mongoose";
import dotenv from "dotenv";
import Question from "./models/Question.js";

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Connected to MongoDB");

    // Fix missing answers
    await Question.updateMany(
      { answer: { $exists: false } },
      { $set: { answer: "" } }
    );

    // Fix missing explanations
    await Question.updateMany(
      { explanation: { $exists: false } },
      { $set: { explanation: "" } }
    );

    console.log("✅ Fixed missing fields in questions collection");

    process.exit();
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
};

run();
