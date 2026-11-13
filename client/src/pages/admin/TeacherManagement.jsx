
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  UserRound,
  ShieldCheck,
  AlertCircle,
  X,
  CalendarDays,
  Eye,
  Filter,
  ChevronDown,
  Clock3,
  CheckCircle2,
  XCircle,
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
      .join("") || "T"
  );
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function TeacherManagement() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  const fetchTeachers = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }

      const response = await fetch(`${API}/admin/teachers`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to load teacher records.");
      }

      const list = Array.isArray(data.teachers)
        ? data.teachers
        : Array.isArray(data)
          ? data
          : [];

      setTeachers(list);
    } catch (err) {
      setError(err.message || "Unable to load teacher records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const matchesSearch =
        !query ||
        String(teacher.fullName || "").toLowerCase().includes(query) ||
        String(teacher.email || "").toLowerCase().includes(query) ||
        String(teacher.phone || "").toLowerCase().includes(query) ||
        String(teacher.organisation || "").toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        String(teacher.status || "").toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [teachers, search, statusFilter]);

  const approvedCount = teachers.filter(
    (teacher) => teacher.status === "approved"
  ).length;

  const pendingCount = teachers.filter(
    (teacher) => teacher.status === "pending"
  ).length;

  const rejectedCount = teachers.filter(
    (teacher) => teacher.status === "rejected"
  ).length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const statusLabel = (status) => {
    const value = String(status || "pending").toLowerCase();

    if (value === "approved") return "Approved";
    if (value === "rejected") return "Rejected";

    return "Pending";
  };

  const styles = `
    .tm-page {
      min-height: 100vh;
      padding: 30px;
      color: #202943;
      background: #f6f7fc;
      font-family: Inter, "Segoe UI", sans-serif;
    }

    .tm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 25px;
    }

    .tm-eyebrow {
      display: inline-block;
      margin-bottom: 8px;
      color: #7564d8;
      font-size: 10px;
      font-weight: 850;
      letter-spacing: 1.3px;
    }

    .tm-header h1 {
      margin: 0;
      color: #202943;
      font-size: 27px;
      font-weight: 850;
      letter-spacing: -0.8px;
    }

    .tm-header p {
      margin: 8px 0 0;
      color: #9299aa;
      font-size: 12px;
    }

    .tm-refresh {
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
    }

    .tm-refresh:hover {
      background: #5545b7;
    }

    .tm-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .tm-spin {
      animation: tm-rotate 1s linear infinite;
    }

    @keyframes tm-rotate {
      to { transform: rotate(360deg); }
    }

    .tm-alert {
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

    .tm-alert span { flex: 1; }

    .tm-alert button {
      display: grid;
      place-items: center;
      padding: 4px;
      color: inherit;
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    .tm-stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 22px;
    }

    .tm-stat {
      display: flex;
      align-items: center;
      gap: 13px;
      min-height: 100px;
      padding: 17px;
      background: white;
      border: 1px solid #edf0f6;
      border-radius: 15px;
      box-shadow: 0 5px 18px rgba(31,42,76,0.03);
    }

    .tm-stat-icon {
      width: 43px;
      height: 43px;
      display: grid;
      flex-shrink: 0;
      place-items: center;
      color: #725bd4;
      background: #f0edff;
      border-radius: 12px;
    }

    .tm-stat-icon.green {
      color: #29956d;
      background: #e8f8f0;
    }

    .tm-stat-icon.orange {
      color: #c17c32;
      background: #fff4e6;
    }

    .tm-stat-icon.red {
      color: #c65c68;
      background: #fff0f1;
    }

    .tm-stat span,
    .tm-stat strong,
    .tm-stat small {
      display: block;
    }

    .tm-stat span {
      margin-bottom: 5px;
      color: #8f97aa;
      font-size: 10px;
      font-weight: 650;
    }

    .tm-stat strong {
      color: #27324b;
      font-size: 24px;
      font-weight: 850;
    }

    .tm-stat small {
      margin-top: 4px;
      color: #a2a9b7;
      font-size: 9px;
    }

    .tm-card {
      overflow: hidden;
      background: white;
      border: 1px solid #edf0f6;
      border-radius: 16px;
      box-shadow: 0 5px 20px rgba(31,42,76,0.03);
    }

    .tm-card-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      padding: 21px 22px;
      border-bottom: 1px solid #f0f1f6;
    }

    .tm-heading-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tm-heading-icon {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      color: #6d5bce;
      background: #f0edff;
      border-radius: 10px;
    }

    .tm-card-heading h2 {
      margin: 0;
      color: #303b55;
      font-size: 15px;
      font-weight: 850;
    }

    .tm-card-heading p {
      margin: 6px 0 0;
      color: #999fb0;
      font-size: 10px;
    }

    .tm-count {
      padding: 7px 10px;
      color: #6656c8;
      background: #f0edff;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 800;
      white-space: nowrap;
    }

    .tm-toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 22px;
      border-bottom: 1px solid #f0f1f6;
    }

    .tm-search {
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

    .tm-search input {
      width: 100%;
      min-width: 0;
      border: 0;
      outline: 0;
      color: #46516a;
      background: transparent;
      font-size: 11px;
    }

    .tm-search input::placeholder { color: #a5abba; }

    .tm-filter {
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

    .tm-filter select {
      border: 0;
      outline: 0;
      color: #59637a;
      background: transparent;
      font-size: 10px;
      cursor: pointer;
    }

    .tm-reset {
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

    .tm-table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    .tm-table {
      width: 100%;
      min-width: 690px;
      border-collapse: collapse;
      text-align: left;
    }

    .tm-table thead { background: #fafbfe; }

    .tm-table th {
      padding: 13px 17px;
      color: #a0a6b6;
      border-bottom: 1px solid #f0f1f6;
      font-size: 9px;
      font-weight: 850;
      letter-spacing: 0.6px;
      white-space: nowrap;
    }

    .tm-table td {
      padding: 14px 17px;
      color: #68728a;
      border-bottom: 1px solid #f0f1f6;
      font-size: 10px;
      white-space: nowrap;
    }

    .tm-table tbody tr:hover { background: #fcfcff; }
    .tm-table tbody tr:last-child td { border-bottom: 0; }

    .tm-identity {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 190px;
    }

    .tm-avatar {
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

    .tm-name strong,
    .tm-name span {
      display: block;
    }

    .tm-name strong {
      color: #35405a;
      font-size: 11px;
    }

    .tm-name span {
      margin-top: 4px;
      color: #a0a7b6;
      font-size: 9px;
    }

    .tm-status {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 8px;
      border-radius: 7px;
      font-size: 9px;
      font-weight: 800;
    }

    .tm-status.approved {
      color: #27835f;
      background: #e9f8f0;
    }

    .tm-status.pending {
      color: #a66c24;
      background: #fff4e6;
    }

    .tm-status.rejected {
      color: #bd5b65;
      background: #fff0f1;
    }

    .tm-view {
      width: 31px;
      height: 31px;
      display: grid;
      place-items: center;
      color: #6656c8;
      background: #f0edff;
      border: 0;
      border-radius: 8px;
      cursor: pointer;
    }

    .tm-view:hover {
      color: white;
      background: #6656c8;
    }

    .tm-state {
      min-height: 250px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 9px;
      padding: 25px;
      color: #aaa2d8;
      text-align: center;
    }

    .tm-state-icon {
      width: 55px;
      height: 55px;
      display: grid;
      place-items: center;
      color: #6d5bce;
      background: #f0edff;
      border-radius: 16px;
    }

    .tm-state strong {
      color: #46516a;
      font-size: 12px;
    }

    .tm-state span {
      max-width: 350px;
      color: #9ba2b2;
      font-size: 10px;
      line-height: 1.6;
    }

    .tm-note {
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

    .tm-note svg { flex-shrink: 0; }

    .tm-note strong {
      display: block;
      color: #4d438c;
      font-size: 10px;
    }

    .tm-note p {
      margin: 5px 0 0;
      color: #8279b5;
      font-size: 9px;
      line-height: 1.6;
    }

    .tm-modal-backdrop {
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

    .tm-modal {
      width: min(540px, 100%);
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
      background: white;
      border-radius: 18px;
      box-shadow: 0 25px 80px rgba(12,20,42,0.2);
    }

    .tm-modal-heading {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .tm-modal-heading h2 {
      margin: 0;
      color: #27324b;
      font-size: 19px;
    }

    .tm-close {
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

    .tm-profile {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 19px 0;
      margin-top: 10px;
      border-bottom: 1px solid #f0f1f6;
    }

    .tm-profile-avatar {
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

    .tm-profile h3 {
      margin: 0 0 6px;
      color: #303b55;
      font-size: 15px;
    }

    .tm-profile span {
      color: #9299aa;
      font-size: 10px;
    }

    .tm-detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 11px;
      padding: 18px 0;
    }

    .tm-detail {
      min-width: 0;
      padding: 12px;
      background: #f8f9fc;
      border: 1px solid #edf0f6;
      border-radius: 10px;
    }

    .tm-detail span {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 7px;
      color: #969daf;
      font-size: 9px;
    }

    .tm-detail strong {
      display: block;
      overflow-wrap: anywhere;
      color: #46516a;
      font-size: 10px;
    }

    .tm-modal-footer {
      display: flex;
      justify-content: flex-end;
      padding-top: 14px;
      border-top: 1px solid #f0f1f6;
    }

    .tm-modal-footer button {
      padding: 9px 15px;
      color: white;
      background: #6656c8;
      border: 0;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    @media (max-width: 900px) {
      .tm-page { padding: 22px 17px; }
      .tm-stats { grid-template-columns: 1fr 1fr; }
      .tm-toolbar { flex-wrap: wrap; }
      .tm-search { flex-basis: 100%; }
    }

    @media (max-width: 560px) {
      .tm-page { padding: 19px 12px; }
      .tm-header {
        align-items: flex-start;
        flex-direction: column;
      }
      .tm-header h1 { font-size: 23px; }
      .tm-stats { grid-template-columns: 1fr 1fr; gap: 9px; }
      .tm-stat { min-height: 85px; padding: 11px; gap: 9px; }
      .tm-stat-icon { width: 36px; height: 36px; }
      .tm-stat strong { font-size: 20px; }
      .tm-card-heading {
        align-items: flex-start;
        flex-direction: column;
        padding: 17px;
      }
      .tm-toolbar { padding: 13px; }
      .tm-filter { flex: 1; }
      .tm-detail-grid { grid-template-columns: 1fr; }
    }
  `;

  return (
    <div className="tm-page">
      <style>{styles}</style>

      <div className="tm-header">
        <div>
          <span className="tm-eyebrow">INSTITUTION OVERVIEW</span>
          <h1>Teacher Directory</h1>
          <p>
            View teacher accounts and their registration status across your
            institution.
          </p>
        </div>

        <button
          className="tm-refresh"
          onClick={() => fetchTeachers(true)}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "tm-spin" : ""}
          />
          Refresh Directory
        </button>
      </div>

      {error && (
        <motion.div
          className="tm-alert"
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

      <section className="tm-stats">
        <div className="tm-stat">
          <div className="tm-stat-icon">
            <Users size={21} />
          </div>
          <div>
            <span>Total Teachers</span>
            <strong>{loading ? "—" : teachers.length}</strong>
            <small>All registered teacher accounts</small>
          </div>
        </div>

        <div className="tm-stat">
          <div className="tm-stat-icon green">
            <CheckCircle2 size={21} />
          </div>
          <div>
            <span>Approved</span>
            <strong>{loading ? "—" : approvedCount}</strong>
            <small>Approved teacher accounts</small>
          </div>
        </div>

        <div className="tm-stat">
          <div className="tm-stat-icon orange">
            <Clock3 size={21} />
          </div>
          <div>
            <span>Pending</span>
            <strong>{loading ? "—" : pendingCount}</strong>
            <small>Awaiting approval</small>
          </div>
        </div>

        <div className="tm-stat">
          <div className="tm-stat-icon red">
            <XCircle size={21} />
          </div>
          <div>
            <span>Rejected</span>
            <strong>{loading ? "—" : rejectedCount}</strong>
            <small>Rejected registrations</small>
          </div>
        </div>
      </section>

      <section className="tm-card">
        <div className="tm-card-heading">
          <div>
            <div className="tm-heading-title">
              <span className="tm-heading-icon">
                <Users size={19} />
              </span>
              <h2>Institution Teacher Directory</h2>
            </div>
            <p>Search and inspect teacher account information.</p>
          </div>

          <span className="tm-count">
            {loading ? "Loading..." : `${filteredTeachers.length} Records`}
          </span>
        </div>

        <div className="tm-toolbar">
          <div className="tm-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone or institution..."
            />
          </div>

          <div className="tm-filter">
            <Filter size={15} />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter by teacher status"
            >
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
            <ChevronDown size={14} />
          </div>

          {(search || statusFilter !== "all") && (
            <button className="tm-reset" onClick={clearFilters}>
              Reset
            </button>
          )}
        </div>

        {loading ? (
          <div className="tm-state">
            <RefreshCw size={25} className="tm-spin" />
            <strong>Loading teacher directory...</strong>
            <span>Retrieving teacher records from the database.</span>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="tm-state">
            <div className="tm-state-icon">
              <Users size={26} />
            </div>
            <strong>
              {teachers.length === 0
                ? "No teacher records found"
                : "No matching teachers"}
            </strong>
            <span>
              {teachers.length === 0
                ? "Teacher registrations for this institution will appear here."
                : "Try changing your search or status filter."}
            </span>
          </div>
        ) : (
          <div className="tm-table-wrap">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>TEACHER</th>
                  <th>CONTACT</th>
                  <th>REGISTERED</th>
                  <th>STATUS</th>
                  <th>PROFILE</th>
                </tr>
              </thead>

              <tbody>
                {filteredTeachers.map((teacher, index) => {
                  const status = String(
                    teacher.status || "pending"
                  ).toLowerCase();

                  return (
                    <motion.tr
                      key={teacher._id || index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(index * 0.025, 0.25) }}
                    >
                      <td>
                        <div className="tm-identity">
                          <div className="tm-avatar">
                            {getInitials(teacher.fullName)}
                          </div>
                          <div className="tm-name">
                            <strong>{teacher.fullName || "Unnamed Teacher"}</strong>
                            <span>{teacher.organisation || "Institution not provided"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        {teacher.email || teacher.phone || "No contact details"}
                      </td>

                      <td>{formatDate(teacher.createdAt)}</td>

                      <td>
                        <span className={`tm-status ${status}`}>
                          {status === "approved" ? (
                            <CheckCircle2 size={12} />
                          ) : status === "rejected" ? (
                            <XCircle size={12} />
                          ) : (
                            <Clock3 size={12} />
                          )}
                          {statusLabel(status)}
                        </span>
                      </td>

                      <td>
                        <button
                          className="tm-view"
                          onClick={() => setSelectedTeacher(teacher)}
                          title="View teacher profile"
                          aria-label={`View ${teacher.fullName || "teacher"} profile`}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="tm-note">
        <ShieldCheck size={18} />
        <div>
          <strong>Read-only administrator access</strong>
          <p>
            This directory displays teacher records belonging to your
            institution. Administrators can monitor account information and
            registration status but cannot approve, reject, edit, or delete
            teacher accounts from this page.
          </p>
        </div>
      </div>

      <AnimatePresence>
        {selectedTeacher && (
          <div
            className="tm-modal-backdrop"
            onClick={() => setSelectedTeacher(null)}
          >
            <motion.div
              className="tm-modal"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="tm-modal-heading">
                <div>
                  <span className="tm-eyebrow">TEACHER RECORD</span>
                  <h2>Teacher Profile</h2>
                </div>

                <button
                  className="tm-close"
                  onClick={() => setSelectedTeacher(null)}
                  aria-label="Close profile"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="tm-profile">
                <div className="tm-profile-avatar">
                  {getInitials(selectedTeacher.fullName)}
                </div>
                <div>
                  <h3>{selectedTeacher.fullName || "Unnamed Teacher"}</h3>
                  <span>
                    {statusLabel(selectedTeacher.status)} teacher account
                  </span>
                </div>
              </div>

              <div className="tm-detail-grid">
                <div className="tm-detail">
                  <span><Mail size={14} /> Email address</span>
                  <strong>{selectedTeacher.email || "Not provided"}</strong>
                </div>

                <div className="tm-detail">
                  <span><Phone size={14} /> Phone number</span>
                  <strong>{selectedTeacher.phone || "Not provided"}</strong>
                </div>

                <div className="tm-detail">
                  <span><Building2 size={14} /> Institution</span>
                  <strong>{selectedTeacher.organisation || "Not provided"}</strong>
                </div>

                <div className="tm-detail">
                  <span><CalendarDays size={14} /> Registered on</span>
                  <strong>{formatDate(selectedTeacher.createdAt)}</strong>
                </div>

                <div className="tm-detail">
                  <span><UserRound size={14} /> Account role</span>
                  <strong>{selectedTeacher.role || "Teacher"}</strong>
                </div>

                <div className="tm-detail">
                  <span><ShieldCheck size={14} /> Account status</span>
                  <strong>{statusLabel(selectedTeacher.status)}</strong>
                </div>
              </div>

              <div className="tm-modal-footer">
                <button onClick={() => setSelectedTeacher(null)}>
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

export default TeacherManagement;
