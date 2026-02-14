import mongoose from "mongoose";

const ClassSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    professor: { type: String, default: "" },
    semester: { type: String, default: "" }
  },
  { timestamps: true }
);

export default mongoose.model("Class", ClassSchema);
