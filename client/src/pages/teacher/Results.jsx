
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  ClipboardCheck,
  Users,
  TrendingUp,
  Award,
  Search,
  RefreshCw,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Eye,
  ShieldCheck,
} from "lucide-react";
import "./Results.css";

const API = "http://localhost:5000/api";
const RESULTS_API = `${API}/results`;

function getToken() {
  return (
    localStorage.getItem("anksetuToken") ||
    sessionStorage.getItem("anksetuToken")
  );
}

function getCurrentUser() {
  try {
    const storedUser =
      localStorage.getItem("anksetuUser") ||
      sessionStorage.getItem("anksetuUser");

    return storedUser ? JSON.parse(storedUser) : {};
  } catch {
    return {};
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
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

function Results() {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser.role === "admin";

  const [sessions, setSessions] = useState([]);
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [results, setResults] = useState([]);

  const [selection, setSelection] = useState({
    exam: "",
    classId: "",
    section: "",
  });

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    if (!message) return;

    const timeout = setTimeout(() => {
      setMessage("");
    }, 3500);

    return () => clearTimeout(timeout);
  }, [message]);

  async function loadOptions() {
    setLoading(true);
    setError("");

    try {
      const [sessionData, examData, classData] =
        await Promise.all([
          request(`${API}/academic/sessions`),
          request(`${API}/academic/exams`),
          request(`${API}/class-management/classes`),
        ]);

      setSessions(sessionData.sessions || []);
      setExams(examData.exams || []);
      setClasses(classData.classes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const selectedExam = exams.find(
    (exam) => exam._id === selection.exam
  );

  const availableClasses = useMemo(() => {
    if (!selectedExam) return classes;

    const examClassId =
      typeof selectedExam.classId === "object"
        ? selectedExam.classId?._id
        : selectedExam.classId;

    return classes.filter(
      (item) => item._id === examClassId
    );
  }, [classes, selectedExam]);

  const selectedClass = classes.find(
    (item) => item._id === selection.classId
  );

  const availableSections = selectedClass?.sections || [];

  const selectedSessionId =
    typeof selectedExam?.academicSession === "object"
      ? selectedExam.academicSession?._id || ""
      : selectedExam?.academicSession || "";

  const selectedSession = sessions.find(
    (session) => session._id === selectedSessionId
  );

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    return results.filter((student) => {
      const name =
        student.student?.fullName ||
        student.fullName ||
        "";

      const roll =
        student.student?.rollNumber ||
        student.rollNumber ||
        "";

      const studentId =
        student.student?.studentId ||
        "";

      return `${name} ${roll} ${studentId}`
        .toLowerCase()
        .includes(query);
    });
  }, [results, search]);

  const totalStudents = results.length;

  const passCount = results.filter(
    (student) => student.resultStatus === "Pass"
  ).length;

  const failCount = results.filter(
    (student) => student.resultStatus === "Fail"
  ).length;

  const averagePercentage =
    totalStudents > 0
      ? results.reduce(
          (total, student) =>
            total + Number(student.percentage || 0),
          0
        ) / totalStudents
      : 0;

  const passPercentage =
    totalStudents > 0
      ? (passCount / totalStudents) * 100
      : 0;

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
    setError("");
    setMessage("");
    setSearch("");
  }

  async function loadResults() {
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

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const params = new URLSearchParams({
        exam: selection.exam,
        classId: selection.classId,
        section: selection.section,
      });

      const data = await request(
        `${RESULTS_API}?${params.toString()}`
      );

      const record = data.result || null;

      setResults(record?.students || []);

      setMessage(
        record
          ? "Results loaded successfully."
          : "No generated results were found for this selection."
      );
    } catch (err) {
      setResults([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateResults() {
    if (isAdmin) {
      setError(
        "Administrators have read-only access to academic results."
      );
      return;
    }

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

    if (!selectedSessionId) {
      setError(
        "The selected examination does not have a valid academic session."
      );
      return;
    }

    const confirmed = window.confirm(
      "Generate or regenerate results using the saved marks for this class and section?"
    );

    if (!confirmed) return;

    setGenerating(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        exam: selection.exam,
        classId: selection.classId,
        section: selection.section,
        academicSession: selectedSessionId,
      };

      const data = await request(
        `${RESULTS_API}/generate`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );

      const record = data.result || null;

      setResults(record?.students || []);

      setMessage(
        data.message || "Results generated successfully."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function getStudentName(student) {
    return (
      student.student?.fullName ||
      student.fullName ||
      "Unknown Student"
    );
  }

  function getRollNumber(student) {
    return (
      student.student?.rollNumber ||
      student.rollNumber ||
      "—"
    );
  }

  function getPercentage(student) {
    return Number(student.percentage || 0);
  }

  function getStatus(student) {
    return student.resultStatus || "—";
  }

  if (loading && sessions.length === 0 && exams.length === 0) {
    return (
      <div className="rg-loading">
        <RefreshCw className="rg-spin" size={28} />
        <p>Preparing result management...</p>
      </div>
    );
  }

  return (
    <div className="rg-page">
      <header className="rg-topbar">
        <div className="rg-brand">
          <div className="rg-brand-icon">
            <GraduationCap size={24} />
          </div>

          <div>
            <h2>AnkSetu</h2>
            <span>Academic Result Management</span>
          </div>
        </div>

        <button
          className="rg-refresh"
          onClick={loadOptions}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? "rg-spin" : ""}
          />
          Refresh
        </button>
      </header>

      <main className="rg-main">
        <section className="rg-heading">
          <div>
            <span className="rg-eyebrow">
              ACADEMICS / RESULTS
            </span>

            <h1>
              {isAdmin
                ? "Institution Results"
                : "Result Generation"}
            </h1>

            <p>
              {isAdmin
                ? "Monitor student performance and academic results across the institution."
                : "Generate and review examination results for students across your institution."}
            </p>
          </div>

          <div className="rg-heading-icon">
            {isAdmin ? (
              <Eye size={30} />
            ) : (
              <FileCheck2 size={30} />
            )}
          </div>
        </section>

        {isAdmin && (
          <div className="rg-alert success">
            <ShieldCheck size={18} />
            Administrator view: You can monitor all institution
            results. Result generation and editing are reserved
            for teachers.
          </div>
        )}

        <section className="rg-selection">
          <div className="rg-section-title">
            <div>
              <h2>Choose Examination</h2>
              <p>
                Select an examination, class and section to
                review academic performance.
              </p>
            </div>

            <span>STEP 01</span>
          </div>

          <div className="rg-fields">
            <label>
              Academic Session

              <select value={selectedSessionId} disabled>
                <option value="">
                  Select examination first
                </option>

                {sessions.map((session) => (
                  <option
                    key={session._id}
                    value={session._id}
                  >
                    {session.sessionName}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Examination

              <select
                value={selection.exam}
                onChange={(event) =>
                  updateSelection("exam", event.target.value)
                }
              >
                <option value="">Select examination</option>

                {exams.map((exam) => (
                  <option
                    key={exam._id}
                    value={exam._id}
                  >
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
                  updateSelection(
                    "classId",
                    event.target.value
                  )
                }
                disabled={!selection.exam}
              >
                <option value="">Select class</option>

                {availableClasses.map((item) => (
                  <option
                    key={item._id}
                    value={item._id}
                  >
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
                  updateSelection(
                    "section",
                    event.target.value
                  )
                }
                disabled={!selection.classId}
              >
                <option value="">Select section</option>

                {availableSections.map((section) => (
                  <option
                    key={section}
                    value={section}
                  >
                    Section {section}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rg-actions">
            <button
              className="rg-secondary-btn"
              onClick={loadResults}
              disabled={loading}
            >
              <Search size={17} />
              View Results
            </button>

            {!isAdmin && (
              <button
                className="rg-primary-btn"
                onClick={generateResults}
                disabled={generating || loading}
              >
                {generating ? (
                  <RefreshCw
                    className="rg-spin"
                    size={17}
                  />
                ) : (
                  <Sparkles size={17} />
                )}

                {generating
                  ? "Generating..."
                  : "Generate Results"}
              </button>
            )}
          </div>
        </section>

        {error && (
          <div className="rg-alert error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {message && (
          <div className="rg-alert success">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        <section className="rg-stats">
          <motion.div
            className="rg-stat-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="rg-stat-icon purple">
              <Users size={21} />
            </div>

            <div>
              <span>Total Students</span>
              <strong>{totalStudents}</strong>
            </div>
          </motion.div>

          <motion.div
            className="rg-stat-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="rg-stat-icon green">
              <ClipboardCheck size={21} />
            </div>

            <div>
              <span>Passed</span>
              <strong>{passCount}</strong>
            </div>
          </motion.div>

          <motion.div
            className="rg-stat-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <div className="rg-stat-icon red">
              <AlertCircle size={21} />
            </div>

            <div>
              <span>Failed</span>
              <strong>{failCount}</strong>
            </div>
          </motion.div>

          <motion.div
            className="rg-stat-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
          >
            <div className="rg-stat-icon blue">
              <TrendingUp size={21} />
            </div>

            <div>
              <span>Class Average</span>
              <strong>
                {averagePercentage.toFixed(1)}%
              </strong>
            </div>
          </motion.div>
        </section>

        <section className="rg-results-card">
          <div className="rg-results-heading">
            <div>
              <span className="rg-eyebrow">STEP 02</span>

              <h2>Student Result Register</h2>

              <p>
                Review the generated results for the selected
                class and section.
              </p>
            </div>

            <div className="rg-search">
              <Search size={16} />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student..."
              />
            </div>
          </div>

          <div className="rg-table-wrap">
            <table className="rg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>STUDENT NAME</th>
                  <th>ROLL NUMBER</th>
                  <th>TOTAL OBTAINED</th>
                  <th>PERCENTAGE</th>
                  <th>GRADE</th>
                  <th>RESULT</th>
                </tr>
              </thead>

              <tbody>
                {filteredResults.map((student, index) => {
                  const percentage =
                    getPercentage(student);

                  const grade =
                    student.overallGrade ||
                    getGrade(percentage);

                  const status = getStatus(student);

                  return (
                    <tr
                      key={
                        student._id ||
                        student.student?._id ||
                        index
                      }
                    >
                      <td>{index + 1}</td>

                      <td>
                        <div className="rg-student-name">
                          <div className="rg-avatar">
                            {getStudentName(student)
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <strong>
                            {getStudentName(student)}
                          </strong>
                        </div>
                      </td>

                      <td>{getRollNumber(student)}</td>

                      <td>
                        <strong className="rg-total-marks">
                          {student.totalObtained ?? "—"}

                          {student.totalMaximum
                            ? ` / ${student.totalMaximum}`
                            : ""}
                        </strong>
                      </td>

                      <td>
                        <div className="rg-percentage">
                          <span>
                            {percentage.toFixed(1)}%
                          </span>

                          <div className="rg-progress">
                            <div
                              style={{
                                width: `${Math.min(
                                  Math.max(percentage, 0),
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="rg-grade">
                          {grade}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`rg-status ${
                            status === "Pass"
                              ? "pass"
                              : status === "Fail"
                                ? "fail"
                                : ""
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {results.length === 0 && (
              <div className="rg-empty">
                <Award size={40} />

                <h3>No results to display</h3>

                <p>
                  Choose an examination, class and section,
                  then view existing results
                  {!isAdmin && " or generate new results"}.
                </p>
              </div>
            )}

            {results.length > 0 &&
              filteredResults.length === 0 && (
                <div className="rg-empty">
                  <Search size={35} />

                  <h3>No matching students</h3>

                  <p>
                    Try searching with another name,
                    student ID or roll number.
                  </p>
                </div>
              )}
          </div>

          {results.length > 0 && (
            <div className="rg-table-footer">
              <span>
                Showing {filteredResults.length} of{" "}
                {results.length} students
              </span>

              <span>
                Pass percentage:{" "}
                <strong>
                  {passPercentage.toFixed(1)}%
                </strong>
              </span>
            </div>
          )}
        </section>

        <div className="rg-note">
          <Sparkles size={18} />

          <div>
            <strong>
              {isAdmin
                ? "Institution-wide academic monitoring"
                : "Automatic result calculation"}
            </strong>

            <p>
              {isAdmin
                ? "Use these results to monitor class performance, identify learning gaps and understand academic progress across the institution."
                : "Results are calculated from saved marks for every active student and assigned subject. Improvement suggestions are rule-based."}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Results;
