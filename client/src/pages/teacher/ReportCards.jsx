
import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  FileText,
  Search,
  RefreshCw,
  Printer,
  Award,
  UserRound,
  BookOpen,
  AlertCircle,
  Download,
} from "lucide-react";
import "./ReportCards.css";

const API = "http://localhost:5000/api";

function getToken() {
  return (
    localStorage.getItem("anksetuToken") ||
    sessionStorage.getItem("anksetuToken")
  );
}

function getUser() {
  try {
    const stored =
      localStorage.getItem("anksetuUser") ||
      sessionStorage.getItem("anksetuUser");

    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

async function request(url) {
  const token = getToken();

  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || "Unable to load report card data."
    );
  }

  return data;
}

function getGrade(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 33) return "E";
  return "F";
}

function getId(value) {
  if (!value) return "";

  return typeof value === "object"
    ? value._id || ""
    : value;
}

function getSessionName(value) {
  if (!value) return "—";

  if (typeof value === "object") {
    return value.sessionName || "—";
  }

  return value;
}

function getResultRecords(data) {
  // Supports the common API response formats:
  // { results: [...] }
  // { result: {...} }
  // { students: [...] }

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (data?.result && Array.isArray(data.result.students)) {
    return [data.result];
  }

  if (Array.isArray(data?.students)) {
    return [data];
  }

  if (Array.isArray(data)) {
    return data;
  }

  return [];
}

