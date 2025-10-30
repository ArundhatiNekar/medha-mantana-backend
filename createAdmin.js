import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import User from "./models/User.js"; // adjust path if needed

dotenv.config();

const createAdmin = async () => {
  try {
   await mongoose.connect(process.env.MONGO_URI, { dbName: "aptiquest" });

    const existingAdmin = await User.findOne({ email: "admin@medha.com" });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists!");
      return mongoose.connection.close();
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = new User({
      username: "SuperAdmin", // ✅ Added username
      email: "admin@medha.com",
      password: hashedPassword,
      role: "admin",
    });

    await admin.save();
    console.log("✅ Admin created successfully!");
    mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error creating admin:", error);
    mongoose.connection.close();
  }
};

createAdmin();
