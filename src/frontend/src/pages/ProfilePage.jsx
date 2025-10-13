import React, { useState, useEffect } from "react";
import UserNavbar from "../components/UserNavbar";
import {authAPI} from "../services/api";

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const user = await authAPI.me()
            setUser(user);
        } catch (err) {
            console.error("Error fetching profile:", err);
            setError("Failed to load profile data.");
        } finally {
            setLoading(false);
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
    },
    cardTitle: {
        fontSize: "1.8rem",
        marginBottom: "1.5rem",
        textAlign: "center",
        color: "#0052D4",
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
};

export default ProfilePage;
