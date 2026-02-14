import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    // Cognito stable unique id
    cognitoSub: { type: String, required: true, unique: true, index: true },

    // helpful metadata (optional)
    email: { type: String, index: true },
    username: { type: String },

    preferences: {
      timezone: { type: String, default: "America/New_York" },
      theme: { type: String, default: "light" },
    },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
