import React, { useEffect, useState } from "react";
import { FaBox, FaPlus, FaSave, FaTimes, FaTrash, FaCheck, FaBan } from "react-icons/fa";
import {projectsAPI} from "../../services/api";

const fakeVendors = [
    { id: 1, name: "Home Depot" },
    { id: 2, name: "Lowe’s" },
    { id: 3, name: "Grainger" },
    { id: 4, name: "Ace Hardware" },
    { id: 5, name: "Amazon Business" },
];

const SuppliesTab = ({ project, userRole }) => {
    const [supplies, setSupplies] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newSupply, setNewSupply] = useState({ name: "", vendorId: "", budget: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const token = localStorage.getItem("accessToken");

    useEffect(() => {
        const fetchSupplies = async () => {
            try {
                setLoading(true);
                const res = await projectsAPI.getSupplies(project.id)

                const data = res.data;
                if (res.status != 200) throw new Error(data.error || "Failed to load supplies");
                setSupplies(data.supplies || []);
            } catch (err) {
                console.error(err);
                setError("Failed to load supplies");
            } finally {
                setLoading(false);
            }
        };
        if (project?.id) fetchSupplies();
    }, [project?.id, token]);

    const handleAddSupply = async () => {
        if (!newSupply.name || !newSupply.vendorId || !newSupply.budget) {
            alert("Please fill out all fields");
            return;
        }

        const vendor = fakeVendors.find((v) => v.id === parseInt(newSupply.vendorId));
        try {

            const payload = JSON.stringify({
                name: newSupply.name.trim(),
                vendor: vendor.name,
                budget: parseFloat(newSupply.budget),
            })

            const res = await projectsAPI.postSupplies(project.id, payload)
            const data = res.data;
            if (res.status != 201) throw new Error(data.error || "Failed to submit supply");
            setSupplies((prev) => [data.supply, ...prev]);
            setShowModal(false);
            setNewSupply({ name: "", vendorId: "", budget: "" });
        } catch (err) {
            alert(err.message);
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            const payload = JSON.stringify({ status })
            const res = await projectsAPI.patchSupplies(project.id, id, payload)
            const data = res.data;
            if (res.status != 200) throw new Error(data.error || "Failed to update status");
            setSupplies((prev) => prev.map((s) => (s.id === id ? data.supply : s)));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteSupply = async (id) => {
        if (!window.confirm("Are you sure you want to delete this supply?")) return;

        try {
            const res = await projectsAPI.deleteSupplies(project.id, id);
            if (res.status !== 200) throw new Error(res.data.error || "Failed to delete supply");
            setSupplies((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            console.error(err);
            alert(err.message || "Error deleting supply");
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Supplies</h2>
                <button style={styles.addButton} onClick={() => setShowModal(true)}>
                    <FaPlus /> {userRole === "worker" ? "Request Supply" : "Add Supply"}
                </button>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : supplies.length === 0 ? (
                <div style={styles.emptyState}>
                    <FaBox style={styles.emptyIcon} />
                    <p style={styles.emptyText}>No supplies yet.</p>
                </div>
            ) : (
                <table style={styles.table}>
                    <thead>
                    <tr>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Vendor</th>
                        <th style={styles.th}>Budget ($)</th>
                        <th style={styles.th}>Status</th>
                        {userRole === "project_manager" && <th style={styles.th}>Actions</th>}
                    </tr>
                    </thead>
                    <tbody>
                    {supplies.map((supply) => (
                        <tr key={supply.id}>
                            <td style={styles.td}>{supply.name}</td>
                            <td style={styles.td}>{supply.vendor}</td>
                            <td style={styles.td}>{supply.budget.toFixed(2)}</td>
                            <td style={styles.td}>
                  <span
                      style={{
                          color:
                              supply.status === "approved"
                                  ? "green"
                                  : supply.status === "rejected"
                                      ? "red"
                                      : "gray",
                          fontWeight: 600,
                          textTransform: "capitalize",
                      }}
                  >
                    {supply.status}
                  </span>
                            </td>
                            {console.log(userRole)}
                            {userRole == "project_manager" && (
                                <td style={styles.td}>
                                    {supply.status === "pending" ? (
                                        <>
                                            <button
                                                style={{
                                                    ...styles.actionButton,
                                                    backgroundColor: "#dcfce7",
                                                    color: "#166534",
                                                    border: "1px solid #86efac",
                                                    marginRight: "0.5rem",
                                                }}
                                                onClick={() => handleStatusChange(supply.id, "approved")}
                                            >
                                                <FaCheck style={{marginRight: "0.3rem"}}/> Approve
                                            </button>

                                            <button
                                                style={{
                                                    ...styles.actionButton,
                                                    backgroundColor: "#fee2e2",
                                                    color: "#991b1b",
                                                    border: "1px solid #fca5a5",
                                                    marginRight: "0.5rem",
                                                }}
                                                onClick={() => handleStatusChange(supply.id, "rejected")}
                                            >
                                                <FaBan style={{marginRight: "0.3rem"}}/> Reject
                                            </button>
                                        </>
                                    ) : null}

                                    <button
                                        style={{
                                            ...styles.actionButton,
                                            backgroundColor: "#fef2f2",
                                            color: "#b91c1c",
                                            border: "1px solid #fecaca",
                                        }}
                                        onClick={() => handleDeleteSupply(supply.id)}
                                    >
                                        <FaTrash style={{marginRight: "0.3rem"}}/> Delete
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                    </tbody>
                </table>
            )}

            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h3 style={styles.modalTitle}>
                            {userRole === "worker" ? "Request New Supply" : "Add Supply"}
                        </h3>
                        <label style={styles.label}>Supply Name</label>
                        <input
                            type="text"
                            value={newSupply.name}
                            onChange={(e) => setNewSupply({...newSupply, name: e.target.value})}
                            style={styles.input}
                        />
                        <label style={styles.label}>Vendor</label>
                        <select
                            value={newSupply.vendorId}
                            onChange={(e) => setNewSupply({...newSupply, vendorId: e.target.value})}
                            style={styles.input}
                        >
                            <option value="">Select a vendor</option>
                            {fakeVendors.map((v) => (
                                <option key={v.id} value={v.id}>
                                    {v.name}
                                </option>
                            ))}
                        </select>
                        <label style={styles.label}>Budget ($)</label>
                        <input
                            type="number"
                            value={newSupply.budget}
                            onChange={(e) => setNewSupply({ ...newSupply, budget: e.target.value })}
                            style={styles.input}
                        />
                        <div style={styles.modalActions}>
                            <button style={styles.saveButton} onClick={handleAddSupply}>
                                <FaSave /> {userRole === "worker" ? "Request" : "Save"}
                            </button>
                            <button style={styles.cancelButton} onClick={() => setShowModal(false)}>
                                <FaTimes /> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { maxWidth: "900px", margin: "0 auto" },
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
    tr: { transition: "background-color 0.2s" },
    removeButton: {
        backgroundColor: "#fee2e2",
        color: "#dc2626",
        border: "none",
        borderRadius: "6px",
        padding: "0.5rem",
        cursor: "pointer",
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
    addFirstButton: {
        padding: "0.8rem 1.5rem",
        background: "linear-gradient(135deg, #2373f3 0%, #4facfe 100%)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
    },
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

export default SuppliesTab;
