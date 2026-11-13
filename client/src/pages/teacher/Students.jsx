
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Search,
  Plus,
  Users,
  GraduationCap,
  UserRound,
  Pencil,
  Trash2,
  X,
  Filter,
  RefreshCw,
  Phone,
  CalendarDays,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import "./Students.css";

const API_URL = "http://localhost:5000/api/students";

const emptyForm = {
  fullName: "",
  studentId: "",
  rollNumber: "",
  className: "",
  section: "",
  academicSession: "2026-2027",
  dateOfBirth: "",
  gender: "",
  guardianName: "",
  guardianPhone: "",
  address: "",
  status: "Active",
};

function getToken() {
  return (
    localStorage.getItem("anksetuToken") ||
    sessionStorage.getItem("anksetuToken")
  );
}

function Students() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const headers = {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };

  const fetchStudents = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load students.");
      }

      setStudents(data.students || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const classes = useMemo(
    () => [...new Set(students.map((s) => s.className))].sort(),
    [students]
  );

  const sections = useMemo(
    () => [...new Set(students.map((s) => s.section))].sort(),
    [students]
  );

  const filteredStudents = students.filter((student) => {
    const query = search.toLowerCase();

    const matchesSearch =
      student.fullName?.toLowerCase().includes(query) ||
      student.studentId?.toLowerCase().includes(query) ||
      student.rollNumber?.toLowerCase().includes(query);

    const matchesClass =
      classFilter === "All" || student.className === classFilter;

    const matchesSection =
      sectionFilter === "All" || student.section === sectionFilter;

    const matchesStatus =
      statusFilter === "All" || student.status === statusFilter;

    return (
      matchesSearch &&
      matchesClass &&
      matchesSection &&
      matchesStatus
    );
  });

  const showMessage = (text) => {
    setMessage(text);
    setError("");
    setTimeout(() => setMessage(""), 3500);
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setForm(emptyForm);
    setModalOpen(true);
    setError("");
  };

  const openEditModal = (student) => {
    setEditingStudent(student);

    setForm({
      ...emptyForm,
      ...student,
      dateOfBirth: student.dateOfBirth
        ? new Date(student.dateOfBirth).toISOString().slice(0, 10)
        : "",
    });

    setModalOpen(true);
    setError("");
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingStudent(null);
    setForm(emptyForm);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = editingStudent
        ? `${API_URL}/${editingStudent._id}`
        : API_URL;

      const response = await fetch(url, {
        method: editingStudent ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to save student.");
      }

      setModalOpen(false);
      setEditingStudent(null);
      setForm(emptyForm);

      await fetchStudents();

      showMessage(
        editingStudent
          ? "Student updated successfully."
          : "Student added successfully."
      );
    } catch (err) {
      setError(err.message || "Unable to save student.");
    } finally {
      setSaving(false);
    }
  };

  const deleteStudent = async (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.fullName}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/${student._id}`, {
        method: "DELETE",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete student.");
      }

      setStudents((previous) =>
        previous.filter((item) => item._id !== student._id)
      );

      showMessage("Student deleted successfully.");
    } catch (err) {
      setError(err.message || "Unable to delete student.");
    }
  };

  const activeCount = students.filter(
    (student) => student.status === "Active"
  ).length;

  return (
    <div className="students-page">
      <div className="students-topbar">
        <button
          className="students-back-button"
          onClick={() => navigate("/teacher")}
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </button>

        <div className="students-brand">
          <div className="students-brand-icon">
            <GraduationCap size={23} />
          </div>
          <strong>AnkSetu</strong>
        </div>
      </div>

      <main className="students-main">
        <motion.div
          className="students-heading-section"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <span className="students-eyebrow">
              <span className="students-live-dot" />
              ACADEMIC WORKSPACE
            </span>

            <h1>Student Management</h1>

            <p>
              Manage student profiles, academic details and records
              in one place.
            </p>
          </div>

          <button
            className="students-add-button"
            onClick={openAddModal}
          >
            <Plus size={19} />
            Add New Student
          </button>
        </motion.div>

        {message && (
          <div className="students-toast success-toast">
            <CheckCircle2 size={18} />
            {message}
          </div>
        )}

        {error && !modalOpen && (
          <div className="students-toast error-toast">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <section className="students-stats">
          <div className="students-stat-card">
            <div className="students-stat-icon purple">
              <Users size={22} />
            </div>
            <div>
              <span>Total Students</span>
              <h2>{loading ? "—" : students.length}</h2>
              <small>Records in your accessible database</small>
            </div>
          </div>

          <div className="students-stat-card">
            <div className="students-stat-icon green">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span>Active Students</span>
              <h2>{loading ? "—" : activeCount}</h2>
              <small>Currently active records</small>
            </div>
          </div>

          <div className="students-stat-card">
            <div className="students-stat-icon blue">
              <BookOpen size={22} />
            </div>
            <div>
              <span>Classes</span>
              <h2>{loading ? "—" : classes.length}</h2>
              <small>Distinct classes represented</small>
            </div>
          </div>
        </section>

        <section className="students-record-panel">
          <div className="students-panel-heading">
            <div>
              <span className="students-panel-kicker">
                YOUR DATABASE
              </span>
              <h2>All Students</h2>
              <p>Search, filter and manage student information.</p>
            </div>

            <button
              className="students-refresh-button"
              onClick={fetchStudents}
              disabled={loading}
              title="Refresh students"
            >
              <RefreshCw
                size={17}
                className={loading ? "refresh-spinning" : ""}
              />
              Refresh
            </button>
          </div>

          <div className="students-filters">
            <label className="students-search">
              <Search size={19} />
              <input
                type="search"
                placeholder="Search name, student ID or roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <label className="students-filter">
              <Filter size={16} />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
              >
                <option value="All">All Classes</option>
                {classes.map((item) => (
                  <option key={item} value={item}>
                    Class {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="students-filter">
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
              >
                <option value="All">All Sections</option>
                {sections.map((item) => (
                  <option key={item} value={item}>
                    Section {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="students-filter">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>
          </div>

          <div className="students-table-container">
            {loading ? (
              <div className="students-loading">
                <LoaderCircle size={32} className="refresh-spinning" />
                <p>Loading student records...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="students-empty">
                <div className="students-empty-icon">
                  <UserRound size={30} />
                </div>
                <h3>
                  {students.length === 0
                    ? "No students added yet"
                    : "No matching students"}
                </h3>
                <p>
                  {students.length === 0
                    ? "Start building your student database by adding your first student."
                    : "Try changing your search or filters."}
                </p>
                {students.length === 0 && (
                  <button
                    className="students-add-button"
                    onClick={openAddModal}
                  >
                    <Plus size={18} />
                    Add First Student
                  </button>
                )}
              </div>
            ) : (
              <table className="students-data-table">
                <thead>
                  <tr>
                    <th>STUDENT</th>
                    <th>STUDENT ID</th>
                    <th>ROLL NO.</th>
                    <th>CLASS / SECTION</th>
                    <th>SESSION</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student, index) => (
                    <motion.tr
                      key={student._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.025 }}
                    >
                      <td>
                        <div className="students-name-cell">
                          <div className="students-row-avatar">
                            {student.fullName
                              ?.split(" ")
                              .map((part) => part[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <strong>{student.fullName}</strong>
                            <small>
                              {student.guardianName || "Guardian not added"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td className="students-id-cell">
                        {student.studentId}
                      </td>

                      <td>{student.rollNumber}</td>

                      <td>
                        Class {student.className} - {student.section}
                      </td>

                      <td>{student.academicSession}</td>

                      <td>
                        <span
                          className={`students-status ${
                            student.status === "Active"
                              ? "status-active"
                              : "status-inactive"
                          }`}
                        >
                          {student.status}
                        </span>
                      </td>

                      <td>
                        <div className="students-row-actions">
                          <button
                            onClick={() => openEditModal(student)}
                            title="Edit student"
                            aria-label={`Edit ${student.fullName}`}
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            className="delete-action"
                            onClick={() => deleteStudent(student)}
                            title="Delete student"
                            aria-label={`Delete ${student.fullName}`}
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="students-table-footer">
            <span>
              Showing {filteredStudents.length} of {students.length} students
            </span>
            <span>Connected to AnkSetu database</span>
          </div>
        </section>

        <footer className="students-footer">
          © 2026 AnkSetu · Making every learning journey count.
        </footer>
      </main>

      <AnimatePresence>
        {modalOpen && (
          <motion.div
            className="students-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal();
            }}
          >
            <motion.div
              className="students-modal"
              initial={{ opacity: 0, y: 25, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
            >
              <div className="students-modal-header">
                <div>
                  <span className="students-panel-kicker">
                    STUDENT PROFILE
                  </span>
                  <h2>
                    {editingStudent ? "Edit Student" : "Add New Student"}
                  </h2>
                  <p>
                    Enter the student's academic and personal details.
                  </p>
                </div>

                <button
                  className="students-modal-close"
                  onClick={closeModal}
                  disabled={saving}
                  aria-label="Close form"
                >
                  <X size={21} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="students-form-section">
                  <h3>
                    <UserRound size={17} />
                    Basic Information
                  </h3>

                  <div className="students-form-grid">
                    <label className="students-form-field full-field">
                      <span>Full Name *</span>
                      <input
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Enter student's full name"
                        required
                      />
                    </label>

                    <label className="students-form-field">
                      <span>Student ID *</span>
                      <input
                        name="studentId"
                        value={form.studentId}
                        onChange={handleChange}
                        placeholder="e.g. ANK002"
                        required
                        disabled={Boolean(editingStudent)}
                      />
                    </label>

                    <label className="students-form-field">
                      <span>Roll Number *</span>
                      <input
                        name="rollNumber"
                        value={form.rollNumber}
                        onChange={handleChange}
                        placeholder="e.g. 02"
                        required
                      />
                    </label>

                    <label className="students-form-field">
                      <span>Date of Birth</span>
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={form.dateOfBirth}
                        onChange={handleChange}
                      />
                    </label>

                    <label className="students-form-field">
                      <span>Gender</span>
                      <select
                        name="gender"
                        value={form.gender}
                        onChange={handleChange}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="students-form-section">
                  <h3>
                    <GraduationCap size={18} />
                    Academic Information
                  </h3>

                  <div className="students-form-grid">
                    <label className="students-form-field">
                      <span>Class *</span>
                      <input
                        name="className"
                        value={form.className}
                        onChange={handleChange}
                        placeholder="e.g. 8"
                        required
                      />
                    </label>

                    <label className="students-form-field">
                      <span>Section *</span>
                      <input
                        name="section"
                        value={form.section}
                        onChange={handleChange}
                        placeholder="e.g. A"
                        required
                      />
                    </label>

                    <label className="students-form-field">
                      <span>Academic Session *</span>
                      <input
                        name="academicSession"
                        value={form.academicSession}
                        onChange={handleChange}
                        placeholder="e.g. 2026-2027"
                        required
                      />
                    </label>

                    <label className="students-form-field">
                      <span>Status</span>
                      <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="students-form-section">
                  <h3>
                    <Phone size={17} />
                    Guardian Information
                  </h3>

                  <div className="students-form-grid">
                    <label className="students-form-field">
                      <span>Guardian Name</span>
                      <input
                        name="guardianName"
                        value={form.guardianName}
                        onChange={handleChange}
                        placeholder="Enter guardian's name"
                      />
                    </label>

                    <label className="students-form-field">
                      <span>Guardian Phone</span>
                      <input
                        type="tel"
                        name="guardianPhone"
                        value={form.guardianPhone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                      />
                    </label>

                    <label className="students-form-field full-field">
                      <span>Address</span>
                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder="Enter student's address"
                        rows="2"
                      />
                    </label>
                  </div>
                </div>

                {error && (
                  <div className="students-form-error">
                    <AlertCircle size={17} />
                    {error}
                  </div>
                )}

                <div className="students-modal-actions">
                  <button
                    type="button"
                    className="students-cancel-button"
                    onClick={closeModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="students-add-button"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <LoaderCircle size={17} className="refresh-spinning" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        {editingStudent ? "Save Changes" : "Add Student"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Students;
