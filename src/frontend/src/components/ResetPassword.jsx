import React, { useRef, useState, useEffect } from "react";
import { Typography, Snackbar, Alert, Slide } from "@mui/material";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import backgroundImg from '../imgs/OnePager.png';
import "../styles/pages/LoginPage.css";
import "../styles/components/LoginForm.css";
import { authAPI } from "../services/api";

function TransitionDown(props) {
  return <Slide {...props} direction="down" />;
}

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState("");
  const [imageLoaded, setImageLoaded] = useState(false);
  const formRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const img = new Image();
    img.src = backgroundImg;
    img.onload = () => setImageLoaded(true);
  }, []);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setLoading(false);
        setTokenValid(false);
        openToast("No reset token provided", "error");
        return;
      }

      try {
        const response = await authAPI.validateResetToken(token);
        if (response.valid) {
          setTokenValid(true);
          setEmail(response.email || "");
        } else {
          setTokenValid(false);
          openToast(response.error || "Invalid or expired reset token", "error");
        }
      } catch (err) {
        console.error(err);
        setTokenValid(false);
        openToast("Failed to validate reset token", "error");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const openToast = (message, severity = "info") =>
    setToast({ open: true, message, severity });
  const closeToast = (_, reason) => {
    if (reason === "clickaway") return;
    setToast((t) => ({ ...t, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

    if (password !== confirmPassword) {
      openToast("Passwords do not match", "error");
      return;
    }

    if (password.length < 6) {
      openToast("Password must be at least 6 characters long", "error");
      return;
    }

    try {
      setSubmitting(true);
      await authAPI.resetPassword({
        token: token,
        password: password,
      });
      openToast("Password reset successfully! Redirecting to login...", "success");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Unable to reset password. Please try again.";
      openToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        className="login-page"
        style={{
          backgroundImage: imageLoaded ? `url(${backgroundImg})` : 'none',
        }}
      >
        <div className="form-wrapper">
          <div className="wrapper">
            <Typography variant="h5" component="h2" align="center" fontSize={36} fontWeight={"bold"}>
              Validating reset token...
            </Typography>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div
        className="login-page"
        style={{
          backgroundImage: imageLoaded ? `url(${backgroundImg})` : 'none',
        }}
      >
        <div className="form-wrapper">
          <div className="wrapper">
            <Typography variant="h5" component="h2" align="center" fontSize={36} fontWeight={"bold"}>
              Invalid Reset Link
            </Typography>
            <p style={{ textAlign: "center", marginTop: "1rem", color: "#666" }}>
              This password reset link is invalid or has expired.
            </p>
            <div className="forgot-password" style={{ marginTop: 24 }}>
              <Link to="/forgot-password">
                <button type="button" className="btn">Request New Reset Link</button>
              </Link>
            </div>
            <div className="forgot-password" style={{ marginTop: 12 }}>
              <Link to="/login">
                <button type="button">Back to Login</button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="login-page"
        style={{
          backgroundImage: imageLoaded ? `url(${backgroundImg})` : 'none',
        }}
      >
        <div className="top-right">
          <button className="create-account" onClick={() => navigate("/create-account")}>
            Create Account
          </button>
        </div>

        <div className="form-wrapper">
          <div className="wrapper">
            <Typography
              variant="h5"
              component="h2"
              gutterBottom
              align="center"
              fontSize={36}
              fontWeight={"bold"}
            >
              Reset Password
            </Typography>
            {email && (
              <Typography
                variant="body2"
                align="center"
                style={{ marginBottom: "1rem", color: "#666" }}
              >
                Reset password for {email}
              </Typography>
            )}

            <form className="login-form" ref={formRef} onSubmit={handleSubmit}>
              <div className="input-box">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  title="Password must be at least 6 characters long"
                />
                <span className="input-icon">
                  <FaLock />
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "45px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#666",
                    padding: "0.5rem",
                  }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="input-box">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  title="Passwords must match"
                />
                <span className="input-icon">
                  <FaLock />
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "45px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#666",
                    padding: "0.5rem",
                  }}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Resetting..." : "Reset Password"}
              </button>

              <div className="forgot-password" style={{ marginTop: 12 }}>
                <Link to="/login">
                  <button type="button">Back to Login</button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Centered dropdown window */}
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={closeToast}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        TransitionComponent={TransitionDown}
      >
        <Alert
          onClose={closeToast}
          severity={toast.severity}
          variant="filled"
          sx={{
            width: "100%",
            textAlign: "center",
            fontWeight: "bold",
            borderRadius: "8px",
            boxShadow: 3,
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ResetPassword;

