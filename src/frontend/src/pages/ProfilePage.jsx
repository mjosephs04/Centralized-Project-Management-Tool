import React, { useState, useEffect } from "react";
import UserNavbar from "../components/UserNavbar";
import NotificationSettings from "../components/NotificationSettings";
import { authAPI } from "../services/api";
import { useNavigate } from "react-router-dom";
import { useSnackbar } from "../contexts/SnackbarContext";
import { FaEdit, FaSave, FaTimes, FaCamera } from "react-icons/fa";

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
        showSnackbar("Changes discarded", "info");
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

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            setUploading(true);
            const res = await authAPI.uploadProfilePic(formData)

            const data = res.data;
            
            setUser((prev) => ({ ...prev, profileImageUrl: data.profileImageUrl }));
            showSnackbar("Profile picture updated successfully!", "success");
        } catch (err) {
            console.error("Upload failed:", err);
            showSnackbar("Failed to upload profile picture", "error");
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
                </div>

                {loading ? (
                    <div style={styles.centerContent}>
                        <div style={styles.loader}>Loading profile...</div>
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
                        {/* Profile Picture Section */}
                        <div style={styles.profilePicContainer}>
                            <div style={styles.profilePicWrapper}>
                                <img
                                    src={user.profileImageUrl}
                                    alt="Profile"
                                    style={styles.profilePic}
                                />
                                <label htmlFor="fileUpload" style={styles.uploadOverlay}>
                                    <FaCamera style={styles.cameraIcon} />
                                    <input
                                        id="fileUpload"
                                        type="file"
                                        accept="image/*"
                                        style={{ display: "none" }}
                                        onChange={handleUpload}
                                        disabled={uploading}
                                    />
                                </label>
                                {uploading && <div style={styles.uploadingOverlay}>Uploading...</div>}
                            </div>
                        </div>

                        {!isEditing ? (
                            <>
                                <h3 style={styles.cardTitle}>
                                    {user.firstName} {user.lastName}
                                </h3>
                                <div style={styles.roleTag}>
                                    {formatRole(user.role)}
                                </div>

                                <div style={styles.infoSection}>
                                    <div style={styles.infoRow}>
                                        <span style={styles.infoLabel}>First Name</span>
                                        <span style={styles.infoValue}>{user.firstName}</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.infoLabel}>Last Name</span>
                                        <span style={styles.infoValue}>{user.lastName}</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.infoLabel}>Email</span>
                                        <span style={styles.infoValue}>{user.emailAddress}</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.infoLabel}>Phone Number</span>
                                        <span style={styles.infoValue}>{user.phoneNumber || "Not provided"}</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.infoLabel}>Worker Type</span>
                                        <span style={styles.infoValue}>{formatWorkerType(user.workerType)}</span>
                                    </div>
                                    <div style={styles.infoRow}>
                                        <span style={styles.infoLabel}>Account Created</span>
                                        <span style={styles.infoValue}>{new Date(user.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div style={styles.buttonContainer}>
                                    <button onClick={handleEdit} style={styles.editButton}>
                                        <FaEdit style={styles.buttonIcon} />
                                        Edit Profile
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 style={styles.cardTitle}>Edit Profile</h3>
                                
                                <div style={styles.formSection}>
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>First Name</label>
                                        <input
                                            type="text"
                                            value={formData.firstName}
                                            onChange={(e) => handleInputChange("firstName", e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                    
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Last Name</label>
                                        <input
                                            type="text"
                                            value={formData.lastName}
                                            onChange={(e) => handleInputChange("lastName", e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                    
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Email</label>
                                        <input
                                            type="email"
                                            value={formData.emailAddress}
                                            onChange={(e) => handleInputChange("emailAddress", e.target.value)}
                                            style={styles.input}
                                        />
                                    </div>
                                    
                                    <div style={styles.formGroup}>
                                        <label style={styles.label}>Phone Number</label>
                                        <input
                                            type="tel"
                                            value={formData.phoneNumber}
                                            onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                                            style={styles.input}
                                            placeholder="Not provided"
                                        />
                                    </div>
                                </div>
                                
                                <div style={styles.buttonContainer}>
                                    <button 
                                        onClick={handleSave} 
                                        style={styles.saveButton}
                                        disabled={saving}
                                    >
                                        <FaSave style={styles.buttonIcon} />
                                        {saving ? "Saving..." : "Save Changes"}
                                    </button>
                                    <button 
                                        onClick={handleCancel} 
                                        style={styles.cancelButton}
                                        disabled={saving}
                                    >
                                        <FaTimes style={styles.buttonIcon} />
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Notification Settings - Only for Project Managers */}
                {!loading && !error && user && user.role === "project_manager" && (
                    <div style={styles.settingsSection}>
                        <NotificationSettings />
                    </div>
                )}
            </div>
        </>
    );
};

const styles = {
    pageContainer: {
        padding: "2rem 8rem",
        backgroundColor: "#fff4ed",
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
        fontWeight: "700",
        color: "#2c3e50",
        margin: 0,
    },
    profileCard: {
        backgroundColor: "white",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        padding: "2.5rem 3rem",
        maxWidth: "700px",
        margin: "0 auto",
    },
    cardTitle: {
        fontSize: "1.8rem",
        fontWeight: "700",
        marginTop: "0.5rem",
        marginBottom: "0.5rem",
        color: "#2c3e50",
        textAlign: "center",
    },
    roleTag: {
        display: "inline-block",
        padding: "0.4rem 1rem",
        backgroundColor: "#5692bc",
        color: "white",
        borderRadius: "20px",
        fontSize: "0.85rem",
        fontWeight: "600",
        textAlign: "center",
        marginBottom: "1.5rem",
        width: "fit-content",
        marginLeft: "auto",
        marginRight: "auto",
        display: "flex",
        justifyContent: "center",
    },
    profilePicContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "1.5rem",
    },
    profilePicWrapper: {
        position: "relative",
        width: "150px",
        height: "150px",
    },
    profilePic: {
        width: "150px",
        height: "150px",
        borderRadius: "50%",
        objectFit: "cover",
        border: "4px solid #5692bc",
        boxShadow: "0 4px 12px rgba(86, 146, 188, 0.3)",
    },
    uploadOverlay: {
        position: "absolute",
        bottom: "8px",
        right: "8px",
        width: "40px",
        height: "40px",
        backgroundColor: "#5692bc",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
        transition: "all 0.2s ease",
        border: "3px solid white",
    },
    cameraIcon: {
        color: "white",
        fontSize: "16px",
    },
    uploadingOverlay: {
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: "0.85rem",
        fontWeight: "600",
    },
    infoSection: {
        margin: "1.5rem 0",
    },
    infoRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0.9rem 1rem",
        margin: "0.4rem 0",
        backgroundColor: "#f9fafb",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
    },
    infoLabel: {
        fontSize: "0.95rem",
        fontWeight: "600",
        color: "#6b7280",
    },
    infoValue: {
        fontSize: "0.95rem",
        fontWeight: "500",
        color: "#2c3e50",
    },
    centerContent: {
        textAlign: "center",
        padding: "4rem",
        fontSize: "1.1rem",
        color: "#6b7280",
    },
    loader: {
        fontSize: "1.1rem",
        color: "#5692bc",
        fontWeight: "500",
    },
    errorText: {
        color: "#dc2626",
        marginBottom: "1rem",
        fontSize: "1rem",
    },
    retryButton: {
        padding: "0.8rem 1.5rem",
        backgroundColor: "#5692bc",
        color: "white",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "1rem",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 4px rgba(86, 146, 188, 0.2)",
    },
    buttonContainer: {
        display: "flex",
        gap: "1rem",
        justifyContent: "center",
        marginTop: "2rem",
    },
    buttonIcon: {
        marginRight: "0.5rem",
        fontSize: "0.9rem",
    },
    editButton: {
        backgroundColor: "#5692bc",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.8rem 1.5rem",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "1rem",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 4px rgba(86, 146, 188, 0.2)",
    },
    saveButton: {
        backgroundColor: "#77DD77",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.8rem 1.5rem",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "1rem",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 4px rgba(119, 221, 119, 0.2)",
    },
    cancelButton: {
        backgroundColor: "white",
        color: "#bc8056",
        border: "2px solid #bc8056",
        borderRadius: "8px",
        padding: "0.8rem 1.5rem",
        cursor: "pointer",
        fontWeight: "600",
        fontSize: "1rem",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    formSection: {
        margin: "1.5rem 0",
    },
    formGroup: {
        margin: "1.2rem 0",
        textAlign: "left",
    },
    label: {
        display: "block",
        marginBottom: "0.5rem",
        fontWeight: "600",
        color: "#2c3e50",
        fontSize: "0.95rem",
    },
    input: {
        width: "100%",
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        border: "2px solid #e5e7eb",
        fontSize: "0.95rem",
        boxSizing: "border-box",
        transition: "border-color 0.2s ease",
        outline: "none",
    },
    settingsSection: {
        marginTop: "2rem",
    },
};

export default ProfilePage;
