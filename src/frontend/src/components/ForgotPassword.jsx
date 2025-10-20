import React, { useRef, useState } from "react";
import axios from "axios";
import { Typography, Snackbar, Alert, Slide } from "@mui/material";
import { FaUser } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";


import "../styles/pages/LoginPage.css";
import "../styles/components/LoginForm.css";
import {authAPI} from "../services/api";

function TransitionDown(props) {
  return <Slide {...props} direction="down" />;
}

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);
  const navigate = useNavigate();

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
    try {
      setSubmitting(true);
      await authAPI.forgotPassword({
        emailAddress: email.trim(),
      })
      openToast("If an account exists for that email, a reset link was sent.", "success");
      setEmail("");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Unable to process request. Please try again.";
      openToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {}
      <div className="login-page">
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
              Forgot Password
            </Typography>

            <form className="login-form" ref={formRef} onSubmit={handleSubmit}>
              <div className="input-box">
                <input
                  type="email"
                  name="emailAddress"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  title="Enter a valid email address"
                />
                <span className="input-icon">
                  <FaUser />
                </span>
              </div>

              <button type="submit" className="btn" disabled={submitting}>
                {submitting ? "Sending..." : "Send Reset Link"}
              </button>

              <div className="forgot-password" style={{ marginTop: 12 }}>
                <Link to="/login/">
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

export default ForgotPassword;