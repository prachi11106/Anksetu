
import express from "express";
import mongoose from "mongoose";

import Result from "../models/Result.js";
import Marks from "../models/Marks.js";
import Student from "../models/Student.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Exam from "../models/Exam.js";
import AcademicSession from "../models/AcademicSession.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ======================================
// AUTHENTICATION AND ORGANISATION
// ======================================

router.use(protect);
router.use(authorizeRoles("teacher", "admin"));

router.use((req, res, next) => {
  if (!req.user?.organisation) {
    return res.status(403).json({
      success: false,
      message:
        "Your account does not have an organisation assigned.",
    });
  }

  next();
});

const isValidId = (id) =>
  mongoose.isValidObjectId(id);

const organisationFilter = (req) => ({
  organisation: req.user.organisation,
});

// ======================================
// GRADE CALCULATION
// ======================================

function calculateGrade(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 33) return "E";
  return "F";
}

// ======================================
// IMPROVEMENT SUGGESTIONS
// RULE-BASED, NOT AI-GENERATED
// ======================================

function generateSuggestions(subjectResults) {
  const weakSubjects = subjectResults
    .filter(
      (subject) =>
        subject.percentage < 50 ||
        subject.status === "Fail"
    )
    .map((subject) => subject.subjectName);

  if (weakSubjects.length === 0) {
    return [
      "Keep up the good work and continue regular revision.",
    ];
  }

  return weakSubjects.map(
    (subject) =>
      `Focus on improving ${subject} through regular practice and revision.`
  );
}

// ======================================
// RESULT POPULATION
// ======================================

const resultPopulateOptions = [
  {
    path: "students.student",
    select:
      "fullName studentId rollNumber className section",
  },
  {
    path: "students.subjects.subject",
    select: "subjectName subjectCode",
  },
  {
    path: "exam",
    select:
      "examName examType examDate maxMarks passingMarks",
  },
  {
    path: "classId",
    select: "className sections",
  },
  {
    path: "academicSession",
    select: "sessionName startDate endDate",
  },
  {
    path: "generatedBy",
    select: "fullName",
  },
];

// ======================================
// GENERATE RESULTS
// POST /api/results/generate
// TEACHER ONLY
// ======================================

