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
                    <h3 style={styles.groupTitle}>{group.title}</h3>
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
                                            {preferences[item.key] ? "ON" : "OFF"}
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
                                            {preferences[item.emailKey] ? "ON" : "OFF"}
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
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    },
    header: {
        marginBottom: "2rem",
        paddingBottom: "1.5rem",
        borderBottom: "2px solid #e5e7eb",
    },
    title: {
        margin: "0 0 0.5rem 0",
        fontSize: "24px",
        fontWeight: "600",
        color: "#1a202c",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
    },
    titleIcon: {
        color: "#0052D4",
    },
    subtitle: {
        margin: 0,
        fontSize: "14px",
        color: "#6b7280",
    },
    loading: {
        textAlign: "center",
        padding: "2rem",
        color: "#6b7280",
    },
    error: {
        textAlign: "center",
        padding: "2rem",
        color: "#ef4444",
    },
    group: {
        marginBottom: "2rem",
    },
    groupTitle: {
        margin: "0 0 1rem 0",
        fontSize: "18px",
        fontWeight: "600",
        color: "#374151",
    },
    items: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    item: {
        padding: "1.25rem",
        background: "#f9fafb",
        borderRadius: "8px",
        border: "1px solid #e5e7eb",
    },
    itemHeader: {
        marginBottom: "0.75rem",
    },
    label: {
        fontSize: "15px",
        fontWeight: "500",
        color: "#1a202c",
    },
    toggles: {
        display: "flex",
        gap: "1.5rem",
        flexWrap: "wrap",
    },
    toggleGroup: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
    },
    toggleLabel: {
        fontSize: "14px",
        color: "#6b7280",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        fontWeight: "500",
    },
    toggleIcon: {
        fontSize: "14px",
    },
    toggleButton: {
        padding: "0.5rem 1rem",
        borderRadius: "6px",
        border: "1px solid #d1d5db",
        background: "white",
        color: "#6b7280",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        minWidth: "60px",
    },
    toggleButtonActive: {
        background: "linear-gradient(135deg, #0052D4 0%, #4facfe 100%)",
        color: "white",
        borderColor: "#0052D4",
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
        padding: "0.75rem 1.5rem",
        background: "linear-gradient(135deg, #0052D4 0%, #4facfe 100%)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "15px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    saveIcon: {
        fontSize: "16px",
    },
};

export default NotificationSettings;

