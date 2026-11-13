
import { useNavigate } from "react-router-dom";

function DashboardPlaceholder({ role }) {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("anksetuUser") ||
    sessionStorage.getItem("anksetuUser") ||
    "{}"
  );

  const logout = () => {
    localStorage.removeItem("anksetuToken");
    localStorage.removeItem("anksetuUser");
    sessionStorage.removeItem("anksetuToken");
    sessionStorage.removeItem("anksetuUser");

    navigate("/", { replace: true });
  };

  return (
    <div style={{
      minHeight: "100vh",
      padding: "40px",
      background: "#f5f9ff",
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ color: "#102a56" }}>
        Welcome to AnkSetu!
      </h1>

      <h2>
        {role === "teacher" ? "Teacher Dashboard" : "Administrator Dashboard"}
      </h2>

      <p>
        Hello, {user.fullName || "User"}!
      </p>

      <p>
        Your {role} dashboard is being prepared.
      </p>

      <button
        onClick={logout}
        style={{
          padding: "12px 24px",
          background: "#2563eb",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer"
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default DashboardPlaceholder;
