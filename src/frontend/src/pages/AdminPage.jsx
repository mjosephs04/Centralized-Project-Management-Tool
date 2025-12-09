import React, { useEffect, useState, useMemo } from "react";
import { FaPlus, FaSave, FaTimes, FaTrash, FaUser } from "react-icons/fa";
import { FaShareFromSquare } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import UserNavbar from "../components/UserNavbar";
import { authAPI, usersAPI } from "../services/api";

const AdminPage = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
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
        const { firstName, lastName, emailAddress } = newUser;
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
                role: "project_manager", // FORCE PROJECT MANAGER
            });

            const status = await authAPI.register(payload);
            if (status !== 201) throw new Error("Failed to add project manager");

            setShowModal(false);
            setNewUser({ firstName: "", lastName: "", emailAddress: "", role: "project_manager" });
        } catch (err) {
            alert(err.message);
        }
    };

    const handleActivateUser = async (id) => {
        try {
            const res = await usersAPI.activateUser(id);
            if (res.status !== 200) throw new Error(res.data.error || "Failed to activate user");

            setUsers((prev) =>
                prev.map((u) => (u.id === id ? { ...u, isActive: true } : u))
            );
        } catch (err) {
            alert(err.message);
        }
    };

    const handleUpdateRole = async (id, newRole) => {
        try {
            const res = await usersAPI.updateUserRole(id, newRole);
            if (res.status !== 200) throw new Error(res.data.error || "Failed to update role");

            // update row in UI
            setUsers((prev) =>
                prev.map((u) =>
                    u.id === id ? { ...u, role: newRole } : u
                )
            );
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteUser = async (id) => {
        if (!window.confirm("Are you sure you want to deactivate this user?")) return;
        try {
            const res = await usersAPI.deleteUser(id);
            if (res.status !== 200) throw new Error(res.data.error || "Failed to delete user");
            setUsers((prev) => prev.filter((u) => u.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    const filteredUsers = useMemo(() => {
        let list = [...users];

        // Filter
        if (searchQuery.trim() !== "") {
            const query = searchQuery.toLowerCase();
            list = list.filter((u) =>
                (u.firstName + " " + u.lastName).toLowerCase().includes(query) ||
                u.emailAddress.toLowerCase().includes(query) ||
                u.role.toLowerCase().includes(query) ||
                (u.isActive ? "active" : "inactive").includes(query)
            );
        }

        return list;
    }, [users, searchQuery]);

    return (
        <>
            <UserNavbar />
            <div style={styles.container}>
                <div style={styles.header}>
                    <h2 style={styles.title}>Users</h2>
                    <div style={styles.headerButtons}>
                        <button style={styles.inviteButton} onClick={() => navigate('/login-distribution')}>
                            <FaShareFromSquare /> Invite Users
                        </button>
                        <button style={styles.addButton} onClick={() => setShowModal(true)}>
                            <FaPlus /> Add Project Manager
                        </button>
                    </div>
                </div>

                {/* 🔍 SEARCH BAR */}
                <div style={{ marginBottom: "1rem" }}>
                    <input
                        type="text"
                        placeholder="Search users by name, email, role, or status..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "0.7rem",
                            borderRadius: "8px",
                            border: "1px solid #d1d5db",
                            fontSize: "1rem",
                        }}
                    />
                </div>

                {loading ? (
                    <p>Loading users...</p>
                ) : filteredUsers.length === 0 ? (
                    <div style={styles.emptyState}>
                        <FaUser style={styles.emptyIcon} />
                        <p style={styles.emptyText}>No users found.</p>
                    </div>
                ) : (
                    <table style={styles.table}>
                        <thead>
                        <tr>
                            <th style={styles.th}>
                                Name
                            </th>
                            <th style={styles.th} >
                                Email
                            </th>
                            <th style={styles.th}>
                                Role
                            </th>
                            <th style={styles.th}>
                                Active
                            </th>
                            <th style={styles.th}>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td style={styles.td}>
                                    {user.firstName} {user.lastName}
                                </td>
                                <td style={styles.td}>{user.emailAddress}</td>
                                <td style={styles.td}>
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                        style={{
                                            padding: "0.4rem",
                                            borderRadius: "6px",
                                            border: "1px solid #d1d5db",
                                            fontWeight: 600,
                                            backgroundColor: "#f9fafb",
                                            cursor: "pointer"
                                        }}
                                    >
                                        <option value="admin">ADMIN</option>
                                        <option value="worker">WORKER</option>
                                        <option value="project_manager">PROJECT MANAGER</option>
                                    </select>
                                </td>

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
                                    {user.isActive ? (
                                        <button
                                            style={{
                                                ...styles.actionButton,
                                                backgroundColor: "#fef2f2",
                                                color: "#b91c1c",
                                                border: "1px solid #fecaca",
                                            }}
                                            onClick={() => handleDeleteUser(user.id)}
                                        >
                                            <FaTrash style={{ marginRight: "0.3rem" }} />
                                            Deactivate
                                        </button>
                                    ) : (
                                        <button
                                            style={{
                                                ...styles.actionButton,
                                                backgroundColor: "#ecfdf5",
                                                color: "#047857",
                                                border: "1px solid #a7f3d0",
                                            }}
                                            onClick={() => handleActivateUser(user.id)}
                                        >
                                            <FaPlus style={{ marginRight: "0.3rem" }} />
                                            Activate
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}

                {/* --- ADD USER MODAL --- */}
                {showModal && (
                    <div style={styles.modalOverlay}>
                        <div style={styles.modal}>
                            <h3 style={styles.modalTitle}>Add New Project Manager</h3>

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
    headerButtons: {
        display: "flex",
        gap: "1rem",
        alignItems: "center",
    },
    inviteButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.7rem 1.5rem",
        background: "linear-gradient(135deg, #5692bc 0%, #6ba8d4 100%)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
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
    td: { padding: "1rem", borderBottom: "1px solid #f3f4f6", color: "#374151" },
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
    label: {
        display: "block",
        marginBottom: "0.5rem",
        color: "#374151",
        fontWeight: "500",
    },
    input: {
        width: "90%",
        padding: "0.7rem",
        marginBottom: "1rem",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        outline: "none",
        fontSize: "1rem",
    },
    modalActions: {
        display: "flex",
        justifyContent: "space-between",
        marginTop: "1rem",
    },
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
