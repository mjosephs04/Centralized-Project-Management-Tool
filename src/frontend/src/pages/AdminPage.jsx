import React, { useEffect, useState } from "react";
import { FaPlus, FaSave, FaTimes, FaTrash, FaUser } from "react-icons/fa";
import UserNavbar from "../components/UserNavbar";
import {authAPI, usersAPI} from "../services/api";

const AdminPage = () => {
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newUser, setNewUser] = useState({
        firstName: "",
        lastName: "",
        emailAddress: "",
        role: "worker",
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const data = await usersAPI.getAllUsers();
            setUsers(data || []);
        } catch (err) {
            console.error("Error fetching users:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async () => {
        const { firstName, lastName, emailAddress, role } = newUser;
        if (!firstName || !lastName || !emailAddress) {
            alert("Please fill out all fields");
            return;
        }

        try {
            const payload = JSON.stringify({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                emailAddress: emailAddress.trim(),
                phoneNumber: "+10000000000",
                password: "testPass",
                role,
            });


            const res = await authAPI.register(payload);
            const data = res.data;
            if (res.status !== 201) throw new Error(data.error || "Failed to add user");

            setUsers((prev) => [data.user, ...prev]);
            setShowModal(false);
            setNewUser({ firstName: "", lastName: "", emailAddress: "", role: "worker" });
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;
        try {
            const res = await usersAPI.deleteUser(id);
            if (res.status !== 200) throw new Error(res.data.error || "Failed to delete user");
            setUsers((prev) => prev.filter((u) => u.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <>
            <UserNavbar />
            <div style={styles.container}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Users</h2>
                    <button style={styles.addButton} onClick={() => setShowModal(true)}>
                        <FaPlus /> Add User
                    </button>
                </div>

                {loading ? (
                    <p>Loading users...</p>
                ) : users.length === 0 ? (
                    <div style={styles.emptyState}>
                        <FaUser style={styles.emptyIcon} />
                        <p style={styles.emptyText}>No users found.</p>
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                        <tr>
                            <th style={styles.th}>Name</th>
                            <th style={styles.th}>Email</th>
                            <th style={styles.th}>Role</th>
                            <th style={styles.th}>Active</th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td style={styles.td}>
                                    {user.firstName} {user.lastName}
                                </td>
                                <td style={styles.td}>{user.emailAddress}</td>
                                <td style={styles.td}>{user.role}</td>
                                <td style={styles.td}>
                    <span
                        style={{
                            color: user.isActive ? "green" : "gray",
                            fontWeight: 600,
                            textTransform: "capitalize",
                        }}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                                </td>
                                <td style={styles.td}>
                                    <button
                                        style={{
                                            ...styles.actionButton,
                                            backgroundColor: "#fef2f2",
                                            color: "#b91c1c",
                                            border: "1px solid #fecaca",
                                        }}
                                        onClick={() => handleDeleteUser(user.id)}
                                    >
                                        <FaTrash style={{ marginRight: "0.3rem" }} /> Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}

                {showModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <h3 style={styles.modalTitle}>Add New User</h3>
                            <label style={styles.label}>First Name</label>
                            <input
                                type="text"
                                value={newUser.firstName}
                                onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                                style={styles.input}
                            />
                            <label style={styles.label}>Last Name</label>
                            <input
                                type="text"
                                value={newUser.lastName}
                                onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                                style={styles.input}
                            />
                            <label style={styles.label}>Email</label>
                            <input
                                type="email"
                                value={newUser.emailAddress}
                                onChange={(e) => setNewUser({ ...newUser, emailAddress: e.target.value })}
                                style={styles.input}
                            />
                            <label style={styles.label}>Role</label>

                            <div style={styles.modalActions}>
                                <button style={styles.saveButton} onClick={handleAddUser}>
                                    <FaSave /> Save
                                </button>
                                <button style={styles.cancelButton} onClick={() => setShowModal(false)}>
                                    <FaTimes /> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

const styles = {
    container: { maxWidth: "900px", margin: "2rem auto", padding: "1rem" },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
    },
    title: { fontSize: "1.8rem", fontWeight: "600", color: "#2c3e50", margin: 0 },
    addButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.7rem 1.5rem",
        background: "linear-gradient(135deg, #2373f3 0%, #4facfe 100%)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: "600",
        cursor: "pointer",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    },
    th: {
        textAlign: "left",
        padding: "1rem",
        backgroundColor: "#f8fafc",
        fontWeight: "600",
        color: "#2c3e50",
        borderBottom: "1px solid #e5e7eb",
    },
    td: {
        padding: "1rem",
        borderBottom: "1px solid #f3f4f6",
        color: "#374151",
    },
    emptyState: {
        textAlign: "center",
        padding: "4rem 2rem",
        backgroundColor: "#f8fafc",
        borderRadius: "12px",
        border: "2px dashed #cbd5e1",
    },
    emptyIcon: { fontSize: "4rem", color: "#cbd5e1", marginBottom: "1rem" },
    emptyText: { fontSize: "1.1rem", color: "#6b7280", marginBottom: "1.5rem" },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
    },
    modal: {
        background: "white",
        padding: "2rem",
        borderRadius: "12px",
        width: "400px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    },
    modalTitle: { marginBottom: "1.5rem", fontSize: "1.3rem", fontWeight: "600" },
    label: { display: "block", marginBottom: "0.5rem", color: "#374151", fontWeight: "500" },
    input: {
        width: "100%",
        padding: "0.7rem",
        marginBottom: "1rem",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        outline: "none",
        fontSize: "1rem",
    },
    modalActions: { display: "flex", justifyContent: "space-between", marginTop: "1rem" },
    saveButton: {
        backgroundColor: "#10b981",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.7rem 1.2rem",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        fontWeight: "600",
        cursor: "pointer",
    },
    cancelButton: {
        backgroundColor: "#6b7280",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.7rem 1.2rem",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        fontWeight: "600",
        cursor: "pointer",
    },
    actionButton: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.5rem 1rem",
        borderRadius: "6px",
        border: "none",
        fontSize: "0.9rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
};

export default AdminPage;
