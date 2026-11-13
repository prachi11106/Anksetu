
import express from "express";
import mongoose from "mongoose";
import PDFDocument from "pdfkit";

import Result from "../models/Result.js";

import {
  protect,
  authorizeRoles,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ======================================
// AUTHENTICATION AND ORGANISATION
// TEACHER + ADMIN: READ-ONLY ACCESS
// ======================================

router.use(protect, authorizeRoles("teacher", "admin"));

router.use((req, res, next) => {
  if (!req.user?.organisation) {
    return res.status(403).json({
      success: false,
      message: "Your account does not have an organisation assigned.",
    });
  }

  next();
});

// ======================================
// DESIGN CONSTANTS
// ======================================

const COLORS = {
  navy: "#17365D",
  blue: "#315DAB",
  grey: "#64748B",
  lightBlue: "#EFF6FF",
  red: "#DC2626",
  green: "#15803D",
  white: "#FFFFFF",
  border: "#CBD5E1",
  lightRed: "#FEF2F2",
  lightGrey: "#F8FAFC",
};

const PAGE = {
  left: 45,
  right: 550,
  width: 505,
  contentBottom: 735,
  footerLine: 760,
};

// ======================================
// HELPER FUNCTIONS
// ======================================

const safeFileName = (value) =>
  String(value || "student")
    .replace(/[^a-z0-9]/gi, "_")
    .toLowerCase();

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleDateString("en-IN");
  }

  return date.toLocaleDateString("en-IN");
};

// ======================================
// DOWNLOAD INDIVIDUAL STUDENT REPORT CARD
// GET /api/report-cards/:resultId/:studentId/pdf
// ======================================

