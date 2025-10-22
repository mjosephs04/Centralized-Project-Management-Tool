import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Snackbar, Alert, Slide } from "@mui/material";
import { authAPI } from "../services/api";
import "../styles/components/CreateAccount.css";

function TransitionDown(props) {
  return <Slide {...props} direction="down" />;
}

const RegisterWithTokenForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [invitationData, setInvitationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: "", severity: "info" });

  const formRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const openToast = (message, severity = "info") =>
    setToast({ open: true, message, severity });
  const closeToast = (_, reason) => {
    if (reason === "clickaway") return;
    setToast((t) => ({ ...t, open: false }));
  };

  // Validate invitation token on component mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        openToast("No invitation token provided", "error");
        setLoading(false);
        return;
      }

      try {
        const response = await authAPI.validateInvitationToken(token);
        if (response.valid) {
          setInvitationData(response.invitation);
        } else {
          openToast("Invalid or expired invitation token", "error");
        }
      } catch (error) {
        console.error("Token validation error:", error);
        openToast("Invalid or expired invitation token", "error");
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const formatPhoneDisplay = (value) => {
    const phoneNumber = value.replace(/\D/g, "");
    
    if (phoneNumber.length === 0) {
      return "";
    } else if (phoneNumber.length <= 3) {
      return `(${phoneNumber}`;
    } else if (phoneNumber.length <= 6) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    } else {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (confirmPasswordRef.current) {
      confirmPasswordRef.current.setCustomValidity(
        formData.confirmPassword !== formData.password ? "Passwords do not match." : ""
      );
    }

    if (!formRef.current.checkValidity()) {
      formRef.current.reportValidity();
      return;
    }

    try {
      const payload = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phoneNumber: formData.phone,
        password: formData.password,
        invitationToken: token,
      };

      await authAPI.registerWithInvitation(payload);

      openToast("Account created successfully! Redirecting to login...", "success");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Registration failed";
      openToast(msg, "error");
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'worker': return 'Worker';
      case 'project_manager': return 'Project Manager';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  const getWorkerTypeDisplayName = (workerType) => {
    switch (workerType) {
      case 'crew_member': return 'Crew Member';
      case 'contractor': return 'Contractor';
      default: return workerType;
    }
  };

  if (loading) {
    return (
      <div className="create-account-form" style={{ textAlign: 'center', padding: '2rem' }}>
        <h1>Validating Invitation...</h1>
        <div style={{ fontSize: '16px', color: '#666', marginTop: '1rem' }}>
          Please wait while we validate your invitation.
        </div>
      </div>
    );
  }

  if (!invitationData) {
    return (
      <div className="create-account-form" style={{ textAlign: 'center', padding: '2rem' }}>
        <h1>Invalid Invitation</h1>
        <div style={{ fontSize: '16px', color: '#666', marginTop: '1rem', marginBottom: '2rem' }}>
          This invitation link is invalid or has expired.
        </div>
        <button 
          className="butn" 
          onClick={() => navigate('/login')}
          style={{ width: 'auto', padding: '0.75rem 2rem' }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <>
      <form className="create-account-form" ref={formRef} onSubmit={handleSubmit}>
        <h1>Complete Your Registration</h1>
        
        {/* Invitation Details */}
        <div style={{
          backgroundColor: 'rgba(106, 151, 196, 0.1)',
          border: '2px solid rgba(106, 151, 196, 0.3)',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '0.5rem' }}>
            You've been invited to join:
          </div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: '#6a97c4', marginBottom: '0.5rem' }}>
            {invitationData.project?.name || 'Project'}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Role: <strong>{getRoleDisplayName(invitationData.role)}</strong>
            {invitationData.workerType && (
              <span> • Type: <strong>{getWorkerTypeDisplayName(invitationData.workerType)}</strong></span>
            )}
          </div>
        </div>

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
            value={invitationData.email}
            disabled
            style={{ backgroundColor: '#f5f5f5', color: '#666' }}
            title="Email is set from your invitation"
          />
        </div>

        <div className="input-field">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel" 
            id="phone" 
            name="phone"
            value={formatPhoneDisplay(formData.phone)} 
            onChange={handleChange}
            required 
            inputMode="tel" 
            pattern="\D*?(\d\D*){10,}"
            title="Enter at least 10 digits" 
            placeholder="(555) 555-5555"
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

        <button type="submit" className="butn">Complete Registration</button>
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

export default RegisterWithTokenForm;
