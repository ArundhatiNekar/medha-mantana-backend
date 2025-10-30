// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // ✅ Make sure this line exists

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "No token, authorization denied" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");

    // ✅ Fetch user from DB to attach role, username, etc.
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = user; // ✅ Now req.user contains _id, email, role, etc.
    next();
  } catch (err) {
    console.error("❌ Auth error:", err);
    return res.status(403).json({ error: "Token is invalid or expired" });
  }
};

export default authMiddleware;
