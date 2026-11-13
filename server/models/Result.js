
import mongoose from "mongoose";

// ======================================
// SUBJECT RESULT SCHEMA
// ======================================

const subjectResultSchema = new mongoose.Schema(
  {
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },

    marksObtained: {
      type: Number,
      required: true,
      min: 0,
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

    attendance: {
      type: String,
      enum: ["Present", "Absent"],
      default: "Present",
      required: true,
    },

    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    grade: {
      type: String,
      default: "N/A",
      trim: true,
    },

    status: {
      type: String,
      enum: ["Pass", "Fail"],
      required: true,
    },
  },
  {
    _id: false,
  }
);

// ======================================
// SUBJECT RESULT VALIDATION
// ======================================

subjectResultSchema.pre("validate", function () {
  if (
    this.maxMarks != null &&
    this.marksObtained != null &&
    this.marksObtained > this.maxMarks
  ) {
    this.invalidate(
      "marksObtained",
      "Obtained marks cannot exceed maximum marks."
    );
  }

  if (
    this.maxMarks != null &&
    this.passingMarks != null &&
    this.passingMarks > this.maxMarks
  ) {
    this.invalidate(
      "passingMarks",
      "Passing marks cannot exceed maximum marks."
    );
  }

  // Absent students must have zero marks.
  if (
    this.attendance === "Absent" &&
    this.marksObtained !== 0
  ) {
    this.invalidate(
      "marksObtained",
      "Absent students must have zero marks."
    );
  }

  // Validate subject percentage.
  if (
    this.maxMarks > 0 &&
    this.marksObtained != null &&
    this.percentage != null
  ) {
    const expectedPercentage =
      (this.marksObtained / this.maxMarks) * 100;

    if (
      Math.abs(this.percentage - expectedPercentage) >
      0.02
    ) {
      this.invalidate(
        "percentage",
        "Subject percentage does not match obtained marks."
      );
    }
  }

  // An absent student always fails,
  // even when passing marks are zero.
  if (
    this.marksObtained != null &&
    this.passingMarks != null &&
    this.status
  ) {
    const shouldPass =
      this.attendance !== "Absent" &&
      this.marksObtained >= this.passingMarks;

    const expectedStatus = shouldPass ? "Pass" : "Fail";

    if (this.status !== expectedStatus) {
      this.invalidate(
        "status",
        "Subject pass/fail status does not match marks and attendance."
      );
    }
  }
});

// ======================================
// STUDENT RESULT SCHEMA
// ======================================

const studentResultSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    subjects: {
      type: [subjectResultSchema],
      default: [],
    },

    totalObtained: {
      type: Number,
      required: true,
      min: 0,
    },

    totalMaximum: {
      type: Number,
      required: true,
      min: 1,
    },

    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    overallGrade: {
      type: String,
      required: true,
      trim: true,
    },

    resultStatus: {
      type: String,
      enum: ["Pass", "Fail"],
      required: true,
    },

    attendance: {
      present: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
          validator: Number.isInteger,
          message: "Present attendance must be a whole number.",
        },
      },

      absent: {
        type: Number,
        default: 0,
        min: 0,
        validate: {
          validator: Number.isInteger,
          message: "Absent attendance must be a whole number.",
        },
      },
    },

    teacherRemarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },

    improvementSuggestions: {
      type: [String],
      default: [],
    },
  },
  {
    _id: false,
  }
);

// ======================================
// STUDENT RESULT VALIDATION
// ======================================

