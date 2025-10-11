import React from "react";

const LogsTab = ({ project }) => {
    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Project Activity Logs</h2>
            <div style={styles.placeholderBox}>
                <p style={styles.placeholderText}>
                    This tab will display an audit trail of project changes such as updated dates,
                    status transitions, work order updates, and user actions.
                </p>
            </div>
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: '600',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '0.25rem',
    },
    subtitle: {
        color: '#6b7280',
        marginTop: 0,
    },
    placeholderBox: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px dashed #cbd5e1',
        padding: '2rem',
        marginTop: '1rem',
    },
    placeholderText: {
        margin: 0,
        color: '#4b5563',
        lineHeight: 1.6,
    }
};

export default LogsTab;


