import mongoose from "mongoose";

const uploadedCSVSchema = new mongoose.Schema({
  originalname: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model("UploadedCSV", uploadedCSVSchema);
