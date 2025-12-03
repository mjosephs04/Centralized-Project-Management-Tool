import React from 'react';
import { FaCalendarAlt } from 'react-icons/fa';

const ReportTimeline = ({ project, metrics }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const timeline = metrics?.timeline || {};
    const completionDate = project.completedAt || project.archivedAt;

    return (
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>
                <FaCalendarAlt style={styles.icon} />
                Timeline
            </h2>
            
            <div style={styles.grid}>
                <div style={styles.item}>
                    <div style={styles.label}>Scheduled Start</div>
                    <div style={styles.value}>{formatDate(project.startDate)}</div>
                </div>
                
                <div style={styles.item}>
                    <div style={styles.label}>Scheduled End</div>
                    <div style={styles.value}>{formatDate(project.endDate)}</div>
                </div>
                
                <div style={styles.item}>
                    <div style={styles.label}>Duration</div>
                    <div style={styles.value}>
                        {timeline.scheduled_duration_days ? `${timeline.scheduled_duration_days} days` : 'N/A'}
                    </div>
                </div>
                
                <div style={styles.item}>
                    <div style={styles.label}>Completed</div>
                    <div style={styles.value}>
                        {completionDate ? formatDate(completionDate) : 'In Progress'}
                    </div>
                </div>
            </div>

            {timeline.variance_days !== undefined && (
                <div style={styles.varianceRow}>
                    <div style={{
                        ...styles.variance,
                        ...(timeline.variance_days <= 0 ? styles.varianceGood : styles.varianceBad)
                    }}>
                        {timeline.variance_days === 0 && '✓ On Time'}
                        {timeline.variance_days < 0 && `✓ ${Math.abs(timeline.variance_days)} days early`}
                        {timeline.variance_days > 0 && `⚠ ${timeline.variance_days} days delayed`}
                    </div>
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
    },
    varianceRow: {
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
    },
    variance: {
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600',
    },
    varianceGood: {
        backgroundColor: '#d1fae5',
        color: '#065f46',
        border: '1px solid #10b981',
    },
    varianceBad: {
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        border: '1px solid #ef4444',
    }
};

export default ReportTimeline;