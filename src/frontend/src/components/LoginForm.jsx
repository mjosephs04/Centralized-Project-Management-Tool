import React, { useRef, useState } from "react";
import { Typography, Snackbar, Alert, Slide } from "@mui/material";
import { FaUser, FaLock } from "react-icons/fa";
import "../styles/components/LoginForm.css";
import { useNavigate } from "react-router-dom";
import {authAPI} from "../services/api";

function TransitionDown(props) {
  return <Slide {...props} direction="down" />;
}

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


  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

    try {

            const res = await authAPI.login({
                emailAddress: formData.emailAddress.trim(),
                password: formData.password,
            });
            localStorage.setItem('accessToken', res.data.accessToken);

            setSuccess("Login Successful!");
            console.log("Logged in user:", res.data.user);
            navigate('/projects')
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Login Failed');
        }
    };


    return (
        <div className="wrapper">
            <Typography variant="h5" component="h2" gutterBottom align="center" fontSize={40} fontWeight={'bold'}>
                Login
            </Typography>

            {error && <p className="error">{error}</p>}
            {success && <p className="success">{success}</p>}

            <form className="login-form" ref={formRef} onSubmit={handleSubmit}>
                <div className="input-box">
                    <input
                        type="text"
                        name="emailAddress"
                        placeholder='Email Address'
                        value={formData.emailAddress}
                        onChange={handleChange}
                        required
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
                />
                    <span className="input-icon"><FaLock /></span>
                </div>
                <button
                    type="submit"
                    className='btn'
                > Sign In </button>
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

          {/* Centered Snackbar with slide-down transition */}
          <Snackbar
            open={toast.open}
            autoHideDuration={3500}
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
    </div>
  );
};

export default LoginForm;