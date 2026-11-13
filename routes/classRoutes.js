
import express from "express";
import mongoose from "mongoose";

import Class from "../models/class.js";
import Subject from "../models/subject.js";
import Student from "../models/Student.js";
import Marks from "../models/Marks.js";
import Exam from "../models/Exam.js";
import Result from "../models/Result.js";
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
      message: "Your account does not have an organisation assigned.",
    });
  }

  next();
});

const isValidId = (id) =>
  mongoose.isValidObjectId(id);

const getOrganisation = (req) =>
  req.user.organisation;

// ======================================
// HELPER FUNCTIONS
// ======================================

function normalizeSections(sections) {
  if (!Array.isArray(sections)) {
    return null;
  }

  return [
    ...new Set(
      sections
        .filter((section) => typeof section === "string")
        .map((section) => section.trim().toUpperCase())
        .filter(Boolean)
    ),
  ];
}

async function validateAcademicSession(
  sessionName,
  organisation
) {
  if (
    typeof sessionName !== "string" ||
    !sessionName.trim()
  ) {
    return null;
  }

  return AcademicSession.findOne({
    sessionName: sessionName.trim(),
    organisation,
  });
}

async function validateSubjectIds(
  subjectIds,
  organisation
) {
  if (!Array.isArray(subjectIds)) {
    return false;
  }

  if (!subjectIds.every(isValidId)) {
    return false;
  }

  const uniqueIds = [
    ...new Set(subjectIds.map(String)),
  ];

  const count = await Subject.countDocuments({
    _id: { $in: uniqueIds },
    organisation,
  });

  return count === uniqueIds.length;
}

async function classHasAcademicRecords(
  classId,
  organisation
) {
  const [
    hasMarks,
    hasExams,
    hasResults,
  ] = await Promise.all([
    Marks.exists({ classId, organisation }),
    Exam.exists({ classId, organisation }),
    Result.exists({ classId, organisation }),
  ]);

  return Boolean(hasMarks || hasExams || hasResults);
}

// ======================================
// CLASS MANAGEMENT
// ======================================

// GET ALL CLASSES
// Teachers and admins: view access

router.get("/classes", async (req, res) => {
  try {
    const classes = await Class.find({
      organisation: getOrganisation(req),
    })
      .populate("subjects", "subjectName subjectCode")
      .sort({ className: 1 });

    return res.status(200).json({
      success: true,
      count: classes.length,
      classes,
    });
  } catch (error) {
    console.error("Fetch classes error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch classes.",
    });
  }
});

// ======================================
// CREATE CLASS
// TEACHER ONLY
// ======================================

router.post(
  "/classes",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const {
        className,
        sections,
        academicSession,
        subjects,
      } = req.body;

      const organisation = getOrganisation(req);

      if (
        typeof className !== "string" ||
        !className.trim() ||
        typeof academicSession !== "string" ||
        !academicSession.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Class name and academic session are required.",
        });
      }

      const validSections =
        sections === undefined
          ? ["A"]
          : normalizeSections(sections);

      if (!validSections || validSections.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "At least one valid section is required.",
        });
      }

      const subjectIds = subjects ?? [];

      if (!Array.isArray(subjectIds)) {
        return res.status(400).json({
          success: false,
          message: "Subjects must be an array.",
        });
      }

      const validSubjects = await validateSubjectIds(
        subjectIds,
        organisation
      );

      if (!validSubjects) {
        return res.status(400).json({
          success: false,
          message:
            "One or more subjects are invalid or do not belong to your organisation.",
        });
      }

      const selectedSession =
        await validateAcademicSession(
          academicSession,
          organisation
        );

      if (!selectedSession) {
        return res.status(400).json({
          success: false,
          message:
            "The selected academic session does not exist in your organisation.",
        });
      }

      const uniqueSubjectIds = [
        ...new Set(subjectIds.map(String)),
      ];

      const newClass = await Class.create({
        className: className.trim(),
        sections: validSections,
        academicSession: selectedSession.sessionName,
        subjects: uniqueSubjectIds,
        organisation,
        createdBy: req.user._id,
      });

      await newClass.populate(
        "subjects",
        "subjectName subjectCode"
      );

      return res.status(201).json({
        success: true,
        message: "Class created successfully.",
        class: newClass,
      });
    } catch (error) {
      console.error("Create class error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "This class already exists for this academic session.",
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
        message: "Failed to create class.",
      });
    }
  }
);

// ======================================
// UPDATE CLASS
// TEACHER ONLY
// ======================================

