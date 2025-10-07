import React, { useRef, useState } from "react";
import axios from "axios";
import "../styles/components/CreateAccount.css";
import { Snackbar, Alert, Slide } from "@mui/material";

function TransitionDown(props) {
  return <Slide {...props} direction="down" />;
}

const CreateAccountForm = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    confirmEmail: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "",
    workerType: "", // NEW
  });

  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const formRef = useRef(null);
  const confirmEmailRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const openToast = (message, severity = "info") =>
    setToast({ open: true, message, severity });
  const closeToast = (_, reason) => {
    if (reason === "clickaway") return;
    setToast((t) => ({ ...t, open: false }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "confirmEmail" && confirmEmailRef.current) {
      confirmEmailRef.current.setCustomValidity(
        value !== formData.email ? "Emails do not match." : ""
      );
    }
    if (name === "email" && confirmEmailRef.current) {
      confirmEmailRef.current.setCustomValidity(
        formData.confirmEmail && formData.confirmEmail !== value ? "Emails do not match." : ""
      );
    }
    if (name === "confirmPassword" && confirmPasswordRef.current) {
      confirmPasswordRef.current.setCustomValidity(
        value !== formData.password ? "Passwords do not match." : ""
      );
    }
    if (name === "password" && confirmPasswordRef.current) {
      confirmPasswordRef.current.setCustomValidity(
        formData.confirmPassword && formData.confirmPassword !== value ? "Passwords do not match." : ""
      );
    }

    // if user flips to PM, clear workerType so we don't send it accidentally
    if (name === "role" && value === "project_manager") {
      setFormData((prev) => ({ ...prev, workerType: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (confirmEmailRef.current) {
      confirmEmailRef.current.setCustomValidity(
        formData.confirmEmail !== formData.email ? "Emails do not match." : ""
      );
    }
    if (confirmPasswordRef.current) {
      confirmPasswordRef.current.setCustomValidity(
        formData.confirmPassword !== formData.password ? "Passwords do not match." : ""
      );
    }

    // Enforce workerType selection if role is worker
    if (formData.role === "worker" && !formData.workerType) {
      openToast("Please choose a worker type.", "error");
      return;
    }

    if (!formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        emailAddress: formData.email.trim(),
        phoneNumber: formData.phone.replace(/\D/g, ""),
        password: formData.password,
        role: formData.role.toLowerCase(), // "worker" | "project_manager"
        ...(formData.role === "worker" && { workerType: formData.workerType }), // "contractor" | "crew_member"
      };

      await axios.post("http://localhost:8080/api/auth/register", payload);

      openToast("Account created successfully!", "success");
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        confirmEmail: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "",
        workerType: "",
      });
      if (confirmEmailRef.current) confirmEmailRef.current.setCustomValidity("");
      if (confirmPasswordRef.current) confirmPasswordRef.current.setCustomValidity("");
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Registration failed";
      openToast(msg, "error");
    }
  };

  return (
    <>
      <form className="create-account-form" ref={formRef} onSubmit={handleSubmit}>
        <h1>Create Account</h1>

        <div className="input-row">
          <div className="input-field">
            <label htmlFor="firstName">First Name</label>
            <input
              type="text" id="firstName" name="firstName"
              value={formData.firstName} onChange={handleChange}
              required maxLength={50} title="First name is required"
            />
          </div>

          <div className="input-field">
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text" id="lastName" name="lastName"
              value={formData.lastName} onChange={handleChange}
              required maxLength={50} title="Last name is required"
            />
          </div>
        </div>

        <div className="input-field">
          <label htmlFor="email">Email</label>
          <input
            type="email" id="email" name="email"
            value={formData.email} onChange={handleChange}
            required title="Enter a valid email address"
          />
        </div>

        <div className="input-field">
          <label htmlFor="confirmEmail">Confirm Email</label>
          <input
            type="email" id="confirmEmail" name="confirmEmail"
            value={formData.confirmEmail} onChange={handleChange}
            ref={confirmEmailRef} required title="Emails must match"
          />
        </div>

        <div className="input-field">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel" id="phone" name="phone"
            value={formData.phone} onChange={handleChange}
            required inputMode="tel" pattern="\D*?(\d\D*){10,}"
            title="Enter at least 10 digits (e.g., 5551234567)" placeholder="(555) 555-5555"
          />
        </div>

        <div className="input-field">
          <label htmlFor="password">Password</label>
          <input
            type="password" id="password" name="password"
            value={formData.password} onChange={handleChange}
            required minLength={8} title="At least 8 characters"
          />
        </div>

        <div className="input-field">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password" id="confirmPassword" name="confirmPassword"
            value={formData.confirmPassword} onChange={handleChange}
            ref={confirmPasswordRef} required title="Passwords must match"
          />
        </div>

        {/* Role */}
        <div className="role-select">
          <div className="role-option">
            <input
              type="radio" id="worker" name="role" value="worker"
              checked={formData.role === "worker"} onChange={handleChange} required
            />
            <label htmlFor="worker">Worker</label>
          </div>
          <div className="role-option">
            <input
              type="radio" id="pm" name="role" value="project_manager"
              checked={formData.role === "project_manager"} onChange={handleChange} required
            />
            <label htmlFor="pm">Project Manager</label>
          </div>
        </div>

        {/* Worker Type (only visible when role=worker) */}
        {formData.role === "worker" && (
          <div className="role-select" style={{ marginTop: 8 }}>
            <div className="role-option">
              <input
                type="radio" id="contractor" name="workerType" value="contractor"
                checked={formData.workerType === "contractor"} onChange={handleChange}
              />
              <label htmlFor="contractor">Contractor</label>
            </div>
            <div className="role-option">
              <input
                type="radio" id="crew_member" name="workerType" value="crew_member"
                checked={formData.workerType === "crew_member"} onChange={handleChange}
              />
              <label htmlFor="crew_member">Crew Member</label>
            </div>
          </div>
        )}

        <button type="submit" className="butn">Create Account</button>
      </form>

      <Snackbar
        open={toast.open} autoHideDuration={4000} onClose={closeToast}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        TransitionComponent={TransitionDown}
      >
        <Alert onClose={closeToast} severity={toast.severity} variant="filled"
          sx={{ width: "100%", textAlign: "center", fontWeight: "bold", borderRadius: "8px", boxShadow: 3 }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default CreateAccountForm;