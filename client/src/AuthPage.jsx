
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  GraduationCap,
  ShieldCheck,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  UserRound,
  Building2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Heart,
} from "lucide-react";

const initialForm = {
  fullName: "",
  organisation: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  rememberMe: false,
};

const API_URL = "http://localhost:5000/api/auth";

function AuthPage() {
  const navigate = useNavigate();

  const [role, setRole] = useState("teacher");
  const [mode, setMode] = useState("signup");
  const [form, setForm] = useState(initialForm);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setMessage("");
  };

  const changeRole = (newRole) => {
    setRole(newRole);
    setForm(initialForm);
    setMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const changeMode = (newMode) => {
    setMode(newMode);
    setForm(initialForm);
    setMessage("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const showFeedback = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
  };

  const inputField = ({
    label,
    field,
    placeholder,
    icon: Icon,
    type = "text",
    required = false,
  }) => (
    <div className="form-field">
      <label htmlFor={field}>
        {label} {required && <span>*</span>}
      </label>

      <div className="input-wrapper">
        <Icon size={20} className="input-icon" />

        <input
          id={field}
          type={type}
          placeholder={placeholder}
          value={form[field]}
          required={required}
          onChange={(e) => updateField(field, e.target.value)}
        />
      </div>
    </div>
  );

  const passwordField = ({
    label,
    field,
    placeholder,
    visible,
    toggleVisibility,
  }) => (
    <div className="form-field">
      <label htmlFor={field}>
        {label} <span>*</span>
      </label>

      <div className="input-wrapper">
        <Lock size={20} className="input-icon" />

        <input
          id={field}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          value={form[field]}
          required
          minLength={8}
          onChange={(e) => updateField(field, e.target.value)}
        />

        <button
          type="button"
          className="password-toggle"
          onClick={toggleVisibility}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    if (!form.email.trim() && !form.phone.trim()) {
      showFeedback(
        "Please enter either your email address or phone number.",
        "error"
      );
      return;
    }

    if (mode === "signup") {
      if (role === "admin") {
        showFeedback(
          "Administrator registration requires secure authorization. Please contact your administrator.",
          "error"
        );
        return;
      }

      if (form.password !== form.confirmPassword) {
        showFeedback("Passwords do not match. Please try again.", "error");
        return;
      }

      if (form.password.length < 8) {
        showFeedback(
          "Password must contain at least 8 characters.",
          "error"
        );
        return;
      }
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      let endpoint;
      let requestBody;

      if (mode === "signup") {
        endpoint = `${API_URL}/signup`;

        requestBody = {
          fullName: form.fullName.trim(),
          organisation: form.organisation.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        };
      } else {
        endpoint = `${API_URL}/login`;

        requestBody = {
          identifier: form.email.trim() || form.phone.trim(),
          password: form.password,
        };
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      if (mode === "signup") {
        showFeedback(data.message, "success");
        setForm(initialForm);
      } else {
        if (!data.token || !data.user || !data.user.role) {
          throw new Error("Invalid login response from server.");
        }

        if (!["teacher", "admin"].includes(data.user.role)) {
          throw new Error("Invalid user role.");
        }

        localStorage.removeItem("anksetuToken");
        sessionStorage.removeItem("anksetuToken");
        localStorage.removeItem("anksetuUser");
        sessionStorage.removeItem("anksetuUser");

        const storage = form.rememberMe
          ? localStorage
          : sessionStorage;

        storage.setItem("anksetuToken", data.token);
        storage.setItem("anksetuUser", JSON.stringify(data.user));

        navigate(
          data.user.role === "admin" ? "/admin" : "/teacher",
          { replace: true }
        );
      }
    } catch (error) {
      showFeedback(
        error.message || "Unable to connect to the server.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="anksetu-app">
      <section className="branding-panel">
        <div className="brand-top">
          <div className="brand-logo">
            <GraduationCap size={39} />
          </div>

          <div>
            <h1>AnkSetu</h1>
            <span>ONLINE RESULT & REPORT GENERATOR</span>
          </div>
        </div>

        <div className="branding-content">
          <div>
            <div className="brand-pill">
              <Sparkles size={18} />
              <span>Empowering education through technology</span>
            </div>

            <h2>
              Every student
              <br />
              has a story.
              <br />
              <span>Let's make it count.</span>
            </h2>

            <p>
              Simplify academic management, understand student performance,
              and create meaningful learning journeys with AnkSetu.
            </p>
          </div>

          <div className="floating-illustration">
            <div className="illustration-orbit orbit-one" />
            <div className="illustration-orbit orbit-two" />

            <div className="floating-icon floating-icon-one">
              <BookOpen size={27} />
            </div>

            <div className="floating-icon floating-icon-two">
              <Heart size={27} />
            </div>

            <div className="floating-icon floating-icon-three">
              <Sparkles size={23} />
            </div>

            <div className="illustration-card">
              <div className="illustration-cap">
                <GraduationCap size={43} />
              </div>

              <h3>Learning. Growing. Achieving.</h3>
              <p>One step at a time.</p>

              <div className="illustration-progress">
                <span />
              </div>
            </div>
          </div>
        </div>

        <div className="branding-footer">
          <div className="branding-footer-icon">
            <CheckCircle2 size={17} />
          </div>
          <span>Making student progress easier to understand.</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand">
          <GraduationCap size={30} />
          <span>AnkSetu</span>
        </div>

        <div className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow">WELCOME TO ANKSETU</span>

            <h2>
              {mode === "signup" ? "Create your account" : "Welcome back"}
            </h2>

            <p>
              {mode === "signup"
                ? "A simpler way to manage academic progress."
                : "Sign in to continue to your dashboard."}
            </p>
          </div>

          <div className="role-selector">
            <button
              type="button"
              className={`role-option ${role === "teacher" ? "selected" : ""}`}
              onClick={() => changeRole("teacher")}
            >
              <div className="role-icon">
                <GraduationCap size={24} />
              </div>

              <div>
                <strong>Teacher</strong>
                <span>Academic access</span>
              </div>

              {role === "teacher" && (
                <CheckCircle2 className="role-check" size={21} />
              )}
            </button>

            <button
              type="button"
              className={`role-option ${role === "admin" ? "selected" : ""}`}
              onClick={() => changeRole("admin")}
            >
              <div className="role-icon">
                <ShieldCheck size={24} />
              </div>

              <div>
                <strong>Administrator</strong>
                <span>Management access</span>
              </div>

              {role === "admin" && (
                <CheckCircle2 className="role-check" size={21} />
              )}
            </button>
          </div>

          <div className="form-mode-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
            >
              Login
            </button>

            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => changeMode("signup")}
            >
              Sign Up
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${role}-${mode}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <form className="auth-form" onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <>
                    {inputField({
                      label: "Full Name",
                      field: "fullName",
                      placeholder: "Enter your full name",
                      icon: UserRound,
                      required: true,
                    })}

                    {inputField({
                      label: "Organisation Name",
                      field: "organisation",
                      placeholder: "Enter organisation name",
                      icon: Building2,
                      required: true,
                    })}
                  </>
                )}

                {inputField({
                  label: "Email Address",
                  field: "email",
                  placeholder: "Enter your email address",
                  icon: Mail,
                  type: "email",
                })}

                {inputField({
                  label: "Phone Number",
                  field: "phone",
                  placeholder: "Enter your phone number",
                  icon: Phone,
                  type: "tel",
                })}

                {passwordField({
                  label: "Password",
                  field: "password",
                  placeholder: "Enter your password",
                  visible: showPassword,
                  toggleVisibility: () =>
                    setShowPassword((prev) => !prev),
                })}

                {mode === "signup" && (
                  <>
                    {passwordField({
                      label: "Confirm Password",
                      field: "confirmPassword",
                      placeholder: "Re-enter your password",
                      visible: showConfirmPassword,
                      toggleVisibility: () =>
                        setShowConfirmPassword((prev) => !prev),
                    })}

                    <p className="approval-note">
                      <ShieldCheck size={17} />

                      Your teacher account will be activated after
                      administrator approval.
                    </p>
                  </>
                )}

                {mode === "login" && (
                  <div className="form-extras">
                    <label className="remember-label">
                      <input
                        type="checkbox"
                        checked={form.rememberMe}
                        onChange={(e) =>
                          updateField("rememberMe", e.target.checked)
                        }
                      />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      className="text-link"
                      onClick={() =>
                        showFeedback(
                          "Password recovery will be available after backend integration."
                        )
                      }
                    >
                      Forgot Password?
                    </button>
                  </div>
                )}

                {message && (
                  <div className={`form-message ${messageType}`}>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="submit-button"
                  disabled={isSubmitting}
                >
                  <span>
                    {isSubmitting
                      ? "Please wait..."
                      : mode === "signup"
                        ? "Create Account"
                        : "Login to AnkSetu"}
                  </span>

                  <ArrowRight size={19} />
                </button>
              </form>
            </motion.div>
          </AnimatePresence>

          <div className="auth-bottom">
            <p>
              {mode === "signup"
                ? "Already have an account?"
                : "Don't have an account?"}

              <button
                type="button"
                onClick={() =>
                  changeMode(mode === "signup" ? "login" : "signup")
                }
              >
                {mode === "signup" ? "Login" : "Sign Up"}
              </button>
            </p>

            <div className="auth-security">
              <ShieldCheck size={16} />
              <span>Your information is handled securely.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default AuthPage;