router.put(
  "/classes/:id",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID.",
        });
      }

      const organisation = getOrganisation(req);

      const existingClass = await Class.findOne({
        _id: id,
        organisation,
      });

      if (!existingClass) {
        return res.status(404).json({
          success: false,
          message: "Class not found.",
        });
      }

      const {
        className,
        sections,
        academicSession,
        subjects,
      } = req.body;

      const updateData = {};

      // Validate class name.
      if (className !== undefined) {
        if (
          typeof className !== "string" ||
          !className.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "Class name cannot be empty.",
          });
        }

        updateData.className = className.trim();
      }

      // Validate academic session.
      if (academicSession !== undefined) {
        if (
          typeof academicSession !== "string" ||
          !academicSession.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "Academic session cannot be empty.",
          });
        }

        const selectedSession =
          await validateAcademicSession(
            academicSession,
            organisation
          );

        if (!selectedSession) {
          return res.status(400).json({
            success: false,
            message:
              "The selected academic session does not exist in your organisation.",
          });
        }

        updateData.academicSession =
          selectedSession.sessionName;
      }

      // Validate sections.
      if (sections !== undefined) {
        const validSections =
          normalizeSections(sections);

        if (
          !validSections ||
          validSections.length === 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "At least one valid section is required.",
          });
        }

        updateData.sections = validSections;
      }

      // Validate subjects.
      if (subjects !== undefined) {
        if (!Array.isArray(subjects)) {
          return res.status(400).json({
            success: false,
            message: "Subjects must be an array.",
          });
        }

        const validSubjects = await validateSubjectIds(
          subjects,
          organisation
        );

        if (!validSubjects) {
          return res.status(400).json({
            success: false,
            message:
              "Some subjects are invalid or do not belong to your organisation.",
          });
        }

        updateData.subjects = [
          ...new Set(subjects.map(String)),
        ];
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide at least one field to update.",
        });
      }

      // ----------------------------------
      // PROTECT EXISTING ACADEMIC RECORDS
      // ----------------------------------

      const identityChanged =
        (updateData.className !== undefined &&
          updateData.className !== existingClass.className) ||
        (updateData.academicSession !== undefined &&
          updateData.academicSession !==
            existingClass.academicSession);

      if (identityChanged) {
        const [
          hasStudents,
          hasAcademicRecords,
        ] = await Promise.all([
          Student.exists({
            organisation,
            className: existingClass.className,
            academicSession: existingClass.academicSession,
          }),
          classHasAcademicRecords(
            existingClass._id,
            organisation
          ),
        ]);

        if (hasStudents || hasAcademicRecords) {
          return res.status(409).json({
            success: false,
            message:
              "The class name or academic session cannot be changed because academic records are already linked to this class.",
          });
        }
      }

      // Prevent removing sections that contain students or records.
      if (updateData.sections !== undefined) {
        const removedSections =
          await Promise.all([
            Student.exists({
              organisation,
              className: existingClass.className,
              academicSession: existingClass.academicSession,
              section: { $nin: updateData.sections },
            }),
            Marks.exists({
              organisation,
              classId: existingClass._id,
              section: { $nin: updateData.sections },
            }),
            Result.exists({
              organisation,
              classId: existingClass._id,
              section: { $nin: updateData.sections },
            }),
          ]);

        if (removedSections.some(Boolean)) {
          return res.status(409).json({
            success: false,
            message:
              "One or more sections contain students or academic records and cannot be removed.",
          });
        }
      }

      // Prevent removing subjects already used in marks/results.
      if (updateData.subjects !== undefined) {
        const oldSubjectIds = existingClass.subjects.map(
          (subject) => String(subject)
        );

        const newSubjectIds = new Set(
          updateData.subjects
        );

        const removedSubjectIds = oldSubjectIds.filter(
          (subjectId) => !newSubjectIds.has(subjectId)
        );

        if (removedSubjectIds.length > 0) {
          const [
            hasMarks,
            hasResults,
          ] = await Promise.all([
            Marks.exists({
              organisation,
              classId: existingClass._id,
              subject: { $in: removedSubjectIds },
            }),
            Result.exists({
              organisation,
              classId: existingClass._id,
              "students.subjects.subject": {
                $in: removedSubjectIds,
              },
            }),
          ]);

          if (hasMarks || hasResults) {
            return res.status(409).json({
              success: false,
              message:
                "One or more subjects already have academic records and cannot be removed from this class.",
            });
          }
        }
      }

      Object.assign(existingClass, updateData);

      await existingClass.save();

      await existingClass.populate(
        "subjects",
        "subjectName subjectCode"
      );

      return res.status(200).json({
        success: true,
        message: "Class updated successfully.",
        class: existingClass,
      });
    } catch (error) {
      console.error("Update class error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            "A class with these details already exists.",
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
        message: "Failed to update class.",
      });
    }
  }
);

// ======================================
// DELETE CLASS
// TEACHER ONLY
// ======================================

