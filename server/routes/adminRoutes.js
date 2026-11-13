
import express from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import Student from "../models/Student.js";
import Class from "../models/class.js";
import Subject from "../models/subject.js";
import AcademicSession from "../models/AcademicSession.js";
import Exam from "../models/Exam.js";
import Marks from "../models/Marks.js";
import Result from "../models/Result.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ======================================
// ADMIN AUTHENTICATION
// All admin routes are read-only.
// ======================================

router.use(protect, authorizeRoles("admin"));

router.use((req, res, next) => {
  if (!req.user?.organisation) {
    return res.status(403).json({
      success: false,
      message: "Your account does not have an organisation assigned.",
    });
  }

  next();
});

const getOrganisation = (req) =>
  req.user.organisation;

// ======================================
// 1. ADMIN DASHBOARD OVERVIEW
// GET /api/admin/overview
//
// Returns live organisation-wide analytics.
// ======================================

router.get("/overview", async (req, res) => {
  try {
    const organisation = getOrganisation(req);

    const organisationFilter = { organisation };

    const [
      totalStudents,
      activeStudents,
      inactiveStudents,
      totalTeachers,
      approvedTeachers,
      pendingTeachers,
      rejectedTeachers,
      totalClasses,
      totalSubjects,
      totalSessions,
      activeSessions,
      totalExams,
      totalMarksRecords,
      totalResults,
      studentsByClass,
      resultStatistics,
      attendanceStatistics,
      subjectPerformance,
      recentResults,
    ] = await Promise.all([
      Student.countDocuments(organisationFilter),

      Student.countDocuments({
        ...organisationFilter,
        status: "Active",
      }),

      Student.countDocuments({
        ...organisationFilter,
        status: "Inactive",
      }),

      User.countDocuments({
        ...organisationFilter,
        role: "teacher",
      }),

      User.countDocuments({
        ...organisationFilter,
        role: "teacher",
        status: "approved",
      }),

      User.countDocuments({
        ...organisationFilter,
        role: "teacher",
        status: "pending",
      }),

      User.countDocuments({
        ...organisationFilter,
        role: "teacher",
        status: "rejected",
      }),

      Class.countDocuments(organisationFilter),

      Subject.countDocuments(organisationFilter),

      AcademicSession.countDocuments(organisationFilter),

      AcademicSession.countDocuments({
        ...organisationFilter,
        isActive: true,
      }),

      Exam.countDocuments(organisationFilter),

      Marks.countDocuments(organisationFilter),

      Result.countDocuments(organisationFilter),

      // Students grouped by class and section.
      Student.aggregate([
        {
          $match: {
            ...organisationFilter,
            status: "Active",
          },
        },
        {
          $group: {
            _id: {
              className: "$className",
              section: "$section",
            },
            studentCount: { $sum: 1 },
          },
        },
        {
          $sort: {
            "_id.className": 1,
            "_id.section": 1,
          },
        },
        {
          $project: {
            _id: 0,
            className: "$_id.className",
            section: "$_id.section",
            studentCount: 1,
          },
        },
      ]),

      // Overall result performance.
      Result.aggregate([
        {
          $match: organisationFilter,
        },
        {
          $group: {
            _id: null,
            totalResults: { $sum: 1 },
            totalPass: { $sum: "$passCount" },
            totalFail: { $sum: "$failCount" },
            averageClassPercentage: {
              $avg: "$classAverage",
            },
          },
        },
      ]),

      // Attendance from actual marks records.
      Marks.aggregate([
        {
          $match: organisationFilter,
        },
        {
          $unwind: "$students",
        },
        {
          $group: {
            _id: "$students.attendance",
            count: { $sum: 1 },
          },
        },
      ]),

      // Subject performance from generated results.
      Result.aggregate([
        {
          $match: organisationFilter,
        },
        {
          $unwind: "$students",
        },
        {
          $unwind: "$students.subjects",
        },
        {
          $group: {
            _id: "$students.subjects.subject",
            averagePercentage: {
              $avg: "$students.subjects.percentage",
            },
            passCount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$students.subjects.status",
                      "Pass",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            failCount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$students.subjects.status",
                      "Fail",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from: "subjects",
            localField: "_id",
            foreignField: "_id",
            as: "subjectDetails",
          },
        },
        {
          $unwind: {
            path: "$subjectDetails",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            subjectId: "$_id",
            subjectName: {
              $ifNull: [
                "$subjectDetails.subjectName",
                "Unknown Subject",
              ],
            },
            averagePercentage: {
              $round: ["$averagePercentage", 2],
            },
            passCount: 1,
            failCount: 1,
          },
        },
        {
          $sort: {
            averagePercentage: -1,
          },
        },
      ]),

      // Latest generated results.
      Result.find(organisationFilter)
        .sort({ generatedAt: -1 })
        .limit(5)
        .populate("exam", "examName examType")
        .populate("classId", "className")
        .populate("generatedBy", "fullName")
        .select(
          "section classAverage passCount failCount generatedAt"
        )
        .lean(),
    ]);

    // ----------------------------------
    // RESULT STATISTICS
    // ----------------------------------

    const resultData = resultStatistics[0] || {
      totalResults: 0,
      totalPass: 0,
      totalFail: 0,
      averageClassPercentage: 0,
    };

    const totalPass = resultData.totalPass || 0;
    const totalFail = resultData.totalFail || 0;

    const totalEvaluated = totalPass + totalFail;

    const passPercentage =
      totalEvaluated > 0
        ? Number(
            ((totalPass / totalEvaluated) * 100).toFixed(2)
          )
        : 0;

    const averageClassPercentage =
      Number(
        (resultData.averageClassPercentage || 0).toFixed(2)
      );

    // ----------------------------------
    // ATTENDANCE STATISTICS
    // ----------------------------------

    const totalPresent =
      attendanceStatistics.find(
        (item) => item._id === "Present"
      )?.count || 0;

    const totalAbsent =
      attendanceStatistics.find(
        (item) => item._id === "Absent"
      )?.count || 0;

    const totalAttendance = totalPresent + totalAbsent;

    const attendancePercentage =
      totalAttendance > 0
        ? Number(
            (
              (totalPresent / totalAttendance) *
              100
            ).toFixed(2)
          )
        : 0;

    // ----------------------------------
    // RESPONSE
    // ----------------------------------

    return res.status(200).json({
      success: true,
      overview: {
        summary: {
          totalStudents,
          activeStudents,
          inactiveStudents,

          totalTeachers,
          approvedTeachers,
          pendingTeachers,
          rejectedTeachers,

          totalClasses,
          totalSubjects,

          totalSessions,
          activeSessions,

          totalExams,
          totalMarksRecords,
          totalResults,
        },

        performance: {
          totalPass,
          totalFail,
          totalEvaluated,
          passPercentage,
          averageClassPercentage,
        },

        attendance: {
          totalPresent,
          totalAbsent,
          totalAttendance,
          attendancePercentage,
        },

        studentsByClass,
        subjectPerformance,
        recentResults,
      },
    });
  } catch (error) {
    console.error("Admin overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load institution analytics.",
    });
  }
});

