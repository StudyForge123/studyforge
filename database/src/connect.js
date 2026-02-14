import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI in .env");
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
}
