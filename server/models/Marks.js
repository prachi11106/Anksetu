
import mongoose from "mongoose";

// ======================================
// STUDENT MARKS SCHEMA
// ======================================

const studentMarksSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    marksObtained: {
      type: Number,
      required: true,
      min: [0, "Marks cannot be negative."],
    },

    attendance: {
      type: String,
      enum: ["Present", "Absent"],
      default: "Present",
      required: true,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Remarks cannot exceed 500 characters."],
    },
  },
  {
    _id: false,
  }
);

// ======================================
// MAIN MARKS SCHEMA
// ======================================

const marksSchema = new mongoose.Schema(
  {
    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },

    exam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
    },

    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    section: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    maxMarks: {
      type: Number,
      required: true,
      min: [1, "Maximum marks must be at least 1."],
    },

    passingMarks: {
      type: Number,
      required: true,
      min: [0, "Passing marks cannot be negative."],
    },

    students: {
      type: [studentMarksSchema],
      default: [],
    },

    organisation: {
      type: String,
      required: true,
      trim: true,
    },

    enteredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================
// DOCUMENT VALIDATION
// ======================================

marksSchema.pre("validate", function () {
  // 1. Validate maximum marks.

  if (
    !Number.isFinite(this.maxMarks) ||
    this.maxMarks <= 0
  ) {
    this.invalidate(
      "maxMarks",
      "Maximum marks must be a valid positive number."
    );
  }

  // 2. Validate passing marks.

  if (
    !Number.isFinite(this.passingMarks) ||
    this.passingMarks < 0
  ) {
    this.invalidate(
      "passingMarks",
      "Passing marks must be a valid non-negative number."
    );
  }

  // 3. Passing marks cannot exceed maximum marks.

  if (
    Number.isFinite(this.maxMarks) &&
    Number.isFinite(this.passingMarks) &&
    this.passingMarks > this.maxMarks
  ) {
    this.invalidate(
      "passingMarks",
      "Passing marks cannot exceed maximum marks."
    );
  }

  // 4. At least one student's marks are required.

  if (!this.students || this.students.length === 0) {
    this.invalidate(
      "students",
      "At least one student's marks must be entered."
    );

    return;
  }

  // 5. Check duplicate student entries.

  const studentIds = this.students.map((item) =>
    String(item.student)
  );

  if (
    new Set(studentIds).size !== studentIds.length
  ) {
    this.invalidate(
      "students",
      "Duplicate student entries are not allowed."
    );
  }

  // 6. Validate each student's marks.

  for (const item of this.students) {
    const marks = Number(item.marksObtained);

    if (
      item.marksObtained == null ||
      !Number.isFinite(marks)
    ) {
      this.invalidate(
        "students",
        "Valid marks must be entered for every student."
      );

      continue;
    }

    // Negative marks are not allowed.

    if (marks < 0) {
      this.invalidate(
        "students",
        "Student marks cannot be negative."
      );
    }

    // Absent students must have zero marks.

    if (
      item.attendance === "Absent" &&
      marks !== 0
    ) {
      this.invalidate(
        "students",
        "Absent students must have zero marks."
      );
    }

    // Obtained marks cannot exceed maximum marks.

    if (
      Number.isFinite(this.maxMarks) &&
      marks > this.maxMarks
    ) {
      this.invalidate(
        "students",
        "Student marks cannot exceed maximum marks."
      );
    }
  }
});

// ======================================
// DATABASE INDEXES
// ======================================

// 1. One marks record per subject, exam,
// class and section in an organisation.

marksSchema.index(
  {
    organisation: 1,
    exam: 1,
    classId: 1,
    section: 1,
    subject: 1,
  },
  {
    unique: true,
  }
);

// 2. Organisation-wide marks searches.

marksSchema.index({
  organisation: 1,
  academicSession: 1,
  classId: 1,
  section: 1,
  updatedAt: -1,
});

// 3. Student-specific marks lookup.

marksSchema.index({
  organisation: 1,
  "students.student": 1,
  academicSession: 1,
});

// ======================================
// MODEL EXPORT
// ======================================

const Marks =
  mongoose.models.Marks ||
  mongoose.model("Marks", marksSchema);

export default Marks;