router.delete(
  "/classes/:id",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid class ID.",
        });
      }

      const organisation = getOrganisation(req);

      const existingClass = await Class.findOne({
        _id: id,
        organisation,
      });

      if (!existingClass) {
        return res.status(404).json({
          success: false,
          message: "Class not found.",
        });
      }

      const [
        hasStudents,
        hasMarks,
        hasExams,
        hasResults,
      ] = await Promise.all([
        // Student model stores className and academicSession,
        // not classId.
        Student.exists({
          className: existingClass.className,
          academicSession: existingClass.academicSession,
          organisation,
        }),

        Marks.exists({
          classId: existingClass._id,
          organisation,
        }),

        Exam.exists({
          classId: existingClass._id,
          organisation,
        }),

        Result.exists({
          classId: existingClass._id,
          organisation,
        }),
      ]);

      if (
        hasStudents ||
        hasMarks ||
        hasExams ||
        hasResults
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This class has linked students, marks, exams or results. Remove or transfer those records before deleting the class.",
        });
      }

      await existingClass.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Class deleted successfully.",
      });
    } catch (error) {
      console.error("Delete class error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete class.",
      });
    }
  }
);

// ======================================
// SUBJECT MANAGEMENT
// ======================================

// GET ALL SUBJECTS
// Teachers and admins: view access

router.get("/subjects", async (req, res) => {
  try {
    const subjects = await Subject.find({
      organisation: getOrganisation(req),
    }).sort({ subjectName: 1 });

    return res.status(200).json({
      success: true,
      count: subjects.length,
      subjects,
    });
  } catch (error) {
    console.error("Fetch subjects error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch subjects.",
    });
  }
});

// ======================================
// CREATE SUBJECT
// TEACHER ONLY
// ======================================

router.post(
  "/subjects",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const { subjectName, subjectCode } = req.body;

      if (
        typeof subjectName !== "string" ||
        !subjectName.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Subject name is required.",
        });
      }

      if (
        subjectCode !== undefined &&
        typeof subjectCode !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Subject code must be text.",
        });
      }

      const subject = await Subject.create({
        subjectName: subjectName.trim(),
        subjectCode: subjectCode?.trim() ?? "",
        organisation: getOrganisation(req),
        createdBy: req.user._id,
      });

      return res.status(201).json({
        success: true,
        message: "Subject created successfully.",
        subject,
      });
    } catch (error) {
      console.error("Create subject error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This subject already exists.",
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
        message: "Failed to create subject.",
      });
    }
  }
);

// ======================================
// UPDATE SUBJECT
// TEACHER ONLY
// ======================================

router.put(
  "/subjects/:id",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject ID.",
        });
      }

      const organisation = getOrganisation(req);

      const subject = await Subject.findOne({
        _id: id,
        organisation,
      });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found.",
        });
      }

      const { subjectName, subjectCode } = req.body;

      const updateData = {};

      if (subjectName !== undefined) {
        if (
          typeof subjectName !== "string" ||
          !subjectName.trim()
        ) {
          return res.status(400).json({
            success: false,
            message: "Subject name cannot be empty.",
          });
        }

        updateData.subjectName = subjectName.trim();
      }

      if (subjectCode !== undefined) {
        if (typeof subjectCode !== "string") {
          return res.status(400).json({
            success: false,
            message: "Subject code must be text.",
          });
        }

        updateData.subjectCode = subjectCode.trim();
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Please provide at least one field to update.",
        });
      }

      Object.assign(subject, updateData);

      await subject.save();

      return res.status(200).json({
        success: true,
        message: "Subject updated successfully.",
        subject,
      });
    } catch (error) {
      console.error("Update subject error:", error);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "This subject name already exists.",
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
        message: "Failed to update subject.",
      });
    }
  }
);

// ======================================
// DELETE SUBJECT
// TEACHER ONLY
// ======================================

router.delete(
  "/subjects/:id",
  authorizeRoles("teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidId(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid subject ID.",
        });
      }

      const organisation = getOrganisation(req);

      const subject = await Subject.findOne({
        _id: id,
        organisation,
      });

      if (!subject) {
        return res.status(404).json({
          success: false,
          message: "Subject not found.",
        });
      }

      const [
        isAssignedToClass,
        hasMarks,
        hasResults,
      ] = await Promise.all([
        Class.exists({
          organisation,
          subjects: subject._id,
        }),

        Marks.exists({
          organisation,
          subject: subject._id,
        }),

        Result.exists({
          organisation,
          "students.subjects.subject": subject._id,
        }),
      ]);

      if (
        isAssignedToClass ||
        hasMarks ||
        hasResults
      ) {
        return res.status(409).json({
          success: false,
          message:
            "This subject is already in use. Remove its class assignments and linked academic records before deleting it.",
        });
      }

      await subject.deleteOne();

      return res.status(200).json({
        success: true,
        message: "Subject deleted successfully.",
      });
    } catch (error) {
      console.error("Delete subject error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete subject.",
      });
    }
  }
);

export default router;
