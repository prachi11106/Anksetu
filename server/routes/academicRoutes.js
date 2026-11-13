
import express from "express";
import mongoose from "mongoose";

import AcademicSession from "../models/AcademicSession.js";
import Exam from "../models/Exam.js";
import Class from "../models/class.js";
import Marks from "../models/Marks.js";
import Result from "../models/Result.js";

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
      message: "Your account does not have an organisation assigned.",
    });
  }

  next();
});

const isValidId = (id) =>
  mongoose.isValidObjectId(id);

const organisationFilter = (req) => ({
  organisation: req.user.organisation,
});

const allowedExamTypes = [
  "Unit Test",
  "Mid Term",
  "Half Yearly",
  "Annual",
  "Final",
  "Other",
];

// ======================================
// ACADEMIC SESSION MANAGEMENT
// ======================================

// GET /api/academic/sessions
// Teachers and admins can view all organisation sessions.

router.get("/sessions", async (req, res) => {
  try {
    const sessions = await AcademicSession.find(
      organisationFilter(req)
    ).sort({
      startDate: -1,
    });

    return res.status(200).json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Fetch sessions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch academic sessions.",
    });
  }
});

// POST /api/academic/sessions
// Only teachers can create academic sessions.

router.post(
  "/sessions",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const {
        sessionName,
        startDate,
        endDate,
        isActive,
      } = req.body;

      if (
        typeof sessionName !== "string" ||
        !sessionName.trim() ||
        !startDate ||
        !endDate
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Session name, start date and end date are required.",
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start >= end
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide valid dates. End date must be after start date.",
        });
      }

      const trimmedName = sessionName.trim();

      const existingSession =
        await AcademicSession.findOne({
          ...organisationFilter(req),
          sessionName: trimmedName,
        });

      if (existingSession) {
        return res.status(409).json({
          success: false,
          message: "This academic session already exists.",
        });
      }

      // Create the session before deactivating the previous one.
      const session = await AcademicSession.create({
        sessionName: trimmedName,
        startDate: start,
        endDate: end,
        isActive: isActive === true,
        organisation: req.user.organisation,
        createdBy: req.user._id,
      });

      // Only one active session per organisation.
      if (session.isActive) {
        await AcademicSession.updateMany(
          {
            ...organisationFilter(req),
            _id: { $ne: session._id },
          },
          {
            $set: {
              isActive: false,
            },
          }
        );
      }

      return res.status(201).json({
        success: true,
        message: "Academic session created successfully.",
        session,
      });
    } catch (error) {
      console.error("Create session error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This academic session already exists.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create academic session.",
      });
    }
  }
);

// PUT /api/academic/sessions/:id
// Only teachers can update academic sessions.

router.put(
  "/sessions/:id",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic session ID.",
        });
      }

      const session = await AcademicSession.findOne({
        _id: req.params.id,
        ...organisationFilter(req),
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Academic session not found.",
        });
      }

      const {
        sessionName,
        startDate,
        endDate,
        isActive,
      } = req.body;

      const previousName = session.sessionName;

      if (sessionName !== undefined) {
        if (
          typeof sessionName !== "string" ||
          !sessionName.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "Session name cannot be empty.",
          });
        }

        const trimmedName = sessionName.trim();

        const duplicate = await AcademicSession.findOne({
          ...organisationFilter(req),
          _id: { $ne: session._id },
          sessionName: trimmedName,
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            message: "This session name already exists.",
          });
        }

        // Classes store academicSession as a string.
        // Changing the session name could break their references.
        if (trimmedName !== previousName) {
          const hasClasses = await Class.exists({
            ...organisationFilter(req),
            academicSession: previousName,
          });

          if (hasClasses) {
            return res.status(409).json({
              success: false,
              message:
                "This session already has classes assigned. Reassign those classes before changing the session name.",
            });
          }
        }

        session.sessionName = trimmedName;
      }

      if (startDate !== undefined) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date.",
          });
        }

        session.startDate = start;
      }

      if (endDate !== undefined) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date.",
          });
        }

        session.endDate = end;
      }

      if (session.startDate >= session.endDate) {
        return res.status(400).json({
          success: false,
          message: "End date must be after start date.",
        });
      }

      if (
        isActive !== undefined &&
        typeof isActive !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid active session value.",
        });
      }

      if (isActive === true) {
        session.isActive = true;
      } else if (isActive === false) {
        session.isActive = false;
      }

      await session.save();

      // Deactivate all other sessions if this one is active.
      if (session.isActive) {
        await AcademicSession.updateMany(
          {
            ...organisationFilter(req),
            _id: { $ne: session._id },
          },
          {
            $set: {
              isActive: false,
            },
          }
        );
      }

      return res.status(200).json({
        success: true,
        message: "Academic session updated successfully.",
        session,
      });
    } catch (error) {
      console.error("Update session error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This session name already exists.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to update academic session.",
      });
    }
  }
);

