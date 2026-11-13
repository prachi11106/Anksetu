
import express from "express";
import mongoose from "mongoose";

import Marks from "../models/Marks.js";
import Student from "../models/Student.js";
import Class from "../models/class.js";
import Exam from "../models/Exam.js";
import AcademicSession from "../models/AcademicSession.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, authorizeRoles("teacher", "admin"));

const isValidId = (id) => mongoose.isValidObjectId(id);

// ======================================
// GET STUDENT ID
// Accepts student, studentId or populated student object
// ======================================

function getStudentId(item) {
  if (!item) return null;

  if (item.student && typeof item.student === "object") {
    return item.student._id || null;
  }

  return item.student || item.studentId || null;
}

// ======================================
// ORGANISATION VALIDATION
// ======================================

function getOrganisation(req, res) {
  const organisation = req.user?.organisation;

  if (!organisation) {
    res.status(400).json({
      success: false,
      message:
        "Your account does not have an organisation assigned.",
    });

    return null;
  }

  return organisation;
}

// ======================================
// VALIDATE MARKS ENTRY
// ======================================

async function validateMarksEntry(req, body) {
  const {
    academicSession,
    exam,
    classId,
    section,
    subject,
    students,
  } = body;

  if (
    !academicSession ||
    !exam ||
    !classId ||
    typeof section !== "string" ||
    !section.trim() ||
    !subject ||
    !Array.isArray(students) ||
    students.length === 0
  ) {
    return {
      error:
        "Please provide session, exam, class, section, subject and student marks.",
      status: 400,
    };
  }

  const ids = [
    academicSession,
    exam,
    classId,
    subject,
  ];

  if (!ids.every(isValidId)) {
    return {
      error: "One or more IDs are invalid.",
      status: 400,
    };
  }

  if (
    students.some(
      (item) =>
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
    )
  ) {
    return {
      error: "Invalid student marks data.",
      status: 400,
    };
  }

  const organisation = req.user.organisation;

  if (!organisation) {
    return {
      error:
        "Your account does not have an organisation assigned.",
      status: 400,
    };
  }

  const [session, selectedExam, selectedClass] =
    await Promise.all([
      AcademicSession.findOne({
        _id: academicSession,
        organisation,
      }),

      Exam.findOne({
        _id: exam,
        organisation,
      }),

      Class.findOne({
        _id: classId,
        organisation,
      }),
    ]);

  if (!session) {
    return {
      error: "Academic session not found.",
      status: 404,
    };
  }

  if (!selectedExam) {
    return {
      error: "Exam not found.",
      status: 404,
    };
  }

  if (!selectedClass) {
    return {
      error: "Class not found.",
      status: 404,
    };
  }

  // VERIFY EXAM, CLASS AND SESSION

  if (
    String(selectedExam.academicSession) !==
    String(session._id) ||
    String(selectedExam.classId) !==
    String(selectedClass._id)
  ) {
    return {
      error:
        "The selected exam does not belong to this class and session.",
      status: 400,
    };
  }

  if (
    selectedClass.academicSession !== session.sessionName
  ) {
    return {
      error:
        "The selected class does not belong to this academic session.",
      status: 400,
    };
  }

  // VERIFY SECTION

  const normalizedSection = section.trim().toUpperCase();

  const classSections = (selectedClass.sections || []).map(
    (item) => String(item).trim().toUpperCase()
  );

  if (!classSections.includes(normalizedSection)) {
    return {
      error:
        "This section is not configured for the selected class.",
      status: 400,
    };
  }

  // VERIFY SUBJECT ASSIGNMENT

  const subjectAssigned = (selectedClass.subjects || []).some(
    (id) => String(id) === String(subject)
  );

  if (!subjectAssigned) {
    return {
      error:
        "This subject is not assigned to the selected class.",
      status: 400,
    };
  }

  // VERIFY STUDENT IDS

  const studentIds = students.map(getStudentId);

  if (
    studentIds.some((id) => !isValidId(id)) ||
    new Set(studentIds.map(String)).size !== studentIds.length
  ) {
    return {
      error: "Student IDs must be valid and unique.",
      status: 400,
    };
  }

  // VERIFY EXAM MARK LIMITS

  const maxMarks = Number(selectedExam.maxMarks);
  const passingMarks = Number(selectedExam.passingMarks);

  if (
    !Number.isFinite(maxMarks) ||
    !Number.isFinite(passingMarks) ||
    maxMarks <= 0 ||
    passingMarks < 0 ||
    passingMarks > maxMarks
  ) {
    return {
      error:
        "The selected exam has invalid maximum or passing marks.",
      status: 400,
    };
  }

  // VALIDATE EACH STUDENT'S MARKS

  for (const item of students) {
    const attendance = item.attendance || "Present";

    if (!["Present", "Absent"].includes(attendance)) {
      return {
        error: "Attendance must be Present or Absent.",
        status: 400,
      };
    }

    if (
      item.remarks !== undefined &&
      typeof item.remarks !== "string"
    ) {
      return {
        error: "Student remarks must be text.",
        status: 400,
      };
    }

    if (attendance === "Absent") {
      if (
        item.marksObtained !== 0 &&
        item.marksObtained !== "0"
      ) {
        return {
          error: "Absent students must have zero marks.",
          status: 400,
        };
      }

      continue;
    }

    const obtained = Number(item.marksObtained);

    if (
      item.marksObtained === "" ||
      item.marksObtained === null ||
      item.marksObtained === undefined ||
      !Number.isFinite(obtained) ||
      obtained < 0 ||
      obtained > maxMarks
    ) {
      return {
        error: `Marks must be between 0 and ${maxMarks}.`,
        status: 400,
      };
    }
  }

  // VERIFY STUDENTS BELONG TO SELECTED CLASS

  const validStudents = await Student.find({
    _id: { $in: studentIds },
    organisation,
    className: selectedClass.className,
    section: normalizedSection,
    academicSession: session.sessionName,
    status: "Active",
  }).select("_id");

  if (validStudents.length !== studentIds.length) {
    return {
      error:
        "Some students do not belong to the selected organisation, class, section or session, or are inactive.",
      status: 403,
    };
  }

  return {
    data: {
      session,
      selectedExam,
      selectedClass,
      normalizedSection,
      studentIds,
      maxMarks,
      passingMarks,
    },
  };
}

