import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },

    // ✅ Added default role (safe update)
    role: {
      type: String,
      enum: ["student", "faculty", "admin"],
      required: [true, "Role is required"],
      default: "student", // <-- Default to student so old records still work
    },
  },
  {
    timestamps: true, // ✅ Adds createdAt & updatedAt automatically
  }
);

export default mongoose.model("User", userSchema);
