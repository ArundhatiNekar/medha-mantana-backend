// backend/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // ✅ Import User model

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // "Bearer <token>"

    if (!token) {
      return res.status(401).json({ error: "No token, authorization denied" });
    }

    // ✅ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");

    // ✅ Fetch user details from DB and attach to request
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user = user; // ✅ Full user object (has _id, email, role)
    next();
  } catch (err) {
    console.error("❌ Auth Middleware Error:", err);
    return res.status(403).json({ error: "Token is invalid or expired" });
  }
};

export default authMiddleware;
