
import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
    },

    sections: {
      type: [String],
      default: ["A"],
    },

    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
    ],

    academicSession: {
      type: String,
      required: true,
      trim: true,
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

classSchema.index(
  { organisation: 1, academicSession: 1, className: 1 },
  { unique: true }
);

const Class =
  mongoose.models.Class || mongoose.model("Class", classSchema);

export default Class;