export default function ReportCards() {
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);

  const [results, setResults] = useState([]);
  const [resultRecord, setResultRecord] = useState(null);

  const [selectedStudentId, setSelectedStudentId] = useState("");

  const [selection, setSelection] = useState({
    exam: "",
    classId: "",
    section: "",
  });

  const [search, setSearch] = useState("");

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [error, setError] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);

  const user = useMemo(() => getUser(), []);

  const selectedExam = exams.find(
    (exam) => exam._id === selection.exam
  );

  const selectedClass = classes.find(
    (item) => item._id === selection.classId
  );

  const availableClasses = useMemo(() => {
    if (!selectedExam) return [];

    const examClassId = getId(selectedExam.classId);

    return classes.filter(
      (item) => item._id === examClassId
    );
  }, [classes, selectedExam]);

  const availableSections = selectedClass?.sections || [];

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return results.filter((item) => {
      const student = item.student || {};

      const name = student.fullName || "";
      const roll = student.rollNumber || "";
      const studentId = student.studentId || "";

      return `${name} ${roll} ${studentId}`
        .toLowerCase()
        .includes(query);
    });
  }, [results, search]);

  const selectedResult = results.find(
    (item) => getId(item.student) === selectedStudentId
  );

  const student = selectedResult?.student || {};
  const subjects = selectedResult?.subjects || [];

  const totalObtained = Number(
    selectedResult?.totalObtained || 0
  );

  const totalMaximum = Number(
    selectedResult?.totalMaximum || 0
  );

  const percentage = Number(
    selectedResult?.percentage || 0
  );

  const grade =
    selectedResult?.overallGrade || getGrade(percentage);

  const resultStatus =
    selectedResult?.resultStatus || "—";

  const organisation =
    user.organisation ||
    user.organization ||
    "Educational Institution";

  const sessionName = getSessionName(
    selectedExam?.academicSession
  );

  const attendance = {
    present: Number(
      selectedResult?.attendance?.present || 0
    ),
    absent: Number(
      selectedResult?.attendance?.absent || 0
    ),
  };

  // ======================================
  // LOAD EXAMS AND CLASSES
  // ======================================

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    setLoadingOptions(true);
    setError("");

    try {
      const [examData, classData] = await Promise.all([
        request(`${API}/academic/exams`),
        request(`${API}/class-management/classes`),
      ]);

      setExams(
        Array.isArray(examData.exams)
          ? examData.exams
          : []
      );

      setClasses(
        Array.isArray(classData.classes)
          ? classData.classes
          : []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOptions(false);
    }
  }

  // ======================================
  // UPDATE SELECTION
  // ======================================

  function updateSelection(field, value) {
    setSelection((previous) => ({
      ...previous,
      [field]: value,

      ...(field === "exam"
        ? { classId: "", section: "" }
        : {}),

      ...(field === "classId"
        ? { section: "" }
        : {}),
    }));

    setResults([]);
    setResultRecord(null);
    setSelectedStudentId("");
    setSearch("");
    setHasLoaded(false);
    setError("");
  }

  // ======================================
  // LOAD GENERATED REPORT CARDS
  // ======================================

  async function loadReportCards() {
    if (
      !selection.exam ||
      !selection.classId ||
      !selection.section
    ) {
      setError(
        "Select an examination, class and section first."
      );
      return;
    }

    setLoadingResults(true);
    setError("");
    setResults([]);
    setResultRecord(null);
    setSelectedStudentId("");
    setHasLoaded(false);

    try {
      const params = new URLSearchParams({
        exam: selection.exam,
        classId: selection.classId,
        section: selection.section,
      });

      const data = await request(
        `${API}/results?${params.toString()}`
      );

      const records = getResultRecords(data);

      // Find the generated result matching the selection.
      const matchingRecord = records.find((record) => {
        return (
          getId(record.exam) === selection.exam &&
          getId(record.classId) === selection.classId &&
          String(record.section || "") === selection.section
        );
      });

      // Some APIs return only one already-filtered result.
      const record =
        matchingRecord ||
        (records.length === 1 ? records[0] : null);

      if (!record) {
        setHasLoaded(true);
        setError(
          "No generated results were found for this examination, class and section."
        );
        return;
      }

      const studentResults = Array.isArray(record.students)
        ? record.students
        : [];

      setResultRecord(record);
      setResults(studentResults);
      setHasLoaded(true);

      if (studentResults.length > 0) {
        const firstStudentId = getId(
          studentResults[0].student
        );

        setSelectedStudentId(firstStudentId);
      } else {
        setError(
          "No student reports are available in this generated result."
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingResults(false);
    }
  }

  // ======================================
  // PRINT REPORT
  // ======================================

  function printReport() {
    if (!selectedResult) {
      setError("Select a student report card first.");
      return;
    }

    window.print();
  }

  // ======================================
  // DOWNLOAD PDF FROM BACKEND
  // ======================================

  async function downloadReport() {
    if (!selectedResult || !resultRecord?._id) {
      setError("Unable to identify the selected report card.");
      return;
    }

    const token = getToken();

    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    const studentId = getId(selectedResult.student);

    if (!studentId) {
      setError("Student ID is missing from this report.");
      return;
    }

    setDownloading(true);
    setError("");

    try {
      const response = await fetch(
        `${API}/report-cards/${resultRecord._id}/${studentId}/pdf`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.message || "Unable to download report card."
        );
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("The downloaded report card is empty.");
      }

      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${(
        student.fullName || "student"
      )
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase()}_report_card.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  // ======================================
  // SUBJECT HELPERS
  // ======================================

  function getSubjectName(subject) {
    if (typeof subject.subject === "object") {
      return subject.subject?.subjectName || "Subject";
    }

    return subject.subjectName || "Subject";
  }

  function getSubjectGrade(subject) {
    if (subject.grade) return subject.grade;

    const subjectPercentage = Number(
      subject.percentage ??
        (subject.maxMarks
          ? (Number(subject.marksObtained || 0) /
              Number(subject.maxMarks)) *
            100
          : 0)
    );

    return getGrade(subjectPercentage);
  }

  // ======================================
  // LOADING SCREEN
  // ======================================

  if (loadingOptions) {
    return (
      <div className="rc-loading">
        <RefreshCw className="rc-spin" size={28} />
        <p>Preparing report card generator...</p>
      </div>
    );
  }

  // ======================================
  // MAIN UI
  // ======================================

  return (
    <div className="rc-page">
      {/* TOPBAR */}

      <header className="rc-topbar no-print">
        <div className="rc-brand">
          <div className="rc-brand-icon">
            <GraduationCap size={24} />
          </div>

          <div>
            <h2>AnkSetu</h2>
            <span>Report Card Management</span>
          </div>
        </div>

        <button
          className="rc-refresh"
          onClick={loadOptions}
          disabled={loadingOptions}
        >
          <RefreshCw
            size={16}
            className={loadingOptions ? "rc-spin" : ""}
          />
          Refresh
        </button>
      </header>

      <main className="rc-main">
        {/* PAGE HEADING */}

        <section className="rc-heading no-print">
          <div>
            <span className="rc-eyebrow">
              ACADEMICS / REPORT CARDS
            </span>

            <h1>Report Card Generator</h1>

            <p>
              View individual student performance and prepare
              printable academic report cards.
            </p>
          </div>

          <div className="rc-heading-icon">
            <FileText size={29} />
          </div>
        </section>

        {/* SELECTION SECTION */}

        <section className="rc-selection no-print">
          <div className="rc-section-title">
            <div>
              <h2>Select Report Details</h2>
              <p>
                Choose the examination and class to find student
                reports.
              </p>
            </div>

            <span>STEP 01</span>
          </div>

          <div className="rc-fields">
            <label>
              Examination

              <select
                value={selection.exam}
                onChange={(event) =>
                  updateSelection("exam", event.target.value)
                }
              >
                <option value="">
                  Select examination
                </option>

                {exams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {exam.examName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Class

              <select
                value={selection.classId}
                onChange={(event) =>
                  updateSelection("classId", event.target.value)
                }
                disabled={!selection.exam}
              >
                <option value="">Select class</option>

                {availableClasses.map((item) => (
                  <option key={item._id} value={item._id}>
                    Class {item.className}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Section

              <select
                value={selection.section}
                onChange={(event) =>
                  updateSelection("section", event.target.value)
                }
                disabled={!selection.classId}
              >
                <option value="">Select section</option>

                {availableSections.map((section) => (
                  <option key={section} value={section}>
                    Section {section}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rc-selection-footer">
            <span>
              <BookOpen size={15} />
              Reports are generated from saved examination results.
            </span>

            <button
              className="rc-load-btn"
              onClick={loadReportCards}
              disabled={loadingResults}
            >
              {loadingResults ? (
                <RefreshCw className="rc-spin" size={17} />
              ) : (
                <Search size={17} />
              )}

              {loadingResults
                ? "Loading Reports..."
                : "Load Student Reports"}
            </button>
          </div>
        </section>

        {/* ERROR MESSAGE */}

        {error && (
          <div className="rc-alert no-print">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* REPORT WORKSPACE */}

        {results.length > 0 && (
          <div className="rc-workspace">
            {/* STUDENT LIST */}

            <section className="rc-student-list no-print">
              <div className="rc-list-heading">
                <div>
                  <h2>Student Reports</h2>
                  <span>
                    {results.length} generated reports
                  </span>
                </div>

                <UserRound size={21} />
              </div>

              <div className="rc-search">
                <Search size={16} />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search student..."
                />
              </div>

              <div className="rc-student-items">
                {filteredStudents.map((item) => {
                  const itemId = getId(item.student);
                  const itemStudent = item.student || {};

                  const active =
                    itemId === selectedStudentId;

                  return (
                    <button
                      key={itemId}
                      className={`rc-student-item ${
                        active ? "active" : ""
                      }`}
                      onClick={() =>
                        setSelectedStudentId(itemId)
                      }
                    >
                      <div className="rc-student-avatar">
                        {(itemStudent.fullName || "S")
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="rc-student-info">
                        <strong>
                          {itemStudent.fullName || "Student"}
                        </strong>

                        <span>
                          Roll No.{" "}
                          {itemStudent.rollNumber || "—"}
                        </span>
                      </div>

                      <span
                        className={`rc-mini-status ${
                          item.resultStatus === "Pass"
                            ? "pass"
                            : item.resultStatus === "Fail"
                              ? "fail"
                              : ""
                        }`}
                      >
                        {item.resultStatus || "—"}
                      </span>
                    </button>
                  );
                })}

                {filteredStudents.length === 0 && (
                  <p className="rc-no-students">
                    No matching students.
                  </p>
                )}
              </div>
            </section>

            {/* REPORT PREVIEW */}

            <div className="rc-preview-area">
              {selectedResult ? (
                <>
                  <div className="rc-preview-toolbar no-print">
                    <span>REPORT CARD PREVIEW</span>

                    <div className="rc-preview-actions">
                      <button
                        className="rc-print-btn"
                        onClick={printReport}
                      >
                        <Printer size={17} />
                        Print
                      </button>

                      <button
                        className="rc-print-btn"
                        onClick={downloadReport}
                        disabled={downloading}
                      >
                        {downloading ? (
                          <RefreshCw
                            size={17}
                            className="rc-spin"
                          />
                        ) : (
                          <Download size={17} />
                        )}

                        {downloading
                          ? "Downloading..."
                          : "Download PDF"}
                      </button>
                    </div>
                  </div>

                  <article className="rc-report">
                    {/* REPORT HEADER */}

                    <div className="rc-report-header">
                      <div className="rc-report-logo">
                        <GraduationCap size={34} />
                      </div>

                      <div className="rc-institution">
                        <h1>{organisation}</h1>
                        <p>STUDENT ACADEMIC REPORT</p>
                        <span>
                          Learning • Progress • Achievement
                        </span>
                      </div>

                      <div className="rc-report-symbol">
                        <Award size={34} />
                      </div>
                    </div>

                    <div className="rc-report-title">
                      <h2>REPORT CARD</h2>
                      <span>
                        {selectedExam?.examName || "Examination"}
                      </span>
                    </div>

                    {/* STUDENT DETAILS */}

                    <div className="rc-student-details">
                      <div>
                        <span>Student Name</span>
                        <strong>
                          {student.fullName || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Roll Number</span>
                        <strong>
                          {student.rollNumber || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Student ID</span>
                        <strong>
                          {student.studentId || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Class / Section</span>
                        <strong>
                          {selectedClass?.className || "—"} /{" "}
                          {selection.section || "—"}
                        </strong>
                      </div>

                      <div>
                        <span>Academic Session</span>
                        <strong>{sessionName}</strong>
                      </div>

                      <div>
                        <span>Examination</span>
                        <strong>
                          {selectedExam?.examName || "—"}
                        </strong>
                      </div>
                    </div>

                    {/* SUBJECT PERFORMANCE */}

                    <div className="rc-table-title">
                      <h3>Subject-wise Performance</h3>
                    </div>

                    <table className="rc-subject-table">
                      <thead>
                        <tr>
                          <th>Subject</th>
                          <th>Maximum Marks</th>
                          <th>Marks Obtained</th>
                          <th>Percentage</th>
                          <th>Grade</th>
                          <th>Attendance</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {subjects.map((subject, index) => (
                          <tr key={subject._id || index}>
                            <td>{getSubjectName(subject)}</td>

                            <td>
                              {subject.maxMarks ?? "—"}
                            </td>

                            <td>
                              {subject.marksObtained ?? "—"}
                            </td>

                            <td>
                              {Number(
                                subject.percentage || 0
                              ).toFixed(1)}
                              %
                            </td>

                            <td>
                              {getSubjectGrade(subject)}
                            </td>

                            <td>
                              {subject.attendance || "Present"}
                            </td>

                            <td>
                              <span
                                className={`rc-subject-status ${
                                  subject.status === "Pass"
                                    ? "pass"
                                    : subject.status === "Fail"
                                      ? "fail"
                                      : ""
                                }`}
                              >
                                {subject.status || "—"}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {subjects.length === 0 && (
                          <tr>
                            <td colSpan="7">
                              No subject details available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* OVERALL SUMMARY */}

                    <div className="rc-summary">
                      <div>
                        <span>Total Marks</span>
                        <strong>
                          {totalObtained} / {totalMaximum}
                        </strong>
                      </div>

                      <div>
                        <span>Percentage</span>
                        <strong>
                          {percentage.toFixed(2)}%
                        </strong>
                      </div>

                      <div>
                        <span>Overall Grade</span>
                        <strong className="rc-summary-grade">
                          {grade}
                        </strong>
                      </div>

                      <div>
                        <span>Final Result</span>
                        <strong
                          className={
                            resultStatus === "Pass"
                              ? "rc-pass"
                              : resultStatus === "Fail"
                                ? "rc-fail"
                                : ""
                          }
                        >
                          {resultStatus}
                        </strong>
                      </div>
                    </div>

                    {/* ATTENDANCE */}

                    <div className="rc-attendance">
                      <h3>Attendance Summary</h3>

                      <div>
                        <span>
                          Present:{" "}
                          <strong>{attendance.present}</strong>
                        </span>

                        <span>
                          Absent:{" "}
                          <strong>{attendance.absent}</strong>
                        </span>
                      </div>
                    </div>

                    {/* TEACHER REMARKS */}

                    <div className="rc-remarks">
                      <h3>Teacher's Remarks</h3>

                      <p>
                        {selectedResult.teacherRemarks ||
                          "No teacher remarks have been added."}
                      </p>
                    </div>

                    {/* IMPROVEMENT SUGGESTIONS */}

                    {selectedResult.improvementSuggestions
                      ?.length > 0 && (
                      <div className="rc-improvements">
                        <h3>Areas for Improvement</h3>

                        <ul>
                          {selectedResult.improvementSuggestions.map(
                            (suggestion, index) => (
                              <li key={index}>
                                {typeof suggestion === "string"
                                  ? suggestion
                                  : suggestion.message ||
                                    suggestion.subject ||
                                    "Review subject performance"}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}

                    {/* SIGNATURES */}

                    <div className="rc-signatures">
                      <div>
                        <span>________________________</span>
                        <strong>Class Teacher</strong>
                      </div>

                      <div>
                        <span>________________________</span>
                        <strong>
                          Principal / Administrator
                        </strong>
                      </div>
                    </div>

                    <footer className="rc-report-footer">
                      Generated through AnkSetu Result Management
                      System
                    </footer>
                  </article>
                </>
              ) : (
                <div className="rc-preview-empty">
                  <FileText size={45} />

                  <h3>Select a student</h3>

                  <p>
                    Choose a student from the list to preview
                    their report card here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}

        {results.length === 0 && (
          <div className="rc-empty no-print">
            {hasLoaded ? (
              <AlertCircle size={42} />
            ) : (
              <FileText size={42} />
            )}

            <h3>
              {hasLoaded
                ? "No report cards found"
                : "Your report cards will appear here"}
            </h3>

            <p>
              {hasLoaded
                ? "No generated results are available for the selected examination and class."
                : "Select an examination, class and section, then load the generated student reports."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
