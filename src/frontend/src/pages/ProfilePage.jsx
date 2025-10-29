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
    const navigate = useNavigate();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await authAPI.me();
            setUser(data);
        } catch (err) {
            console.error("Error fetching profile:", err);
            setError("Failed to load profile data.");
            showSnackbar("Failed to load profile data", "error");
        } finally {
            setLoading(false);
        }
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

                        <h3 style={styles.cardTitle}>
                            {user.firstName} {user.lastName}
                        </h3>

                        <div style={styles.infoRow}>
                            <strong>Email:</strong> <span>{user.emailAddress}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <strong>Phone Number:</strong>{" "}
                            <span>{user.phoneNumber || "Not provided"}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <strong>Worker Type:</strong> <span>{user.workerType}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <strong>Role:</strong> <span>{user.role}</span>
                        </div>
                        <div style={styles.infoRow}>
                            <strong>Account Created:</strong>{" "}
                            <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
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
};

export default ProfilePage;
