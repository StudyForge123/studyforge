import mongoose from "mongoose";

const EventSchema = new mongoose.Schema(
  {
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    title: { type: String, required: true },
    type: { type: String, default: "study" },
    startAt: { type: Date, required: true },
    endAt: { type: Date }
  },
  { timestamps: true }
);

export default mongoose.model("Event", EventSchema);
