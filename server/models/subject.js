
import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
  {
    subjectName: {
      type: String,
      required: true,
      trim: true,
    },

    subjectCode: {
      type: String,
      trim: true,
      default: "",
    },

    organisation: {
      type: String,
      required: true,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

subjectSchema.index(
  { organisation: 1, subjectName: 1 },
  { unique: true }
);

const Subject =
  mongoose.models.Subject ||
  mongoose.model("Subject", subjectSchema);

export default Subject;
