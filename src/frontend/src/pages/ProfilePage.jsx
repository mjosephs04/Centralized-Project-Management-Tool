import React, { useState, useEffect } from "react";
import UserNavbar from "../components/UserNavbar";
import { authAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../contexts/SnackbarContext";

const ProfilePage = () => {
    const { showSnackbar } = useSnackbar();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        emailAddress: "",
        phoneNumber: ""
    });
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await authAPI.me();
            setUser(data);
            setFormData({
                firstName: data.firstName || "",
                lastName: data.lastName || "",
                emailAddress: data.emailAddress || "",
                phoneNumber: data.phoneNumber || ""
            });
        } catch (err) {
            console.error("Error fetching profile:", err);
            setError("Failed to load profile data.");
            showSnackbar("Failed to load profile data", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
    };

    const handleCancel = () => {
        setIsEditing(false);
        if (user) {
            setFormData({
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                emailAddress: user.emailAddress || "",
                phoneNumber: user.phoneNumber || ""
            });
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const updatedUser = await authAPI.updateProfile(formData);
            setUser(updatedUser);
            setIsEditing(false);
            showSnackbar("Profile updated successfully", "success");
        } catch (err) {
            console.error("Error updating profile:", err);
            const errorMessage = err.response?.data?.error || "Failed to update profile";
            showSnackbar(errorMessage, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const formatRole = (role) => {
        if (!role) return "Not set";
        const roleMap = {
            "project_manager": "Project Manager",
            "worker": "Worker",
            "admin": "Admin"
        };
        return roleMap[role] || role;
    };

    const formatWorkerType = (workerType) => {
        if (!workerType) return "Not set";
        const workerTypeMap = {
            "crew_member": "Crew Member",
            "contractor": "Contractor"
        };
        return workerTypeMap[workerType] || workerType;
    };

    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        showSnackbar("Successfully logged out", "info");
        navigate("/login");
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            setUploading(true);
            const res = await authAPI.uploadProfilePic(formData)

            const data =  res.data;
            // if (!res.ok) throw new Error(data.error || "Upload failed");

            // Update the user’s profile image in state
            setUser((prev) => ({ ...prev, profileImageUrl: data.profileImageUrl }));
            alert("Profile picture updated successfully!");
        } catch (err) {
            console.error("Upload failed:", err);
            alert(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <UserNavbar />
            <div style={styles.pageContainer}>
                <div style={styles.header}>
                    <h2 style={styles.pageTitle}>My Profile</h2>
                    <button onClick={handleLogout} style={styles.logoutButton}>
                        Logout
                    </button>
                </div>

                {loading ? (
                    <div style={styles.centerContent}>
                        <p>Loading profile...</p>
                    </div>
                ) : error ? (
                    <div style={styles.centerContent}>
                        <p style={styles.errorText}>{error}</p>
                        <button onClick={fetchProfile} style={styles.retryButton}>
                            Retry
                        </button>
                    </div>
                ) : (
                    <div style={styles.profileCard}>
                        {/* 🧍 Profile Picture Section */}
                        <div style={styles.profilePicContainer}>
                            <img
                                src={user.profileImageUrl}
                                alt="Profile"
                                style={styles.profilePic}
                            />
                            <label htmlFor="fileUpload" style={styles.uploadButton}>
                                {uploading ? "Uploading..." : "Upload Photo"}
                            </label>
                            <input
                                id="fileUpload"
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleUpload}
                            />
                        </div>

                        {!isEditing ? (
                            <>
                                <h3 style={styles.cardTitle}>
                                    {user.firstName} {user.lastName}
                                </h3>

                                <div style={styles.infoRow}>
                                    <strong>First Name:</strong> <span>{user.firstName}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <strong>Last Name:</strong> <span>{user.lastName}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <strong>Email:</strong> <span>{user.emailAddress}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <strong>Phone Number:</strong>{" "}
                                    <span>{user.phoneNumber || "Not provided"}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <strong>Worker Type:</strong> <span>{formatWorkerType(user.workerType)}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <strong>Role:</strong> <span>{formatRole(user.role)}</span>
                                </div>
                                <div style={styles.infoRow}>
                                    <strong>Account Created:</strong>{" "}
                                    <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div style={styles.buttonContainer}>
                                    <button onClick={handleEdit} style={styles.editButton}>
                                        Edit Profile
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={styles.cardTitle}>Edit Profile</h3>
                                
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>First Name:</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                                
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Last Name:</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => handleInputChange("lastName", e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                                
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Email:</label>
                                    <input
                                        type="email"
                                        value={formData.emailAddress}
                                        onChange={(e) => handleInputChange("emailAddress", e.target.value)}
                                        style={styles.input}
                                    />
                                </div>
                                
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Phone Number:</label>
                                    <input
                                        type="tel"
                                        value={formData.phoneNumber}
                                        onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                                        style={styles.input}
                                        placeholder="Not provided"
                                    />
                                </div>
                                
                                <div style={styles.buttonContainer}>
                                    <button 
                                        onClick={handleSave} 
                                        style={styles.saveButton}
                                        disabled={saving}
                                    >
                                        {saving ? "Saving..." : "Save"}
                                    </button>
                                    <button 
                                        onClick={handleCancel} 
                                        style={styles.cancelButton}
                                        disabled={saving}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

const styles = {
    pageContainer: {
        padding: "2rem 8rem",
        backgroundColor: "#f8f0fa",
        fontFamily: "sans-serif",
        minHeight: "100vh",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
    },
    pageTitle: {
        fontSize: "2rem",
        color: "#333",
        margin: 0,
    },
    profileCard: {
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        padding: "2rem 3rem",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center",
    },
    cardTitle: {
        fontSize: "1.8rem",
        marginTop: "1.2rem",
        marginBottom: "1.5rem",
        color: "#0052D4",
    },
    profilePicContainer: {
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "1rem",
    },
    profilePic: {
        width: "130px",
        height: "130px",
        borderRadius: "50%",
        objectFit: "cover",
        border: "3px solid #e5e7eb",
        marginBottom: "1rem",
    },
    uploadButton: {
        backgroundColor: "#0052D4",
        color: "white",
        padding: "0.5rem 1rem",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "0.9rem",
        transition: "background 0.2s ease-in-out",
    },
    infoRow: {
        margin: "0.7rem 0",
        fontSize: "1.1rem",
        color: "#333",
        display: "flex",
        justifyContent: "space-between",
    },
    centerContent: {
        textAlign: "center",
        padding: "4rem",
        fontSize: "1.1rem",
        color: "#6b7280",
    },
    errorText: {
        color: "#dc2626",
        marginBottom: "1rem",
    },
    retryButton: {
        padding: "0.8rem 1.5rem",
        backgroundColor: "#0052D4",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "1rem",
    },
    logoutButton: {
        backgroundColor: "#dc2626",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.8rem 1.5rem",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "1rem",
        transition: "background-color 0.2s ease-in-out",
    },
    buttonContainer: {
        display: "flex",
        gap: "1rem",
        justifyContent: "center",
        marginTop: "2rem",
    },
    editButton: {
        backgroundColor: "#0052D4",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.8rem 1.5rem",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "1rem",
        transition: "background-color 0.2s ease-in-out",
    },
    saveButton: {
        backgroundColor: "#10b981",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.8rem 1.5rem",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "1rem",
        transition: "background-color 0.2s ease-in-out",
    },
    cancelButton: {
        backgroundColor: "#6b7280",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.8rem 1.5rem",
        cursor: "pointer",
        fontWeight: "bold",
        fontSize: "1rem",
        transition: "background-color 0.2s ease-in-out",
    },
    formGroup: {
        margin: "1rem 0",
        textAlign: "left",
    },
    label: {
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: "bold",
        color: "#333",
        fontSize: "1rem",
    },
    input: {
        width: "100%",
        padding: "0.75rem",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        fontSize: "1rem",
        boxSizing: "border-box",
    },
    select: {
        width: "100%",
        padding: "0.75rem",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        fontSize: "1rem",
        boxSizing: "border-box",
        backgroundColor: "white",
    },
};

export default ProfilePage;