// DELETE /api/academic/sessions/:id
// Only teachers can delete sessions.
// Sessions with classes or exams cannot be deleted.

router.delete(
  "/sessions/:id",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic session ID.",
        });
      }

      const session = await AcademicSession.findOne({
        _id: req.params.id,
        ...organisationFilter(req),
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Academic session not found.",
        });
      }

      const [
        hasExams,
        hasClasses,
      ] = await Promise.all([
        Exam.exists({
          ...organisationFilter(req),
          academicSession: session._id,
        }),
        Class.exists({
          ...organisationFilter(req),
          academicSession: session.sessionName,
        }),
      ]);

      if (hasExams || hasClasses) {
        return res.status(409).json({
          success: false,
          message:
            "This session is linked to classes or exams. Remove or reassign those records before deleting it.",
        });
      }

      await session.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Academic session deleted successfully.",
      });
    } catch (error) {
      console.error("Delete session error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete academic session.",
      });
    }
  }
);

// ======================================
// EXAM MANAGEMENT
// ======================================

// GET /api/academic/exams
// Teachers and admins can view all organisation exams.

router.get("/exams", async (req, res) => {
  try {
    const exams = await Exam.find(
      organisationFilter(req)
    )
      .populate("academicSession", "sessionName")
      .populate("classId", "className sections")
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      count: exams.length,
      exams,
    });
  } catch (error) {
    console.error("Fetch exams error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch exams.",
    });
  }
});

// POST /api/academic/exams
// Only teachers can create exams.

router.post(
  "/exams",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const {
        examName,
        examType,
        academicSession,
        classId,
        examDate,
        maxMarks,
        passingMarks,
      } = req.body;

      if (
        typeof examName !== "string" ||
        !examName.trim() ||
        !academicSession ||
        !classId ||
        maxMarks === undefined ||
        passingMarks === undefined
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide all required exam details.",
        });
      }

      if (
        !isValidId(academicSession) ||
        !isValidId(classId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid academic session or class ID.",
        });
      }

      const max = Number(maxMarks);
      const passing = Number(passingMarks);

      if (
        !Number.isFinite(max) ||
        !Number.isFinite(passing) ||
        max <= 0 ||
        passing < 0 ||
        passing > max
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Maximum and passing marks must be valid. Passing marks cannot exceed maximum marks.",
        });
      }

      if (
        examDate &&
        Number.isNaN(new Date(examDate).getTime())
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid exam date.",
        });
      }

      const selectedType = examType || "Other";

      if (!allowedExamTypes.includes(selectedType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid exam type.",
        });
      }

      const session = await AcademicSession.findOne({
        _id: academicSession,
        ...organisationFilter(req),
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: "Academic session not found.",
        });
      }

      const selectedClass = await Class.findOne({
        _id: classId,
        ...organisationFilter(req),
        academicSession: session.sessionName,
      });

      if (!selectedClass) {
        return res.status(404).json({
          success: false,
          message:
            "Class not found for the selected academic session.",
        });
      }

      const exam = await Exam.create({
        examName: examName.trim(),
        examType: selectedType,
        academicSession: session._id,
        classId: selectedClass._id,
        examDate: examDate
          ? new Date(examDate)
          : undefined,
        maxMarks: max,
        passingMarks: passing,
        organisation: req.user.organisation,
        createdBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        message: "Exam created successfully.",
        exam,
      });
    } catch (error) {
      console.error("Create exam error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "This exam already exists for the selected class and session.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to create exam.",
      });
    }
  }
);

// PUT /api/academic/exams/:id
// Only teachers can update exams.
// Exam structure and marks settings are locked after marks/results exist.