// ======================================
// GET MARKS
// GET /api/marks
// TEACHER + ADMIN: VIEW ACCESS
// ======================================

router.get("/", async (req, res) => {
  try {
    const organisation = getOrganisation(req, res);

    if (!organisation) return;

    const { exam, classId, section, subject } = req.query;

    if (
      !exam ||
      !classId ||
      !subject ||
      typeof section !== "string" ||
      !section.trim() ||
      ![exam, classId, subject].every(isValidId)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide valid exam, class, section and subject filters.",
      });
    }

    const query = {
      organisation,
      exam,
      classId,
      section: section.trim().toUpperCase(),
      subject,
    };

    const marksRecord = await Marks.findOne(query)
      .populate("academicSession", "sessionName")
      .populate(
        "exam",
        "examName examType maxMarks passingMarks"
      )
      .populate("classId", "className sections")
      .populate("subject", "subjectName subjectCode")
      .populate(
        "students.student",
        "fullName studentId rollNumber"
      )
      .populate("enteredBy", "fullName");

    return res.status(200).json({
      success: true,
      marks: marksRecord,
    });
  } catch (error) {
    console.error("Fetch marks error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch marks.",
    });
  }
});

// ======================================
// BULK SAVE / UPDATE MARKS
// POST /api/marks/bulk
// TEACHER ONLY: WRITE ACCESS
// ADMIN: READ ONLY
// ======================================

router.post(
  "/bulk",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const organisation = getOrganisation(req, res);

      if (!organisation) return;

      console.log("Marks save request received.");

      const validation = await validateMarksEntry(
        req,
        req.body
      );

      if (validation.error) {
        return res.status(validation.status).json({
          success: false,
          message: validation.error,
        });
      }

      const {
        session,
        selectedExam,
        selectedClass,
        normalizedSection,
        maxMarks,
        passingMarks,
      } = validation.data;

      const { subject, students } = req.body;

      const recordQuery = {
        organisation,
        academicSession: session._id,
        exam: selectedExam._id,
        classId: selectedClass._id,
        section: normalizedSection,
        subject,
      };

      // PREPARE STUDENT MARKS

      const studentEntries = students.map((item) => ({
        student: getStudentId(item),

        marksObtained:
          item.attendance === "Absent"
            ? 0
            : Number(item.marksObtained),

        attendance: item.attendance || "Present",

        remarks:
          typeof item.remarks === "string"
            ? item.remarks.trim()
            : "",
      }));

      // FIND EXISTING RECORD

      let marksRecord = await Marks.findOne(recordQuery);

      // CREATE OR UPDATE

      if (!marksRecord) {
        marksRecord = new Marks({
          ...recordQuery,
          maxMarks,
          passingMarks,
          students: studentEntries,
          enteredBy: req.user._id,
        });
      } else {
        marksRecord.maxMarks = maxMarks;
        marksRecord.passingMarks = passingMarks;
        marksRecord.students = studentEntries;
        marksRecord.enteredBy = req.user._id;
      }

      // SAVE TO MONGODB

      await marksRecord.save();

      // POPULATE RESPONSE

      await marksRecord.populate(
        "students.student",
        "fullName studentId rollNumber"
      );

      await marksRecord.populate("enteredBy", "fullName");

      console.log("Marks saved successfully:", marksRecord._id);

      return res.status(200).json({
        success: true,
        message: "Marks saved successfully.",
        marks: marksRecord,
      });
    } catch (error) {
      console.error("Save marks error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "Marks already exist for this exam, class, section and subject. Please refresh and try again.",
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
        message:
          error.message || "Failed to save marks.",
      });
    }
  }
);

export default router;
