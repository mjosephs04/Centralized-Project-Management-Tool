import React from 'react';
import { FaClipboardList } from 'react-icons/fa';

const ReportWorkOrders = ({ metrics }) => {
    const workOrders = metrics?.workOrders || {};

    const statuses = [
        { key: 'completed', label: 'Completed', icon: '✓', color: '#10b981' },
        { key: 'in_progress', label: 'In Progress', icon: '↻', color: '#3b82f6' },
        { key: 'pending', label: 'Pending', icon: '⧗', color: '#6b7280' },
        { key: 'on_hold', label: 'On Hold', icon: '⏸', color: '#f59e0b' },
        { key: 'cancelled', label: 'Cancelled', icon: '✕', color: '#ef4444' },
    ];

    const completionRate = workOrders.completion_rate || 0;

    return (
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>
                <FaClipboardList style={styles.icon} />
                Work Orders
            </h2>

            <div style={styles.totalRow}>
                <div style={styles.totalLabel}>Total Work Orders</div>
                <div style={styles.totalValue}>{workOrders.total || 0}</div>
            </div>

            <div style={styles.statusGrid}>
                {statuses.map(status => (
                    <div key={status.key} style={styles.statusItem}>
                        <span style={{...styles.statusIcon, color: status.color}}>{status.icon}</span>
                        <span style={styles.statusLabel}>{status.label}</span>
                        <span style={styles.statusCount}>{workOrders[status.key] || 0}</span>
                    </div>
                ))}
            </div>

            <div style={styles.completionRow}>
                <div style={styles.completionLabel}>
                    Completion Rate: <span style={styles.completionPercent}>{completionRate.toFixed(1)}%</span>
                </div>
                <div style={styles.progressBar}>
                    <div style={{
                        ...styles.progressFill,
                        width: `${completionRate}%`
                    }} />
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
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        marginBottom: '12px',
        border: '1px solid #e5e7eb',
    },
    totalLabel: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    totalValue: {
        fontSize: '20px',
        fontWeight: '700',
        color: '#1f2937',
    },
    statusGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        marginBottom: '12px',
    },
    statusItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px',
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
    },
    statusIcon: {
        fontSize: '14px',
        fontWeight: '700',
    },
    statusLabel: {
        fontSize: '11px',
        color: '#6b7280',
        flex: 1,
    },
    statusCount: {
        fontSize: '13px',
        fontWeight: '700',
        color: '#1f2937',
    },
    completionRow: {
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
    },
    completionLabel: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '6px',
    },
    completionPercent: {
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
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3b82f6',
        transition: 'width 0.3s ease',
    }
};

export default ReportWorkOrders;