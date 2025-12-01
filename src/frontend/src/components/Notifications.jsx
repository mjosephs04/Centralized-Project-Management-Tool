import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell, FaTimes, FaCheck } from "react-icons/fa";
import { projectsAPI } from "../services/api";
import { useSnackbar } from "../contexts/SnackbarContext";

const Notifications = ({ userRole }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();

    // Debug: Log userRole to console
    useEffect(() => {
        console.log('Notifications component - userRole:', userRole);
    }, [userRole]);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const data = await projectsAPI.getNotifications(50, false);
            setNotifications(data.notifications || []);
            setUnreadCount(data.unreadCount || 0);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            // Don't show error snackbar for background refreshes
            if (isOpen) {
                showSnackbar("Failed to load notifications", "error");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Only fetch notifications for project managers
        if (userRole !== "project_manager") {
            return;
        }
        
        fetchNotifications();
        // Refresh notifications every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [userRole]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const handleNotificationClick = (notification) => {
        if (notification.projectId) {
            navigate(`/projects/${notification.projectId}`);
            setIsOpen(false);
        }
    };

    const handleDismiss = async (notificationId, e) => {
        e.stopPropagation(); // Prevent triggering the click handler
        try {
            await projectsAPI.dismissNotification(notificationId);
            // Remove the notification from the list
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
            setUnreadCount(prev => Math.max(0, prev - 1));
            showSnackbar("Notification dismissed", "success");
        } catch (error) {
            console.error("Error dismissing notification:", error);
            showSnackbar("Failed to dismiss notification", "error");
        }
    };

    const handleDismissAll = async () => {
        try {
            const result = await projectsAPI.dismissAllNotifications();
            setNotifications([]);
            setUnreadCount(0);
            showSnackbar(`Dismissed ${result.dismissedCount || 0} notifications`, "success");
        } catch (error) {
            console.error("Error dismissing all notifications:", error);
            showSnackbar("Failed to dismiss notifications", "error");
        }
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return "Unknown time";
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
        
        return date.toLocaleDateString();
    };

    const getNotificationIcon = (field) => {
        // You can customize icons based on notification type
        return "🔔";
    };

    // Only show for project managers
    // Don't render anything if userRole is not yet loaded or not a project manager
    // Temporarily comment out to debug - remove this check to always show
    if (!userRole || userRole !== "project_manager") {
        console.log('Notifications: Not rendering - userRole is:', userRole);
        return null;
    }
    
    console.log('Notifications: Rendering bell icon for userRole:', userRole);

    return (
        <div style={styles.container} ref={dropdownRef}>
            <button
                type="button"
                style={{
                    ...styles.bellButton,
                    ...(isOpen || isHovered ? styles.bellButtonActive : {})
                }}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                        fetchNotifications();
                    }
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                aria-label="Notifications"
            >
                <FaBell 
                    size={20} 
                    style={{
                        ...styles.bellIcon,
                        ...(isHovered ? styles.bellIconHover : {})
                    }} 
                />
                {unreadCount > 0 && (
                    <span style={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div style={styles.dropdown}>
                    <div style={styles.header}>
                        <h3 style={styles.title}>Notifications</h3>
                        <div style={styles.headerActions}>
                            {notifications.length > 0 && (
                                <button
                                    style={styles.dismissAllButton}
                                    onClick={handleDismissAll}
                                    title="Dismiss all notifications"
                                >
                                    <FaCheck size={14} />
                                    Dismiss All
                                </button>
                            )}
                            <button
                                style={styles.closeButton}
                                onClick={() => setIsOpen(false)}
                            >
                                <FaTimes size={16} />
                            </button>
                        </div>
                    </div>

                    <div style={styles.content}>
                        {loading && notifications.length === 0 ? (
                            <div style={styles.emptyState}>
                                <p style={styles.emptyText}>Loading notifications...</p>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={styles.emptyState}>
                                <p style={styles.emptyText}>No notifications</p>
                                <p style={styles.emptySubtext}>You'll see updates about your projects here</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    style={{
                                        ...styles.notificationItem,
                                        ...(!notification.isRead ? styles.unreadItem : {})
                                    }}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div style={styles.notificationIcon}>
                                        {getNotificationIcon(notification.field)}
                                    </div>
                                    <div style={styles.notificationContent}>
                                        <div style={styles.notificationHeader}>
                                            <span style={styles.projectName}>
                                                {notification.projectName}
                                            </span>
                                            {notification.entityName && (
                                                <span style={styles.entityName}>
                                                    • {notification.entityName}
                                                </span>
                                            )}
                                        </div>
                                        <p style={styles.changeDescription}>
                                            {notification.changeDescription}
                                        </p>
                                        <div style={styles.notificationFooter}>
                                            {notification.changedBy && (
                                                <span style={styles.changedBy}>
                                                    by {notification.changedBy}
                                                </span>
                                            )}
                                            <span style={styles.timeAgo}>
                                                {formatTimeAgo(notification.createdAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        style={styles.dismissButton}
                                        onClick={(e) => handleDismiss(notification.id, e)}
                                        title="Dismiss notification"
                                    >
                                        <FaTimes size={12} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div style={styles.footer}>
                            <button
                                style={styles.viewAllButton}
                                onClick={() => {
                                    navigate("/projects");
                                    setIsOpen(false);
                                }}
                            >
                                View All Projects
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        position: "relative",
        display: "inline-block",
        zIndex: 1000,
    },
    bellButton: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "40px",
        height: "40px",
        borderRadius: "10px",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        transition: "all 0.2s ease",
        position: "relative",
    },
    bellButtonActive: {
        background: "rgba(0, 82, 212, 0.08)",
        transform: "translateY(-2px)",
    },
    bellIcon: {
        color: "#4a5568",
        transition: "color 0.2s ease-in-out",
    },
    bellIconHover: {
        color: "#0052D4",
    },
    badge: {
        position: "absolute",
        top: "6px",
        right: "6px",
        minWidth: "18px",
        height: "18px",
        padding: "0 4px",
        background: "#ef4444",
        color: "white",
        borderRadius: "9px",
        fontSize: "11px",
        fontWeight: "600",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "2px solid white",
        boxSizing: "border-box",
    },
    dropdown: {
        position: "absolute",
        top: "calc(100% + 10px)",
        right: "0",
        width: "400px",
        maxHeight: "600px",
        background: "white",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
        border: "1px solid rgba(0, 0, 0, 0.1)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
        background: "linear-gradient(135deg, #0052D4 0%, #4facfe 100%)",
    },
    title: {
        margin: 0,
        fontSize: "18px",
        fontWeight: "600",
        color: "white",
    },
    headerActions: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
    },
    dismissAllButton: {
        display: "flex",
        alignItems: "center",
        gap: "4px",
        background: "rgba(255, 255, 255, 0.2)",
        border: "1px solid rgba(255, 255, 255, 0.3)",
        color: "white",
        cursor: "pointer",
        padding: "6px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "500",
        transition: "background 0.2s ease",
    },
    closeButton: {
        background: "transparent",
        border: "none",
        color: "white",
        cursor: "pointer",
        padding: "4px",
        borderRadius: "4px",
        transition: "background 0.2s ease",
    },
    content: {
        flex: 1,
        overflowY: "auto",
        maxHeight: "500px",
    },
    emptyState: {
        padding: "40px 20px",
        textAlign: "center",
    },
    emptyText: {
        margin: 0,
        fontSize: "16px",
        color: "#6b7280",
        fontWeight: "500",
    },
    emptySubtext: {
        margin: "8px 0 0 0",
        fontSize: "14px",
        color: "#9ca3af",
    },
    notificationItem: {
        display: "flex",
        padding: "16px 20px",
        paddingRight: "48px", // Make room for dismiss button
        borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
        cursor: "pointer",
        transition: "background 0.2s ease",
        position: "relative",
    },
    unreadItem: {
        background: "rgba(0, 82, 212, 0.03)",
        borderLeft: "3px solid #0052D4",
    },
    notificationIcon: {
        fontSize: "20px",
        marginRight: "12px",
        flexShrink: 0,
    },
    notificationContent: {
        flex: 1,
        minWidth: 0,
    },
    notificationHeader: {
        display: "flex",
        alignItems: "center",
        marginBottom: "6px",
        flexWrap: "wrap",
    },
    projectName: {
        fontSize: "14px",
        fontWeight: "600",
        color: "#1a202c",
    },
    entityName: {
        fontSize: "14px",
        color: "#6b7280",
        marginLeft: "4px",
    },
    changeDescription: {
        margin: "4px 0",
        fontSize: "14px",
        color: "#4a5568",
        lineHeight: "1.5",
    },
    notificationFooter: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "6px",
        fontSize: "12px",
        color: "#9ca3af",
    },
    changedBy: {
        fontWeight: "500",
    },
    timeAgo: {
        marginLeft: "auto",
    },
    dismissButton: {
        position: "absolute",
        top: "12px",
        right: "12px",
        background: "transparent",
        border: "none",
        color: "#9ca3af",
        cursor: "pointer",
        padding: "4px",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        width: "24px",
        height: "24px",
    },
    dismissButtonHover: {
        background: "rgba(239, 68, 68, 0.1)",
        color: "#ef4444",
    },
    footer: {
        padding: "12px 20px",
        borderTop: "1px solid rgba(0, 0, 0, 0.1)",
        background: "#f9fafb",
    },
    viewAllButton: {
        width: "100%",
        padding: "10px",
        background: "linear-gradient(135deg, #0052D4 0%, #4facfe 100%)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: "pointer",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
    },
};

export default Notifications;

