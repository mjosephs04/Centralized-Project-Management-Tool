import React from 'react';
import { FaChartLine, FaCalendarAlt, FaUsers, FaShieldAlt } from 'react-icons/fa';

const ReportMetrics = ({ metrics }) => {
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return 'N/A';
        return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDays = (value) => {
        if (value === null || value === undefined) return 'N/A';
        const rounded = Math.round(value * 10) / 10;
        return `${rounded} ${Math.abs(rounded) === 1 ? 'day' : 'days'}`;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const progress = metrics?.progress || {};
    const schedule = metrics?.schedule || {};
    const workforce = metrics?.workforce || {};
    const quality = metrics?.quality || {};
    const health = metrics?.health || {};

    const getHealthColor = (score) => {
        if (score >= 80) return { bg: '#d1fae5', text: '#065f46', label: 'Excellent' };
        if (score >= 60) return { bg: '#fef3c7', text: '#92400e', label: 'Good' };
        if (score >= 40) return { bg: '#fed7aa', text: '#9a3412', label: 'Fair' };
        return { bg: '#fee2e2', text: '#991b1b', label: 'Poor' };
    };

    const healthScore = health.healthScore || 0;
    const healthColor = getHealthColor(healthScore);

    return (
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>
                <FaChartLine style={styles.icon} />
                Project Metrics & Performance
            </h2>

            {/* Health Score Banner */}
            <div style={{
                ...styles.healthBanner,
                backgroundColor: healthColor.bg,
                borderColor: healthColor.text,
            }}>
                <div style={styles.healthContent}>
                    <span style={styles.healthLabel}>Project Health Score</span>
                    <div style={styles.healthScoreRow}>
                        <span style={{...styles.healthScore, color: healthColor.text}}>
                            {healthScore.toFixed(0)}
                        </span>
                        <span style={{...styles.healthRating, color: healthColor.text}}>
                            {healthColor.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* Performance Indicators */}
            <div style={styles.sectionSubtitle}>
                <FaChartLine style={styles.subtitleIcon} />
                Performance Indicators
            </div>
            <div style={styles.metricsGrid}>
                <div style={styles.metricBox}>
                    <div style={styles.metricLabel}>Schedule Performance (SPI)</div>
                    <div style={{
                        ...styles.metricValue,
                        color: progress.SPI >= 1 ? '#059669' : '#dc2626'
                    }}>
                        {(progress.SPI || 0).toFixed(2)}
                    </div>
                    <div style={styles.metricDescription}>
                        {progress.SPI >= 1 ? 'On track' : 'Behind schedule'}
                    </div>
                </div>
                <div style={styles.metricBox}>
                    <div style={styles.metricLabel}>Cost Performance (CPI)</div>
                    <div style={{
                        ...styles.metricValue,
                        color: progress.CPI >= 1 ? '#059669' : '#dc2626'
                    }}>
                        {(progress.CPI || 0).toFixed(2)}
                    </div>
                    <div style={styles.metricDescription}>
                        {progress.CPI >= 1 ? 'Under budget' : 'Over budget'}
                    </div>
                </div>
                <div style={styles.metricBox}>
                    <div style={styles.metricLabel}>Work Order Completion</div>
                    <div style={styles.metricValue}>
                        {((progress.workOrderCompletion || 0) * 100).toFixed(1)}%
                    </div>
                    <div style={styles.metricDescription}>
                        {progress.details?.counts?.completed || 0} of {(progress.details?.counts?.total || 0) - (progress.details?.counts?.cancelled || 0)} done
                    </div>
                </div>
            </div>

            {/* Schedule Metrics */}
            <div style={styles.sectionSubtitle}>
                <FaCalendarAlt style={styles.subtitleIcon} />
                Schedule Metrics
            </div>
            <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Planned Duration:</span>
                    <span style={styles.detailValue}>{formatDays(schedule.plannedDuration)}</span>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Actual Duration:</span>
                    <span style={styles.detailValue}>{formatDays(schedule.actualDuration)}</span>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Schedule Variance:</span>
                    <span style={{
                        ...styles.detailValue,
                        color: schedule.scheduleVariance >= 0 ? '#059669' : '#dc2626'
                    }}>
                        {formatDays(schedule.scheduleVariance)}
                    </span>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Forecast Completion:</span>
                    <span style={styles.detailValue}>{formatDate(schedule.forecastEndDate)}</span>
                </div>
            </div>

            {/* Workforce Metrics */}
            <div style={styles.sectionSubtitle}>
                <FaUsers style={styles.subtitleIcon} />
                Workforce & Resources
            </div>
            <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Team Size:</span>
                    <span style={styles.detailValue}>{workforce.teamSize || 0}</span>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Work Orders per Worker:</span>
                    <span style={styles.detailValue}>{(workforce.activeWorkOrdersPerWorker || 0).toFixed(1)}</span>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Avg WO Duration:</span>
                    <span style={styles.detailValue}>{formatDays(workforce.averageWorkOrderDurationDays)}</span>
                </div>
            </div>

            {/* Risk & Quality */}
            <div style={styles.sectionSubtitle}>
                <FaShieldAlt style={styles.subtitleIcon} />
                Risk & Quality
            </div>
            <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Risk Index:</span>
                    <span style={{
                        ...styles.detailValue,
                        color: quality.riskIndex > 50 ? '#dc2626' : '#059669'
                    }}>
                        {(quality.riskIndex || 0).toFixed(1)}%
                    </span>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Overdue Orders:</span>
                    <span style={styles.detailValue}>{quality.overdueOrders || 0}</span>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Cost Overruns:</span>
                    <span style={styles.detailValue}>{quality.costOverruns || 0}</span>
                </div>
                <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Total Completed:</span>
                    <span style={styles.detailValue}>{quality.totalCompleted || 0}</span>
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
    healthBanner: {
        padding: '12px',
        borderRadius: '6px',
        border: '2px solid',
        marginBottom: '12px',
    },
    healthContent: {
        textAlign: 'center',
    },
    healthLabel: {
        display: 'block',
        fontSize: '10px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px',
    },
    healthScoreRow: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '8px',
    },
    healthScore: {
        fontSize: '24px',
        fontWeight: '700',
    },
    healthRating: {
        fontSize: '12px',
        fontWeight: '600',
    },
    sectionSubtitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        fontWeight: '600',
        color: '#374151',
        marginTop: '12px',
        marginBottom: '8px',
        paddingBottom: '6px',
        borderBottom: '1px solid #e5e7eb',
    },
    subtitleIcon: {
        fontSize: '11px',
        color: '#6b7280',
    },
    metricsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginBottom: '12px',
    },
    metricBox: {
        padding: '10px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
    },
    metricLabel: {
        fontSize: '9px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px',
    },
    metricValue: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: '2px',
    },
    metricDescription: {
        fontSize: '9px',
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    detailsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '8px',
        marginBottom: '8px',
    },
    detailItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 8px',
        backgroundColor: '#f9fafb',
        borderRadius: '4px',
        border: '1px solid #e5e7eb',
    },
    detailLabel: {
        fontSize: '10px',
        color: '#6b7280',
        fontWeight: '500',
    },
    detailValue: {
        fontSize: '11px',
        fontWeight: '700',
        color: '#1f2937',
    },
};

export default ReportMetrics;