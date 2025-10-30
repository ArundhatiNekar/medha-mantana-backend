import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

/* -------------------------------------------------------------------------- */
/*                         🔑 JWT TOKEN GENERATION                            */
/* -------------------------------------------------------------------------- */
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || "secret123",
    { expiresIn: "1d" }
  );
};

/* -------------------------------------------------------------------------- */
/*                           👤 REGISTER (Student/Faculty)                    */
/* -------------------------------------------------------------------------- */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, role, facultyCode } = req.body;

    if (!username || !email || !password || !role)
      return res.status(400).json({ error: "All fields are required" });

    const normalizedEmail = email.toLowerCase();

    // 🔒 Faculty registration code check
    if (role === "faculty") {
      const FACULTY_SECRET = process.env.FACULTY_SECRET || "supersecret123";
      if (facultyCode !== FACULTY_SECRET) {
        return res.status(403).json({ error: "❌ Invalid faculty code" });
      }
    }

    // ❌ Block manual admin registration
    if (role === "admin") {
      return res.status(403).json({
        error: "❌ Admin registration is not allowed. Please contact system admin.",
      });
    }

    // ✅ Validate existing user
    const existingUser = await User.findOne({
      $or: [{ username }, { email: normalizedEmail }],
    });
    if (existingUser)
      return res.status(400).json({ error: "User already exists" });

    // 🔑 Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🆕 Create new user
    const newUser = new User({
      username,
      email: normalizedEmail,
      password: hashedPassword,
      role: role === "faculty" ? "faculty" : "student",
    });

    await newUser.save();
    const token = generateToken(newUser);

    res.status(201).json({
      message: `✅ ${newUser.role} registered successfully`,
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
/*                               🔐 LOGIN                                     */
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

    if (!loginId || !password)
      return res.status(400).json({ error: "All fields are required" });

    // 🔍 Find user
    const query =
      loginId.includes("@") && loginId.includes(".")
        ? { email: loginId.toLowerCase() }
        : { username: loginId };

    const user = await User.findOne(query);
    if (!user) return res.status(404).json({ error: "User not found" });

    // 🧩 Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid credentials" });

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
/*                       👩‍🏫 ADMIN LOGIN (Manual only)                        */
/* -------------------------------------------------------------------------- */
router.post("/admin-login", async (req, res) => {
  try {
    const { email, password, adminCode } = req.body;

    if (!email || !password || !adminCode)
      return res
        .status(400)
        .json({ error: "Email, password, and admin code are required" });

    const ADMIN_SECRET = process.env.ADMIN_SECRET || "adminsecret123";
    if (adminCode !== ADMIN_SECRET)
      return res.status(403).json({ error: "❌ Invalid admin code" });

    const admin = await User.findOne({ email, role: "admin" });
    if (!admin)
      return res
        .status(404)
        .json({ error: "Admin not found or not authorized" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(400).json({ error: "Invalid credentials" });

    const token = generateToken(admin);
    res.json({
      message: "✅ Admin login successful",
      token,
      user: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    console.error("❌ Error logging in admin:", err);
    res.status(500).json({ error: "Server error during admin login" });
  }
});


/* -------------------------------------------------------------------------- */
/*                         🔵 GOOGLE REGISTER                                 */
/* -------------------------------------------------------------------------- */
router.post("/google-register", async (req, res) => {
  try {
    const { username, email, password, role, facultyCode } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    const normalizedEmail = email.toLowerCase();

    // 🧩 Validate role codes
    if (role === "faculty") {
      const FACULTY_SECRET = process.env.FACULTY_SECRET || "supersecret123";
      if (facultyCode !== FACULTY_SECRET)
        return res.status(403).json({ error: "❌ Invalid faculty code" });
    }

    if (role === "admin") {
      const ADMIN_SECRET = process.env.ADMIN_SECRET || "adminsecret123";
      if (facultyCode !== ADMIN_SECRET)
        return res.status(403).json({ error: "❌ Invalid admin code" });
    }

    const finalRole =
      role === "faculty" ? "faculty" : role === "admin" ? "admin" : "student";

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (user.role !== finalRole) {
        user.role = finalRole;
        await user.save();
      }
      const token = generateToken(user);
      return res.json({
        message: "✅ Logged in with Google",
        token,
        user,
      });
    }

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
      user: newUser,
    });
  } catch (err) {
    console.error("❌ Google registration error:", err);
    res.status(500).json({ error: "Server error during Google registration" });
  }
});

/* -------------------------------------------------------------------------- */
/*                          🔵 GOOGLE LOGIN                                   */
/* -------------------------------------------------------------------------- */
router.post("/google-login", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    const normalizedEmail = email.toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

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

    if (user.role === "admin" || user.role === "faculty")
      return res
        .status(403)
        .json({ error: "Admins and faculty must use manual login." });

    const token = generateToken(user);

    res.json({
      message: "✅ Google login successful",
      token,
      user,
    });
  } catch (err) {
    console.error("❌ Google login error:", err);
    res.status(500).json({ error: "Server error during Google login" });
  }
});

/* -------------------------------------------------------------------------- */
/*                           ✏️ UPDATE PROFILE                                */
/* -------------------------------------------------------------------------- */
router.put("/update-profile", authMiddleware, async (req, res) => {
  try {
    const { email, password } = req.body;
    const userId = req.user.id;

    if (!email && !password)
      return res
        .status(400)
        .json({ error: "At least one field (email or password) required" });

    const updateData = {};

    if (email) {
      updateData.email = email.toLowerCase();
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: userId },
      });
      if (existingUser)
        return res.status(400).json({ error: "Email already in use" });
    }

    if (password) updateData.password = await bcrypt.hash(password, 10);

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
    });

    if (!updatedUser)
      return res.status(404).json({ error: "User not found" });

    res.json({
      message: "✅ Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("❌ Error updating profile:", err);
    res.status(500).json({ error: "Server error during profile update" });
  }
});

export default router;
