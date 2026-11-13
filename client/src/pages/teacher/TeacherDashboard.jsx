
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  FileText,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Plus,
  ArrowUpRight,
  MoreHorizontal,
  CalendarDays,
  Sparkles,
  Clock3,
  CheckCircle2,
  ChevronRight,
  UserPlus,
  ClipboardCheck,
} from "lucide-react";

import "./TeacherDashboard.css";

// -------------------- API --------------------

const API = "http://localhost:5000/api/academic";

function getToken() {
  return (
    localStorage.getItem("anksetuToken") ||
    sessionStorage.getItem("anksetuToken")
  );
}

// -------------------- DEMO DATA --------------------

const performanceData = [
  { month: "Jun", students: 62 },
  { month: "Jul", students: 68 },
  { month: "Aug", students: 65 },
  { month: "Sep", students: 76 },
  { month: "Oct", students: 82 },
  { month: "Nov", students: 88 },
];

const subjectData = [
  { subject: "English", average: 82 },
  { subject: "Maths", average: 74 },
  { subject: "Science", average: 88 },
  { subject: "Hindi", average: 79 },
  { subject: "Social Sci.", average: 85 },
];

const resultData = [
  { name: "Passed", value: 82, color: "#16a78a" },
  { name: "Needs improvement", value: 13, color: "#f5a623" },
  { name: "Failed", value: 5, color: "#f16b78" },
];

const activities = [
  {
    icon: UserPlus,
    title: "New student added",
    detail: "Aarav Sharma · Class 6-A",
    time: "10 minutes ago",
    color: "purple",
  },
  {
    icon: ClipboardCheck,
    title: "Marks entry completed",
    detail: "Mathematics · Class 8-B",
    time: "1 hour ago",
    color: "blue",
  },
  {
    icon: FileText,
    title: "Report card generated",
    detail: "Class 5-A · Mid-term examination",
    time: "Yesterday",
    color: "green",
  },
  {
    icon: CheckCircle2,
    title: "Student record updated",
    detail: "Ananya Verma · Class 7-A",
    time: "Yesterday",
    color: "orange",
  },
];

const students = [
  {
    name: "Aarav Sharma",
    roll: "STU-1024",
    className: "Class 8-A",
    percentage: "94.2%",
    status: "Excellent",
    initials: "AS",
    color: "lavender",
  },
  {
    name: "Ananya Verma",
    roll: "STU-1025",
    className: "Class 7-B",
    percentage: "89.5%",
    status: "Very Good",
    initials: "AV",
    color: "peach",
  },
  {
    name: "Rohan Mehta",
    roll: "STU-1026",
    className: "Class 8-A",
    percentage: "76.8%",
    status: "Good",
    initials: "RM",
    color: "mint",
  },
  {
    name: "Sana Khan",
    roll: "STU-1027",
    className: "Class 6-A",
    percentage: "68.4%",
    status: "Improving",
    initials: "SK",
    color: "blue",
  },
];

// -------------------- USER DATA --------------------

function readUser() {
  try {
    const storedUser =
      localStorage.getItem("anksetuUser") ||
      sessionStorage.getItem("anksetuUser");

    return storedUser ? JSON.parse(storedUser) : {};
  } catch {
    return {};
  }
}

// -------------------- NAVIGATION --------------------


const navigation = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    path: "/teacher",
  },
  {
    label: "Students",
    icon: Users,
    path: "/teacher/students",
  },
  {
    label: "Classes & Subjects",
    icon: BookOpen,
    path: "/teacher/classes-subjects",
  },
  {
    label: "Academic Management",
    icon: CalendarDays,
    path: "/teacher/academic",
  },
  {
    label: "Marks Entry",
    icon: ClipboardList,
    path: "/teacher/marks",
  },
  {
    label: "Results",
    icon: ChartNoAxesCombined,
    path: "/teacher/results",
  },
  {
    label: "Report Cards",
    icon: FileText,
    path: "/teacher/report-cards",
  },
];


// -------------------- STAT CARD --------------------

function StatCard({
  title,
  value,
  suffix = "",
  change,
  description,
  icon: Icon,
  color,
  delay = 0,
}) {
  return (
    <motion.div
      className="teacher-stat-card"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -5 }}
    >
      <div className="stat-card-top">
        <div className={`stat-icon ${color}`}>
          <Icon size={22} />
        </div>

        <button
          type="button"
          className="stat-more"
          aria-label={`More about ${title}`}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>

      <p className="stat-title">{title}</p>

      <div className="stat-value-row">
        <h3>
          {value}
          {suffix}
        </h3>

        <span className="stat-change">
          <ArrowUpRight size={14} />
          {change}
        </span>
      </div>

      <p className="stat-description">{description}</p>
    </motion.div>
  );
}

