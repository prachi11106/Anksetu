
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  ClipboardList,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  BookOpen,
  CalendarDays,
  Save,
  UserCheck,
  UserX,
  Loader2,
} from "lucide-react";

import "./MarksEntry.css";

const MARKS_API = "http://localhost:5000/api/marks";
const STUDENTS_API = "http://localhost:5000/api/students";
const CLASS_API = "http://localhost:5000/api/class-management";
const ACADEMIC_API = "http://localhost:5000/api/academic";

function getToken() {
  return (
    localStorage.getItem("anksetuToken") ||
    sessionStorage.getItem("anksetuToken")
  );
}

async function apiRequest(url, options = {}) {
  const token = getToken();

  if (!token) {
    throw new Error("Your login session has expired. Please log in again.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || data.error || `Request failed (${response.status})`
    );
  }

  return data;
}

function getId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
}

function getExamName(exam) {
  return exam.examName || exam.name || "Unnamed Examination";
}

export default function MarksEntry() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [exams, setExams] = useState([]);

  const [selection, setSelection] = useState({
    exam: "",
    classId: "",
    section: "",
    subject: "",
  });

  const [marks, setMarks] = useState({});
  const [remarks, setRemarks] = useState({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [marksLoaded, setMarksLoaded] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ------------------------------------------
  // LOAD INITIAL DATA
  // ------------------------------------------

  const loadInitialData = useCallback(async () => {
    setInitialLoading(true);
    setError("");

    const requests = await Promise.allSettled([
      apiRequest(STUDENTS_API),
      apiRequest(`${CLASS_API}/classes`),
      apiRequest(`${CLASS_API}/subjects`),
      apiRequest(`${ACADEMIC_API}/exams`),
    ]);

    const [studentResult, classResult, subjectResult, examResult] = requests;

    if (studentResult.status === "fulfilled") {
      setStudents(studentResult.value.students || []);
    } else {
      setStudents([]);
      console.error("Students loading error:", studentResult.reason);
    }

    if (classResult.status === "fulfilled") {
      setClasses(classResult.value.classes || []);
    } else {
      setClasses([]);
      console.error("Classes loading error:", classResult.reason);
    }

    if (subjectResult.status === "fulfilled") {
      setSubjects(subjectResult.value.subjects || []);
    } else {
      setSubjects([]);
      console.error("Subjects loading error:", subjectResult.reason);
    }

    if (examResult.status === "fulfilled") {
      const examList = examResult.value.exams || [];

      setExams(Array.isArray(examList) ? examList : []);

      console.log("Examinations loaded:", examList);

      if (!examList.length) {
        setError(
          "No examinations found. Please create an examination in Academic Management first."
        );
      }
    } else {
      setExams([]);
      setError(
        examResult.reason?.message ||
        "Unable to load examinations. Please check your login and try again."
      );

      console.error("Examinations loading error:", examResult.reason);
    }

    setInitialLoading(false);
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // ------------------------------------------
  // SELECTED RECORDS
  // ------------------------------------------

  const selectedExam = useMemo(
    () => exams.find((exam) => exam._id === selection.exam),
    [exams, selection.exam]
  );

  const selectedClass = useMemo(
    () => classes.find((item) => item._id === selection.classId),
    [classes, selection.classId]
  );

  const classOptions = useMemo(() => {
    if (!selectedExam) return [];

    const examClassId = getId(selectedExam.classId);

    if (!examClassId) return classes;

    return classes.filter(
      (item) => String(item._id) === examClassId
    );
  }, [classes, selectedExam]);

  const availableSections = selectedClass?.sections || [];

  const availableSubjects = useMemo(() => {
    if (!selectedClass) return [];

    const assignedSubjects = selectedClass.subjects || [];

    return assignedSubjects
      .map((assigned) => {
        const assignedId = getId(assigned);

        return (
          subjects.find(
            (subject) => String(subject._id) === assignedId
          ) ||
          (typeof assigned === "object" && assigned._id
            ? assigned
            : null)
        );
      })
      .filter(Boolean);
  }, [selectedClass, subjects]);

  // ------------------------------------------
  // STUDENT ROSTER
  // ------------------------------------------

  const roster = useMemo(() => {
    if (!selectedClass || !selection.section) return [];

    const expectedSession =
      selectedClass.academicSession ||
      getId(selectedExam?.academicSession);

    return students.filter((student) => {
      const sameClass =
        String(student.className || "").trim() ===
        String(selectedClass.className || "").trim();

      const sameSection =
        String(student.section || "").trim().toUpperCase() ===
        String(selection.section).trim().toUpperCase();

      const sameSession =
        !expectedSession ||
        String(student.academicSession || "").trim() ===
        String(expectedSession).trim();

      const active = !student.status || student.status === "Active";

      return sameClass && sameSection && sameSession && active;
    });
  }, [students, selectedClass, selectedExam, selection.section]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return roster;

    return roster.filter((student) => {
      return (
        (student.fullName || "").toLowerCase().includes(query) ||
        (student.rollNumber || "").toLowerCase().includes(query) ||
        (student.studentId || "").toLowerCase().includes(query)
      );
    });
  }, [roster, search]);

  // ------------------------------------------
  // COUNTS
  // ------------------------------------------

  const enteredCount = roster.filter(
    (student) =>
      marks[student._id] !== undefined &&
      marks[student._id] !== ""
  ).length;

  const absentCount = roster.filter(
    (student) => marks[student._id] === "ABSENT"
  ).length;

  const presentCount = roster.length - absentCount;

  const maxMarks = Number(selectedExam?.maxMarks || 100);

  // ------------------------------------------
  // SELECTION HANDLER
  // ------------------------------------------

  const handleSelectionChange = (field, value) => {
    setSelection((previous) => {
      const updated = {
        ...previous,
        [field]: value,
      };

      if (field === "exam") {
        updated.classId = "";
        updated.section = "";
        updated.subject = "";
      }

      if (field === "classId") {
        updated.section = "";
        updated.subject = "";
      }

      if (field === "section") {
        updated.subject = "";
      }

      return updated;
    });

    setMarks({});
    setRemarks({});
    setMarksLoaded(false);
    setSearch("");
    setError("");
    setMessage("");
  };

  // ------------------------------------------
  // LOAD EXISTING MARKS
  // ------------------------------------------

  const loadExistingMarks = async () => {
    if (
      !selection.exam ||
      !selection.classId ||
      !selection.section ||
      !selection.subject
    ) {
      setError("Please select examination, class, section and subject.");
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
        subject: selection.subject,
      });

      const data = await apiRequest(
        `${MARKS_API}?${params.toString()}`
      );

      const record = data.marks || data.record || null;

      const nextMarks = {};
      const nextRemarks = {};

      if (record && Array.isArray(record.students)) {
        record.students.forEach((entry) => {
          const studentId = getId(entry.student);

          if (!studentId) return;

          nextMarks[studentId] =
            entry.attendance === "Absent"
              ? "ABSENT"
              : entry.marksObtained ?? "";

          nextRemarks[studentId] = entry.remarks || "";
        });
      }

      setMarks(nextMarks);
      setRemarks(nextRemarks);
      setMarksLoaded(true);

      setMessage(
        record
          ? "Existing marks loaded successfully."
          : "Student list loaded. You can now enter marks."
      );
    } catch (err) {
      setError(err.message || "Unable to load student marks.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------
  // UPDATE MARKS
  // ------------------------------------------

  const updateStudentMarks = (studentId, value) => {
    if (value === "") {
      setMarks((previous) => ({
        ...previous,
        [studentId]: "",
      }));
      return;
    }

    const number = Number(value);

    if (!Number.isFinite(number) || number < 0 || number > maxMarks) {
      return;
    }

    setMarks((previous) => ({
      ...previous,
      [studentId]: number,
    }));
  };

  // ------------------------------------------
  // TOGGLE ATTENDANCE
  // ------------------------------------------

  const toggleAbsent = (studentId) => {
    setMarks((previous) => ({
      ...previous,
      [studentId]:
        previous[studentId] === "ABSENT" ? "" : "ABSENT",
    }));
  };

  // ------------------------------------------
  // UPDATE REMARKS
  // ------------------------------------------

  const updateRemarks = (studentId, value) => {
    setRemarks((previous) => ({
      ...previous,
      [studentId]: value,
    }));
  };

  // ------------------------------------------
  // SAVE MARKS
  // ------------------------------------------

  const saveMarks = async () => {
    if (
      !selection.exam ||
      !selection.classId ||
      !selection.section ||
      !selection.subject
    ) {
      setError("Please complete all examination selections.");
      return;
    }

    if (!roster.length) {
      setError("No active students found in the selected class and section.");
      return;
    }

    const incomplete = roster.filter(
      (student) =>
        marks[student._id] === undefined ||
        marks[student._id] === ""
    );

    if (incomplete.length) {
      setError(
        `Please enter marks or mark absent for all students. ${incomplete.length} student(s) remaining.`
      );
      return;
    }

    const passingMarks = Number(
      selectedExam?.passingMarks ?? 33
    );

    const academicSession = getId(selectedExam?.academicSession);

    if (!academicSession) {
      setError("The selected examination has no valid academic session.");
      return;
    }

    const payload = {
      exam: selection.exam,
      classId: selection.classId,
      section: selection.section,
      subject: selection.subject,
      academicSession,
      maxMarks,
      passingMarks,

      students: roster.map((student) => ({
        student: student._id,
        marksObtained:
          marks[student._id] === "ABSENT"
            ? 0
            : Number(marks[student._id]),
        attendance:
          marks[student._id] === "ABSENT"
            ? "Absent"
            : "Present",
        remarks: remarks[student._id] || "",
      })),
    };

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest(`${MARKS_API}/bulk`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setMarksLoaded(true);
      setMessage(
        data.message || "Marks saved successfully."
      );
    } catch (err) {
      setError(err.message || "Unable to save marks.");
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------
  // PAGE UI
  // ------------------------------------------

  if (initialLoading) {
    return (
      <div className="me-page">
        <div className="me-loading-page">
          <Loader2 size={32} className="me-spin" />
          <p>Loading Marks Entry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="me-page">
      <header className="me-topbar">
        <div className="me-brand">
          <div className="me-brand-icon">
            <GraduationCap size={24} />
          </div>

          <div>
            <h2>AnkSetu</h2>
            <span>Academic Management System</span>
          </div>
        </div>

        <button
          type="button"
          className="me-refresh"
          onClick={loadInitialData}
          disabled={initialLoading}
        >
          <RefreshCw size={15} />
          Refresh Data
        </button>
      </header>

      <main className="me-main">
        <div className="me-heading">
          <div>
            <div className="me-eyebrow">TEACHER WORKSPACE</div>
            <h1>Marks Entry</h1>
            <p>
              Select an examination and enter student marks and attendance.
            </p>
          </div>

          <div className="me-heading-icon">
            <ClipboardList size={27} />
          </div>
        </div>

        <div className="me-stats">
          <div className="me-stat">
            <div className="me-stat-icon purple">
              <Users size={21} />
            </div>
            <div>
              <span>Total Students</span>
              <strong>{roster.length}</strong>
            </div>
          </div>

          <div className="me-stat">
            <div className="me-stat-icon blue">
              <ClipboardList size={21} />
            </div>
            <div>
              <span>Marks Entered</span>
              <strong>{enteredCount}</strong>
            </div>
          </div>

          <div className="me-stat">
            <div className="me-stat-icon green">
              <UserCheck size={21} />
            </div>
            <div>
              <span>Present</span>
              <strong>{presentCount}</strong>
            </div>
          </div>

          <div className="me-stat">
            <div className="me-stat-icon orange">
              <UserX size={21} />
            </div>
            <div>
              <span>Absent</span>
              <strong>{absentCount}</strong>
            </div>
          </div>
        </div>

        {error && (
          <div className="me-alert error">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {message && (
          <div className="me-alert success">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        <section className="me-selection-card">
          <div className="me-section-heading">
            <div>
              <h2>Select Examination Details</h2>
              <p>
                Choose the examination, class, section and subject.
              </p>
            </div>

            <span className="me-step-label">STEP 01</span>
          </div>

          <div className="me-fields">
            <label>
              <span>
                <CalendarDays size={15} />
                Examination
              </span>

              <select
                value={selection.exam}
                onChange={(e) =>
                  handleSelectionChange("exam", e.target.value)
                }
                disabled={initialLoading || exams.length === 0}
              >
                <option value="">
                  {initialLoading
                    ? "Loading examinations..."
                    : exams.length === 0
                      ? "No examinations available"
                      : "Select Examination"}
                </option>

                {exams.map((exam) => (
                  <option key={exam._id} value={exam._id}>
                    {getExamName(exam)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <GraduationCap size={15} />
                Class
              </span>

              <select
                value={selection.classId}
                onChange={(e) =>
                  handleSelectionChange("classId", e.target.value)
                }
                disabled={!selection.exam}
              >
                <option value="">Select Class</option>

                {classOptions.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.className}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <Users size={15} />
                Section
              </span>

              <select
                value={selection.section}
                onChange={(e) =>
                  handleSelectionChange("section", e.target.value)
                }
                disabled={!selection.classId}
              >
                <option value="">Select Section</option>

                {availableSections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>
                <BookOpen size={15} />
                Subject
              </span>

              <select
                value={selection.subject}
                onChange={(e) =>
                  handleSelectionChange("subject", e.target.value)
                }
                disabled={!selection.section}
              >
                <option value="">
                  {!selection.section
                    ? "Select section first"
                    : availableSubjects.length === 0
                      ? "No subjects assigned to this class"
                      : "Select Subject"}
                </option>

                {availableSubjects.map((subject) => (
                  <option key={subject._id} value={subject._id}>
                    {subject.subjectName || subject.name || "Unnamed Subject"}
                    {subject.subjectCode ? ` (${subject.subjectCode})` : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="me-selection-footer">
            <div className="me-exam-info">
              <span>
                Maximum Marks: <strong>{maxMarks}</strong>
              </span>

              <span>
                Passing Marks:{" "}
                <strong>{selectedExam?.passingMarks ?? 33}</strong>
              </span>
            </div>

            <button
              type="button"
              className="me-load-btn"
              onClick={loadExistingMarks}
              disabled={
                loading ||
                !selection.exam ||
                !selection.classId ||
                !selection.section ||
                !selection.subject
              }
            >
              {loading ? (
                <Loader2 size={16} className="me-spin" />
              ) : (
                <ClipboardList size={16} />
              )}

              {loading ? "Loading..." : "Load Student List"}
            </button>
          </div>
        </section>

        {marksLoaded && (
          <section className="me-table-card">
            <div className="me-table-heading">
              <div>
                <h2>Student Marks Register</h2>
                <p>
                  Enter marks, update attendance and add remarks.
                </p>
              </div>

              <div className="me-table-tools">
                <div className="me-search">
                  <Search size={16} />

                  <input
                    type="text"
                    placeholder="Search students..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <span className="me-total">
                  {roster.length} Students
                </span>
              </div>
            </div>

            <div className="me-table-wrap">
              <table className="me-table">
                <thead>
                  <tr>
                    <th>STUDENT</th>
                    <th>ROLL NUMBER</th>
                    <th>MARKS / {maxMarks}</th>
                    <th>ATTENDANCE</th>
                    <th>REMARKS</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => {
                      const isAbsent =
                        marks[student._id] === "ABSENT";

                      return (
                        <tr key={student._id}>
                          <td>
                            <div className="me-student">
                              <div className="me-avatar">
                                {(student.fullName || "S")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <strong>{student.fullName}</strong>
                                <span>
                                  {student.studentId || "Student"}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            {student.rollNumber || "—"}
                          </td>

                          <td>
                            <input
                              type="number"
                              className="me-marks-input"
                              min="0"
                              max={maxMarks}
                              step="any"
                              placeholder="Enter marks"
                              value={
                                isAbsent
                                  ? ""
                                  : marks[student._id] ?? ""
                              }
                              disabled={isAbsent}
                              onChange={(e) =>
                                updateStudentMarks(
                                  student._id,
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <button
                              type="button"
                              className={`me-attendance ${isAbsent ? "absent" : "present"
                                }`}
                              onClick={() =>
                                toggleAbsent(student._id)
                              }
                            >
                              {isAbsent ? "Absent" : "Present"}
                            </button>
                          </td>

                          <td>
                            <input
                              type="text"
                              className="me-remarks-input"
                              placeholder="Add remark"
                              value={remarks[student._id] || ""}
                              onChange={(e) =>
                                updateRemarks(
                                  student._id,
                                  e.target.value
                                )
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5">
                        <div className="me-empty">
                          <Users size={30} />
                          <h3>No Students Found</h3>
                          <p>
                            No students match your search or selected class.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="me-save-footer">
              <div>
                <strong>{enteredCount}</strong> of{" "}
                <strong>{roster.length}</strong> students completed
              </div>

              <button
                type="button"
                className="me-save-btn"
                onClick={saveMarks}
                disabled={saving || !roster.length}
              >
                {saving ? (
                  <Loader2 size={16} className="me-spin" />
                ) : (
                  <Save size={16} />
                )}

                {saving ? "Saving Marks..." : "Save All Marks"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
