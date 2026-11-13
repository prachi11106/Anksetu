
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  RefreshCw,
  GraduationCap,
  BookOpen,
  UserRound,
  X,
  Eye,
  Filter,
  CalendarDays,
  Phone,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Hash,
} from "lucide-react";

const API = "http://localhost:5000/api";

function getToken() {
  return (
    localStorage.getItem("anksetuToken") ||
    sessionStorage.getItem("anksetuToken")
  );
}

function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "S"
  );
}

function formatDate(value) {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not provided";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState(null);

  const fetchStudents = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await fetch(`${API}/students`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load student records.");
      }

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.students)
          ? data.students
          : [];

      setStudents(list);
    } catch (err) {
      setError(err.message || "Something went wrong while loading students.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const classOptions = useMemo(() => {
    return [
      ...new Set(
        students
          .map((student) => String(student.className || "").trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  const sectionOptions = useMemo(() => {
    const relevantStudents =
      classFilter === "all"
        ? students
        : students.filter(
            (student) => String(student.className) === classFilter
          );

    return [
      ...new Set(
        relevantStudents
          .map((student) => String(student.section || "").trim())
          .filter(Boolean)
      ),
    ].sort();
  }, [students, classFilter]);

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        String(student.fullName || "").toLowerCase().includes(query) ||
        String(student.rollNumber || "").toLowerCase().includes(query) ||
        String(student.studentId || "").toLowerCase().includes(query) ||
        String(student.guardianName || "").toLowerCase().includes(query);

      const matchesClass =
        classFilter === "all" ||
        String(student.className || "") === classFilter;

      const matchesSection =
        sectionFilter === "all" ||
        String(student.section || "") === sectionFilter;

      return matchesSearch && matchesClass && matchesSection;
    });
  }, [students, search, classFilter, sectionFilter]);

  const activeStudents = students.filter(
    (student) => student.status !== "Inactive"
  ).length;

  const inactiveStudents = students.filter(
    (student) => student.status === "Inactive"
  ).length;

  const resetFilters = () => {
    setSearch("");
    setClassFilter("all");
    setSectionFilter("all");
  };

  const styles = `
    .asm-page {
      min-height: 100vh;
      padding: 30px;
      color: #202943;
      background: #f6f7fc;
      font-family: Inter, "Segoe UI", sans-serif;
    }

    .asm-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 18px;
      margin-bottom: 25px;
    }

    .asm-eyebrow {
      display: inline-block;
      margin-bottom: 8px;
      color: #7564d8;
      font-size: 10px;
      font-weight: 850;
      letter-spacing: 1.3px;
    }

    .asm-header h1 {
      margin: 0;
      color: #202943;
      font-size: 27px;
      font-weight: 850;
      letter-spacing: -0.8px;
    }

    .asm-header p {
      margin: 8px 0 0;
      color: #9299aa;
      font-size: 12px;
    }

    .asm-refresh {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 16px;
      color: white;
      background: #6656c8;
      border: 0;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .asm-refresh:hover {
      background: #5545b7;
      transform: translateY(-2px);
    }

    .asm-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .asm-spin {
      animation: asm-rotate 1s linear infinite;
    }

    @keyframes asm-rotate {
      to { transform: rotate(360deg); }
    }

    .asm-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 14px;
      margin-bottom: 18px;
      color: #a4434e;
      background: #fff0f1;
      border: 1px solid #ffdadd;
      border-radius: 10px;
      font-size: 11px;
    }

    .asm-alert span { flex: 1; }

    .asm-alert button {
      display: grid;
      place-items: center;
      padding: 4px;
      color: inherit;
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    .asm-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 15px;
      margin-bottom: 22px;
    }

    .asm-stat {
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 112px;
      padding: 19px;
      background: white;
      border: 1px solid #edf0f6;
      border-radius: 15px;
      box-shadow: 0 5px 18px rgba(31,42,76,0.03);
      transition: transform 0.2s ease;
    }

    .asm-stat:hover { transform: translateY(-3px); }

    .asm-stat-icon {
      width: 45px;
      height: 45px;
      display: grid;
      flex-shrink: 0;
      place-items: center;
      color: #725bd4;
      background: #f0edff;
      border-radius: 13px;
    }

    .asm-stat-icon.blue {
      color: #3986d8;
      background: #eaf4ff;
    }

    .asm-stat-icon.green {
      color: #29956d;
      background: #e8f8f0;
    }

    .asm-stat span,
    .asm-stat strong,
    .asm-stat small {
      display: block;
    }

    .asm-stat span {
      margin-bottom: 5px;
      color: #8f97aa;
      font-size: 10px;
      font-weight: 650;
    }

    .asm-stat strong {
      color: #27324b;
      font-size: 25px;
      font-weight: 850;
    }

    .asm-stat small {
      margin-top: 4px;
      color: #a2a9b7;
      font-size: 9px;
    }

    .asm-card {
      overflow: hidden;
      background: white;
      border: 1px solid #edf0f6;
      border-radius: 16px;
      box-shadow: 0 5px 20px rgba(31,42,76,0.03);
    }

    .asm-card-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      padding: 21px 22px;
      border-bottom: 1px solid #f0f1f6;
    }

    .asm-heading-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .asm-heading-icon {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      color: #6d5bce;
      background: #f0edff;
      border-radius: 10px;
    }

    .asm-card-heading h2 {
      margin: 0;
      color: #303b55;
      font-size: 15px;
      font-weight: 850;
    }

    .asm-card-heading p {
      margin: 6px 0 0;
      color: #999fb0;
      font-size: 10px;
    }

    .asm-result-count {
      padding: 7px 10px;
      color: #6656c8;
      background: #f0edff;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
    }

    .asm-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 22px;
      border-bottom: 1px solid #f0f1f6;
    }

    .asm-search {
      height: 42px;
      flex: 1;
      min-width: 160px;
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 0 12px;
      color: #969daf;
      background: #f8f9fc;
      border: 1px solid #edf0f6;
      border-radius: 9px;
    }

    .asm-search input {
      width: 100%;
      min-width: 0;
      border: 0;
      outline: 0;
      color: #46516a;
      background: transparent;
      font-size: 11px;
    }

    .asm-search input::placeholder { color: #a5abba; }

    .asm-filter {
      height: 42px;
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 0 10px;
      color: #9299aa;
      background: #f8f9fc;
      border: 1px solid #edf0f6;
      border-radius: 9px;
    }

    .asm-filter select {
      max-width: 125px;
      border: 0;
      outline: 0;
      color: #59637a;
      background: transparent;
      font-size: 10px;
      cursor: pointer;
    }

    .asm-reset {
      height: 42px;
      padding: 0 12px;
      color: #6656c8;
      background: #f0edff;
      border: 0;
      border-radius: 9px;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    .asm-table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    .asm-table {
      width: 100%;
      min-width: 760px;
      border-collapse: collapse;
      text-align: left;
    }

    .asm-table thead { background: #fafbfe; }

    .asm-table th {
      padding: 13px 17px;
      color: #a0a6b6;
      border-bottom: 1px solid #f0f1f6;
      font-size: 9px;
      font-weight: 850;
      letter-spacing: 0.6px;
      white-space: nowrap;
    }

    .asm-table td {
      padding: 14px 17px;
      color: #68728a;
      border-bottom: 1px solid #f0f1f6;
      font-size: 10px;
      white-space: nowrap;
    }

    .asm-table tbody tr { transition: background 0.2s ease; }
    .asm-table tbody tr:hover { background: #fcfcff; }
    .asm-table tbody tr:last-child td { border-bottom: 0; }

    .asm-student-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 190px;
    }

    .asm-avatar {
      width: 36px;
      height: 36px;
      display: grid;
      flex-shrink: 0;
      place-items: center;
      color: #6656c8;
      background: #eeeaff;
      border-radius: 11px;
      font-size: 10px;
      font-weight: 850;
    }

    .asm-student-name strong,
    .asm-student-name span {
      display: block;
    }

    .asm-student-name strong {
      color: #35405a;
      font-size: 11px;
    }

    .asm-student-name span {
      margin-top: 4px;
      color: #a0a7b6;
      font-size: 9px;
    }

    .asm-class-badge {
      display: inline-flex;
      align-items: center;
      padding: 6px 9px;
      color: #6656c8;
      background: #f0edff;
      border-radius: 7px;
      font-size: 9px;
      font-weight: 800;
    }

    .asm-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 8px;
      color: #27835f;
      background: #e9f8f0;
      border-radius: 7px;
      font-size: 9px;
      font-weight: 800;
    }

    .asm-status.inactive {
      color: #bd5b65;
      background: #fff0f1;
    }

    .asm-view-btn {
      width: 31px;
      height: 31px;
      display: grid;
      place-items: center;
      color: #6656c8;
      background: #f0edff;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .asm-view-btn:hover {
      color: white;
      background: #6656c8;
    }

    .asm-state {
      min-height: 260px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 9px;
      padding: 25px;
      color: #aaa2d8;
      text-align: center;
    }

    .asm-state strong {
      color: #46516a;
      font-size: 12px;
    }

    .asm-state span {
      max-width: 350px;
      color: #9ba2b2;
      font-size: 10px;
      line-height: 1.6;
    }

    .asm-state-icon {
      width: 55px;
      height: 55px;
      display: grid;
      place-items: center;
      color: #6d5bce;
      background: #f0edff;
      border-radius: 16px;
    }

    .asm-footer-note {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px 16px;
      margin-top: 16px;
      color: #6d5bce;
      background: #f0edff;
      border: 1px solid #e8e3ff;
      border-radius: 11px;
    }

    .asm-footer-note svg { flex-shrink: 0; }

    .asm-footer-note strong {
      display: block;
      color: #4d438c;
      font-size: 10px;
    }

    .asm-footer-note p {
      margin: 5px 0 0;
      color: #8279b5;
      font-size: 9px;
      line-height: 1.6;
    }

    /* Student details modal */

    .asm-modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1200;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(18,25,46,0.55);
      backdrop-filter: blur(5px);
    }

    .asm-modal {
      width: min(550px, 100%);
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
      background: white;
      border-radius: 18px;
      box-shadow: 0 25px 80px rgba(12,20,42,0.2);
    }

    .asm-modal-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .asm-modal-heading h2 {
      margin: 0;
      color: #27324b;
      font-size: 19px;
    }

    .asm-close {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      color: #6c7489;
      background: #f3f4f8;
      border: 0;
      border-radius: 9px;
      cursor: pointer;
    }

    .asm-profile {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 19px 0;
      margin-top: 10px;
      border-bottom: 1px solid #f0f1f6;
    }

    .asm-profile-avatar {
      width: 56px;
      height: 56px;
      display: grid;
      flex-shrink: 0;
      place-items: center;
      color: #6656c8;
      background: #eeeaff;
      border-radius: 15px;
      font-size: 16px;
      font-weight: 850;
    }

    .asm-profile h3 {
      margin: 0 0 6px;
      color: #303b55;
      font-size: 15px;
    }

    .asm-profile span {
      color: #9299aa;
      font-size: 10px;
    }

    .asm-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 11px;
      padding: 18px 0;
    }

    .asm-detail {
      min-width: 0;
      padding: 12px;
      background: #f8f9fc;
      border: 1px solid #edf0f6;
      border-radius: 10px;
    }

    .asm-detail span {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 7px;
      color: #969daf;
      font-size: 9px;
    }

    .asm-detail strong {
      display: block;
      overflow-wrap: anywhere;
      color: #46516a;
      font-size: 10px;
    }

    .asm-modal-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 14px;
      border-top: 1px solid #f0f1f6;
    }

    .asm-modal-footer button {
      padding: 9px 15px;
      color: white;
      background: #6656c8;
      border: 0;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    @media (max-width: 850px) {
      .asm-page { padding: 22px 17px; }
      .asm-stats { grid-template-columns: 1fr 1fr; }
      .asm-toolbar { flex-wrap: wrap; }
      .asm-search { flex-basis: 100%; }
    }

    @media (max-width: 560px) {
      .asm-page { padding: 19px 12px; }
      .asm-header {
        align-items: flex-start;
        flex-direction: column;
      }
      .asm-header h1 { font-size: 23px; }
      .asm-stats { grid-template-columns: 1fr; gap: 10px; }
      .asm-stat { min-height: 88px; padding: 14px; }
      .asm-card-heading {
        align-items: flex-start;
        flex-direction: column;
        padding: 17px;
      }
      .asm-toolbar { padding: 13px; }
      .asm-filter { flex: 1; }
      .asm-filter select { max-width: 100%; width: 100%; }
      .asm-reset { flex: 1; }
      .asm-detail-grid { grid-template-columns: 1fr; }
    }
  `;

  return (
    <div className="asm-page">
      <style>{styles}</style>

      <div className="asm-header">
        <div>
          <span className="asm-eyebrow">INSTITUTION MANAGEMENT</span>
          <h1>Student Management</h1>
          <p>
            View and monitor student records across your institution.
          </p>
        </div>

        <button
          className="asm-refresh"
          onClick={() => fetchStudents(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "asm-spin" : ""}
          />
          Refresh Records
        </button>
      </div>

      {error && (
        <motion.div
          className="asm-alert"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={17} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </motion.div>
      )}

      <section className="asm-stats">
        <motion.div
          className="asm-stat"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="asm-stat-icon">
            <Users size={22} />
          </div>
          <div>
            <span>Total Students</span>
            <strong>{loading ? "—" : students.length}</strong>
            <small>All institution records</small>
          </div>
        </motion.div>

        <motion.div
          className="asm-stat"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <div className="asm-stat-icon green">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span>Active Students</span>
            <strong>{loading ? "—" : activeStudents}</strong>
            <small>Not marked inactive</small>
          </div>
        </motion.div>

        <motion.div
          className="asm-stat"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <div className="asm-stat-icon blue">
            <GraduationCap size={22} />
          </div>
          <div>
            <span>Classes Represented</span>
            <strong>{loading ? "—" : classOptions.length}</strong>
            <small>Classes with student records</small>
          </div>
        </motion.div>
      </section>

      <section className="asm-card">
        <div className="asm-card-heading">
          <div>
            <div className="asm-heading-title">
              <span className="asm-heading-icon">
                <BookOpen size={19} />
              </span>
              <h2>Institution Student Directory</h2>
            </div>
            <p>Search, filter and inspect student profiles.</p>
          </div>

          <span className="asm-result-count">
            {loading ? "Loading..." : `${filteredStudents.length} Records`}
          </span>
        </div>

        <div className="asm-toolbar">
          <div className="asm-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, roll number, student ID or guardian..."
            />
          </div>

          <div className="asm-filter">
            <Filter size={15} />
            <select
              value={classFilter}
              onChange={(event) => {
                setClassFilter(event.target.value);
                setSectionFilter("all");
              }}
              aria-label="Filter by class"
            >
              <option value="all">All Classes</option>
              {classOptions.map((className) => (
                <option key={className} value={className}>
                  Class {className}
                </option>
              ))}
            </select>
          </div>

          <div className="asm-filter">
            <ChevronDown size={15} />
            <select
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
              aria-label="Filter by section"
            >
              <option value="all">All Sections</option>
              {sectionOptions.map((section) => (
                <option key={section} value={section}>
                  Section {section}
                </option>
              ))}
            </select>
          </div>

          <button className="asm-reset" onClick={resetFilters}>
            Reset
          </button>
        </div>

        {loading ? (
          <div className="asm-state">
            <RefreshCw size={25} className="asm-spin" />
            <strong>Loading student records...</strong>
            <span>Retrieving student information from the database.</span>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="asm-state">
            <div className="asm-state-icon">
              <Users size={26} />
            </div>
            <strong>
              {students.length === 0
                ? "No student records found"
                : "No matching students"}
            </strong>
            <span>
              {students.length === 0
                ? "Student records added by teachers will appear here."
                : "Try changing your search or filters."}
            </span>
            {(search || classFilter !== "all" || sectionFilter !== "all") && (
              <button className="asm-reset" onClick={resetFilters}>
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="asm-table-wrap">
            <table className="asm-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>STUDENT ID</th>
                  <th>ROLL NUMBER</th>
                  <th>CLASS / SECTION</th>
                  <th>ACADEMIC SESSION</th>
                  <th>STATUS</th>
                  <th>PROFILE</th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student, index) => (
                  <motion.tr
                    key={student._id || student.studentId || index}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(index * 0.025, 0.25) }}
                  >
                    <td>
                      <div className="asm-student-cell">
                        <div className="asm-avatar">
                          {getInitials(student.fullName)}
                        </div>
                        <div className="asm-student-name">
                          <strong>{student.fullName || "Unnamed Student"}</strong>
                          <span>{student.guardianName || "Guardian not provided"}</span>
                        </div>
                      </div>
                    </td>

                    <td>{student.studentId || "—"}</td>
                    <td>{student.rollNumber || "—"}</td>

                    <td>
                      <span className="asm-class-badge">
                        {student.className
                          ? `Class ${student.className}`
                          : "—"}
                        {student.section ? ` • ${student.section}` : ""}
                      </span>
                    </td>

                    <td>{student.academicSession || "—"}</td>

                    <td>
                      <span
                        className={`asm-status ${
                          student.status === "Inactive" ? "inactive" : ""
                        }`}
                      >
                        {student.status === "Inactive" ? (
                          <X size={12} />
                        ) : (
                          <CheckCircle2 size={12} />
                        )}
                        {student.status || "Active"}
                      </span>
                    </td>

                    <td>
                      <button
                        className="asm-view-btn"
                        onClick={() => setSelectedStudent(student)}
                        title="View student profile"
                        aria-label={`View ${student.fullName || "student"} profile`}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="asm-footer-note">
        <Building2 size={18} />
        <div>
          <strong>Institution-wide student overview</strong>
          <p>
            This page displays records returned by the administrator's
            institution-scoped student API. It does not modify or delete
            student records.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {selectedStudent && (
          <div
            className="asm-modal-backdrop"
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              className="asm-modal"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="asm-modal-heading">
                <div>
                  <span className="asm-eyebrow">STUDENT RECORD</span>
                  <h2>Student Profile</h2>
                </div>

                <button
                  className="asm-close"
                  onClick={() => setSelectedStudent(null)}
                  aria-label="Close profile"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="asm-profile">
                <div className="asm-profile-avatar">
                  {getInitials(selectedStudent.fullName)}
                </div>
                <div>
                  <h3>{selectedStudent.fullName || "Unnamed Student"}</h3>
                  <span>
                    {selectedStudent.status || "Active"} student
                  </span>
                </div>
              </div>

              <div className="asm-detail-grid">
                <div className="asm-detail">
                  <span><Hash size={14} /> Student ID</span>
                  <strong>{selectedStudent.studentId || "Not provided"}</strong>
                </div>

                <div className="asm-detail">
                  <span><Hash size={14} /> Roll Number</span>
                  <strong>{selectedStudent.rollNumber || "Not provided"}</strong>
                </div>

                <div className="asm-detail">
                  <span><GraduationCap size={14} /> Class and Section</span>
                  <strong>
                    {selectedStudent.className
                      ? `Class ${selectedStudent.className}`
                      : "Not provided"}
                    {selectedStudent.section
                      ? ` - Section ${selectedStudent.section}`
                      : ""}
                  </strong>
                </div>

                <div className="asm-detail">
                  <span><CalendarDays size={14} /> Academic Session</span>
                  <strong>{selectedStudent.academicSession || "Not provided"}</strong>
                </div>

                <div className="asm-detail">
                  <span><UserRound size={14} /> Guardian</span>
                  <strong>{selectedStudent.guardianName || "Not provided"}</strong>
                </div>

                <div className="asm-detail">
                  <span><Phone size={14} /> Guardian Phone</span>
                  <strong>{selectedStudent.guardianPhone || "Not provided"}</strong>
                </div>

                <div className="asm-detail">
                  <span><CalendarDays size={14} /> Date of Birth</span>
                  <strong>{formatDate(selectedStudent.dateOfBirth)}</strong>
                </div>

                <div className="asm-detail">
                  <span><UserRound size={14} /> Gender</span>
                  <strong>{selectedStudent.gender || "Not provided"}</strong>
                </div>

                <div className="asm-detail">
                  <span><MapPin size={14} /> Address</span>
                  <strong>{selectedStudent.address || "Not provided"}</strong>
                </div>
              </div>

              <div className="asm-modal-footer">
                <button onClick={() => setSelectedStudent(null)}>
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentManagement;