// -------------------- MAIN DASHBOARD --------------------

function TeacherDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const user = readUser();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);

  // -------------------- ACTIVE ACADEMIC SESSION --------------------

  const [activeSession, setActiveSession] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchActiveSession = async () => {
      try {
        setSessionLoading(true);
        setSessionError("");

        const token = getToken();

        if (!token) {
          throw new Error("Please log in again.");
        }

        const response = await fetch(`${API}/sessions`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
          throw new Error(
            data.message || "Unable to fetch academic sessions."
          );
        }

        const sessions = Array.isArray(data.sessions)
          ? data.sessions
          : [];

        const currentSession = sessions.find(
          (session) => session.isActive === true
        );

        if (isMounted) {
          setActiveSession(currentSession || null);
        }
      } catch (error) {
        if (isMounted) {
          console.error("Academic session error:", error);
          setSessionError(error.message);
          setActiveSession(null);
        }
      } finally {
        if (isMounted) {
          setSessionLoading(false);
        }
      }
    };

    fetchActiveSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const firstName =
    user.fullName?.trim().split(" ")[0] || "Teacher";

  const activeNav =
    navigation.find(
      (item) => item.path === location.pathname
    )?.label || "Overview";

  // -------------------- LOGOUT --------------------

  const logout = () => {
    localStorage.removeItem("anksetuToken");
    localStorage.removeItem("anksetuUser");

    sessionStorage.removeItem("anksetuToken");
    sessionStorage.removeItem("anksetuUser");

    navigate("/", { replace: true });
  };

  // -------------------- SEARCH --------------------

  const filteredStudents = students.filter((student) =>
    `${student.name} ${student.roll} ${student.className}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  // -------------------- NAVIGATION --------------------

  const selectNavigation = (item) => {
    setSidebarOpen(false);
    setShowNotifications(false);
    navigate(item.path);
  };

  const openStudents = () => {
    setSidebarOpen(false);
    navigate("/teacher/students");
  };

  const openAcademicManagement = () => {
    setSidebarOpen(false);
    navigate("/teacher/academic");
  };

  const openSettings = () => {
    window.alert(
      "Teacher settings will be available in a future update."
    );
  };

  return (
    <div className="teacher-dashboard">

      {/* MOBILE SIDEBAR BACKDROP */}

      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* SIDEBAR */}

      <aside
        className={`teacher-sidebar ${sidebarOpen ? "sidebar-open" : ""
          }`}
      >
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <GraduationCap size={27} />
          </div>

          <div>
            <h2>AnkSetu</h2>
            <span>ACADEMIC MANAGEMENT</span>
          </div>

          <button
            type="button"
            className="mobile-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-label">
          WORKSPACE
        </div>

        <nav className="sidebar-navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.label;

            return (
              <button
                type="button"
                key={item.label}
                className={`sidebar-link ${active ? "active" : ""
                  }`}
                onClick={() => selectNavigation(item)}
              >
                <Icon size={19} />

                <span>{item.label}</span>

                {active && (
                  <span className="active-indicator" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-help-card">
          <div className="help-sparkle">
            <Sparkles size={19} />
          </div>

          <h4>Making learning matter</h4>

          <p>
            Every small step contributes to a brighter future.
          </p>

          <span>
            Built with care <HeartIcon />
          </span>
        </div>

        {/* SIDEBAR BOTTOM */}

        <div className="sidebar-bottom">
          <button
            type="button"
            className="sidebar-link"
            onClick={openSettings}
          >
            <Settings size={19} />
            <span>Settings</span>
          </button>

          <button
            type="button"
            className="sidebar-link logout-link"
            onClick={logout}
          >
            <LogOut size={19} />
            <span>Logout</span>
          </button>

          <div className="sidebar-profile">
            <div className="profile-avatar">
              {firstName.charAt(0).toUpperCase()}
            </div>

            <div className="profile-info">
              <strong>
                {user.fullName || "Teacher"}
              </strong>

              <span>Teacher account</span>
            </div>

            <MoreHorizontal size={19} />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}

      <main className="teacher-main">

        {/* TOPBAR */}

        <header className="teacher-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={23} />
            </button>

            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={15} />
              <strong>{activeNav}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <label className="dashboard-search">
              <Search size={18} />

              <input
                type="search"
                placeholder="Search students..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

              <kbd>⌘ K</kbd>
            </label>

            <div className="notification-wrap">
              <button
                type="button"
                className="notification-button"
                onClick={() =>
                  setShowNotifications((previous) => !previous)
                }
                aria-label="Notifications"
              >
                <Bell size={20} />
                <span />
              </button>

              {showNotifications && (
                <div className="notification-popover">
                  <strong>Notifications</strong>

                  <p>
                    Your dashboard is using sample data for now.
                  </p>

                  <p>
                    Student management is now available.
                  </p>
                </div>
              )}
            </div>

            <div className="topbar-avatar">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY */}

        <div className="dashboard-content">

          {/* DEMO NOTICE */}

          <div className="demo-notice">
            <Sparkles size={16} />
            <span>DEMO PREVIEW</span>

            <p>
              You're viewing sample academic data. Real records
              will appear after database integration.
            </p>
          </div>

          {/* WELCOME SECTION */}

          <motion.section
            className="dashboard-welcome"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div>
              <div className="welcome-eyebrow">
                <span className="welcome-dot" />
                YOUR ACADEMIC WORKSPACE
              </div>

              <h1>
                Good afternoon, {firstName}{" "}
                <span className="wave">✦</span>
              </h1>

              <p>
                Here's what's happening with your students today.
              </p>
            </div>

            <div className="welcome-actions">

              {/* CLICKABLE ACTIVE SESSION CHIP */}

              <button
                type="button"
                className="session-chip"
                onClick={openAcademicManagement}
                title="Open Academic Management"
                aria-label="Open Academic Management"
                style={{
                  border: "none",
                  cursor: "pointer",
                  font: "inherit",
                  background: "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <CalendarDays size={17} />

                {sessionLoading
                  ? "Loading session..."
                  : activeSession
                    ? `Academic Session ${activeSession.sessionName}`
                    : sessionError
                      ? "Session unavailable"
                      : "No active session"}
              </button>

              <button
                type="button"
                className="primary-action"
                onClick={openStudents}
              >
                <Plus size={18} />
                Add Student
              </button>
            </div>

            {!sessionLoading && !activeSession && (
              <p
                style={{
                  color: "#d97706",
                  fontSize: "12px",
                  marginTop: "8px",
                }}
              >
                {sessionError ||
                  "Please activate an academic session in Academic Management."}
              </p>
            )}
          </motion.section>

          {/* STATISTICS */}

          <section className="teacher-stats-grid">
            <StatCard
              title="Total Students"
              value="248"
              change="+12.5%"
              description="Compared to last session"
              icon={Users}
              color="stat-purple"
              delay={0.08}
            />

            <StatCard
              title="My Classes"
              value="08"
              change="+2"
              description="Across different sections"
              icon={BookOpen}
              color="stat-blue"
              delay={0.16}
            />

            <StatCard
              title="Results Generated"
              value="186"
              change="+18.2%"
              description="Reports created this session"
              icon={FileText}
              color="stat-green"
              delay={0.24}
            />

            <StatCard
              title="Average Performance"
              value="78.6"
              suffix="%"
              change="+4.8%"
              description="Overall student average"
              icon={ChartNoAxesCombined}
              color="stat-orange"
              delay={0.32}
            />
          </section>

          {/* CHARTS */}

          <section className="dashboard-chart-grid">

            {/* PERFORMANCE CHART */}

            <motion.div
              className="dashboard-panel performance-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">
                    ACADEMIC OVERVIEW
                  </span>

                  <h3>Student performance</h3>

                  <p>
                    Performance trend across the recent months
                  </p>
                </div>

                <button
                  type="button"
                  className="panel-menu"
                  aria-label="More chart options"
                >
                  <MoreHorizontal size={21} />
                </button>
              </div>

              <div className="chart-legend">
                <span className="legend-dot purple-dot" />
                <span>Average performance</span>
              </div>

              <div className="area-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={performanceData}
                    margin={{
                      top: 12,
                      right: 8,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="performanceFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#7565e8"
                          stopOpacity={0.25}
                        />

                        <stop
                          offset="95%"
                          stopColor="#7565e8"
                          stopOpacity={0.01}
                        />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      stroke="#edf0f7"
                      strokeDasharray="4 5"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#9299ad",
                        fontSize: 12,
                      }}
                    />

                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#9299ad",
                        fontSize: 12,
                      }}
                    />

                    <Tooltip />

                    <Area
                      type="monotone"
                      dataKey="students"
                      name="Performance"
                      stroke="#7868e8"
                      strokeWidth={3}
                      fill="url(#performanceFill)"
                      activeDot={{
                        r: 6,
                        strokeWidth: 0,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* RESULT DISTRIBUTION */}

            <motion.div
              className="dashboard-panel result-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">
                    RESULT ANALYSIS
                  </span>

                  <h3>Result distribution</h3>
                  <p>Student outcome breakdown</p>
                </div>

                <button
                  type="button"
                  className="panel-menu"
                  aria-label="More result options"
                >
                  <MoreHorizontal size={21} />
                </button>
              </div>

              <div className="donut-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={resultData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={65}
                      outerRadius={91}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {resultData.map((entry) => (
                        <Cell
                          key={entry.name}
                          fill={entry.color}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                <div className="donut-center">
                  <strong>82%</strong>
                  <span>Passed</span>
                </div>
              </div>

              <div className="result-legend">
                {resultData.map((item) => (
                  <div
                    className="result-legend-item"
                    key={item.name}
                  >
                    <span
                      className="legend-dot"
                      style={{
                        background: item.color,
                      }}
                    />

                    <span>{item.name}</span>
                    <strong>{item.value}%</strong>
                  </div>
                ))}
              </div>
            </motion.div>
          </section>

          {/* SUBJECT AND ACTIVITY */}

          <section className="dashboard-lower-grid">

            {/* SUBJECT PERFORMANCE */}

            <motion.div
              className="dashboard-panel subject-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
            >
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">
                    SUBJECT INSIGHTS
                  </span>

                  <h3>Subject-wise performance</h3>
                  <p>Average marks across subjects</p>
                </div>

                <button
                  type="button"
                  className="panel-menu"
                  aria-label="More subject options"
                >
                  <MoreHorizontal size={21} />
                </button>
              </div>

              <div className="subject-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectData}
                    margin={{
                      top: 8,
                      right: 5,
                      left: -20,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid
                      stroke="#edf0f7"
                      strokeDasharray="4 5"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="subject"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#9299ad",
                        fontSize: 11,
                      }}
                    />

                    <YAxis
                      domain={[0, 100]}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#9299ad",
                        fontSize: 11,
                      }}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="average"
                      name="Average marks"
                      fill="#8172ed"
                      radius={[7, 7, 0, 0]}
                      barSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* RECENT ACTIVITY */}

            <motion.div
              className="dashboard-panel activity-panel"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">
                    YOUR WORKSPACE
                  </span>

                  <h3>Recent activity</h3>
                  <p>Latest updates and actions</p>
                </div>

                <button
                  type="button"
                  className="panel-menu"
                  aria-label="More activity options"
                >
                  <MoreHorizontal size={21} />
                </button>
              </div>

              <div className="activity-list">
                {activities.map((activity, index) => {
                  const Icon = activity.icon;

                  return (
                    <motion.div
                      className="activity-item"
                      key={activity.title}
                      initial={{
                        opacity: 0,
                        x: 12,
                      }}
                      animate={{
                        opacity: 1,
                        x: 0,
                      }}
                      transition={{
                        delay: 0.55 + index * 0.08,
                      }}
                    >
                      <div
                        className={`activity-icon ${activity.color}`}
                      >
                        <Icon size={17} />
                      </div>

                      <div className="activity-details">
                        <strong>{activity.title}</strong>
                        <span>{activity.detail}</span>
                      </div>

                      <time>{activity.time}</time>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </section>

          {/* STUDENT SNAPSHOT */}

          <section className="dashboard-panel students-panel">
            <div className="panel-heading students-heading">
              <div>
                <span className="panel-kicker">
                  STUDENT OVERVIEW
                </span>

                <h3>Student performance snapshot</h3>
                <p>A quick look at student progress</p>
              </div>

              <button
                type="button"
                className="view-all-button"
                onClick={openStudents}
              >
                View all students
                <ArrowUpRight size={16} />
              </button>
            </div>

            <div className="students-table-wrap">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>STUDENT</th>
                    <th>STUDENT ID</th>
                    <th>CLASS</th>
                    <th>OVERALL SCORE</th>
                    <th>PERFORMANCE</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.roll}>
                      <td>
                        <div className="student-name-cell">
                          <div
                            className={`student-avatar ${student.color}`}
                          >
                            {student.initials}
                          </div>

                          <strong>{student.name}</strong>
                        </div>
                      </td>

                      <td className="student-id">
                        {student.roll}
                      </td>

                      <td>{student.className}</td>

                      <td>
                        <strong className="student-score">
                          {student.percentage}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`performance-badge ${student.status
                            .toLowerCase()
                            .replace(" ", "-")}`}
                        >
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td
                        colSpan="5"
                        className="empty-students"
                      >
                        No sample students match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-footer">
              <span>
                Showing {filteredStudents.length} sample students
              </span>

              <span>
                Demo data · Not connected to database
              </span>
            </div>
          </section>

          {/* FOOTER */}

          <footer className="dashboard-footer">
            <span>
              © {new Date().getFullYear()} AnkSetu · Making every learning journey count.
            </span>

            <span>
              <Clock3 size={14} />
              Academic workspace
            </span>
          </footer>
        </div>
      </main>
    </div>
  );
}

// -------------------- SMALL COMPONENT --------------------

function HeartIcon() {
  return <span aria-hidden="true">♥</span>;
}

export default TeacherDashboard;
