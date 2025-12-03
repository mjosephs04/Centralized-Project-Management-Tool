import React from 'react';
import { FaFileDownload } from 'react-icons/fa';

const ReportButton = ({ project, userRole, onGenerateReport, disabled = false }) => {
    // Only show button for Project Managers and Admins
    if (userRole !== 'project_manager' && userRole !== 'admin') {
        return null;
    }

    const handleClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && onGenerateReport) {
            onGenerateReport();
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled}
            className="report-download-button"
            style={{
                ...styles.button,
                ...(disabled ? styles.buttonDisabled : {})
            }}
            title="Download Project Report"
            onMouseEnter={(e) => {
                if (!disabled) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
                }
            }}
        >
            <FaFileDownload style={styles.icon} />
            <span>Download Report</span>
        </button>
    );
};

const styles = {
    button: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: '#3b82f6',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
        zIndex: 100,
        position: 'relative',
        whiteSpace: 'nowrap',
    },
    icon: {
        fontSize: '16px',
    },
    buttonDisabled: {
        backgroundColor: '#9ca3af',
        cursor: 'not-allowed',
        opacity: 0.6,
        pointerEvents: 'none',
    }
};

export default ReportButton;