
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  GraduationCap,
  Save,
  RotateCcw,
  Palette,
  FileText,
  Settings,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  Award,
  Plus,
  Trash2,
} from "lucide-react";

const STORAGE_KEY = "anksetuInstitutionSettings";

const DEFAULT_GRADES = [
  { grade: "A+", min: 90, max: 100, remark: "Outstanding" },
  { grade: "A", min: 80, max: 89, remark: "Excellent" },
  { grade: "B", min: 70, max: 79, remark: "Very Good" },
  { grade: "C", min: 60, max: 69, remark: "Good" },
  { grade: "D", min: 50, max: 59, remark: "Satisfactory" },
  { grade: "E", min: 33, max: 49, remark: "Needs Improvement" },
  { grade: "F", min: 0, max: 32, remark: "Needs Support" },
];

function readUser() {
  try {
    const stored =
      localStorage.getItem("anksetuUser") ||
      sessionStorage.getItem("anksetuUser");

    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function readSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function InstitutionSettings() {
  const user = readUser();

  const [activeTab, setActiveTab] = useState("profile");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [profile, setProfile] = useState({
    institutionName: user?.organisation || user?.organization || "",
    tagline: "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: "",
    reportFooter: "Powered by AnkSetu",
  });

  const [grades, setGrades] = useState(DEFAULT_GRADES);

  useEffect(() => {
    const saved = readSettings();

    if (saved?.profile) {
      setProfile((previous) => ({
        ...previous,
        ...saved.profile,
      }));
    }

    if (Array.isArray(saved?.grades) && saved.grades.length > 0) {
      setGrades(saved.grades);
    }
  }, []);

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);

    window.setTimeout(() => {
      setMessage("");
    }, 3500);
  };

  const updateProfile = (field, value) => {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateGrade = (index, field, value) => {
    setGrades((previous) =>
      previous.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]:
                field === "min" || field === "max"
                  ? value === ""
                    ? ""
                    : Number(value)
                  : value,
            }
          : item
      )
    );
  };

  const addGrade = () => {
    setGrades((previous) => [
      ...previous,
      {
        grade: "",
        min: 0,
        max: 0,
        remark: "",
      },
    ]);
  };

  const removeGrade = (index) => {
    setGrades((previous) =>
      previous.filter((_, i) => i !== index)
    );
  };

  const validateGrades = () => {
    if (grades.length === 0) {
      return "Add at least one grade.";
    }

    for (const grade of grades) {
      if (!grade.grade.trim()) {
        return "Every grade must have a grade name.";
      }

      if (!grade.remark.trim()) {
        return `Add a remark for grade ${grade.grade}.`;
      }

      if (
        grade.min === "" ||
        grade.max === "" ||
        !Number.isFinite(Number(grade.min)) ||
        !Number.isFinite(Number(grade.max)) ||
        Number(grade.min) < 0 ||
        Number(grade.max) > 100 ||
        Number(grade.min) > Number(grade.max)
      ) {
        return `Check the percentage range for grade ${grade.grade}.`;
      }
    }

    const sorted = [...grades].sort(
      (a, b) => Number(a.min) - Number(b.min)
    );

    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1];
      const current = sorted[i];

      if (Number(current.min) <= Number(previous.max)) {
        return "Grade ranges must not overlap.";
      }

      if (Number(current.min) !== Number(previous.max) + 1) {
        return "Grade ranges must cover every percentage without gaps.";
      }
    }

    if (
      Number(sorted[0].min) !== 0 ||
      Number(sorted[sorted.length - 1].max) !== 100
    ) {
      return "The grading scale must cover percentages from 0 to 100.";
    }

    return "";
  };

  const saveSettings = () => {
    if (!profile.institutionName.trim()) {
      showMessage("Institution name is required.", "error");
      setActiveTab("profile");
      return;
    }

    const gradeError = validateGrades();

    if (gradeError) {
      showMessage(gradeError, "error");
      setActiveTab("grading");
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          profile,
          grades,
          updatedAt: new Date().toISOString(),
        })
      );

      showMessage("Settings saved in this browser successfully.");
    } catch {
      showMessage("Unable to save settings in this browser.", "error");
    }
  };

  const resetSettings = () => {
    const confirmed = window.confirm(
      "Reset institution settings and grading scale to their defaults?"
    );

    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);

    setProfile({
      institutionName: user?.organisation || user?.organization || "",
      tagline: "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: "",
      reportFooter: "Powered by AnkSetu",
    });

    setGrades(DEFAULT_GRADES);

    showMessage("Settings have been reset.");
  };

  const styles = `
    .is-page {
      min-height: 100vh;
      padding: 30px;
      color: #26314b;
      background: #f6f7fc;
      font-family: Inter, "Segoe UI", sans-serif;
    }

    .is-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .is-eyebrow {
      color: #7462d3;
      font-size: 10px;
      font-weight: 850;
      letter-spacing: 1.3px;
    }

    .is-header h1 {
      margin: 8px 0 0;
      color: #222d47;
      font-size: 27px;
      font-weight: 850;
      letter-spacing: -0.7px;
    }

    .is-header p {
      margin: 8px 0 0;
      color: #939bad;
      font-size: 11px;
    }

    .is-save {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 17px;
      color: white;
      background: #6656c8;
      border: 0;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 800;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .is-save:hover {
      background: #5545b7;
      transform: translateY(-2px);
    }

    .is-message {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 12px 14px;
      margin-bottom: 18px;
      border-radius: 10px;
      font-size: 11px;
    }

    .is-message.success {
      color: #247c5c;
      background: #eaf8f0;
      border: 1px solid #d5f0df;
    }

    .is-message.error {
      color: #ad4650;
      background: #fff0f1;
      border: 1px solid #ffdadd;
    }

    .is-layout {
      display: grid;
      grid-template-columns: 235px minmax(0, 1fr);
      gap: 20px;
      align-items: start;
    }

    .is-sidebar,
    .is-content {
      background: white;
      border: 1px solid #edf0f6;
      border-radius: 16px;
      box-shadow: 0 5px 20px rgba(31,42,76,0.03);
    }

    .is-sidebar {
      padding: 14px;
    }

    .is-side-heading {
      padding: 10px 10px 14px;
      color: #a0a6b5;
      font-size: 9px;
      font-weight: 850;
      letter-spacing: 1px;
    }

    .is-tab {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 13px 12px;
      margin-bottom: 5px;
      color: #818ba1;
      background: transparent;
      border: 0;
      border-radius: 10px;
      text-align: left;
      font-size: 11px;
      font-weight: 750;
      cursor: pointer;
      transition: 0.2s ease;
    }

    .is-tab:hover {
      color: #6656c8;
      background: #f8f7ff;
    }

    .is-tab.active {
      color: #6656c8;
      background: #f0edff;
    }

    .is-tab svg { flex-shrink: 0; }

    .is-content {
      overflow: hidden;
    }

    .is-content-heading {
      padding: 23px 24px;
      border-bottom: 1px solid #f0f1f6;
    }

    .is-content-heading h2 {
      margin: 0;
      color: #303b55;
      font-size: 16px;
      font-weight: 850;
    }

    .is-content-heading p {
      margin: 7px 0 0;
      color: #999fb0;
      font-size: 10px;
      line-height: 1.6;
    }

    .is-form {
      padding: 24px;
    }

    .is-section-title {
      display: flex;
      align-items: center;
      gap: 9px;
      margin: 0 0 17px;
      color: #46516a;
      font-size: 12px;
      font-weight: 850;
    }

    .is-section-title svg { color: #7462d3; }

    .is-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 17px;
    }

    .is-field {
      display: flex;
      flex-direction: column;
      gap: 7px;
      min-width: 0;
    }

    .is-field.full { grid-column: 1 / -1; }

    .is-field label {
      color: #65708a;
      font-size: 10px;
      font-weight: 800;
    }

    .is-field input,
    .is-field textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 12px;
      color: #3f4a64;
      background: #fafbfe;
      border: 1px solid #e9edf4;
      border-radius: 9px;
      outline: none;
      font-family: inherit;
      font-size: 11px;
      transition: 0.2s ease;
    }

    .is-field textarea {
      min-height: 85px;
      resize: vertical;
    }

    .is-field input:focus,
    .is-field textarea:focus {
      border-color: #9385e1;
      box-shadow: 0 0 0 3px rgba(116,98,211,0.09);
    }

    .is-field input:disabled {
      color: #8b92a4;
      background: #f0f1f5;
      cursor: not-allowed;
    }

    .is-hint {
      color: #a2a8b6;
      font-size: 9px;
      line-height: 1.5;
    }

    .is-preview {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 16px;
      margin-top: 22px;
      background: linear-gradient(110deg, #f1efff, #f7f5ff);
      border: 1px solid #e8e3ff;
      border-radius: 12px;
    }

    .is-preview-icon {
      width: 45px;
      height: 45px;
      display: grid;
      flex-shrink: 0;
      place-items: center;
      color: #6656c8;
      background: white;
      border-radius: 12px;
    }

    .is-preview strong {
      display: block;
      color: #494080;
      font-size: 11px;
    }

    .is-preview span {
      display: block;
      margin-top: 5px;
      color: #8178b1;
      font-size: 9px;
      line-height: 1.5;
    }

    .is-grade-table-wrap {
      overflow-x: auto;
    }

    .is-grade-table {
      width: 100%;
      min-width: 530px;
      border-collapse: collapse;
      text-align: left;
    }

    .is-grade-table th {
      padding: 12px 10px;
      color: #9ba2b1;
      background: #fafbfe;
      border-bottom: 1px solid #edf0f6;
      font-size: 9px;
      letter-spacing: 0.4px;
    }

    .is-grade-table td {
      padding: 10px;
      border-bottom: 1px solid #f0f1f6;
    }

    .is-grade-table input {
      width: 100%;
      min-width: 55px;
      box-sizing: border-box;
      padding: 9px;
      color: #46516a;
      background: #fafbfe;
      border: 1px solid #e9edf4;
      border-radius: 7px;
      outline: none;
      font-size: 10px;
    }

    .is-grade-table input:focus {
      border-color: #9385e1;
    }

    .is-delete {
      width: 29px;
      height: 29px;
      display: grid;
      place-items: center;
      color: #c15c67;
      background: #fff0f1;
      border: 0;
      border-radius: 7px;
      cursor: pointer;
    }

    .is-add {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 10px 13px;
      margin-top: 16px;
      color: #6656c8;
      background: #f0edff;
      border: 0;
      border-radius: 9px;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    .is-grade-note {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      padding: 12px;
      margin-top: 18px;
      color: #7567b3;
      background: #f6f4ff;
      border-radius: 9px;
      font-size: 9px;
      line-height: 1.6;
    }

    .is-bottom-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 17px 24px;
      background: #fafbfe;
      border-top: 1px solid #f0f1f6;
    }

    .is-reset {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 10px 12px;
      color: #788198;
      background: white;
      border: 1px solid #e8ebf2;
      border-radius: 9px;
      font-size: 10px;
      font-weight: 750;
      cursor: pointer;
    }

    .is-save-bottom {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 10px 15px;
      color: white;
      background: #6656c8;
      border: 0;
      border-radius: 9px;
      font-size: 10px;
      font-weight: 800;
      cursor: pointer;
    }

    .is-local-warning {
      display: flex;
      gap: 9px;
      padding: 13px;
      margin-top: 18px;
      color: #94713c;
      background: #fff9ed;
      border: 1px solid #f8edcf;
      border-radius: 10px;
      font-size: 9px;
      line-height: 1.6;
    }

    .is-local-warning svg { flex-shrink: 0; }

    @media (max-width: 850px) {
      .is-page { padding: 22px 16px; }
      .is-layout { grid-template-columns: 1fr; }
      .is-sidebar { display: flex; gap: 6px; overflow-x: auto; }
      .is-side-heading { display: none; }
      .is-tab { width: auto; min-width: max-content; margin: 0; }
    }

    @media (max-width: 560px) {
      .is-page { padding: 18px 11px; }
      .is-header { align-items: flex-start; flex-direction: column; }
      .is-header h1 { font-size: 23px; }
      .is-fields { grid-template-columns: 1fr; }
      .is-field.full { grid-column: auto; }
      .is-form { padding: 18px; }
      .is-content-heading { padding: 18px; }
      .is-bottom-actions { padding: 14px; }
    }
  `;

  return (
    <div className="is-page">
      <style>{styles}</style>

      <div className="is-header">
        <div>
          <span className="is-eyebrow">ADMINISTRATION / CONFIGURATION</span>
          <h1>Institution Settings</h1>
          <p>Configure institution details and academic grading preferences.</p>
        </div>

        <button className="is-save" onClick={saveSettings}>
          <Save size={16} />
          Save Settings
        </button>
      </div>

      {message && (
        <motion.div
          className={`is-message ${messageType}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {messageType === "success" ? (
            <CheckCircle2 size={17} />
          ) : (
            <AlertCircle size={17} />
          )}
          {message}
        </motion.div>
      )}

      <div className="is-layout">
        <aside className="is-sidebar">
          <div className="is-side-heading">SETTINGS MENU</div>

          <button
            className={`is-tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <Building2 size={17} />
            Institution Profile
          </button>

          <button
            className={`is-tab ${activeTab === "grading" ? "active" : ""}`}
            onClick={() => setActiveTab("grading")}
          >
            <Award size={17} />
            Grading System
          </button>

          <button
            className={`is-tab ${activeTab === "report" ? "active" : ""}`}
            onClick={() => setActiveTab("report")}
          >
            <FileText size={17} />
            Report Card
          </button>
        </aside>

        <main className="is-content">
          {activeTab === "profile" && (
            <>
              <div className="is-content-heading">
                <h2>Institution Profile</h2>
                <p>
                  Add the details that identify your school or educational
                  organisation.
                </p>
              </div>

              <div className="is-form">
                <h3 className="is-section-title">
                  <Building2 size={17} />
                  Organisation Information
                </h3>

                <div className="is-fields">
                  <div className="is-field full">
                    <label>Institution Name *</label>
                    <input
                      value={profile.institutionName}
                      onChange={(event) =>
                        updateProfile("institutionName", event.target.value)
                      }
                      placeholder="Enter institution name"
                    />
                    <span className="is-hint">
                      This name can appear on generated report cards.
                    </span>
                  </div>

                  <div className="is-field full">
                    <label>Tagline</label>
                    <input
                      value={profile.tagline}
                      onChange={(event) =>
                        updateProfile("tagline", event.target.value)
                      }
                      placeholder="e.g. Learning Today, Leading Tomorrow"
                    />
                  </div>

                  <div className="is-field">
                    <label>Contact Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(event) =>
                        updateProfile("email", event.target.value)
                      }
                      placeholder="institution@example.com"
                    />
                  </div>

                  <div className="is-field">
                    <label>Contact Phone</label>
                    <input
                      value={profile.phone}
                      onChange={(event) =>
                        updateProfile("phone", event.target.value)
                      }
                      placeholder="Enter contact number"
                    />
                  </div>

                  <div className="is-field full">
                    <label>Institution Address</label>
                    <textarea
                      value={profile.address}
                      onChange={(event) =>
                        updateProfile("address", event.target.value)
                      }
                      placeholder="Enter complete institution address"
                    />
                  </div>
                </div>

                <div className="is-preview">
                  <div className="is-preview-icon">
                    <GraduationCap size={25} />
                  </div>
                  <div>
                    <strong>
                      {profile.institutionName || "Your Institution Name"}
                    </strong>
                    <span>
                      {profile.tagline || "Your institution tagline will appear here."}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "grading" && (
            <>
              <div className="is-content-heading">
                <h2>Grading System</h2>
                <p>
                  Define percentage ranges and corresponding grades for
                  academic results.
                </p>
              </div>

              <div className="is-form">
                <h3 className="is-section-title">
                  <Award size={17} />
                  Grade Configuration
                </h3>

                <div className="is-grade-table-wrap">
                  <table className="is-grade-table">
                    <thead>
                      <tr>
                        <th>GRADE</th>
                        <th>MINIMUM %</th>
                        <th>MAXIMUM %</th>
                        <th>REMARK</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {grades.map((grade, index) => (
                        <tr key={index}>
                          <td>
                            <input
                              value={grade.grade}
                              onChange={(event) =>
                                updateGrade(index, "grade", event.target.value)
                              }
                              placeholder="A+"
                              aria-label="Grade name"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={grade.min}
                              onChange={(event) =>
                                updateGrade(index, "min", event.target.value)
                              }
                              aria-label="Minimum percentage"
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={grade.max}
                              onChange={(event) =>
                                updateGrade(index, "max", event.target.value)
                              }
                              aria-label="Maximum percentage"
                            />
                          </td>

                          <td>
                            <input
                              value={grade.remark}
                              onChange={(event) =>
                                updateGrade(index, "remark", event.target.value)
                              }
                              placeholder="Performance remark"
                              aria-label="Grade remark"
                            />
                          </td>

                          <td>
                            <button
                              className="is-delete"
                              onClick={() => removeGrade(index)}
                              title="Remove grade"
                              aria-label="Remove grade"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button className="is-add" onClick={addGrade}>
                  <Plus size={15} />
                  Add Grade
                </button>

                <div className="is-grade-note">
                  <Award size={16} />
                  <span>
                    Grade ranges must cover 0% to 100% without gaps or
                    overlaps. These settings are saved locally for now;
                    result-generation integration will be handled later.
                  </span>
                </div>
              </div>
            </>
          )}

          {activeTab === "report" && (
            <>
              <div className="is-content-heading">
                <h2>Report Card Preferences</h2>
                <p>
                  Configure the institution details and footer text displayed
                  on report cards.
                </p>
              </div>

              <div className="is-form">
                <h3 className="is-section-title">
                  <FileText size={17} />
                  Report Card Identity
                </h3>

                <div className="is-fields">
                  <div className="is-field full">
                    <label>Report Card Institution Name</label>
                    <input
                      value={profile.institutionName}
                      onChange={(event) =>
                        updateProfile("institutionName", event.target.value)
                      }
                      placeholder="Institution name"
                    />
                  </div>

                  <div className="is-field full">
                    <label>Institution Tagline</label>
                    <input
                      value={profile.tagline}
                      onChange={(event) =>
                        updateProfile("tagline", event.target.value)
                      }
                      placeholder="Institution tagline"
                    />
                  </div>

                  <div className="is-field full">
                    <label>Report Card Footer</label>
                    <input
                      value={profile.reportFooter}
                      onChange={(event) =>
                        updateProfile("reportFooter", event.target.value)
                      }
                      placeholder="Enter footer text"
                    />
                    <span className="is-hint">
                      Example: Powered by AnkSetu | Academic Excellence for Every Student
                    </span>
                  </div>

                  <div className="is-field">
                    <label>Contact Email</label>
                    <input
                      value={profile.email}
                      onChange={(event) =>
                        updateProfile("email", event.target.value)
                      }
                      placeholder="Contact email"
                    />
                  </div>

                  <div className="is-field">
                    <label>Contact Phone</label>
                    <input
                      value={profile.phone}
                      onChange={(event) =>
                        updateProfile("phone", event.target.value)
                      }
                      placeholder="Contact phone"
                    />
                  </div>
                </div>

                <div className="is-preview">
                  <div className="is-preview-icon">
                    <FileText size={24} />
                  </div>
                  <div>
                    <strong>
                      {profile.institutionName || "Institution Name"}
                    </strong>
                    <span>
                      {profile.tagline || "Institution tagline"}
                      <br />
                      {profile.reportFooter || "Report card footer"}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="is-bottom-actions">
            <button className="is-reset" onClick={resetSettings}>
              <RotateCcw size={14} />
              Reset Defaults
            </button>

            <button className="is-save-bottom" onClick={saveSettings}>
              <Save size={14} />
              Save Changes
            </button>
          </div>
        </main>
      </div>

      <div className="is-local-warning">
        <Settings size={16} />
        <span>
          <strong>Current storage limitation:</strong> These settings are
          saved in this browser's local storage, not in MongoDB. They will
          not automatically sync across different computers or administrator
          accounts. We will connect them to the backend during integration.
        </span>
      </div>
    </div>
  );
}

export default InstitutionSettings;
