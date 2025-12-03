import React from 'react';
import { FaInfoCircle } from 'react-icons/fa';

const ReportDetails = ({ project }) => {
    const details = [
        { label: 'Location', value: project.location },
        { label: 'Team Size', value: project.crewMembers?.length || 0 },
        { label: 'Priority', value: project.priority?.toUpperCase() },
        { label: 'Status', value: project.status?.replace(/_/g, ' ').toUpperCase() },
    ].filter(item => item.value);

    return (
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>
                <FaInfoCircle style={styles.icon} />
                Project Details
            </h2>

            {project.description && (
                <div style={styles.description}>
                    <div style={styles.descriptionLabel}>Description</div>
                    <div style={styles.descriptionText}>{project.description}</div>
                </div>
            )}

            {details.length > 0 && (
                <div style={styles.grid}>
                    {details.map((detail, index) => (
                        <div key={index} style={styles.item}>
                            <div style={styles.label}>{detail.label}</div>
                            <div style={styles.value}>{detail.value}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        padding: '16px',
        backgroundColor: '#ffffff',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        marginBottom: '12px',
    },
    sectionTitle: {
        margin: '0 0 12px 0',
        fontSize: '14px',
        fontWeight: '700',
        color: '#1f2937',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    icon: {
        fontSize: '13px',
        color: '#3b82f6',
    },
    description: {
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e5e7eb',
    },
    descriptionLabel: {
        fontSize: '10px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px',
    },
    descriptionText: {
        fontSize: '12px',
        color: '#374151',
        lineHeight: '1.5',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
    },
    item: {
        minWidth: 0,
    },
    label: {
        fontSize: '10px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '3px',
    },
    value: {
        fontSize: '13px',
        fontWeight: '600',
        color: '#1f2937',
    }
};

export default ReportDetails;