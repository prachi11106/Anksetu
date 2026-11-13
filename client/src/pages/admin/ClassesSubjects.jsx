
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  GraduationCap,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Layers,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import "./ClassesSubjects.css";

const API = "http://localhost:5000/api/class-management";

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

export default function ClassesSubjects() {
  const [activeTab, setActiveTab] = useState("classes");
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const emptyClass = {
    className: "",
    academicSession: "",
    sections: "A, B",
    subjects: [],
  };

  const emptySubject = {
    subjectName: "",
    subjectCode: "",
  };

  const [classForm, setClassForm] = useState(emptyClass);
  const [subjectForm, setSubjectForm] = useState(emptySubject);

  async function fetchData() {
    setLoading(true);
    setError("");

    try {
      const [classData, subjectData] = await Promise.all([
        apiRequest(`${API}/classes`),
        apiRequest(`${API}/subjects`),
      ]);

      setClasses(classData.classes || []);
      setSubjects(subjectData.subjects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const filteredClasses = useMemo(
    () =>
      classes.filter((item) =>
        `${item.className} ${item.academicSession}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [classes, search]
  );

  const filteredSubjects = useMemo(
    () =>
      subjects.filter((item) =>
        `${item.subjectName} ${item.subjectCode || ""}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [subjects, search]
  );

  function openAddModal() {
    setEditingItem(null);
    setClassForm(emptyClass);
    setSubjectForm(emptySubject);
    setError("");
    setModalOpen(true);
  }

  function openEditClass(item) {
    setEditingItem(item);
    setClassForm({
      className: item.className || "",
      academicSession: item.academicSession || "",
      sections: (item.sections || []).join(", "),
      subjects: (item.subjects || []).map((subject) =>
        typeof subject === "object" ? subject._id : subject
      ),
    });
    setError("");
    setModalOpen(true);
  }

  function openEditSubject(item) {
    setEditingItem(item);
    setSubjectForm({
      subjectName: item.subjectName || "",
      subjectCode: item.subjectCode || "",
    });
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingItem(null);
  }

  function toggleSubject(subjectId) {
    setClassForm((previous) => ({
      ...previous,
      subjects: previous.subjects.includes(subjectId)
        ? previous.subjects.filter((id) => id !== subjectId)
        : [...previous.subjects, subjectId],
    }));
  }

  async function handleClassSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      className: classForm.className.trim(),
      academicSession: classForm.academicSession.trim(),
      sections: classForm.sections
        .split(",")
        .map((section) => section.trim().toUpperCase())
        .filter(Boolean),
      subjects: classForm.subjects,
    };

    try {
      const url = editingItem
        ? `${API}/classes/${editingItem._id}`
        : `${API}/classes`;

      await apiRequest(url, {
        method: editingItem ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      closeModal();
      setMessage(
        editingItem ? "Class updated successfully." : "Class created successfully."
      );
      await fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubjectSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      subjectName: subjectForm.subjectName.trim(),
      subjectCode: subjectForm.subjectCode.trim(),
    };

    try {
      const url = editingItem
        ? `${API}/subjects/${editingItem._id}`
        : `${API}/subjects`;

      await apiRequest(url, {
        method: editingItem ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });

      closeModal();
      setMessage(
        editingItem
          ? "Subject updated successfully."
          : "Subject created successfully."
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
      type === "classes" ? item.className : item.subjectName;

    if (!window.confirm(`Are you sure you want to delete ${name}?`)) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await apiRequest(
        `${API}/${type}/${item._id}`,
        { method: "DELETE" }
      );

      setMessage(`${name} deleted successfully.`);
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timeout);
  }, [message]);

  return (
    <div className="cs-page">
      <div className="cs-topbar">
        <div className="cs-brand">
          <div className="cs-brand-icon">
            <GraduationCap size={23} />
          </div>
          <div>
            <h2>AnkSetu</h2>
            <span>Academic Management</span>
          </div>
        </div>

        <button
          className="cs-refresh"
          onClick={fetchData}
          disabled={loading}
          title="Refresh data"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      <main className="cs-main">
        <div className="cs-heading">
          <div>
            <span className="cs-eyebrow">ADMINISTRATION / ACADEMICS</span>
            <h1>Classes & Subjects</h1>
            <p>Organise classes, sections and academic subjects.</p>
          </div>

          <button className="cs-primary-btn" onClick={openAddModal}>
            <Plus size={18} />
            Add {activeTab === "classes" ? "Class" : "Subject"}
          </button>
        </div>

        <div className="cs-stats">
          <motion.div
            className="cs-stat-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="cs-stat-icon purple">
              <GraduationCap size={22} />
            </div>
            <div>
              <span>Total Classes</span>
              <strong>{classes.length}</strong>
            </div>
          </motion.div>

          <motion.div
            className="cs-stat-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
          >
            <div className="cs-stat-icon blue">
              <BookOpen size={22} />
            </div>
            <div>
              <span>Total Subjects</span>
              <strong>{subjects.length}</strong>
            </div>
          </motion.div>

          <motion.div
            className="cs-stat-card"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <div className="cs-stat-icon green">
              <Layers size={22} />
            </div>
            <div>
              <span>Total Sections</span>
              <strong>
                {classes.reduce(
                  (sum, item) => sum + (item.sections?.length || 0),
                  0
                )}
              </strong>
            </div>
          </motion.div>
        </div>

        <div className="cs-content-card">
          <div className="cs-toolbar">
            <div className="cs-tabs">
              <button
                className={activeTab === "classes" ? "active" : ""}
                onClick={() => {
                  setActiveTab("classes");
                  setSearch("");
                }}
              >
                <GraduationCap size={17} />
                Classes
              </button>
              <button
                className={activeTab === "subjects" ? "active" : ""}
                onClick={() => {
                  setActiveTab("subjects");
                  setSearch("");
                }}
              >
                <BookOpen size={17} />
                Subjects
              </button>
            </div>

            <div className="cs-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  activeTab === "classes"
                    ? "Search classes or sessions..."
                    : "Search subjects or codes..."
                }
              />
            </div>
          </div>

          {error && !modalOpen && (
            <div className="cs-alert error">
              <AlertCircle size={17} />
              {error}
              <button onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}

          {message && (
            <div className="cs-alert success">
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}

          {loading ? (
            <div className="cs-loading">
              <RefreshCw className="cs-spin" size={25} />
              <p>Loading academic data...</p>
            </div>
          ) : activeTab === "classes" ? (
            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>CLASS</th>
                    <th>ACADEMIC SESSION</th>
                    <th>SECTIONS</th>
                    <th>SUBJECTS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="cs-class-name">
                          <span className="cs-row-icon">
                            <GraduationCap size={17} />
                          </span>
                          <strong>Class {item.className}</strong>
                        </div>
                      </td>
                      <td>{item.academicSession}</td>
                      <td>
                        <div className="cs-pills">
                          {(item.sections || []).map((section) => (
                            <span key={section}>{section}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {item.subjects?.length || 0} subjects
                      </td>
                      <td>
                        <div className="cs-actions">
                          <button
                            title="Edit class"
                            onClick={() => openEditClass(item)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="delete"
                            title="Delete class"
                            onClick={() => deleteItem("classes", item)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredClasses.length === 0 && (
                <div className="cs-empty">
                  <GraduationCap size={34} />
                  <h3>No classes found</h3>
                  <p>Create your first class to get started.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="cs-table-wrap">
              <table className="cs-table">
                <thead>
                  <tr>
                    <th>SUBJECT</th>
                    <th>SUBJECT CODE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubjects.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <div className="cs-class-name">
                          <span className="cs-row-icon subject">
                            <BookOpen size={17} />
                          </span>
                          <strong>{item.subjectName}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="cs-code">
                          {item.subjectCode || "—"}
                        </span>
                      </td>
                      <td>
                        <div className="cs-actions">
                          <button
                            title="Edit subject"
                            onClick={() => openEditSubject(item)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className="delete"
                            title="Delete subject"
                            onClick={() => deleteItem("subjects", item)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredSubjects.length === 0 && (
                <div className="cs-empty">
                  <BookOpen size={34} />
                  <h3>No subjects found</h3>
                  <p>Add subjects before assigning them to classes.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="cs-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeModal();
            }}
          >
            <motion.div
              className="cs-modal"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <div className="cs-modal-header">
                <div>
                  <span>ACADEMIC MANAGEMENT</span>
                  <h2>
                    {activeTab === "classes"
                      ? editingItem
                        ? "Edit Class"
                        : "Create Class"
                      : editingItem
                        ? "Edit Subject"
                        : "Add Subject"}
                  </h2>
                </div>
                <button onClick={closeModal}>
                  <X size={20} />
                </button>
              </div>

              {error && (
                <div className="cs-alert error">
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

              {activeTab === "classes" ? (
                <form onSubmit={handleClassSubmit}>
                  <label>
                    Class Name
                    <input
                      required
                      value={classForm.className}
                      onChange={(event) =>
                        setClassForm({
                          ...classForm,
                          className: event.target.value,
                        })
                      }
                      placeholder="Example: 8"
                    />
                  </label>

                  <label>
                    Academic Session
                    <input
                      required
                      value={classForm.academicSession}
                      onChange={(event) =>
                        setClassForm({
                          ...classForm,
                          academicSession: event.target.value,
                        })
                      }
                      placeholder="Example: 2026-2027"
                    />
                  </label>

                  <label>
                    Sections
                    <input
                      required
                      value={classForm.sections}
                      onChange={(event) =>
                        setClassForm({
                          ...classForm,
                          sections: event.target.value,
                        })
                      }
                      placeholder="A, B, C"
                    />
                    <small>Separate sections with commas.</small>
                  </label>

                  <div className="cs-subject-select">
                    <span>Assign Subjects</span>
                    {subjects.length === 0 ? (
                      <p>Add subjects first.</p>
                    ) : (
                      <div className="cs-subject-options">
                        {subjects.map((subject) => (
                          <label key={subject._id}>
                            <input
                              type="checkbox"
                              checked={classForm.subjects.includes(
                                subject._id
                              )}
                              onChange={() => toggleSubject(subject._id)}
                            />
                            {subject.subjectName}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="cs-modal-footer">
                    <button
                      type="button"
                      className="cs-cancel-btn"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cs-primary-btn"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingItem
                          ? "Save Changes"
                          : "Create Class"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleSubjectSubmit}>
                  <label>
                    Subject Name
                    <input
                      required
                      value={subjectForm.subjectName}
                      onChange={(event) =>
                        setSubjectForm({
                          ...subjectForm,
                          subjectName: event.target.value,
                        })
                      }
                      placeholder="Example: Mathematics"
                    />
                  </label>

                  <label>
                    Subject Code
                    <input
                      value={subjectForm.subjectCode}
                      onChange={(event) =>
                        setSubjectForm({
                          ...subjectForm,
                          subjectCode: event.target.value,
                        })
                      }
                      placeholder="Example: MAT801"
                    />
                  </label>

                  <div className="cs-modal-footer">
                    <button
                      type="button"
                      className="cs-cancel-btn"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="cs-primary-btn"
                      disabled={saving}
                    >
                      {saving
                        ? "Saving..."
                        : editingItem
                          ? "Save Changes"
                          : "Add Subject"}
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
