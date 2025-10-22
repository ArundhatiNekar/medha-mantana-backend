import mongoose from "mongoose";

const CSVFileSchema = new mongoose.Schema({
  originalname: String,   // original name of the uploaded file
  filename: String,       // stored filename on server
  uploadedAt: { type: Date, default: Date.now }
});

export default mongoose.model("CSVFile", CSVFileSchema);