router.post(
  "/generate",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const {
        academicSession,
        exam,
        classId,
        section,
      } = req.body;

      const organisation = req.user.organisation;

      // ----------------------------------
      // 1. VALIDATE INPUT
      // ----------------------------------

      if (
        !academicSession ||
        !exam ||
        !classId ||
        typeof section !== "string" ||
        !section.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Academic session, exam, class and section are required.",
        });
      }

      if (
        ![academicSession, exam, classId].every(isValidId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "One or more selected IDs are invalid.",
        });
      }

      const normalizedSection = section
        .trim()
        .toUpperCase();

      // ----------------------------------
      // 2. FIND ACADEMIC SESSION
      // ----------------------------------

      const selectedSession =
        await AcademicSession.findOne({
          _id: academicSession,
          organisation,
        });

      if (!selectedSession) {
        return res.status(404).json({
          success: false,
          message: "Academic session not found.",
        });
      }

      // ----------------------------------
      // 3. FIND EXAM
      // ----------------------------------

      const selectedExam = await Exam.findOne({
        _id: exam,
        academicSession: selectedSession._id,
        classId,
        organisation,
      });

      if (!selectedExam) {
        return res.status(404).json({
          success: false,
          message:
            "Exam not found for the selected class and academic session.",
        });
      }

      // ----------------------------------
      // 4. VALIDATE EXAM MARKS CONFIGURATION
      // ----------------------------------

      const examMaxMarks = Number(
        selectedExam.maxMarks
      );

      const examPassingMarks = Number(
        selectedExam.passingMarks
      );

      if (
        !Number.isFinite(examMaxMarks) ||
        !Number.isFinite(examPassingMarks) ||
        examMaxMarks <= 0 ||
        examPassingMarks < 0 ||
        examPassingMarks > examMaxMarks
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The selected exam has an invalid marks configuration.",
        });
      }

      // ----------------------------------
      // 5. FIND CLASS
      // ----------------------------------

      const selectedClass = await Class.findOne({
        _id: classId,
        organisation,
        academicSession: selectedSession.sessionName,
      });

      if (!selectedClass) {
        return res.status(404).json({
          success: false,
          message:
            "Class not found in the selected academic session.",
        });
      }

      // ----------------------------------
      // 6. VALIDATE SECTION
      // ----------------------------------

      const classSections = (
        selectedClass.sections || []
      ).map((item) =>
        String(item).trim().toUpperCase()
      );

      if (!classSections.includes(normalizedSection)) {
        return res.status(400).json({
          success: false,
          message:
            "The selected section does not belong to this class.",
        });
      }

      // ----------------------------------
      // 7. GET CLASS SUBJECTS
      // ----------------------------------

      const subjectIds = [
        ...new Set(
          (selectedClass.subjects || []).map(
            (id) => String(id)
          )
        ),
      ];

      if (subjectIds.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No subjects are assigned to this class.",
        });
      }

      const subjects = await Subject.find({
        _id: { $in: subjectIds },
        organisation,
      }).sort({
        subjectName: 1,
      });

      if (subjects.length !== subjectIds.length) {
        return res.status(400).json({
          success: false,
          message:
            "Some assigned subjects could not be found.",
        });
      }

      // ----------------------------------
      // 8. GET ACTIVE STUDENTS
      // ----------------------------------

      const students = await Student.find({
        organisation,
        className: selectedClass.className,
        section: normalizedSection,
        academicSession: selectedSession.sessionName,
        status: "Active",
      }).sort({
        rollNumber: 1,
      });

      if (students.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "No active students were found in this section.",
        });
      }

      const studentIds = new Set(
        students.map((student) =>
          String(student._id)
        )
      );

      // ----------------------------------
      // 9. GET MARKS FOR ALL SUBJECTS
      // ----------------------------------

      const marksDocuments = await Marks.find({
        organisation,
        academicSession: selectedSession._id,
        exam: selectedExam._id,
        classId: selectedClass._id,
        section: normalizedSection,
        subject: { $in: subjectIds },
      });

      const marksBySubject = new Map();

      for (const document of marksDocuments) {
        const subjectId = String(document.subject);

        if (marksBySubject.has(subjectId)) {
          return res.status(409).json({
            success: false,
            message:
              "Duplicate marks records were found for a subject. Resolve them before generating results.",
          });
        }

        // Validate marks configuration.
        if (
          Number(document.maxMarks) !== examMaxMarks ||
          Number(document.passingMarks) !==
            examPassingMarks
        ) {
          return res.status(400).json({
            success: false,
            message:
              "The marks configuration does not match the selected exam. Correct the marks records before generating results.",
          });
        }

        // Build student-to-marks lookup.
        const studentMarksMap = new Map();

        for (const entry of document.students || []) {
          const entryStudentId = String(
            entry.student
          );

          if (studentMarksMap.has(entryStudentId)) {
            return res.status(400).json({
              success: false,
              message:
                "Duplicate student marks were found in a subject record.",
            });
          }

          // Reject students outside the current active roster.
          if (!studentIds.has(entryStudentId)) {
            return res.status(400).json({
              success: false,
              message:
                "A marks record contains a student who does not belong to the current active class roster. Correct the marks before generating results.",
            });
          }

          // Validate attendance explicitly.
          if (
            !["Present", "Absent"].includes(
              entry.attendance
            )
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid attendance data found in a marks record.",
            });
          }

          const entryMarks = Number(
            entry.marksObtained
          );

          if (
            !Number.isFinite(entryMarks) ||
            entryMarks < 0 ||
            entryMarks > examMaxMarks
          ) {
            return res.status(400).json({
              success: false,
              message:
                "Invalid student marks found in a subject record.",
            });
          }

          // Absent students must have zero marks.
          if (
            entry.attendance === "Absent" &&
            entryMarks !== 0
          ) {
            return res.status(400).json({
              success: false,
              message:
                "An absent student has non-zero marks. Correct the marks record before generating results.",
            });
          }

          studentMarksMap.set(
            entryStudentId,
            entry
          );
        }

        // Every active student must have marks.
        for (const student of students) {
          if (
            !studentMarksMap.has(String(student._id))
          ) {
            const subjectName =
              subjects.find(
                (item) =>
                  String(item._id) === subjectId
              )?.subjectName || "a subject";

            return res.status(400).json({
              success: false,
              message:
                `Marks are missing for ${student.fullName} in ${subjectName}.`,
            });
          }
        }

        marksBySubject.set(subjectId, {
          document,
          studentMarksMap,
        });
      }

      // ----------------------------------
      // VERIFY ALL ASSIGNED SUBJECTS
      // ----------------------------------

      for (const subjectId of subjectIds) {
        if (!marksBySubject.has(subjectId)) {
          const subject = subjects.find(
            (item) =>
              String(item._id) === subjectId
          );

          return res.status(400).json({
            success: false,
            message:
              `Marks are missing for ${
                subject?.subjectName || "a subject"
              }. Enter marks before generating results.`,
          });
        }
      }

      // ----------------------------------
      // 10. GET EXISTING RESULT
      // ----------------------------------

      const resultQuery = {
        organisation,
        academicSession: selectedSession._id,
        exam: selectedExam._id,
        classId: selectedClass._id,
        section: normalizedSection,
      };

      const existingResult = await Result.findOne(
        resultQuery
      );

      // Preserve previous teacher remarks.
      const previousRemarks = new Map();

      if (existingResult) {
        for (const studentResult of existingResult.students) {
          previousRemarks.set(
            String(studentResult.student),
            studentResult.teacherRemarks || ""
          );
        }
      }

      // ----------------------------------
      // 11. GENERATE INDIVIDUAL RESULTS
      // ----------------------------------

      const generatedStudents = [];

      let passCount = 0;
      let failCount = 0;
      let totalClassPercentage = 0;

      for (const student of students) {
        const subjectResults = [];

        let totalObtained = 0;
        let totalMaximum = 0;
        let presentCount = 0;
        let absentCount = 0;
        let allSubjectsPassed = true;

        for (const subject of subjects) {
          const marksData = marksBySubject.get(
            String(subject._id)
          );

          const studentMarks =
            marksData.studentMarksMap.get(
              String(student._id)
            );

          const attendance = studentMarks.attendance;

          const isAbsent = attendance === "Absent";

          const marksObtained = Number(
            studentMarks.marksObtained
          );

          const maxMarks = Number(
            marksData.document.maxMarks
          );

          const passingMarks = Number(
            marksData.document.passingMarks
          );

          if (
            !Number.isFinite(marksObtained) ||
            !Number.isFinite(maxMarks) ||
            !Number.isFinite(passingMarks) ||
            maxMarks <= 0 ||
            marksObtained < 0 ||
            marksObtained > maxMarks ||
            passingMarks < 0 ||
            passingMarks > maxMarks
          ) {
            return res.status(400).json({
              success: false,
              message:
                `Invalid marks data found for ${student.fullName} in ${subject.subjectName}.`,
            });
          }

          const percentage = Number(
            (
              (marksObtained / maxMarks) *
              100
            ).toFixed(2)
          );

          // An absent student always fails.
          const passed =
            !isAbsent &&
            marksObtained >= passingMarks;

          const grade = calculateGrade(percentage);

          if (!passed) {
            allSubjectsPassed = false;
          }

          if (isAbsent) {
            absentCount++;
          } else {
            presentCount++;
          }

          totalObtained += marksObtained;
          totalMaximum += maxMarks;

          subjectResults.push({
            subject: subject._id,
            marksObtained,
            maxMarks,
            passingMarks,
            attendance,
            percentage,
            grade,
            status: passed ? "Pass" : "Fail",
          });
        }

        // Calculate overall percentage.
        const overallPercentage =
          totalMaximum > 0
            ? Number(
                (
                  (totalObtained / totalMaximum) *
                  100
                ).toFixed(2)
              )
            : 0;

        const resultStatus = allSubjectsPassed
          ? "Pass"
          : "Fail";

        if (resultStatus === "Pass") {
          passCount++;
        } else {
          failCount++;
        }

        totalClassPercentage += overallPercentage;

        // Generate rule-based improvement suggestions.
        const suggestions = generateSuggestions(
          subjectResults.map((item) => {
            const subject = subjects.find(
              (entry) =>
                String(entry._id) ===
                String(item.subject)
            );

            return {
              ...item,
              subjectName:
                subject?.subjectName || "Subject",
            };
          })
        );

        generatedStudents.push({
          student: student._id,
          subjects: subjectResults,
          totalObtained,
          totalMaximum,
          percentage: overallPercentage,
          overallGrade:
            calculateGrade(overallPercentage),
          resultStatus,

          attendance: {
            present: presentCount,
            absent: absentCount,
          },

          teacherRemarks:
            previousRemarks.get(
              String(student._id)
            ) || "",

          improvementSuggestions: suggestions,
        });
      }

      // ----------------------------------
      // 12. CALCULATE CLASS AVERAGE
      // ----------------------------------

      const classAverage = Number(
        (
          totalClassPercentage / students.length
        ).toFixed(2)
      );

      // ----------------------------------
      // 13. SAVE RESULT
      // USE DOCUMENT SAVE FOR VALIDATION
      // ----------------------------------

      let result = existingResult;

      if (!result) {
        result = new Result(resultQuery);
      }

      result.academicSession = selectedSession._id;
      result.exam = selectedExam._id;
      result.classId = selectedClass._id;
      result.section = normalizedSection;
      result.students = generatedStudents;
      result.classAverage = classAverage;
      result.passCount = passCount;
      result.failCount = failCount;
      result.organisation = organisation;
      result.generatedBy = req.user._id;
      result.generatedAt = new Date();

      await result.save();

      // Populate saved result.
      await result.populate(
        resultPopulateOptions
      );

      return res.status(200).json({
        success: true,
        message: existingResult
          ? "Results regenerated successfully."
          : "Results generated successfully.",

        summary: {
          totalStudents: students.length,
          passCount,
          failCount,
          classAverage,
        },

        result,
      });
    } catch (error) {
      console.error(
        "Result generation error:",
        error
      );

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "A result already exists for this exam, class and section. Please refresh and try again.",
        });
      }

      if (
        error.name === "ValidationError" ||
        error.name === "CastError"
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Unable to generate results.",
      });
    }
  }
);