router.get("/:resultId/:studentId/pdf", async (req, res) => {
  let pdf;

  try {
    const { resultId, studentId } = req.params;
    const organisation = req.user.organisation;

    // ----------------------------------
    // 1. VALIDATE IDS
    // ----------------------------------

    if (
      !mongoose.isValidObjectId(resultId) ||
      !mongoose.isValidObjectId(studentId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid result or student ID.",
      });
    }

    // ----------------------------------
    // 2. FIND ORGANISATION RESULT
    // ----------------------------------

    const result = await Result.findOne({
      _id: resultId,
      organisation,
    })
      .populate(
        "students.student",
        "fullName studentId rollNumber"
      )
      .populate(
        "students.subjects.subject",
        "subjectName subjectCode"
      )
      .populate("exam", "examName examType")
      .populate("classId", "className")
      .populate("academicSession", "sessionName")
      .populate("generatedBy", "fullName");

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Generated result not found.",
      });
    }

    // ----------------------------------
    // 3. FIND INDIVIDUAL STUDENT RESULT
    // ----------------------------------

    const studentResult = result.students.find(
      (item) =>
        item.student &&
        String(item.student._id) === studentId
    );

    if (!studentResult || !studentResult.student) {
      return res.status(404).json({
        success: false,
        message: "Student result not found.",
      });
    }

    const student = studentResult.student;

    // ----------------------------------
    // 4. PREPARE RESPONSE
    // ----------------------------------

    const fileName = `${safeFileName(
      student.fullName
    )}_report_card.pdf`;

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    res.setHeader("Cache-Control", "private, no-store");

    // ----------------------------------
    // 5. CREATE PDF DOCUMENT
    // ----------------------------------

    pdf = new PDFDocument({
      size: "A4",
      margins: {
        top: 45,
        bottom: 55,
        left: 45,
        right: 45,
      },
      bufferPages: true,
    });

    pdf.on("error", (error) => {
      console.error("PDF document error:", error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Unable to generate report card PDF.",
        });
      } else if (!res.destroyed) {
        res.destroy(error);
      }
    });

    res.on("close", () => {
      if (!res.writableEnded && pdf && !pdf.destroyed) {
        pdf.destroy();
      }
    });

    pdf.pipe(res);

    // ==================================
    // PAGE HELPERS
    // ==================================

    let y = 45;

    const addPageIfNeeded = (requiredHeight = 30) => {
      if (y + requiredHeight > PAGE.contentBottom) {
        pdf.addPage();
        y = 55;
        return true;
      }

      return false;
    };

    const drawSectionHeading = (heading, fontSize = 15) => {
      addPageIfNeeded(35);

      pdf
        .fillColor(COLORS.navy)
        .font("Helvetica-Bold")
        .fontSize(fontSize)
        .text(heading, PAGE.left, y);

      y = pdf.y + 12;
    };

    const drawTextBlock = (
      text,
      options = {}
    ) => {
      const {
        x = PAGE.left,
        width = PAGE.width,
        font = "Helvetica",
        fontSize = 10,
        color = COLORS.grey,
        gap = 8,
      } = options;

      const content = String(text || "");

      pdf.font(font).fontSize(fontSize);

      const textHeight = pdf.heightOfString(content, {
        width,
        lineGap: 2,
      });

      addPageIfNeeded(textHeight + gap);

      pdf
        .fillColor(color)
        .font(font)
        .fontSize(fontSize)
        .text(content, x, y, {
          width,
          lineGap: 2,
        });

      y = pdf.y + gap;
    };

    // ==================================
    // HEADER
    // ==================================

    pdf
      .roundedRect(
        PAGE.left,
        45,
        PAGE.width,
        95,
        12
      )
      .fill(COLORS.navy);

    pdf
      .fillColor(COLORS.white)
      .font("Helvetica-Bold")
      .fontSize(23)
      .text("ANKSETU", 65, 65);

    pdf
      .font("Helvetica")
      .fontSize(10)
      .text("ONLINE RESULT & REPORT CARD", 65, 96);

    pdf
      .fontSize(9)
      .text("Academic Performance Report", 65, 115);

    y = 165;

    // ==================================
    // STUDENT DETAILS
    // ==================================

    drawSectionHeading("STUDENT DETAILS");

    const details = [
      ["Student Name", student.fullName || "N/A"],
      ["Student ID", student.studentId || "N/A"],
      ["Roll Number", student.rollNumber || "N/A"],
      ["Class", result.classId?.className || "N/A"],
      ["Section", result.section || "N/A"],
      [
        "Academic Session",
        result.academicSession?.sessionName || "N/A",
      ],
      ["Examination", result.exam?.examName || "N/A"],
    ];

    const drawDetail = (label, value, x, width) => {
      pdf
        .roundedRect(x, y, width, 39, 6)
        .fill(COLORS.lightBlue);

      pdf
        .fillColor(COLORS.grey)
        .font("Helvetica")
        .fontSize(8)
        .text(label, x + 12, y + 7);

      pdf
        .fillColor(COLORS.navy)
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(String(value), x + 12, y + 20, {
          width: width - 24,
          ellipsis: true,
        });
    };

    for (let i = 0; i < details.length; i += 2) {
      drawDetail(
        details[i][0],
        details[i][1],
        45,
        245
      );

      if (details[i + 1]) {
        drawDetail(
          details[i + 1][0],
          details[i + 1][1],
          305,
          245
        );
      }

      y += 47;
    }

    // ==================================
    // SUBJECT-WISE PERFORMANCE
    // ==================================

    y += 10;

    drawSectionHeading("SUBJECT-WISE PERFORMANCE");

    const columns = {
      subject: 50,
      obtained: 240,
      maximum: 310,
      grade: 365,
      attendance: 420,
      status: 490,
    };

    const drawTableHeader = () => {
      pdf
        .rect(45, y, PAGE.width, 27)
        .fill(COLORS.navy);

      pdf
        .fillColor(COLORS.white)
        .font("Helvetica-Bold")
        .fontSize(7)
        .text("SUBJECT", columns.subject, y + 9)
        .text("OBTAINED", columns.obtained, y + 9)
        .text("MAX", columns.maximum, y + 9)
        .text("GRADE", columns.grade, y + 9)
        .text("ATTEND.", columns.attendance, y + 9)
        .text("STATUS", columns.status, y + 9);

      y += 27;
    };

    drawTableHeader();

    const subjectResults = studentResult.subjects || [];

    for (const subject of subjectResults) {
      if (y + 30 > PAGE.contentBottom) {
        pdf.addPage();
        y = 55;
        drawTableHeader();
      }

      const isPassed = subject.status === "Pass";
      const isAbsent = subject.attendance === "Absent";

      pdf
        .rect(45, y, PAGE.width, 30)
        .fill(
          isPassed
            ? COLORS.lightGrey
            : COLORS.lightRed
        );

      pdf
        .fillColor(COLORS.navy)
        .font("Helvetica")
        .fontSize(7)
        .text(
          subject.subject?.subjectName || "Subject",
          columns.subject,
          y + 10,
          {
            width: 180,
            ellipsis: true,
          }
        )
        .text(
          String(subject.marksObtained ?? 0),
          columns.obtained,
          y + 10
        )
        .text(
          String(subject.maxMarks ?? 0),
          columns.maximum,
          y + 10
        )
        .text(
          String(subject.grade || "N/A"),
          columns.grade,
          y + 10
        )
        .fillColor(
          isAbsent ? COLORS.red : COLORS.green
        )
        .text(
          isAbsent ? "Absent" : "Present",
          columns.attendance,
          y + 10
        )
        .fillColor(
          isPassed ? COLORS.green : COLORS.red
        )
        .text(
          String(subject.status || "N/A"),
          columns.status,
          y + 10
        );

      y += 30;
    }

    // ==================================
    // OVERALL RESULT
    // ==================================

    y += 25;

    addPageIfNeeded(125);

    drawSectionHeading("OVERALL RESULT");

    pdf
      .roundedRect(
        45,
        y,
        PAGE.width,
        90,
        10
      )
      .fill(COLORS.lightBlue);

    const summary = [
      [
        "Total Marks",
        `${studentResult.totalObtained ?? 0} / ${
          studentResult.totalMaximum ?? 0
        }`,
      ],
      [
        "Percentage",
        `${studentResult.percentage ?? 0}%`,
      ],
      [
        "Overall Grade",
        studentResult.overallGrade || "N/A",
      ],
      [
        "Result",
        studentResult.resultStatus || "N/A",
      ],
    ];

    summary.forEach((item, index) => {
      const x = 60 + index * 125;

      pdf
        .fillColor(COLORS.grey)
        .font("Helvetica")
        .fontSize(8)
        .text(item[0], x, y + 18);

      pdf
        .fillColor(
          item[0] === "Result" && item[1] === "Fail"
            ? COLORS.red
            : COLORS.navy
        )
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(item[1], x, y + 38, {
          width: 115,
          ellipsis: true,
        });
    });

    y += 110;

    // ==================================
    // ATTENDANCE SUMMARY
    // ==================================

    drawSectionHeading("ATTENDANCE", 12);

    const attendance = studentResult.attendance || {
      present: 0,
      absent: 0,
    };

    const present = attendance.present ?? 0;
    const absent = attendance.absent ?? 0;

    drawTextBlock(
      `Present: ${present}    Absent: ${absent}    Total: ${
        present + absent
      }`,
      {
        fontSize: 10,
        gap: 12,
      }
    );

    // ==================================
    // TEACHER REMARKS
    // ==================================

    drawSectionHeading("TEACHER REMARKS", 12);

    drawTextBlock(
      studentResult.teacherRemarks ||
        "No teacher remarks added.",
      {
        fontSize: 10,
        gap: 12,
      }
    );

    // ==================================
    // IMPROVEMENT SUGGESTIONS
    // ==================================

    const suggestions =
      studentResult.improvementSuggestions || [];

    if (suggestions.length > 0) {
      drawSectionHeading("AREAS FOR IMPROVEMENT", 12);

      for (const suggestion of suggestions) {
        drawTextBlock(`- ${suggestion}`, {
          x: 50,
          width: 490,
          fontSize: 9,
          gap: 6,
        });
      }
    }

    // ==================================
    // FOOTER ON EVERY PAGE
    // ==================================

    const pages = pdf.bufferedPageRange();

    const generatedDate = formatDate(result.generatedAt);

    for (
      let i = pages.start;
      i < pages.start + pages.count;
      i++
    ) {
      pdf.switchToPage(i);

      pdf
        .strokeColor(COLORS.border)
        .lineWidth(1)
        .moveTo(45, PAGE.footerLine)
        .lineTo(PAGE.right, PAGE.footerLine)
        .stroke();

      pdf
        .fillColor(COLORS.grey)
        .font("Helvetica")
        .fontSize(8)
        .text(
          `Generated by AnkSetu | ${generatedDate}`,
          45,
          770,
          {
            align: "center",
            width: PAGE.width,
          }
        );
    }

    // ==================================
    // FINISH PDF
    // ==================================

    pdf.end();
  } catch (error) {
    console.error("Report card PDF error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Unable to generate report card PDF.",
      });
    }

    if (!res.destroyed) {
      res.destroy(error);
    }

    if (pdf && !pdf.destroyed) {
      pdf.destroy();
    }
  }
});

export default router;
