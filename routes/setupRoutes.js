// routes/setupRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

const router = express.Router();

router.post("/create-admin", async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = new User({
      name: "Admin",
      email: "admin@medha.com",
      password: hashedPassword,
      role: "admin"
    });
    await admin.save();
    res.json({ message: "Admin user created successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error creating admin", error });
  }
});

export default router;
