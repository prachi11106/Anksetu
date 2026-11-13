
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Authentication
import AuthPage from "./AuthPage";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import Students from "./pages/teacher/Students";
import MarksEntry from "./pages/teacher/MarksEntry";
import Results from "./pages/teacher/Results";
import ReportCards from "./pages/teacher/ReportCards";

// Shared academic pages - operational access is teacher-only
import ClassesSubjects from "./pages/admin/ClassesSubjects";
import AcademicManagement from "./pages/admin/AcademicManagement";

// Admin pages - read-only monitoring
import AdminDashboard from "./pages/admin/AdminDashboard";
import TeacherManagement from "./pages/admin/TeacherManagement";
import StudentManagement from "./pages/admin/StudentManagement";

function getStoredUser() {
  try {
    const storedUser =
      localStorage.getItem("anksetuUser") ||
      sessionStorage.getItem("anksetuUser");

    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
}

function getStoredToken() {
  return (
    localStorage.getItem("anksetuToken") ||
    sessionStorage.getItem("anksetuToken")
  );
}

// Protect routes according to the logged-in user's role
function ProtectedRoute({ allowedRole, children }) {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <Navigate to="/" replace />;
  }

  if (user.role !== allowedRole) {
    return (
      <Navigate
        to={user.role === "admin" ? "/admin" : "/teacher"}
        replace
      />
    );
  }

  return children;
}

// Redirect users to their respective dashboards
function HomeRedirect() {
  const token = getStoredToken();
  const user = getStoredUser();

  if (!token || !user) {
    return <AuthPage />;
  }

  if (user.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === "teacher") {
    return <Navigate to="/teacher" replace />;
  }

  return <AuthPage />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================= AUTHENTICATION ================= */}

        <Route path="/" element={<HomeRedirect />} />

        {/* ================= TEACHER ROUTES ================= */}

        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRole="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/students"
          element={
            <ProtectedRoute allowedRole="teacher">
              <Students />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/classes-subjects"
          element={
            <ProtectedRoute allowedRole="teacher">
              <ClassesSubjects />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/academic"
          element={
            <ProtectedRoute allowedRole="teacher">
              <AcademicManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/marks"
          element={
            <ProtectedRoute allowedRole="teacher">
              <MarksEntry />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/results"
          element={
            <ProtectedRoute allowedRole="teacher">
              <Results />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher/report-cards"
          element={
            <ProtectedRoute allowedRole="teacher">
              <ReportCards />
            </ProtectedRoute>
          }
        />

        {/* ================= ADMIN ROUTES ================= */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/teachers"
          element={
            <ProtectedRoute allowedRole="admin">
              <TeacherManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/students"
          element={
            <ProtectedRoute allowedRole="admin">
              <StudentManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/results"
          element={
            <ProtectedRoute allowedRole="admin">
              <Results />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/report-cards"
          element={
            <ProtectedRoute allowedRole="admin">
              <ReportCards />
            </ProtectedRoute>
          }
        />

        {/* ================= INVALID ROUTES ================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