studentResultSchema.pre("validate", function () {
  if (!this.subjects || this.subjects.length === 0) {
    this.invalidate(
      "subjects",
      "At least one subject result is required."
    );
    return;
  }

  // Validate total obtained marks.
  const calculatedObtained = this.subjects.reduce(
    (sum, subject) =>
      sum + Number(subject.marksObtained || 0),
    0
  );

  // Validate total maximum marks.
  const calculatedMaximum = this.subjects.reduce(
    (sum, subject) =>
      sum + Number(subject.maxMarks || 0),
    0
  );

  if (
    this.totalObtained != null &&
    Math.abs(this.totalObtained - calculatedObtained) > 0.001
  ) {
    this.invalidate(
      "totalObtained",
      "Total obtained marks must equal the sum of subject marks."
    );
  }

  if (
    this.totalMaximum != null &&
    Math.abs(this.totalMaximum - calculatedMaximum) > 0.001
  ) {
    this.invalidate(
      "totalMaximum",
      "Total maximum marks must equal the sum of subject maximum marks."
    );
  }

  // Validate overall percentage.
  if (
    this.totalMaximum > 0 &&
    this.totalObtained != null &&
    this.percentage != null
  ) {
    const expectedPercentage =
      (this.totalObtained / this.totalMaximum) * 100;

    if (
      Math.abs(this.percentage - expectedPercentage) > 0.02
    ) {
      this.invalidate(
        "percentage",
        "Overall percentage does not match total marks."
      );
    }
  }

  // Validate duplicate subjects.
  const subjectIds = this.subjects.map((item) =>
    String(item.subject)
  );

  if (new Set(subjectIds).size !== subjectIds.length) {
    this.invalidate(
      "subjects",
      "Duplicate subjects are not allowed in a student result."
    );
  }

  // Validate overall Pass/Fail status.
  const hasFailedSubject = this.subjects.some(
    (subject) => subject.status === "Fail"
  );

  const expectedStatus = hasFailedSubject ? "Fail" : "Pass";

  if (
    this.resultStatus &&
    this.resultStatus !== expectedStatus
  ) {
    this.invalidate(
      "resultStatus",
      "Overall result status must match subject results."
    );
  }

  // Calculate attendance directly from subject records.
  const calculatedPresent = this.subjects.filter(
    (subject) => subject.attendance === "Present"
  ).length;

  const calculatedAbsent = this.subjects.filter(
    (subject) => subject.attendance === "Absent"
  ).length;

  const present = this.attendance?.present ?? 0;
  const absent = this.attendance?.absent ?? 0;

  if (
    present !== calculatedPresent ||
    absent !== calculatedAbsent
  ) {
    this.invalidate(
      "attendance",
      "Attendance counts must match subject attendance records."
    );
  }

  if (present + absent !== this.subjects.length) {
    this.invalidate(
      "attendance",
      "Attendance count must match the number of subjects."
    );
  }
});

// ======================================
// MAIN RESULT SCHEMA
// ======================================

const resultSchema = new mongoose.Schema(
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

    students: {
      type: [studentResultSchema],
      default: [],
    },

    classAverage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    passCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    failCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    organisation: {
      type: String,
      required: true,
      trim: true,
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ======================================
// MAIN RESULT VALIDATION
// ======================================

resultSchema.pre("validate", function () {
  if (!this.students || this.students.length === 0) {
    this.invalidate(
      "students",
      "At least one student result is required."
    );
    return;
  }

  // Validate duplicate students.
  const studentIds = this.students.map((item) =>
    String(item.student)
  );

  if (new Set(studentIds).size !== studentIds.length) {
    this.invalidate(
      "students",
      "Duplicate students are not allowed in a result."
    );
  }

  // Validate Pass/Fail counts.
  const actualPassCount = this.students.filter(
    (student) => student.resultStatus === "Pass"
  ).length;

  const actualFailCount = this.students.filter(
    (student) => student.resultStatus === "Fail"
  ).length;

  if (
    this.passCount !== actualPassCount ||
    this.failCount !== actualFailCount
  ) {
    this.invalidate(
      "passCount",
      "Pass and fail counts must match the student results."
    );
  }

  if (
    this.passCount + this.failCount !== this.students.length
  ) {
    this.invalidate(
      "passCount",
      "Pass and fail counts must equal the total number of students."
    );
  }

  // Validate class average.
  const calculatedAverage =
    this.students.reduce(
      (sum, student) =>
        sum + Number(student.percentage || 0),
      0
    ) / this.students.length;

  if (
    this.classAverage == null ||
    Math.abs(this.classAverage - calculatedAverage) > 0.02
  ) {
    this.invalidate(
      "classAverage",
      "Class average does not match student percentages."
    );
  }
});

// ======================================
// DATABASE INDEXES
// ======================================

// One result per organisation, session,
// exam, class and section.
resultSchema.index(
  {
    organisation: 1,
    academicSession: 1,
    exam: 1,
    classId: 1,
    section: 1,
  },
  {
    unique: true,
  }
);

// Organisation-wide result searches.
resultSchema.index({
  organisation: 1,
  generatedAt: -1,
});

// ======================================
// MODEL EXPORT
// ======================================

const Result =
  mongoose.models.Result ||
  mongoose.model("Result", resultSchema);

export default Result;
