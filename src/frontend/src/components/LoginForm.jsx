import React, { useRef, useState } from "react";
import { Snackbar, Alert, Fade } from "@mui/material";
import { FaUser, FaLock } from "react-icons/fa";
import "../styles/components/LoginForm.css";
import { useNavigate } from "react-router-dom";
import {authAPI} from "../services/api";

const LoginForm = () => {
  const [formData, setFormData] = useState({
    emailAddress: "",
    password: "",
  });

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "info", // 'success' | 'error' | 'warning' | 'info'
  });

  const navigate = useNavigate();
  const formRef = useRef(null);

  const openToast = (message, severity = "info") =>
    setToast({ open: true, message, severity });

  const closeToast = (_, reason) => {
    if (reason === "clickaway") return;
    setToast((t) => ({ ...t, open: false }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // HTML5 form validation
    if (!formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.emailAddress.trim())) {
      openToast("Please enter a valid email address", "error");
      return;
    }

    // Password length validation
    if (formData.password.length < 6) {
      openToast("Password must be at least 6 characters", "error");
      return;
    }

    try {
      const res = await authAPI.login({
        emailAddress: formData.emailAddress.trim(),
        password: formData.password,
      });
      
      localStorage.setItem('accessToken', res.data.accessToken);
      
      openToast("Login successful! Redirecting...", "success");
      console.log("Logged in user:", res.data.user);
      
      // Delay navigation to show success message
      setTimeout(() => {
        navigate('/projects');
      }, 1000);
      
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Login failed. Please check your credentials.';
      openToast(errorMessage, "error");
    }
  };

  return (
    <div className="wrapper">
      <h2 style={styles.title}>Login</h2>

      <form className="login-form" ref={formRef} onSubmit={handleSubmit}>
        <div className="input-box">
          <input
            type="email"
            name="emailAddress"
            placeholder='Email Address'
            value={formData.emailAddress}
            onChange={handleChange}
            required
            style={styles.input}
          />
          <span className="input-icon"><FaUser /></span>
        </div>
        <div className='input-box'>
          <input
            type="password"
            name="password"
            placeholder='Password'
            value={formData.password}
            onChange={handleChange}
            required
            minLength={6}
            style={styles.input}
          />
          <span className="input-icon"><FaLock /></span>
        </div>
        <button
          type="submit"
          className='btn'
        > 
          Sign In 
        </button>
        <div className="forgot-password">
          <button
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="forgot-btn"
          >
            Forgot Password?
          </button>
        </div>
      </form>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={closeToast}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        TransitionComponent={Fade}
        style={{ top: '0px' }}
      >
        <Alert
          onClose={closeToast}
          severity={toast.severity}
          variant="filled"
          sx={{
            width: '100%',
            minWidth: '300px',
            background: toast.severity === 'error' 
              ? 'rgba(255, 105, 97, 0.15)' 
              : toast.severity === 'success' 
              ? 'rgba(119, 221, 119, 0.15)' 
              : toast.severity === 'warning'
              ? 'rgba(188, 128, 86, 0.15)'
              : 'rgba(86, 146, 188, 0.15)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: toast.severity === 'error'
              ? '2px solid #FF6961'
              : toast.severity === 'success'
              ? '2px solid #77DD77'
              : toast.severity === 'warning'
              ? '2px solid #bc8056'
              : '2px solid #5692bc',
            color: toast.severity === 'error'
              ? '#FF6961'
              : toast.severity === 'success'
              ? '#77DD77'
              : toast.severity === 'warning'
              ? '#bc8056'
              : '#5692bc',
            fontWeight: '600',
            fontSize: '0.95rem',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            '& .MuiAlert-icon': {
              color: toast.severity === 'error'
                ? '#FF6961'
                : toast.severity === 'success'
                ? '#77DD77'
                : toast.severity === 'warning'
                ? '#bc8056'
                : '#5692bc',
              fontSize: '1.3rem'
            },
            '& .MuiAlert-action': {
              color: toast.severity === 'error'
                ? '#FF6961'
                : toast.severity === 'success'
                ? '#77DD77'
                : toast.severity === 'warning'
                ? '#bc8056'
                : '#5692bc',
            }
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

const styles = {
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#2c3e50',
  },
  input: {
    outline: 'none',
  }
};

export default LoginForm;