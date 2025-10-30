import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: "aptiquest" });

    const admin = await User.findOne({ email: "admin@medha.com" });
    if (!admin) {
      console.log("❌ No admin found with this email.");
    } else {
      console.log("✅ Admin found:");
      console.log(admin);
    }
  } catch (err) {
    console.error("❌ Error checking admin:", err);
  } finally {
    mongoose.connection.close();
  }
};

checkAdmin();
