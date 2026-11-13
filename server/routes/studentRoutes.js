
import express from "express";
import mongoose from "mongoose";

import Student from "../models/Student.js";
import Class from "../models/class.js";
import AcademicSession from "../models/AcademicSession.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ==========================================
// AUTHENTICATION AND ORGANISATION SECURITY
// ==========================================

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

const getOrganisationFilter = (req) => ({
  organisation: req.user.organisation,
});

const isValidId = (id) => mongoose.isValidObjectId(id);

// Escape special characters in search input.
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ==========================================
// VALIDATE CLASS, SECTION AND SESSION
// ==========================================

const validateStudentPlacement = async ({
  className,
  section,
  academicSession,
  organisation,
}) => {
  const session = await AcademicSession.findOne({
    sessionName: academicSession,
    organisation,
  });

  if (!session) {
    return {
      valid: false,
      status: 400,
      message: "The selected academic session does not exist.",
    };
  }

  const selectedClass = await Class.findOne({
    className,
    academicSession,
    organisation,
  });

  if (!selectedClass) {
    return {
      valid: false,
      status: 400,
      message:
        "The selected class does not exist in this academic session.",
    };
  }

  const validSections = (selectedClass.sections || []).map(
    (item) => String(item).trim().toUpperCase()
  );

  if (!validSections.includes(section.toUpperCase())) {
    return {
      valid: false,
      status: 400,
      message: `Section ${section} does not exist in ${className}.`,
    };
  }

  return {
    valid: true,
    selectedClass,
    session,
  };
};

// ==========================================
// GET ALL STUDENTS
// GET /api/students
// ==========================================

router.get("/", async (req, res) => {
  try {
    const {
      search,
      className,
      section,
      academicSession,
      status,
    } = req.query;

    const filter = getOrganisationFilter(req);

    if (className) {
      filter.className = className.trim();
    }

    if (section) {
      filter.section = section.trim().toUpperCase();
    }

    if (academicSession) {
      filter.academicSession = academicSession.trim();
    }

    if (status) {
      if (!["Active", "Inactive"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid student status.",
        });
      }

      filter.status = status;
    }

    if (search?.trim()) {
      const searchRegex = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      filter.$or = [
        { fullName: searchRegex },
        { studentId: searchRegex },
        { rollNumber: searchRegex },
        { guardianName: searchRegex },
      ];
    }

    const students = await Student.find(filter).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Fetch students error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch students.",
    });
  }
});

// ==========================================
// ADD STUDENT
// POST /api/students
// TEACHER ONLY
// ==========================================

router.post("/", authorizeRoles("teacher"), async (req, res) => {
  try {
    const {
      fullName,
      studentId,
      rollNumber,
      className,
      section,
      academicSession,
      dateOfBirth,
      gender,
      guardianName,
      guardianPhone,
      address,
      status,
    } = req.body;

    // Check required fields.
    const requiredFields = {
      fullName,
      studentId,
      rollNumber,
      className,
      section,
      academicSession,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(
        ([, value]) =>
          typeof value !== "string" || !value.trim()
      )
      .map(([field]) => field);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required student details.",
        missingFields,
      });
    }

    // Validate status.
    const studentStatus = status || "Active";

    if (!["Active", "Inactive"].includes(studentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Student status must be Active or Inactive.",
      });
    }

    // Validate gender.
    const studentGender = gender || "";

    if (
      !["Male", "Female", "Other", ""].includes(studentGender)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender value.",
      });
    }

    const cleanClassName = className.trim();
    const cleanSection = section.trim().toUpperCase();
    const cleanSession = academicSession.trim();

    // Validate class, section and session.
    const placement = await validateStudentPlacement({
      className: cleanClassName,
      section: cleanSection,
      academicSession: cleanSession,
      organisation: req.user.organisation,
    });

    if (!placement.valid) {
      return res.status(placement.status).json({
        success: false,
        message: placement.message,
      });
    }

    const student = await Student.create({
      fullName: fullName.trim(),
      studentId: studentId.trim(),
      rollNumber: rollNumber.trim(),

      className: cleanClassName,
      section: cleanSection,
      academicSession: cleanSession,

      dateOfBirth: dateOfBirth || null,
      gender: studentGender,

      guardianName: guardianName || "",
      guardianPhone: guardianPhone || "",
      address: address || "",

      status: studentStatus,

      organisation: req.user.organisation,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Student added successfully.",
      student,
    });
  } catch (error) {
    console.error("Add student error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A student with this Student ID or roll number already exists in this class, section and session.",
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
      message: "Failed to add student.",
    });
  }
});

// ==========================================
// GET STUDENT BY ID
// GET /api/students/:id
// TEACHER AND ADMIN
// ==========================================

router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      ...getOrganisationFilter(req),
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      student,
    });
  } catch (error) {
    console.error("Fetch student error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch student.",
    });
  }
});

// ==========================================
// UPDATE STUDENT
// PUT /api/students/:id
// TEACHER ONLY
// ==========================================

router.put("/:id", authorizeRoles("teacher"), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const student = await Student.findOne({
      _id: req.params.id,
      ...getOrganisationFilter(req),
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const allowedFields = [
      "fullName",
      "studentId",
      "rollNumber",
      "className",
      "section",
      "academicSession",
      "dateOfBirth",
      "gender",
      "guardianName",
      "guardianPhone",
      "address",
      "status",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        const value = req.body[field];

        updates[field] =
          typeof value === "string"
            ? field === "section"
              ? value.trim().toUpperCase()
              : value.trim()
            : value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid student fields were provided.",
      });
    }

    // Validate required fields.
    const requiredFields = [
      "fullName",
      "studentId",
      "rollNumber",
      "className",
      "section",
      "academicSession",
    ];

    for (const field of requiredFields) {
      const value =
        updates[field] !== undefined
          ? updates[field]
          : student[field];

      if (typeof value !== "string" || !value.trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} cannot be empty.`,
        });
      }
    }

    // Validate status.
    if (
      updates.status !== undefined &&
      !["Active", "Inactive"].includes(updates.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Student status must be Active or Inactive.",
      });
    }

    // Validate gender.
    if (
      updates.gender !== undefined &&
      !["Male", "Female", "Other", ""].includes(updates.gender)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid gender value.",
      });
    }

    // Validate the final class/session/section combination.
    const finalClassName =
      updates.className ?? student.className;

    const finalSection =
      updates.section ?? student.section;

    const finalSession =
      updates.academicSession ?? student.academicSession;

    const placement = await validateStudentPlacement({
      className: finalClassName,
      section: finalSection,
      academicSession: finalSession,
      organisation: req.user.organisation,
    });

    if (!placement.valid) {
      return res.status(placement.status).json({
        success: false,
        message: placement.message,
      });
    }

    Object.assign(student, updates);

    await student.save();

    return res.status(200).json({
      success: true,
      message: "Student updated successfully.",
      student,
    });
  } catch (error) {
    console.error("Update student error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Student ID or roll number already exists in this class, section and session.",
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
      message: "Failed to update student.",
    });
  }
});

// ==========================================
// DEACTIVATE STUDENT
// DELETE /api/students/:id
// TEACHER ONLY
//
// Soft deletion preserves historical marks
// and generated results.
// ==========================================

router.delete("/:id", authorizeRoles("teacher"), async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const student = await Student.findOneAndUpdate(
      {
        _id: req.params.id,
        ...getOrganisationFilter(req),
      },
      {
        $set: {
          status: "Inactive",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Student deactivated successfully. Historical academic records have been preserved.",
      student,
    });
  } catch (error) {
    console.error("Deactivate student error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate student.",
    });
  }
});

export default router;
