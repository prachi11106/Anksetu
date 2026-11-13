
import mongoose from "mongoose";

const examSchema = new mongoose.Schema(
  {
    examName: {
      type: String,
      required: true,
      trim: true,
    },

    examType: {
      type: String,
      enum: [
        "Unit Test",
        "Mid Term",
        "Half Yearly",
        "Annual",
        "Final",
        "Other",
      ],
      default: "Other",
    },

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    examDate: {
      type: Date,
    },

    maxMarks: {
      type: Number,
      required: true,
      min: 1,
    },

    passingMarks: {
      type: Number,
      required: true,
      min: 0,
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

examSchema.pre("validate", function () {
  if (
    this.maxMarks !== undefined &&
    this.passingMarks !== undefined &&
    this.passingMarks > this.maxMarks
  ) {
    this.invalidate(
      "passingMarks",
      "Passing marks cannot exceed maximum marks"
    );
  }
});

examSchema.index(
  {
    organisation: 1,
    academicSession: 1,
    classId: 1,
    examName: 1,
  },
  { unique: true }
);

const Exam =
  mongoose.models.Exam || mongoose.model("Exam", examSchema);

export default Exam;
