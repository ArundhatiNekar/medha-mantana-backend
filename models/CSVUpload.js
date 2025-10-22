// backend/models/CSVUpload.js
import mongoose from "mongoose";

const csvUploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalname: { type: String },
  uploadedBy: { type: String }, // or ref to User
  uploadedAt: { type: Date, default: Date.now },
  batchId: { type: String, required: true }
});

export default mongoose.model("CSVUpload", csvUploadSchema);
