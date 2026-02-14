import mongoose from "mongoose";

const SyllabusSchema = new mongoose.Schema(
  {
    ownerSub: { type: String, required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true, index: true },

    // store the PDF in S3, store pointer here:
    s3Key: { type: String, required: true },

    // optional: extracted text or chunk refs (for RAG)
    extractedText: { type: String },
  },
  { timestamps: true }
);

SyllabusSchema.index({ ownerSub: 1, classId: 1 }, { unique: true });

export const Syllabus =
  mongoose.models.Syllabus || mongoose.model("Syllabus", SyllabusSchema);
