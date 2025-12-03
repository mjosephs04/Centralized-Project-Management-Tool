import React from 'react';
import { FaClipboardList, FaCheckCircle, FaClock } from 'react-icons/fa';

const ReportWorkOrders = ({ metrics }) => {
    const workforce = metrics?.workforce || {};
    const progress = metrics?.progress || {};
    const statusDistribution = workforce.statusDistribution || {};

    const statuses = [
        { key: 'completed', label: 'Completed', icon: '✓', color: '#10b981' },
        { key: 'in_progress', label: 'In Progress', icon: '↻', color: '#3b82f6' },
        { key: 'pending', label: 'Pending', icon: '⧗', color: '#6b7280' },
        { key: 'on_hold', label: 'On Hold', icon: '⏸', color: '#f59e0b' },
        { key: 'cancelled', label: 'Cancelled', icon: '✕', color: '#ef4444' },
    ];

    const totalWorkOrders = Object.values(statusDistribution).reduce((sum, count) => sum + count, 0);
    const completionRate = (progress.workOrderCompletion || 0) * 100;
    const completedCount = statusDistribution.completed || 0;
    const inProgressCount = statusDistribution.in_progress || 0;
    const activeTotal = totalWorkOrders - (statusDistribution.cancelled || 0);

    const formatDays = (value) => {
        if (value === null || value === undefined) return 'N/A';
        const rounded = Math.round(value * 10) / 10;
        return `${rounded} ${Math.abs(rounded) === 1 ? 'day' : 'days'}`;
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>
                <FaClipboardList style={styles.icon} />
                Work Orders & Progress
            </h2>

            {/* Key Metrics Row */}
            <div style={styles.metricsRow}>
                <div style={styles.metricCard}>
                    <div style={styles.metricIcon}>
                        <FaClipboardList style={{fontSize: '18px', color: '#3b82f6'}} />
                    </div>
                    <div style={styles.metricContent}>
                        <div style={styles.metricLabel}>Total Work Orders</div>
                        <div style={styles.metricValue}>{totalWorkOrders}</div>
                        <div style={styles.metricSubtext}>{activeTotal} active</div>
                    </div>
                </div>
                <div style={styles.metricCard}>
                    <div style={styles.metricIcon}>
                        <FaCheckCircle style={{fontSize: '18px', color: '#10b981'}} />
                    </div>
                    <div style={styles.metricContent}>
                        <div style={styles.metricLabel}>Completion Rate</div>
                        <div style={styles.metricValue}>{completionRate.toFixed(1)}%</div>
                        <div style={styles.metricSubtext}>
                            {completedCount} completed, {inProgressCount} in progress
                        </div>
                    </div>
                </div>
                <div style={styles.metricCard}>
                    <div style={styles.metricIcon}>
                        <FaClock style={{fontSize: '18px', color: '#f59e0b'}} />
                    </div>
                    <div style={styles.metricContent}>
                        <div style={styles.metricLabel}>Avg Duration</div>
                        <div style={styles.metricValue}>
                            {formatDays(workforce.averageWorkOrderDurationDays)}
                        </div>
                        <div style={styles.metricSubtext}>Time to complete</div>
                    </div>
                </div>
            </div>

            {/* Status Distribution */}
            <div style={styles.sectionSubtitle}>Status Distribution</div>
            <div style={styles.statusGrid}>
                {statuses.map(status => {
                    const count = statusDistribution[status.key] || 0;
                    const percentage = totalWorkOrders > 0 ? ((count / totalWorkOrders) * 100).toFixed(1) : 0;
                    
                    return (
                        <div key={status.key} style={styles.statusItem}>
                            <div style={styles.statusHeader}>
                                <span style={{...styles.statusIcon, color: status.color}}>{status.icon}</span>
                                <span style={styles.statusLabel}>{status.label}</span>
                            </div>
                            <div style={styles.statusContent}>
                                <span style={styles.statusCount}>{count}</span>
                                <span style={styles.statusPercentage}>({percentage}%)</span>
                            </div>
                            <div style={styles.statusBar}>
                                <div style={{
                                    ...styles.statusBarFill,
                                    width: `${percentage}%`,
                                    backgroundColor: status.color
                                }} />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Completion Progress Bar */}
            <div style={styles.completionSection}>
                <div style={styles.completionHeader}>
                    <span style={styles.completionLabel}>Overall Completion Progress</span>
                    <span style={styles.completionPercent}>{completionRate.toFixed(1)}%</span>
                </div>
                <div style={styles.progressBar}>
                    <div style={{
                        ...styles.progressFill,
                        width: `${completionRate}%`,
                        backgroundColor: completionRate >= 80 ? '#10b981' : completionRate >= 50 ? '#3b82f6' : '#f59e0b'
                    }} />
                </div>
                <div style={styles.progressSubtext}>
                    Completed work orders plus 50% credit for in-progress orders
                </div>
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
        pageBreakInside: 'avoid',
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
    sectionSubtitle: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#374151',
        marginTop: '12px',
        marginBottom: '8px',
        paddingBottom: '6px',
        borderBottom: '1px solid #e5e7eb',
    },
    metricsRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '12px',
    },
    metricCard: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
    },
    metricIcon: {
        flexShrink: 0,
    },
    metricContent: {
        flex: 1,
        minWidth: 0,
    },
    metricLabel: {
        fontSize: '9px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '2px',
    },
    metricValue: {
        fontSize: '16px',
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: '2px',
    },
    metricSubtext: {
        fontSize: '9px',
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    statusGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        marginBottom: '12px',
    },
    statusItem: {
        padding: '8px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
    },
    statusHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '6px',
    },
    statusIcon: {
        fontSize: '12px',
        fontWeight: '700',
    },
    statusLabel: {
        fontSize: '10px',
        color: '#6b7280',
        fontWeight: '500',
        flex: 1,
    },
    statusContent: {
        display: 'flex',
        alignItems: 'baseline',
        gap: '4px',
        marginBottom: '6px',
    },
    statusCount: {
        fontSize: '14px',
        fontWeight: '700',
        color: '#1f2937',
    },
    statusPercentage: {
        fontSize: '10px',
        color: '#6b7280',
    },
    statusBar: {
        width: '100%',
        height: '6px',
        backgroundColor: '#e5e7eb',
        borderRadius: '3px',
        overflow: 'hidden',
    },
    statusBarFill: {
        height: '100%',
        transition: 'width 0.3s ease',
    },
    completionSection: {
        paddingTop: '12px',
        borderTop: '2px solid #e5e7eb',
    },
    completionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '6px',
    },
    completionLabel: {
        fontSize: '11px',
        fontWeight: '600',
        color: '#374151',
    },
    completionPercent: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#3b82f6',
    },
    progressBar: {
        width: '100%',
        height: '20px',
        backgroundColor: '#f3f4f6',
        borderRadius: '4px',
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
        marginBottom: '4px',
    },
    progressFill: {
        height: '100%',
        transition: 'width 0.3s ease',
    },
    progressSubtext: {
        fontSize: '9px',
        color: '#9ca3af',
        fontStyle: 'italic',
        textAlign: 'center',
    },
};

export default ReportWorkOrders;