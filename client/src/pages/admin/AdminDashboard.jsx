import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardList,
  FileText,
  CalendarDays,
  RefreshCw,
  AlertCircle,
  Activity,
  ShieldCheck,
  BarChart3,
  PieChart,
  LogOut,
} from "lucide-react";


const API = "http://localhost:5000/api";

function getToken() {
  return (
    localStorage.getItem("anksetuToken") ||
    sessionStorage.getItem("anksetuToken")
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

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("anksetuToken");
    localStorage.removeItem("anksetuUser");

    sessionStorage.removeItem("anksetuToken");
    sessionStorage.removeItem("anksetuUser");

    navigate("/", { replace: true });
  };
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchOverview = useCallback(async (isRefresh = false) => {
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

      const response = await fetch(`${API}/admin/overview`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load dashboard.");
      }

      if (!data.success || !data.overview) {
        throw new Error("The server returned an unexpected dashboard response.");
      }

      setOverview(data.overview);
    } catch (err) {
      setError(err.message || "Unable to load institution analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const summary = overview?.summary || {};
  const performance = overview?.performance || {};
  const attendance = overview?.attendance || {};

  const studentsByClass = overview?.studentsByClass || [];
  const subjectPerformance = overview?.subjectPerformance || [];
  const recentResults = overview?.recentResults || [];

  const totalStudents = summary.totalStudents || 0;
  const totalTeachers = summary.totalTeachers || 0;

  const activeStudentPercentage =
    totalStudents > 0
      ? (summary.activeStudents / totalStudents) * 100
      : 0;

  const maxClassStrength = useMemo(
    () =>
      Math.max(
        1,
        ...studentsByClass.map((item) => item.studentCount || 0)
      ),
    [studentsByClass]
  );

  const styles = `
    .ad-page {
      min-height: 100vh;
      padding: 30px;
      background: #f6f7fc;
      color: #202943;
      font-family: Inter, "Segoe UI", sans-serif;
    }

    .ad-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 25px;
    }
          .ad-logout {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 15px;
      color: #c34f5c;
      background: #fff0f1;
      border: 1px solid #ffdadd;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .ad-logout:hover {
      color: white;
      background: #c34f5c;
    }

    @media (max-width: 520px) {
      .ad-header-actions {
        flex-wrap: wrap;
      }

      .ad-header-actions .ad-refresh,
      .ad-header-actions .ad-logout {
        width: auto;
        flex: 1;
      }
    }

    .ad-eyebrow {
      display: inline-block;
      margin-bottom: 8px;
      color: #7564d8;
      font-size: 10px;
      font-weight: 850;
      letter-spacing: 1.3px;
    }

    .ad-header h1 {
      margin: 0;
      color: #202943;
      font-size: 27px;
      font-weight: 850;
      letter-spacing: -0.8px;
    }

    .ad-header p {
      margin: 8px 0 0;
      color: #9299aa;
      font-size: 12px;
    }

    .ad-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .ad-refresh {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 11px 15px;
      color: white;
      background: #6656c8;
      border: 0;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
    }

    .ad-refresh:hover { background: #5545b7; }

    .ad-refresh:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .ad-spin {
      animation: ad-rotate 1s linear infinite;
    }

    @keyframes ad-rotate {
      to { transform: rotate(360deg); }
    }

    .ad-alert {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 15px;
      margin-bottom: 20px;
      color: #a4434e;
      background: #fff0f1;
      border: 1px solid #ffdadd;
      border-radius: 10px;
      font-size: 11px;
    }

    .ad-alert span { flex: 1; }

    .ad-retry {
      padding: 7px 11px;
      color: white;
      background: #bd5b65;
      border: 0;
      border-radius: 7px;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    .ad-welcome {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding: 24px 27px;
      margin-bottom: 22px;
      color: white;
      background: linear-gradient(115deg, #37316e, #6656c8 65%, #8b78e6);
      border-radius: 17px;
      box-shadow: 0 10px 28px rgba(91,75,181,0.17);
    }

    .ad-welcome::after {
      content: "";
      position: absolute;
      width: 210px;
      height: 210px;
      top: -105px;
      right: 80px;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 50%;
      box-shadow: 0 0 0 25px rgba(255,255,255,0.035),
                  0 0 0 50px rgba(255,255,255,0.025);
    }

    .ad-welcome-content {
      position: relative;
      z-index: 1;
    }

    .ad-welcome-label {
      color: #d6d0ff;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .ad-welcome h2 {
      margin: 8px 0 6px;
      font-size: 21px;
      font-weight: 850;
    }

    .ad-welcome p {
      max-width: 550px;
      margin: 0;
      color: #e0dcff;
      font-size: 11px;
      line-height: 1.7;
    }

    .ad-welcome-icon {
      position: relative;
      z-index: 1;
      width: 57px;
      height: 57px;
      display: grid;
      flex-shrink: 0;
      place-items: center;
      color: white;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 16px;
    }

    .ad-section-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 24px 0 13px;
    }

    .ad-section-heading h2 {
      margin: 0;
      color: #303b55;
      font-size: 14px;
      font-weight: 850;
    }

    .ad-section-heading span {
      color: #9aa1b1;
      font-size: 10px;
    }

    .ad-stat-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .ad-stat {
      display: flex;
      align-items: center;
      gap: 13px;
      min-height: 105px;
      padding: 17px;
      background: white;
      border: 1px solid #edf0f6;
      border-radius: 15px;
      box-shadow: 0 5px 18px rgba(31,42,76,0.03);
    }

    .ad-stat-icon {
      width: 43px;
      height: 43px;
      display: grid;
      flex-shrink: 0;
      place-items: center;
      color: #725bd4;
      background: #f0edff;
      border-radius: 12px;
    }

    .ad-stat-icon.green {
      color: #29956d;
      background: #e8f8f0;
    }

    .ad-stat-icon.blue {
      color: #4389c9;
      background: #eaf4ff;
    }

    .ad-stat-icon.orange {
      color: #c17c32;
      background: #fff4e6;
    }

    .ad-stat-icon.red {
      color: #c65c68;
      background: #fff0f1;
    }

    .ad-stat-text span,
    .ad-stat-text strong,
    .ad-stat-text small {
      display: block;
    }

    .ad-stat-text span {
      margin-bottom: 5px;
      color: #8f97aa;
      font-size: 10px;
      font-weight: 650;
    }

    .ad-stat-text strong {
      color: #27324b;
      font-size: 23px;
      font-weight: 850;
    }

    .ad-stat-text small {
      margin-top: 4px;
      color: #a2a9b7;
      font-size: 9px;
    }

    .ad-two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 17px;
    }

    .ad-panel {
      min-width: 0;
      padding: 20px;
      background: white;
      border: 1px solid #edf0f6;
      border-radius: 15px;
      box-shadow: 0 5px 18px rgba(31,42,76,0.03);
    }

    .ad-panel-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 19px;
    }

    .ad-panel-title {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .ad-panel-icon {
      width: 35px;
      height: 35px;
      display: grid;
      place-items: center;
      color: #6d5bce;
      background: #f0edff;
      border-radius: 9px;
    }

    .ad-panel-title h3 {
      margin: 0;
      color: #303b55;
      font-size: 12px;
      font-weight: 850;
    }

    .ad-panel-title p {
      margin: 4px 0 0;
      color: #a0a6b6;
      font-size: 9px;
    }

    .ad-panel-tag {
      padding: 6px 9px;
      color: #6656c8;
      background: #f0edff;
      border-radius: 20px;
      font-size: 9px;
      font-weight: 800;
    }

    .ad-performance-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .ad-performance-box {
      padding: 14px;
      background: #f9f9fd;
      border: 1px solid #f0f1f6;
      border-radius: 11px;
    }

    .ad-performance-box span {
      display: block;
      margin-bottom: 8px;
      color: #969daf;
      font-size: 9px;
    }

    .ad-performance-box strong {
      color: #303b55;
      font-size: 21px;
      font-weight: 850;
    }

    .ad-progress {
      height: 7px;
      overflow: hidden;
      margin-top: 12px;
      background: #e9eaf2;
      border-radius: 10px;
    }

    .ad-progress-fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #6656c8, #9b8bea);
      transition: width 0.4s ease;
    }

    .ad-progress-fill.green {
      background: linear-gradient(90deg, #2d9b70, #70cba5);
    }

    .ad-progress-fill.orange {
      background: linear-gradient(90deg, #d58a3a, #f2bc78);
    }

    .ad-status-list {
      display: grid;
      gap: 12px;
      margin-top: 18px;
    }

    .ad-status-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      color: #7c859a;
      font-size: 10px;
    }

    .ad-status-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .ad-status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #42ad7e;
    }

    .ad-status-dot.orange { background: #e2a24d; }
    .ad-status-dot.red { background: #d46d78; }

    .ad-status-row strong {
      color: #35405a;
      font-size: 11px;
    }

    .ad-class-list {
      display: grid;
      gap: 15px;
    }

    .ad-class-row {
      display: grid;
      gap: 7px;
    }

    .ad-class-label {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      color: #6e7890;
      font-size: 10px;
    }

    .ad-class-label strong {
      color: #35405a;
      font-size: 10px;
    }

    .ad-class-track {
      height: 8px;
      overflow: hidden;
      background: #f0f1f6;
      border-radius: 10px;
    }

    .ad-class-fill {
      height: 100%;
      background: linear-gradient(90deg, #6656c8, #9b8bea);
      border-radius: 10px;
      transition: width 0.4s ease;
    }

    .ad-subject-list {
      display: grid;
      gap: 13px;
    }

    .ad-subject-row {
      display: grid;
      grid-template-columns: minmax(90px, 1fr) 2fr 42px;
      align-items: center;
      gap: 10px;
    }

    .ad-subject-name {
      overflow: hidden;
      color: #667189;
      font-size: 10px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ad-subject-track {
      height: 8px;
      overflow: hidden;
      background: #f0f1f6;
      border-radius: 10px;
    }

    .ad-subject-fill {
      height: 100%;
      background: linear-gradient(90deg, #3c9c83, #83cdb1);
      border-radius: 10px;
    }

    .ad-subject-value {
      color: #35405a;
      font-size: 10px;
      font-weight: 850;
      text-align: right;
    }

    .ad-table-wrap {
      width: 100%;
      overflow-x: auto;
    }

    .ad-table {
      width: 100%;
      min-width: 600px;
      border-collapse: collapse;
      text-align: left;
    }

    .ad-table th {
      padding: 12px 14px;
      color: #a0a6b6;
      background: #fafbfe;
      border-bottom: 1px solid #f0f1f6;
      font-size: 9px;
      font-weight: 850;
      letter-spacing: 0.5px;
    }

    .ad-table td {
      padding: 13px 14px;
      color: #68728a;
      border-bottom: 1px solid #f0f1f6;
      font-size: 10px;
    }

    .ad-table tbody tr:last-child td { border-bottom: 0; }

    .ad-table strong {
      color: #35405a;
      font-size: 10px;
    }

    .ad-empty {
      min-height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #9ba2b2;
      font-size: 10px;
      text-align: center;
    }

    .ad-section-chip {
      display: inline-block;
      padding: 4px 7px;
      color: #6656c8;
      background: #f0edff;
      border-radius: 6px;
      font-size: 9px;
      font-weight: 800;
    }

    .ad-footer-note {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 14px 16px;
      margin-top: 19px;
      color: #6d5bce;
      background: #f0edff;
      border: 1px solid #e8e3ff;
      border-radius: 11px;
    }

    .ad-footer-note svg { flex-shrink: 0; }

    .ad-footer-note strong {
      display: block;
      color: #4d438c;
      font-size: 10px;
    }

    .ad-footer-note p {
      margin: 5px 0 0;
      color: #8279b5;
      font-size: 9px;
      line-height: 1.6;
    }

    .ad-loading {
      min-height: 350px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #8a7cdb;
    }

    .ad-loading strong {
      color: #46516a;
      font-size: 12px;
    }

    .ad-loading span {
      color: #9ba2b2;
      font-size: 10px;
    }

    @media (max-width: 1100px) {
      .ad-stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 760px) {
      .ad-page { padding: 22px 16px; }
      .ad-two-columns { grid-template-columns: 1fr; }
      .ad-welcome { padding: 20px; }
    }

    @media (max-width: 520px) {
      .ad-page { padding: 18px 12px; }
      .ad-header {
        align-items: flex-start;
        flex-direction: column;
      }
      .ad-header h1 { font-size: 23px; }
      .ad-header-actions { width: 100%; }
      .ad-refresh { width: 100%; }
      .ad-stat-grid { gap: 9px; }
      .ad-stat {
        min-height: 85px;
        gap: 9px;
        padding: 11px;
      }
      .ad-stat-icon { width: 36px; height: 36px; }
      .ad-stat-text strong { font-size: 19px; }
      .ad-stat-text span { font-size: 9px; }
      .ad-welcome h2 { font-size: 17px; }
      .ad-welcome-icon { width: 43px; height: 43px; }
      .ad-panel { padding: 15px; }
      .ad-performance-grid { gap: 8px; }
      .ad-performance-box { padding: 11px; }
    }
  `;

  if (loading) {
    return (
      <div className="ad-page">
        <style>{styles}</style>
        <div className="ad-loading">
          <RefreshCw size={30} className="ad-spin" />
          <strong>Loading institution dashboard...</strong>
          <span>Fetching live information from AnkSetu.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ad-page">
      <style>{styles}</style>

      <header className="ad-header">
        <div>
          <span className="ad-eyebrow">ANKSETU ADMINISTRATION</span>
          <h1>Institution Overview</h1>
          <p>
            Monitor your institution's academic activity and overall progress.
          </p>
        </div>

        <div className="ad-header-actions">
          <button
            className="ad-refresh"
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "ad-spin" : ""}
            />
            Refresh Data
          </button>

          <button
            className="ad-logout"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {error && (
        <div className="ad-alert">
          <AlertCircle size={17} />
          <span>{error}</span>
          <button
            className="ad-retry"
            onClick={() => fetchOverview(true)}
          >
            Retry
          </button>
        </div>
      )}

      <section className="ad-welcome">
        <div className="ad-welcome-content">
          <span className="ad-welcome-label">
            INSTITUTION-WIDE MONITORING
          </span>
          <h2>Welcome to AnkSetu Overview</h2>
          <p>
            Track student records, teacher accounts, academic performance,
            attendance and examination activity from one place.
          </p>
        </div>
        <div className="ad-welcome-icon">
          <ShieldCheck size={29} />
        </div>
      </section>

      <div className="ad-section-heading">
        <h2>Institution Statistics</h2>
        <span>Live database records</span>
      </div>

      <section className="ad-stat-grid">
        <div className="ad-stat">
          <div className="ad-stat-icon">
            <GraduationCap size={21} />
          </div>
          <div className="ad-stat-text">
            <span>Total Students</span>
            <strong>{formatNumber(summary.totalStudents)}</strong>
            <small>{formatNumber(summary.activeStudents)} active students</small>
          </div>
        </div>

        <div className="ad-stat">
          <div className="ad-stat-icon blue">
            <Users size={21} />
          </div>
          <div className="ad-stat-text">
            <span>Total Teachers</span>
            <strong>{formatNumber(summary.totalTeachers)}</strong>
            <small>{formatNumber(summary.approvedTeachers)} approved</small>
          </div>
        </div>

        <div className="ad-stat">
          <div className="ad-stat-icon green">
            <BookOpen size={21} />
          </div>
          <div className="ad-stat-text">
            <span>Total Classes</span>
            <strong>{formatNumber(summary.totalClasses)}</strong>
            <small>{formatNumber(summary.totalSubjects)} subjects</small>
          </div>
        </div>

        <div className="ad-stat">
          <div className="ad-stat-icon orange">
            <ClipboardList size={21} />
          </div>
          <div className="ad-stat-text">
            <span>Total Examinations</span>
            <strong>{formatNumber(summary.totalExams)}</strong>
            <small>{formatNumber(summary.totalSessions)} academic sessions</small>
          </div>
        </div>

        <div className="ad-stat">
          <div className="ad-stat-icon blue">
            <FileText size={21} />
          </div>
          <div className="ad-stat-text">
            <span>Generated Results</span>
            <strong>{formatNumber(summary.totalResults)}</strong>
            <small>Saved result records</small>
          </div>
        </div>

        <div className="ad-stat">
          <div className="ad-stat-icon green">
            <Activity size={21} />
          </div>
          <div className="ad-stat-text">
            <span>Marks Records</span>
            <strong>{formatNumber(summary.totalMarksRecords)}</strong>
            <small>Saved marks entries</small>
          </div>
        </div>

        <div className="ad-stat">
          <div className="ad-stat-icon orange">
            <CalendarDays size={21} />
          </div>
          <div className="ad-stat-text">
            <span>Active Sessions</span>
            <strong>{formatNumber(summary.activeSessions)}</strong>
            <small>Out of {formatNumber(summary.totalSessions)} sessions</small>
          </div>
        </div>

        <div className="ad-stat">
          <div className="ad-stat-icon red">
            <Users size={21} />
          </div>
          <div className="ad-stat-text">
            <span>Inactive Students</span>
            <strong>{formatNumber(summary.inactiveStudents)}</strong>
            <small>Student records marked inactive</small>
          </div>
        </div>
      </section>

      <div className="ad-section-heading">
        <h2>Academic Performance</h2>
        <span>Based on generated results</span>
      </div>

      <section className="ad-two-columns">
        <div className="ad-panel">
          <div className="ad-panel-heading">
            <div className="ad-panel-title">
              <span className="ad-panel-icon">
                <BarChart3 size={18} />
              </span>
              <div>
                <h3>Result Performance</h3>
                <p>Institution-wide result summary</p>
              </div>
            </div>
            <span className="ad-panel-tag">Results</span>
          </div>

          <div className="ad-performance-grid">
            <div className="ad-performance-box">
              <span>Pass Percentage</span>
              <strong>{Number(performance.passPercentage || 0).toFixed(1)}%</strong>
              <div className="ad-progress">
                <div
                  className="ad-progress-fill green"
                  style={{
                    width: `${Math.min(100, Math.max(0, performance.passPercentage || 0))}%`,
                  }}
                />
              </div>
            </div>

            <div className="ad-performance-box">
              <span>Average Class Percentage</span>
              <strong>
                {Number(performance.averageClassPercentage || 0).toFixed(1)}%
              </strong>
              <div className="ad-progress">
                <div
                  className="ad-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.max(0, performance.averageClassPercentage || 0))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="ad-status-list">
            <div className="ad-status-row">
              <div className="ad-status-left">
                <span className="ad-status-dot" />
                Students passed
              </div>
              <strong>{formatNumber(performance.totalPass)}</strong>
            </div>

            <div className="ad-status-row">
              <div className="ad-status-left">
                <span className="ad-status-dot red" />
                Students failed
              </div>
              <strong>{formatNumber(performance.totalFail)}</strong>
            </div>

            <div className="ad-status-row">
              <div className="ad-status-left">
                <span className="ad-status-dot orange" />
                Total evaluated
              </div>
              <strong>{formatNumber(performance.totalEvaluated)}</strong>
            </div>
          </div>
        </div>

        <div className="ad-panel">
          <div className="ad-panel-heading">
            <div className="ad-panel-title">
              <span className="ad-panel-icon">
                <PieChart size={18} />
              </span>
              <div>
                <h3>Attendance Overview</h3>
                <p>Based on saved marks records</p>
              </div>
            </div>
            <span className="ad-panel-tag">Attendance</span>
          </div>

          <div className="ad-performance-grid">
            <div className="ad-performance-box">
              <span>Attendance Percentage</span>
              <strong>
                {Number(attendance.attendancePercentage || 0).toFixed(1)}%
              </strong>
              <div className="ad-progress">
                <div
                  className="ad-progress-fill green"
                  style={{
                    width: `${Math.min(100, Math.max(0, attendance.attendancePercentage || 0))}%`,
                  }}
                />
              </div>
            </div>

            <div className="ad-performance-box">
              <span>Total Attendance Entries</span>
              <strong>{formatNumber(attendance.totalAttendance)}</strong>
              <small>Present + absent entries</small>
            </div>
          </div>

          <div className="ad-status-list">
            <div className="ad-status-row">
              <div className="ad-status-left">
                <span className="ad-status-dot" />
                Present entries
              </div>
              <strong>{formatNumber(attendance.totalPresent)}</strong>
            </div>

            <div className="ad-status-row">
              <div className="ad-status-left">
                <span className="ad-status-dot red" />
                Absent entries
              </div>
              <strong>{formatNumber(attendance.totalAbsent)}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="ad-section-heading">
        <h2>Teacher Accounts</h2>
        <span>Registration status</span>
      </div>

      <section className="ad-panel">
        <div className="ad-panel-heading">
          <div className="ad-panel-title">
            <span className="ad-panel-icon">
              <Users size={18} />
            </span>
            <div>
              <h3>Teacher Registration Overview</h3>
              <p>Current account distribution</p>
            </div>
          </div>
          <span className="ad-panel-tag">
            {formatNumber(totalTeachers)} Teachers
          </span>
        </div>

        <div className="ad-performance-grid">
          <div className="ad-performance-box">
            <span>Approved Teachers</span>
            <strong>{formatNumber(summary.approvedTeachers)}</strong>
            <div className="ad-progress">
              <div
                className="ad-progress-fill green"
                style={{
                  width: `${totalTeachers ? (summary.approvedTeachers / totalTeachers) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="ad-performance-box">
            <span>Pending Teachers</span>
            <strong>{formatNumber(summary.pendingTeachers)}</strong>
            <div className="ad-progress">
              <div
                className="ad-progress-fill orange"
                style={{
                  width: `${totalTeachers ? (summary.pendingTeachers / totalTeachers) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="ad-performance-box">
            <span>Rejected Teachers</span>
            <strong>{formatNumber(summary.rejectedTeachers)}</strong>
            <div className="ad-progress">
              <div
                className="ad-progress-fill"
                style={{
                  width: `${totalTeachers ? (summary.rejectedTeachers / totalTeachers) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="ad-performance-box">
            <span>Active Student Records</span>
            <strong>{Number(activeStudentPercentage).toFixed(1)}%</strong>
            <div className="ad-progress">
              <div
                className="ad-progress-fill green"
                style={{ width: `${activeStudentPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="ad-section-heading">
        <h2>Student Distribution</h2>
        <span>Active students by class and section</span>
      </div>

      <section className="ad-panel">
        <div className="ad-panel-heading">
          <div className="ad-panel-title">
            <span className="ad-panel-icon">
              <GraduationCap size={18} />
            </span>
            <div>
              <h3>Class Strength</h3>
              <p>Student count from the database</p>
            </div>
          </div>
          <span className="ad-panel-tag">
            {studentsByClass.length} Groups
          </span>
        </div>

        {studentsByClass.length === 0 ? (
          <div className="ad-empty">No active student distribution data available.</div>
        ) : (
          <div className="ad-class-list">
            {studentsByClass.map((item, index) => (
              <div
                className="ad-class-row"
                key={`${item.className}-${item.section}-${index}`}
              >
                <div className="ad-class-label">
                  <span>
                    {item.className || "Class not specified"} · Section{" "}
                    {item.section || "—"}
                  </span>
                  <strong>{formatNumber(item.studentCount)}</strong>
                </div>
                <div className="ad-class-track">
                  <div
                    className="ad-class-fill"
                    style={{
                      width: `${Math.min(100, (item.studentCount / maxClassStrength) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="ad-section-heading">
        <h2>Subject Performance</h2>
        <span>Average percentages from generated results</span>
      </div>

      <section className="ad-panel">
        <div className="ad-panel-heading">
          <div className="ad-panel-title">
            <span className="ad-panel-icon">
              <BookOpen size={18} />
            </span>
            <div>
              <h3>Subject-wise Results</h3>
              <p>Average student percentage by subject</p>
            </div>
          </div>
          <span className="ad-panel-tag">
            {subjectPerformance.length} Subjects
          </span>
        </div>

        {subjectPerformance.length === 0 ? (
          <div className="ad-empty">
            Subject performance will appear after results are generated.
          </div>
        ) : (
          <div className="ad-subject-list">
            {subjectPerformance.map((subject, index) => {
              const average = Math.min(
                100,
                Math.max(0, Number(subject.averagePercentage || 0))
              );

              return (
                <div className="ad-subject-row" key={subject.subjectId || index}>
                  <span className="ad-subject-name">
                    {subject.subjectName || "Unknown Subject"}
                  </span>
                  <div className="ad-subject-track">
                    <div
                      className="ad-subject-fill"
                      style={{ width: `${average}%` }}
                    />
                  </div>
                  <span className="ad-subject-value">
                    {average.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="ad-section-heading">
        <h2>Recent Results</h2>
        <span>Latest generated result records</span>
      </div>

      <section className="ad-panel">
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th>EXAMINATION</th>
                <th>CLASS</th>
                <th>SECTION</th>
                <th>CLASS AVERAGE</th>
                <th>PASS / FAIL</th>
                <th>GENERATED BY</th>
                <th>DATE</th>
              </tr>
            </thead>

            <tbody>
              {recentResults.length === 0 ? (
                <tr>
                  <td colSpan="7">
                    <div className="ad-empty">
                      No generated results are available yet.
                    </div>
                  </td>
                </tr>
              ) : (
                recentResults.map((result, index) => (
                  <tr key={result._id || result.id || index}>
                    <td>
                      <strong>
                        {result.exam?.examName ||
                          result.examName ||
                          "Examination"}
                      </strong>
                    </td>

                    <td>
                      {result.classId?.className ||
                        result.className ||
                        "—"}
                    </td>

                    <td>
                      <span className="ad-section-chip">
                        {result.section || "—"}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {Number(result.classAverage || 0).toFixed(1)}%
                      </strong>
                    </td>

                    <td>
                      {formatNumber(result.passCount)} /{" "}
                      {formatNumber(result.failCount)}
                    </td>

                    <td>
                      {result.generatedBy?.fullName ||
                        result.generatedBy ||
                        "—"}
                    </td>

                    <td>{formatDate(result.generatedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="ad-footer-note">
        <ShieldCheck size={18} />
        <div>
          <strong>Administrator: Read-only monitoring</strong>
          <p>
            This dashboard displays organisation-wide information from the
            AnkSetu database. Administrators can monitor academic progress
            and account activity, while teachers retain access to operational
            tasks such as student management, marks entry and result generation.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
