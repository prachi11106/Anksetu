
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    GraduationCap,
    BookOpen,
    Search,
    RefreshCw,
    FileText,
    Eye,
    TrendingUp,
    Users,
    CalendarDays,
    AlertCircle,
    CheckCircle2,
    Filter,
} from "lucide-react";
import "./AcademicRecords.css";

const API = "http://localhost:5000/api";

function getToken() {
    return (
        localStorage.getItem("anksetuToken") ||
        sessionStorage.getItem("anksetuToken")
    );
}

async function request(url) {
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Unable to load academic records.");
    }

    return data;
}

function getId(value) {
    return typeof value === "object" ? value?._id : value;
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

export default function AcademicRecords() {
    const navigate = useNavigate();

    const [sessions, setSessions] = useState([]);
    const [exams, setExams] = useState([]);
    const [classes, setClasses] = useState([]);
    const [records, setRecords] = useState([]);

    const [filters, setFilters] = useState({
        session: "",
        exam: "",
        classId: "",
        section: "",
    });

    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    useEffect(() => {
        loadOptions();
    }, []);

    const selectedExam = exams.find(
        (exam) => exam._id === filters.exam
    );

    const selectedClass = classes.find(
        (item) => item._id === filters.classId
    );

    const availableExams = useMemo(() => {
        if (!filters.session) return exams;

        return exams.filter(
            (exam) => getId(exam.academicSession) === filters.session
        );
    }, [exams, filters.session]);

    const availableClasses = useMemo(() => {
        if (!selectedExam) return classes;

        const examClassId = getId(selectedExam.classId);

        return classes.filter((item) => item._id === examClassId);
    }, [classes, selectedExam]);

    const availableSections = selectedClass?.sections || [];

    const filteredRecords = useMemo(() => {
        const query = search.toLowerCase();

        return records.filter((record) => {
            const student = record.student || {};
            const name = student.fullName || "";
            const roll = student.rollNumber || "";
            const studentId = student.studentId || "";

            return `${name} ${roll} ${studentId}`
                .toLowerCase()
                .includes(query);
        });
    }, [records, search]);

    const passCount = records.filter(
        (record) => record.resultStatus === "Pass"
    ).length;

    const failCount = records.filter(
        (record) => record.resultStatus === "Fail"
    ).length;

    const classAverage =
        records.length > 0
            ? records.reduce(
                (total, record) => total + Number(record.percentage || 0),
                0
            ) / records.length
            : 0;

    async function loadOptions() {
        setLoading(true);
        setError("");

        try {
            const [sessionData, examData, classData] = await Promise.all([
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

    function updateFilter(field, value) {
        setFilters((previous) => ({
            ...previous,
            [field]: value,
            ...(field === "session"
                ? { exam: "", classId: "", section: "" }
                : {}),
            ...(field === "exam"
                ? { classId: "", section: "" }
                : {}),
            ...(field === "classId" ? { section: "" } : {}),
        }));

        setRecords([]);
        setError("");
        setMessage("");
    }

    async function searchRecords() {
        if (
            !filters.exam ||
            !filters.classId ||
            !filters.section
        ) {
            setError("Select an examination, class and section first.");
            return;
        }

        setSearching(true);
        setError("");
        setMessage("");
        setRecords([]);

        try {
            const params = new URLSearchParams({
                exam: filters.exam,
                classId: filters.classId,
                section: filters.section,
            });

            const data = await request(
                `${API}/results?${params.toString()}`
            );

            const result = data.result || data;
            const students = result.students || data.students || [];

            setRecords(students);

            if (students.length === 0) {
                setMessage("No academic records were found for these filters.");
            } else {
                setMessage(`${students.length} student records loaded.`);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setSearching(false);
        }
    }

    function openReportCard() {
        navigate("/teacher/reports", {
            state: {
                exam: filters.exam,
                classId: filters.classId,
                section: filters.section,
            },
        });
    }

    if (loading) {
        return (
            <div className="ar-loading">
                <RefreshCw className="ar-spin" size={28} />
                <p>Loading academic records...</p>
            </div>
        );
    }

    return (
        <div className="ar-page">
            <header className="ar-topbar">
                <div className="ar-brand">
                    <div className="ar-brand-icon">
                        <GraduationCap size={24} />
                    </div>
                    <div>
                        <h2>AnkSetu</h2>
                        <span>Academic Records Management</span>
                    </div>
                </div>

                <button className="ar-refresh" onClick={loadOptions}>
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </header>

            <main className="ar-main">
                <section className="ar-heading">
                    <div>
                        <span className="ar-eyebrow">TEACHER PORTAL / RECORDS</span>
                        <h1>Academic Records</h1>
                        <p>
                            Access examination history and review student performance
                            records.
                        </p>
                    </div>

                    <div className="ar-heading-icon">
                        <BookOpen size={29} />
                    </div>
                </section>

                <section className="ar-filter-card">
                    <div className="ar-filter-heading">
                        <div>
                            <h2>Find Academic Records</h2>
                            <p>Filter student results using academic details.</p>
                        </div>
                        <span><Filter size={15} /> FILTERS</span>
                    </div>

                    <div className="ar-fields">
                        <label>
                            Academic Session
                            <select
                                value={filters.session}
                                onChange={(event) =>
                                    updateFilter("session", event.target.value)
                                }
                            >
                                <option value="">All sessions</option>
                                {sessions.map((session) => (
                                    <option key={session._id} value={session._id}>
                                        {session.sessionName}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Examination
                            <select
                                value={filters.exam}
                                onChange={(event) =>
                                    updateFilter("exam", event.target.value)
                                }
                            >
                                <option value="">Select examination</option>
                                {availableExams.map((exam) => (
                                    <option key={exam._id} value={exam._id}>
                                        {exam.examName}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Class
                            <select
                                value={filters.classId}
                                onChange={(event) =>
                                    updateFilter("classId", event.target.value)
                                }
                                disabled={!filters.exam}
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
                                value={filters.section}
                                onChange={(event) =>
                                    updateFilter("section", event.target.value)
                                }
                                disabled={!filters.classId}
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

                    <div className="ar-filter-footer">
                        <span>
                            <CalendarDays size={15} />
                            Search previously generated examination results.
                        </span>

                        <button
                            className="ar-search-btn"
                            onClick={searchRecords}
                            disabled={searching}
                        >
                            {searching ? (
                                <RefreshCw className="ar-spin" size={17} />
                            ) : (
                                <Search size={17} />
                            )}
                            {searching ? "Searching..." : "Search Records"}
                        </button>
                    </div>
                </section>

                {error && (
                    <div className="ar-alert error">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {message && (
                    <div className="ar-alert success">
                        <CheckCircle2 size={18} />
                        {message}
                    </div>
                )}

                <section className="ar-stats">
                    <div className="ar-stat">
                        <div className="ar-stat-icon purple">
                            <Users size={21} />
                        </div>
                        <div>
                            <span>Students Found</span>
                            <strong>{records.length}</strong>
                        </div>
                    </div>

                    <div className="ar-stat">
                        <div className="ar-stat-icon green">
                            <CheckCircle2 size={21} />
                        </div>
                        <div>
                            <span>Passed</span>
                            <strong>{passCount}</strong>
                        </div>
                    </div>

                    <div className="ar-stat">
                        <div className="ar-stat-icon red">
                            <AlertCircle size={21} />
                        </div>
                        <div>
                            <span>Failed</span>
                            <strong>{failCount}</strong>
                        </div>
                    </div>

                    <div className="ar-stat">
                        <div className="ar-stat-icon blue">
                            <TrendingUp size={21} />
                        </div>
                        <div>
                            <span>Class Average</span>
                            <strong>{classAverage.toFixed(1)}%</strong>
                        </div>
                    </div>
                </section>

                <section className="ar-records-card">
                    <div className="ar-records-heading">
                        <div>
                            <span className="ar-eyebrow">ACADEMIC HISTORY</span>
                            <h2>Student Result Records</h2>
                            <p>Search and review individual student performance.</p>
                        </div>

                        <div className="ar-search-box">
                            <Search size={16} />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Name, roll no. or ID..."
                            />
                        </div>
                    </div>

                    <div className="ar-table-wrap">
                        <table className="ar-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>STUDENT</th>
                                    <th>ROLL NUMBER</th>
                                    <th>TOTAL MARKS</th>
                                    <th>PERCENTAGE</th>
                                    <th>GRADE</th>
                                    <th>RESULT</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredRecords.map((record, index) => {
                                    const student = record.student || {};
                                    const percentage = Number(record.percentage || 0);
                                    const status = record.resultStatus || "—";

                                    return (
                                        <tr key={getId(record.student) || index}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <div className="ar-student">
                                                    <div className="ar-avatar">
                                                        {(student.fullName || "S")
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <strong>{student.fullName || "Student"}</strong>
                                                        <span>{student.studentId || "—"}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{student.rollNumber || "—"}</td>
                                            <td>
                                                <strong className="ar-marks">
                                                    {record.totalObtained ?? "—"}
                                                    {record.totalMaximum
                                                        ? ` / ${record.totalMaximum}`
                                                        : ""}
                                                </strong>
                                            </td>
                                            <td>
                                                <div className="ar-percentage">
                                                    <strong>{percentage.toFixed(1)}%</strong>
                                                    <div className="ar-progress">
                                                        <div
                                                            style={{
                                                                width: `${Math.min(percentage, 100)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="ar-grade">
                                                    {record.overallGrade || getGrade(percentage)}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`ar-status ${status === "Pass" ? "pass" : "fail"
                                                        }`}
                                                >
                                                    {status}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="ar-view-btn"
                                                    onClick={openReportCard}
                                                    title="Open report card"
                                                >
                                                    <Eye size={16} />
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {records.length === 0 && (
                            <div className="ar-empty">
                                <FileText size={40} />
                                <h3>No academic records loaded</h3>
                                <p>
                                    Select your filters and search to view generated student
                                    results.
                                </p>
                            </div>
                        )}

                        {records.length > 0 && filteredRecords.length === 0 && (
                            <div className="ar-empty">
                                <Search size={35} />
                                <h3>No matching students</h3>
                                <p>Try another student name, roll number or ID.</p>
                            </div>
                        )}
                    </div>

                    {records.length > 0 && (
                        <div className="ar-footer">
                            <span>
                                Showing {filteredRecords.length} of {records.length} records
                            </span>
                            <span>
                                Examination: <strong>{selectedExam?.examName || "—"}</strong>
                            </span>
                        </div>
                    )}
                </section>

                <div className="ar-note">
                    <FileText size={18} />
                    <p>
                        Academic records display results that have already been
                        generated. To change marks, use Marks Entry and regenerate
                        the result where appropriate.
                    </p>
                </div>
            </main>
        </div>
    );
}
