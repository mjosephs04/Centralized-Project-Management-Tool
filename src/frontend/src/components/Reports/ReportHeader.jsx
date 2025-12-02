import React from 'react';

const ReportHeader = ({ project }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getStatusColor = (status) => {
        const colors = {
            planning: '#6b7280',
            initiated: '#3b82f6',
            regulatory_scoping: '#8b5cf6',
            design_procurement: '#06b6d4',
            construction_prep: '#f59e0b',
            in_construction: '#3b82f6',
            commissioning: '#8b5cf6',
            energized: '#10b981',
            closeout: '#10b981',
            on_hold: '#f59e0b',
            cancelled: '#ef4444',
            archived: '#6b7280'
        };
        return colors[status] || '#6b7280';
    };

    const formatStatus = (status) => {
        return status?.replace(/_/g, ' ').toUpperCase() || 'N/A';
    };

    return (
        <div style={styles.container}>
            <div style={styles.titleRow}>
                <div>
                    <h1 style={styles.title}>PROJECT COMPLETION REPORT</h1>
                    <div style={styles.subtitle}>
                        <span style={styles.projectName}>{project.name}</span>
                        <span style={styles.separator}>•</span>
                        <span style={styles.projectId}>ID: PRJ-{String(project.id).padStart(4, '0')}</span>
                    </div>
                </div>
                <div style={styles.statusBadge}>
                    <div style={{
                        ...styles.badge,
                        backgroundColor: `${getStatusColor(project.status)}20`,
                        color: getStatusColor(project.status),
                        border: `1px solid ${getStatusColor(project.status)}`
                    }}>
                        {formatStatus(project.status)}
                    </div>
                </div>
            </div>
            
            <div style={styles.metaInfo}>
                <span>Generated: {formatDate(new Date())}</span>
                {project.location && (
                    <>
                        <span style={styles.separator}>•</span>
                        <span>Location: {project.location}</span>
                    </>
                )}
            </div>
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
    titleRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '10px',
    },
    title: {
        margin: 0,
        fontSize: '18px',
        fontWeight: '700',
        color: '#1f2937',
        letterSpacing: '0.5px',
    },
    subtitle: {
        marginTop: '4px',
        fontSize: '13px',
        color: '#6b7280',
    },
    projectName: {
        fontWeight: '600',
        color: '#374151',
    },
    projectId: {
        color: '#6b7280',
    },
    separator: {
        margin: '0 6px',
        color: '#d1d5db',
    },
    statusBadge: {
        display: 'flex',
        alignItems: 'center',
    },
    badge: {
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '700',
        letterSpacing: '0.5px',
        whiteSpace: 'nowrap',
    },
    metaInfo: {
        fontSize: '11px',
        color: '#6b7280',
        paddingTop: '10px',
        borderTop: '1px solid #e5e7eb',
    }
};

export default ReportHeader;