// ======================================
// 2. GET ALL TEACHERS
// GET /api/admin/teachers
//
// Read-only teacher directory.
// Supports optional status filtering.
// ======================================

router.get("/teachers", async (req, res) => {
  try {
    const organisation = getOrganisation(req);

    const { status } = req.query;

    const filter = {
      organisation,
      role: "teacher",
    };

    if (status) {
      const allowedStatuses = [
        "pending",
        "approved",
        "rejected",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid teacher status. Use pending, approved or rejected.",
        });
      }

      filter.status = status;
    }

    const teachers = await User.find(filter)
      .select(
        "-password -__v"
      )
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: teachers.length,
      teachers,
    });
  } catch (error) {
    console.error("Fetch teachers error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch teachers.",
    });
  }
});

// ======================================
// 3. GET PENDING TEACHERS
// GET /api/admin/pending-teachers
//
// Kept for compatibility with existing
// frontend code. This is read-only.
// ======================================

router.get("/pending-teachers", async (req, res) => {
  try {
    const teachers = await User.find({
      organisation: getOrganisation(req),
      role: "teacher",
      status: "pending",
    })
      .select("-password -__v")
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: teachers.length,
      teachers,
    });
  } catch (error) {
    console.error("Fetch pending teachers error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch pending teachers.",
    });
  }
});

export default router;