router.put(
  "/exams/:id",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid exam ID.",
        });
      }

      const exam = await Exam.findOne({
        _id: req.params.id,
        ...organisationFilter(req),
      });

      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Exam not found.",
        });
      }

      const {
        examName,
        examType,
        academicSession,
        classId,
        examDate,
        maxMarks,
        passingMarks,
      } = req.body;

      const hasMarks = await Marks.exists({
        ...organisationFilter(req),
        exam: exam._id,
      });

      const hasResults = await Result.exists({
        ...organisationFilter(req),
        exam: exam._id,
      });

      const hasAcademicRecords = Boolean(
        hasMarks || hasResults
      );

      // Changing the exam name or type is allowed.
      if (examName !== undefined) {
        if (
          typeof examName !== "string" ||
          !examName.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "Exam name cannot be empty.",
          });
        }

        exam.examName = examName.trim();
      }

      if (examType !== undefined) {
        if (!allowedExamTypes.includes(examType)) {
          return res.status(400).json({
            success: false,
            message: "Invalid exam type.",
          });
        }

        exam.examType = examType;
      }

      // Changing the academic structure after marks/results
      // exist could make historical records inconsistent.
      const structuralFieldsChanged =
        academicSession !== undefined ||
        classId !== undefined ||
        maxMarks !== undefined ||
        passingMarks !== undefined;

      if (
        hasAcademicRecords &&
        structuralFieldsChanged
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This exam already has marks or results. Its class, academic session and marks configuration cannot be changed.",
        });
      }

      if (academicSession !== undefined) {
        if (!isValidId(academicSession)) {
          return res.status(400).json({
            success: false,
            message: "Invalid academic session ID.",
          });
        }

        const session = await AcademicSession.findOne({
          _id: academicSession,
          ...organisationFilter(req),
        });

        if (!session) {
          return res.status(404).json({
            success: false,
            message: "Academic session not found.",
          });
        }

        exam.academicSession = session._id;
      }

      if (classId !== undefined) {
        if (!isValidId(classId)) {
          return res.status(400).json({
            success: false,
            message: "Invalid class ID.",
          });
        }

        const selectedClass = await Class.findOne({
          _id: classId,
          ...organisationFilter(req),
        });

        if (!selectedClass) {
          return res.status(404).json({
            success: false,
            message: "Class not found.",
          });
        }

        exam.classId = selectedClass._id;
      }

      if (examDate !== undefined) {
        if (examDate === null || examDate === "") {
          exam.examDate = undefined;
        } else {
          const date = new Date(examDate);

          if (Number.isNaN(date.getTime())) {
            return res.status(400).json({
              success: false,
              message: "Invalid exam date.",
            });
          }

          exam.examDate = date;
        }
      }

      if (maxMarks !== undefined) {
        exam.maxMarks = Number(maxMarks);
      }

      if (passingMarks !== undefined) {
        exam.passingMarks = Number(passingMarks);
      }

      if (
        !Number.isFinite(exam.maxMarks) ||
        !Number.isFinite(exam.passingMarks) ||
        exam.maxMarks <= 0 ||
        exam.passingMarks < 0 ||
        exam.passingMarks > exam.maxMarks
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide valid maximum and passing marks.",
        });
      }

      const session = await AcademicSession.findOne({
        _id: exam.academicSession,
        ...organisationFilter(req),
      });

      const selectedClass = await Class.findOne({
        _id: exam.classId,
        ...organisationFilter(req),
      });

      if (
        !session ||
        !selectedClass ||
        selectedClass.academicSession !== session.sessionName
      ) {
        return res.status(400).json({
          success: false,
          message:
            "The selected class must belong to the selected academic session.",
        });
      }

      await exam.save();

      const updatedExam = await Exam.findById(exam._id)
        .populate("academicSession", "sessionName")
        .populate("classId", "className sections");

      return res.status(200).json({
        success: true,
        message: "Exam updated successfully.",
        exam: updatedExam,
      });
    } catch (error) {
      console.error("Update exam error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "This exam already exists for the selected class and session.",
        });
      }

      if (error.name === "ValidationError") {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message: "Failed to update exam.",
      });
    }
  }
);

// DELETE /api/academic/exams/:id
// Only teachers can delete exams.
// Exams with marks/results cannot be deleted.

router.delete(
  "/exams/:id",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      if (!isValidId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid exam ID.",
        });
      }

      const exam = await Exam.findOne({
        _id: req.params.id,
        ...organisationFilter(req),
      });

      if (!exam) {
        return res.status(404).json({
          success: false,
          message: "Exam not found.",
        });
      }

      const [
        hasMarks,
        hasResults,
      ] = await Promise.all([
        Marks.exists({
          ...organisationFilter(req),
          exam: exam._id,
        }),
        Result.exists({
          ...organisationFilter(req),
          exam: exam._id,
        }),
      ]);

      if (hasMarks || hasResults) {
        return res.status(409).json({
          success: false,
          message:
            "This exam already has marks or results. It cannot be deleted because doing so would affect academic records.",
        });
      }

      await exam.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Exam deleted successfully.",
      });
    } catch (error) {
      console.error("Delete exam error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete exam.",
      });
    }
  }
);

export default router;
