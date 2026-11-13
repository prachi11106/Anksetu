
import mongoose from "mongoose";

const academicSessionSchema = new mongoose.Schema(
  {
    sessionName: {
      type: String,
      required: true,
      trim: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: false,
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

academicSessionSchema.pre("validate", function () {
  if (
    this.startDate &&
    this.endDate &&
    this.startDate >= this.endDate
  ) {
    this.invalidate(
      "endDate",
      "End date must be after the start date"
    );
  }
});

academicSessionSchema.index(
  { organisation: 1, sessionName: 1 },
  { unique: true }
);

const AcademicSession =
  mongoose.models.AcademicSession ||
  mongoose.model("AcademicSession", academicSessionSchema);

export default AcademicSession;