// ======================================
// GET ALL / FILTERED RESULTS
// GET /api/results
// TEACHER + ADMIN: VIEW ACCESS
// ======================================

router.get("/", async (req, res) => {
  try {
    const {
      exam,
      classId,
      section,
      academicSession,
    } = req.query;

    const filter = organisationFilter(req);

    if (exam) {
      if (!isValidId(exam)) {
        return res.status(400).json({
          success: false,
          message: "Invalid exam ID.",
        });
      }

      filter.exam = exam;
    }

    if (classId) {
      if (!isValidId(classId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID.",
        });
      }

      filter.classId = classId;
    }

    if (academicSession) {
      if (!isValidId(academicSession)) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic session ID.",
        });
      }

      filter.academicSession = academicSession;
    }

    if (section !== undefined) {
      if (
        typeof section !== "string" ||
        !section.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid section.",
        });
      }

      filter.section = section
        .trim()
        .toUpperCase();
    }

    const results = await Result.find(filter)
      .populate(resultPopulateOptions)
      .sort({
        generatedAt: -1,
      });

    const selectedResult =
      exam && classId && section
        ? results[0] || null
        : null;

    return res.status(200).json({
      success: true,
      count: results.length,
      results,
      result: selectedResult,
    });
  } catch (error) {
    console.error(
      "Fetch results error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch results.",
    });
  }
});

// ======================================
// GET ONE RESULT BY ID
// GET /api/results/:id
// TEACHER + ADMIN: VIEW ACCESS
// ======================================

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid result ID.",
      });
    }

    const result = await Result.findOne({
      _id: id,
      ...organisationFilter(req),
    }).populate(resultPopulateOptions);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Result not found.",
      });
    }

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    console.error(
      "Fetch single result error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to fetch this result.",
    });
  }
});

export default router;
