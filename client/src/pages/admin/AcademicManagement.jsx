
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ClipboardList,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Clock3,
} from "lucide-react";
import "./AcademicManagement.css";

const API = "http://localhost:5000/api/academic";
const CLASS_API = "http://localhost:5000/api/class-management";

function getToken() {
  return (
    localStorage.getItem("anksetuToken") ||
    sessionStorage.getItem("anksetuToken")
  );
}

async function apiRequest(url, options = {}) {
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

const examTypes = [
  "Unit Test",
  "Mid Term",
  "Half Yearly",
  "Annual",
  "Final",
  "Other",
];

const emptySession = {
  sessionName: "",
  startDate: "",
  endDate: "",
  isActive: false,
};

const emptyExam = {
  examName: "",
  examType: "Unit Test",
  academicSession: "",
  classId: "",
  examDate: "",
  maxMarks: 100,
  passingMarks: 33,
};

export default function AcademicManagement() {
  const [activeTab, setActiveTab] = useState("sessions");
  const [sessions, setSessions] = useState([]);
  const [exams, setExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [sessionForm, setSessionForm] = useState(emptySession);
  const [examForm, setExamForm] = useState(emptyExam);

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [sessionData, examData, classData] = await Promise.all([
        apiRequest(`${API}/sessions`),
        apiRequest(`${API}/exams`),
        apiRequest(`${CLASS_API}/classes`),
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timeout);
  }, [message]);

  const filteredSessions = useMemo(
    () =>
      sessions.filter((item) =>
        item.sessionName.toLowerCase().includes(search.toLowerCase())
      ),
    [sessions, search]
  );

  const filteredExams = useMemo(
    () =>
      exams.filter((item) => {
        const examName = item.examName || "";
        const examType = item.examType || "";
        const className =
          item.classId?.className || item.className || "";

        return `${examName} ${examType} ${className}`
          .toLowerCase()
          .includes(search.toLowerCase());
      }),
    [exams, search]
  );

  function openAddModal() {
    setEditingItem(null);
    setError("");

    if (activeTab === "sessions") {
      setSessionForm(emptySession);
    } else {
      setExamForm({
        ...emptyExam,
        academicSession:
          sessions.find((session) => session.isActive)?._id || "",
      });
    }

    setModalOpen(true);
  }

  function openEditSession(item) {
    setEditingItem(item);
    setSessionForm({
      sessionName: item.sessionName || "",
      startDate: item.startDate
        ? new Date(item.startDate).toISOString().slice(0, 10)
        : "",
      endDate: item.endDate
        ? new Date(item.endDate).toISOString().slice(0, 10)
        : "",
      isActive: Boolean(item.isActive),
    });
    setError("");
    setModalOpen(true);
  }

  function openEditExam(item) {
    setEditingItem(item);

    setExamForm({
      examName: item.examName || "",
      examType: item.examType || "Unit Test",
      academicSession:
        typeof item.academicSession === "object"
          ? item.academicSession?._id || ""
          : item.academicSession || "",
      classId:
        typeof item.classId === "object"
          ? item.classId?._id || ""
          : item.classId || "",
      examDate: item.examDate
        ? new Date(item.examDate).toISOString().slice(0, 10)
        : "",
      maxMarks: item.maxMarks ?? 100,
      passingMarks: item.passingMarks ?? 33,
    });

    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
  }

  async function handleSessionSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editingItem
        ? `${API}/sessions/${editingItem._id}`
        : `${API}/sessions`;

      await apiRequest(url, {
        method: editingItem ? "PUT" : "POST",
        body: JSON.stringify(sessionForm),
      });

      closeModal();
      setMessage(
        editingItem
          ? "Academic session updated successfully."
          : "Academic session created successfully."
      );

      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExamSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      ...examForm,
      maxMarks: Number(examForm.maxMarks),
      passingMarks: Number(examForm.passingMarks),
      examDate: examForm.examDate || undefined,
    };

    try {
      const url = editingItem
        ? `${API}/exams/${editingItem._id}`
        : `${API}/exams`;

      await apiRequest(url, {
        method: editingItem ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      closeModal();
      setMessage(
        editingItem
          ? "Examination updated successfully."
          : "Examination created successfully."
      );

      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem(type, item) {
    const name =
      type === "sessions" ? item.sessionName : item.examName;

    if (!window.confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(`${API}/${type}/${item._id}`, {
        method: "DELETE",
      });

      setMessage(`${name} deleted successfully.`);
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  }

  const activeSession = sessions.find((item) => item.isActive);

  const availableClasses = classes.filter((item) => {
    const selectedSession = sessions.find(
      (session) => session._id === examForm.academicSession
    );

    return (
      !selectedSession ||
      item.academicSession === selectedSession.sessionName
    );
  });

  return (
    <div className="am-page">
      <header className="am-topbar">
        <div className="am-brand">
          <div className="am-brand-icon">
            <GraduationCap size={23} />
          </div>
          <div>
            <h2>AnkSetu</h2>
            <span>Academic Management</span>
          </div>
        </div>

        <button
          className="am-refresh"
          onClick={fetchData}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      <main className="am-main">
        <div className="am-heading">
          <div>
            <span className="am-eyebrow">ADMINISTRATION / ACADEMICS</span>
            <h1>Academic Management</h1>
            <p>Manage academic sessions and examinations.</p>
          </div>

          <button className="am-primary-btn" onClick={openAddModal}>
            <Plus size={18} />
            Add {activeTab === "sessions" ? "Session" : "Exam"}
          </button>
        </div>

        <div className="am-overview">
          <motion.div
            className="am-overview-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="am-icon purple">
              <CalendarDays size={22} />
            </div>
            <div>
              <span>Total Sessions</span>
              <strong>{sessions.length}</strong>
            </div>
          </motion.div>

          <motion.div
            className="am-overview-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="am-icon blue">
              <ClipboardList size={22} />
            </div>
            <div>
              <span>Total Examinations</span>
              <strong>{exams.length}</strong>
            </div>
          </motion.div>

          <motion.div
            className="am-overview-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <div className="am-icon green">
              <Clock3 size={22} />
            </div>
            <div>
              <span>Active Session</span>
              <strong className="am-active-name">
                {activeSession?.sessionName || "Not set"}
              </strong>
            </div>
          </motion.div>
        </div>

        <section className="am-panel">
          <div className="am-toolbar">
            <div className="am-tabs">
              <button
                className={activeTab === "sessions" ? "active" : ""}
                onClick={() => {
                  setActiveTab("sessions");
                  setSearch("");
                }}
              >
                <CalendarDays size={17} />
                Sessions
              </button>

              <button
                className={activeTab === "exams" ? "active" : ""}
                onClick={() => {
                  setActiveTab("exams");
                  setSearch("");
                }}
              >
                <ClipboardList size={17} />
                Examinations
              </button>
            </div>

            <div className="am-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  activeTab === "sessions"
                    ? "Search sessions..."
                    : "Search examinations..."
                }
              />
            </div>
          </div>

          {error && !modalOpen && (
            <div className="am-alert error">
              <AlertCircle size={17} />
              {error}
              <button onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}

          {message && (
            <div className="am-alert success">
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}

          {loading ? (
            <div className="am-loading">
              <RefreshCw className="am-spin" size={25} />
              <p>Loading academic information...</p>
            </div>
          ) : activeTab === "sessions" ? (
            <div className="am-table-wrap">
              <table className="am-table">
                <thead>
                  <tr>
                    <th>ACADEMIC SESSION</th>
                    <th>START DATE</th>
                    <th>END DATE</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="am-name">
                          <span className="am-row-icon">
                            <CalendarDays size={17} />
                          </span>
                          <strong>{item.sessionName}</strong>
                        </div>
                      </td>
                      <td>
                        {item.startDate
                          ? new Date(item.startDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        {item.endDate
                          ? new Date(item.endDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={`am-status ${
                            item.isActive ? "active" : "inactive"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="am-actions">
                          <button
                            title="Edit session"
                            onClick={() => openEditSession(item)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="delete"
                            title="Delete session"
                            onClick={() => deleteItem("sessions", item)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSessions.length === 0 && (
                <div className="am-empty">
                  <CalendarDays size={35} />
                  <h3>No academic sessions found</h3>
                  <p>Create an academic session to get started.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="am-table-wrap">
              <table className="am-table">
                <thead>
                  <tr>
                    <th>EXAMINATION</th>
                    <th>TYPE</th>
                    <th>CLASS</th>
                    <th>SESSION</th>
                    <th>MARKS</th>
                    <th>DATE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExams.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="am-name">
                          <span className="am-row-icon exam">
                            <ClipboardList size={17} />
                          </span>
                          <strong>{item.examName}</strong>
                        </div>
                      </td>
                      <td>{item.examType}</td>
                      <td>
                        {item.classId?.className || "—"}
                      </td>
                      <td>
                        {item.academicSession?.sessionName || "—"}
                      </td>
                      <td>
                        {item.maxMarks} / {item.passingMarks}
                      </td>
                      <td>
                        {item.examDate
                          ? new Date(item.examDate).toLocaleDateString("en-IN")
                          : "—"}
                      </td>
                      <td>
                        <div className="am-actions">
                          <button
                            title="Edit exam"
                            onClick={() => openEditExam(item)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="delete"
                            title="Delete exam"
                            onClick={() => deleteItem("exams", item)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredExams.length === 0 && (
                <div className="am-empty">
                  <ClipboardList size={35} />
                  <h3>No examinations found</h3>
                  <p>Create an examination for a class and session.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="am-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <motion.div
              className="am-modal"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <div className="am-modal-heading">
                <div>
                  <span>ACADEMIC MANAGEMENT</span>
                  <h2>
                    {activeTab === "sessions"
                      ? editingItem
                        ? "Edit Academic Session"
                        : "Create Academic Session"
                      : editingItem
                        ? "Edit Examination"
                        : "Create Examination"}
                  </h2>
                </div>
                <button onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="am-alert error">
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

              {activeTab === "sessions" ? (
                <form onSubmit={handleSessionSubmit}>
                  <label>
                    Session Name
                    <input
                      required
                      value={sessionForm.sessionName}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          sessionName: event.target.value,
                        })
                      }
                      placeholder="Example: 2026-2027"
                    />
                  </label>

                  <div className="am-form-grid">
                    <label>
                      Start Date
                      <input
                        type="date"
                        required
                        value={sessionForm.startDate}
                        onChange={(event) =>
                          setSessionForm({
                            ...sessionForm,
                            startDate: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      End Date
                      <input
                        type="date"
                        required
                        value={sessionForm.endDate}
                        min={sessionForm.startDate || undefined}
                        onChange={(event) =>
                          setSessionForm({
                            ...sessionForm,
                            endDate: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  <label className="am-checkbox">
                    <input
                      type="checkbox"
                      checked={sessionForm.isActive}
                      onChange={(event) =>
                        setSessionForm({
                          ...sessionForm,
                          isActive: event.target.checked,
                        })
                      }
                    />
                    Set as active academic session
                  </label>

                  <div className="am-modal-footer">
                    <button
                      type="button"
                      className="am-cancel"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="am-primary-btn"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingItem
                          ? "Save Changes"
                          : "Create Session"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleExamSubmit}>
                  <label>
                    Examination Name
                    <input
                      required
                      value={examForm.examName}
                      onChange={(event) =>
                        setExamForm({
                          ...examForm,
                          examName: event.target.value,
                        })
                      }
                      placeholder="Example: First Term Examination"
                    />
                  </label>

                  <div className="am-form-grid">
                    <label>
                      Exam Type
                      <select
                        value={examForm.examType}
                        onChange={(event) =>
                          setExamForm({
                            ...examForm,
                            examType: event.target.value,
                          })
                        }
                      >
                        {examTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Academic Session
                      <select
                        required
                        value={examForm.academicSession}
                        onChange={(event) =>
                          setExamForm({
                            ...examForm,
                            academicSession: event.target.value,
                            classId: "",
                          })
                        }
                      >
                        <option value="">Select session</option>
                        {sessions.map((session) => (
                          <option key={session._id} value={session._id}>
                            {session.sessionName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <label>
                    Class
                    <select
                      required
                      value={examForm.classId}
                      onChange={(event) =>
                        setExamForm({
                          ...examForm,
                          classId: event.target.value,
                        })
                      }
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
                    Examination Date
                    <input
                      type="date"
                      value={examForm.examDate}
                      onChange={(event) =>
                        setExamForm({
                          ...examForm,
                          examDate: event.target.value,
                        })
                      }
                    />
                  </label>

                  <div className="am-form-grid">
                    <label>
                      Maximum Marks
                      <input
                        type="number"
                        min="1"
                        required
                        value={examForm.maxMarks}
                        onChange={(event) =>
                          setExamForm({
                            ...examForm,
                            maxMarks: event.target.value,
                          })
                        }
                      />
                    </label>

                    <label>
                      Passing Marks
                      <input
                        type="number"
                        min="0"
                        required
                        value={examForm.passingMarks}
                        onChange={(event) =>
                          setExamForm({
                            ...examForm,
                            passingMarks: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>

                  <div className="am-modal-footer">
                    <button
                      type="button"
                      className="am-cancel"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="am-primary-btn"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingItem
                          ? "Save Changes"
                          : "Create Exam"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
