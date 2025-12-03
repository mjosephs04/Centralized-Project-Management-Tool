import React, { useState, useEffect } from "react";
import { projectsAPI } from "../services/api";
import { useSnackbar } from "../contexts/SnackbarContext";
import { FaBell, FaEnvelope, FaSave } from "react-icons/fa";

const NotificationSettings = () => {
    const { showSnackbar } = useSnackbar();
    const [preferences, setPreferences] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPreferences();
    }, []);

    const fetchPreferences = async () => {
        try {
            setLoading(true);
            const data = await projectsAPI.getNotificationPreferences();
            setPreferences(data);
        } catch (error) {
            console.error("Error fetching notification preferences:", error);
            showSnackbar("Failed to load notification preferences", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await projectsAPI.updateNotificationPreferences(preferences);
            showSnackbar("Notification preferences saved successfully", "success");
        } catch (error) {
            console.error("Error saving notification preferences:", error);
            showSnackbar("Failed to save notification preferences", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = (key) => {
        setPreferences(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loading}>Loading notification settings...</div>
            </div>
        );
    }

    if (!preferences) {
        return (
            <div style={styles.container}>
                <div style={styles.error}>Failed to load notification preferences</div>
            </div>
        );
    }

    const notificationGroups = [
        {
            title: "Project Notifications",
            items: [
                { key: "projectStatusChange", label: "Project Status Changes", emailKey: "projectStatusChangeEmail" },
                { key: "projectPriorityChange", label: "Project Priority Changes", emailKey: "projectPriorityChangeEmail" },
                { key: "projectBudgetChange", label: "Project Budget/Cost Changes", emailKey: "projectBudgetChangeEmail" },
                { key: "projectDateChange", label: "Project Date Changes", emailKey: "projectDateChangeEmail" },
                { key: "projectTeamChange", label: "Project Team Member Changes", emailKey: "projectTeamChangeEmail" },
            ]
        },
        {
            title: "Work Order Notifications",
            items: [
                { key: "workOrderCreated", label: "Work Order Creation", emailKey: "workOrderCreatedEmail" },
                { key: "workOrderStatusChange", label: "Work Order Status Changes", emailKey: "workOrderStatusChangeEmail" },
                { key: "workOrderCompleted", label: "Work Order Completion", emailKey: "workOrderCompletedEmail" },
                { key: "workOrderPriorityChange", label: "Work Order Priority Changes", emailKey: "workOrderPriorityChangeEmail" },
                { key: "workOrderBudgetChange", label: "Work Order Budget/Cost Changes", emailKey: "workOrderBudgetChangeEmail" },
                { key: "workOrderDateChange", label: "Work Order Date Changes", emailKey: "workOrderDateChangeEmail" },
            ]
        }
    ];

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>
                    <FaBell style={styles.titleIcon} />
                    Notification Settings
                </h2>
                <p style={styles.subtitle}>
                    Choose which notifications you want to receive and whether to receive them via email.
                </p>
            </div>

            {notificationGroups.map((group, groupIndex) => (
                <div key={groupIndex} style={styles.group}>
                    <h3 style={styles.groupTitle}>
                        <span style={styles.groupIcon}>{group.icon}</span>
                        {group.title}
                    </h3>
                    <div style={styles.items}>
                        {group.items.map((item) => (
                            <div key={item.key} style={styles.item}>
                                <div style={styles.itemHeader}>
                                    <label style={styles.label}>{item.label}</label>
                                </div>
                                <div style={styles.toggles}>
                                    <div style={styles.toggleGroup}>
                                        <label style={styles.toggleLabel}>
                                            <FaBell style={styles.toggleIcon} />
                                            In-App
                                        </label>
                                        <button
                                            type="button"
                                            style={{
                                                ...styles.toggleButton,
                                                ...(preferences[item.key] ? styles.toggleButtonActive : {})
                                            }}
                                            onClick={() => handleToggle(item.key)}
                                        >
                                            <span style={styles.toggleButtonText}>
                                                {preferences[item.key] ? "ON" : "OFF"}
                                            </span>
                                        </button>
                                    </div>
                                    <div style={styles.toggleGroup}>
                                        <label style={styles.toggleLabel}>
                                            <FaEnvelope style={styles.toggleIcon} />
                                            Email
                                        </label>
                                        <button
                                            type="button"
                                            style={{
                                                ...styles.toggleButton,
                                                ...(preferences[item.emailKey] ? styles.toggleButtonActive : {})
                                            }}
                                            onClick={() => handleToggle(item.emailKey)}
                                        >
                                            <span style={styles.toggleButtonText}>
                                                {preferences[item.emailKey] ? "ON" : "OFF"}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            <div style={styles.footer}>
                <button
                    type="button"
                    style={styles.saveButton}
                    onClick={handleSave}
                    disabled={saving}
                    onMouseEnter={(e) => {
                        if (!saving) {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(119, 221, 119, 0.4)';
                        }
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(119, 221, 119, 0.2)';
                    }}
                >
                    <FaSave style={styles.saveIcon} />
                    {saving ? "Saving..." : "Save Preferences"}
                </button>
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: "900px",
        margin: "0 auto",
        padding: "2rem",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    },
    header: {
        marginBottom: "2rem",
        paddingBottom: "1.5rem",
        borderBottom: "2px solid #e5e7eb",
    },
    title: {
        margin: "0 0 0.5rem 0",
        fontSize: "1.75rem",
        fontWeight: "700",
        color: "#2c3e50",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    },
    titleIcon: {
        color: "#5692bc",
        fontSize: "1.5rem",
    },
    subtitle: {
        margin: 0,
        fontSize: "0.95rem",
        color: "#6b7280",
        lineHeight: "1.5",
    },
    loading: {
        textAlign: "center",
        padding: "2rem",
        color: "#5692bc",
        fontSize: "1rem",
        fontWeight: "500",
    },
    error: {
        textAlign: "center",
        padding: "2rem",
        color: "#ef4444",
        fontSize: "1rem",
    },
    group: {
        marginBottom: "2rem",
        paddingBottom: "1.5rem",
        borderBottom: "1px solid #f3f4f6",
    },
    groupTitle: {
        margin: "0 0 1.25rem 0",
        fontSize: "1.25rem",
        fontWeight: "600",
        color: "#2c3e50",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    groupIcon: {
        fontSize: "1.25rem",
    },
    items: {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
    },
    item: {
        padding: "1.25rem",
        background: "#f9fafb",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
        transition: "all 0.2s ease",
    },
    itemHeader: {
        marginBottom: "0.75rem",
    },
    label: {
        fontSize: "0.95rem",
        fontWeight: "600",
        color: "#2c3e50",
    },
    toggles: {
        display: "flex",
        gap: "2rem",
        flexWrap: "wrap",
    },
    toggleGroup: {
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    },
    toggleLabel: {
        fontSize: "0.85rem",
        color: "#6b7280",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        fontWeight: "500",
        minWidth: "70px",
    },
    toggleIcon: {
        fontSize: "0.85rem",
        color: "#9ca3af",
    },
    toggleButton: {
        padding: "0.5rem 1rem",
        borderRadius: "6px",
        border: "2px solid #d1d5db",
        background: "white",
        color: "#6b7280",
        fontSize: "0.8rem",
        fontWeight: "700",
        cursor: "pointer",
        transition: "all 0.2s ease",
        minWidth: "60px",
        letterSpacing: "0.5px",
    },
    toggleButtonActive: {
        background: "#5692bc",
        color: "white",
        borderColor: "#5692bc",
        boxShadow: "0 2px 4px rgba(86, 146, 188, 0.3)",
    },
    toggleButtonText: {
        display: "inline-block",
    },
    footer: {
        marginTop: "2rem",
        paddingTop: "1.5rem",
        borderTop: "2px solid #e5e7eb",
        display: "flex",
        justifyContent: "flex-end",
    },
    saveButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.85rem 1.75rem",
        background: "#77DD77",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        boxShadow: "0 2px 4px rgba(119, 221, 119, 0.2)",
    },
    saveIcon: {
        fontSize: "0.95rem",
    },
};

export default NotificationSettings;