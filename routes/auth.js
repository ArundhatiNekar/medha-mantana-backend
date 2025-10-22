import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

// 🔑 Helper: Generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "secret123",
    { expiresIn: "1d" }
  );
};

/* -------------------------------------------------------------------------- */
/*                            ✅ MANUAL REGISTER                              */
/* -------------------------------------------------------------------------- */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role, facultyCode } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const normalizedEmail = email.toLowerCase();

    // 🔐 Faculty registration validation
    if (role === "faculty") {
      const FACULTY_SECRET = process.env.FACULTY_SECRET || "supersecret123";
      if (facultyCode !== FACULTY_SECRET) {
        return res.status(403).json({ error: "❌ Invalid faculty code" });
      }
    }

    const finalRole = role === "faculty" ? "faculty" : "student";

    // 🧠 Check if user exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email: normalizedEmail }],
    });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // 🔑 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🧾 Create new user
    const newUser = new User({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      role: finalRole,
    });

    await newUser.save();

    const token = generateToken(newUser);

    res.status(201).json({
      message: `✅ ${finalRole} registered successfully`,
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("❌ Error registering user:", err);
    res.status(500).json({ error: "Server error during registration" });
  }
});

/* -------------------------------------------------------------------------- */
/*                                ✅ MANUAL LOGIN                             */
/* -------------------------------------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const loginId =
      req.body.loginId ||
      req.body.usernameOrEmail ||
      req.body.username ||
      req.body.email ||
      "";
    const password = req.body.password || "";

    if (!loginId || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // 🕵️ Find by email or username
    const query =
      loginId.includes("@") && loginId.includes(".")
        ? { email: loginId.toLowerCase() }
        : { username: loginId };

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 🔐 Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = generateToken(user);

    res.json({
      message: "✅ Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Error logging in:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

/* -------------------------------------------------------------------------- */
/*                      ✅ GOOGLE REGISTER (FIRST TIME)                       */
/* -------------------------------------------------------------------------- */
router.post("/google-register", async (req, res) => {
  try {
    const { username, email, password, role, facultyCode } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase();

    // Check if already exists
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const token = generateToken(user);
      return res.json({
        message: "✅ Logged in with Google",
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    }

    // 🔐 Faculty registration check
    if (role === "faculty") {
      const FACULTY_SECRET = process.env.FACULTY_SECRET || "supersecret123";
      if (facultyCode !== FACULTY_SECRET) {
        return res.status(403).json({ error: "❌ Invalid faculty code" });
      }
    }

    const finalRole = role === "faculty" ? "faculty" : "student";

    // Create Google user
    const newUser = new User({
      username: username || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      password: await bcrypt.hash(password || "google-oauth", 10),
      role: finalRole,
      isGoogleUser: true,
    });

    await newUser.save();

    const token = generateToken(newUser);

    res.status(201).json({
      message: "✅ Google account registered successfully",
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error("❌ Google registration error:", err);
    res.status(500).json({ error: "Server error during Google registration" });
  }
});

/* -------------------------------------------------------------------------- */
/*                        ✅ GOOGLE LOGIN (RETURN USERS)                      */
/* -------------------------------------------------------------------------- */
router.post("/google-login", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase();

    // 🔍 Check if user exists
    let user = await User.findOne({ email: normalizedEmail });

    // 🟢 If not exists, create a new student user
    if (!user) {
      user = new User({
        username: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: await bcrypt.hash("google-oauth", 10),
        role: "student",
        isGoogleUser: true,
      });
      await user.save();
    }

    const token = generateToken(user);

    res.json({
      message: "✅ Logged in with Google successfully",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Google login error:", err);
    res.status(500).json({ error: "Server error during Google login" });
  }
});

/* -------------------------------------------------------------------------- */
/*                            ✅ UPDATE PROFILE                               */
/* -------------------------------------------------------------------------- */
router.put("/update-profile", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!email && !password) {
      return res.status(400).json({ error: "At least one field (email or password) is required" });
    }

    const updateData = {};

    if (email) {
      updateData.email = email.toLowerCase();
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: "Email already in use" });
      }
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "✅ Profile updated successfully",
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ error: "Server error during profile update" });
  }
});

export default router;
