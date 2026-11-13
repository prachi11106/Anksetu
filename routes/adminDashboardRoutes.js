
import express from "express";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

import User from "../models/User.js";
import Student from "../models/Student.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import AcademicSession from "../models/AcademicSession.js";
import Exam from "../models/Exam.js";
import Result from "../models/Result.js";

const router = express.Router();

router.use(protect, authorizeRoles("admin"));

router.get("/overview", async (req, res) => {
  try {
    const organisation = req.user.organisation;

    const [
      totalStudents,
      totalTeachers,
      pendingTeachers,
      approvedTeachers,
      totalClasses,
      totalSubjects,
      totalExams,
      totalResults,
      activeSession,
      classes,
      results,
      recentResults,
    ] = await Promise.all([
      Student.countDocuments({ organisation, status: "Active" }),

      User.countDocuments({
        organisation,
        role: "teacher",
      }),

      User.countDocuments({
        organisation,
        role: "teacher",
        status: "pending",
      }),

      User.countDocuments({
        organisation,
        role: "teacher",
        status: "approved",
      }),

      Class.countDocuments({ organisation }),

      Subject.countDocuments({ organisation }),

      Exam.countDocuments({ organisation }),

      Result.countDocuments({ organisation }),

      AcademicSession.findOne({
        organisation,
        isActive: true,
      }).select("sessionName startDate endDate"),

      Class.find({ organisation })
        .select("className sections academicSession")
        .sort({ className: 1 }),

      Result.find({ organisation }).select(
        "classId section classAverage passCount failCount students generatedAt"
      ),

      Result.find({ organisation })
        .sort({ generatedAt: -1 })
        .limit(5)
        .populate("exam", "examName")
        .populate("classId", "className")
        .populate("generatedBy", "fullName"),
    ]);

    let totalPass = 0;
    let totalFail = 0;
    let totalPercentage = 0;
    let totalResultStudents = 0;

    results.forEach((result) => {
      totalPass += result.passCount || 0;
      totalFail += result.failCount || 0;

      if (result.students?.length) {
        totalPercentage += result.students.reduce(
          (sum, student) => sum + (student.percentage || 0),
          0
        );

        totalResultStudents += result.students.length;
      }
    });

    const overallAverage =
      totalResultStudents > 0
        ? Number((totalPercentage / totalResultStudents).toFixed(2))
        : 0;

    const totalEvaluated = totalPass + totalFail;

    const passPercentage =
      totalEvaluated > 0
        ? Number(((totalPass / totalEvaluated) * 100).toFixed(2))
        : 0;

    const classStrength = await Promise.all(
      classes.map(async (item) => {
        const studentCount = await Student.countDocuments({
          organisation,
          className: item.className,
          academicSession: item.academicSession,
          status: "Active",
        });

        return {
          className: item.className,
          academicSession: item.academicSession,
          sections: item.sections,
          totalStudents: studentCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      dashboard: {
        statistics: {
          totalStudents,
          totalTeachers,
          approvedTeachers,
          pendingTeachers,
          totalClasses,
          totalSubjects,
          totalExams,
          totalResults,
        },

        activeSession,

        performance: {
          totalPass,
          totalFail,
          passPercentage,
          overallAverage,
        },

        classStrength,

        recentResults: recentResults.map((result) => ({
          id: result._id,
          examName: result.exam?.examName || "Exam",
          className: result.classId?.className || "Class",
          section: result.section,
          classAverage: result.classAverage,
          passCount: result.passCount,
          failCount: result.failCount,
          generatedBy: result.generatedBy?.fullName || "Administrator",
          generatedAt: result.generatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load admin dashboard statistics.",
    });
  }
});

export default router;
