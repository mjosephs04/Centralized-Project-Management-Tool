import React from 'react';
import { FaDollarSign, FaChartLine, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const ReportFinancial = ({ project, metrics }) => {
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '$0.00';
        return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const cost = metrics?.cost || {};
    const progress = metrics?.progress || {};

    // Calculate variance (EV - AC)
    const costVariance = cost.costVariance || 0;
    const remainingBudget = cost.remainingBudget || 0;

    const getVarianceStyle = () => {
        if (costVariance === 0) return styles.varianceNeutral;
        return costVariance > 0 ? styles.varianceGood : styles.varianceBad;
    };

    const getCPIStyle = () => {
        const cpi = progress.CPI || 0;
        if (cpi >= 1) return styles.cpiGood;
        if (cpi >= 0.9) return styles.cpiWarning;
        return styles.cpiBad;
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>
                <FaDollarSign style={styles.icon} />
                Financial Summary
            </h2>

            {/* Key Performance Indicators */}
            <div style={styles.kpiRow}>
                <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>Cost Performance Index</div>
                    <div style={{...styles.kpiValue, ...getCPIStyle()}}>
                        {(progress.CPI || 0).toFixed(2)}
                    </div>
                    <div style={styles.kpiDescription}>
                        {progress.CPI >= 1 ? 'Under Budget' : 'Over Budget'}
                    </div>
                </div>
                <div style={styles.kpiCard}>
                    <div style={styles.kpiLabel}>Cost Variance</div>
                    <div style={{...styles.kpiValue, ...getVarianceStyle()}}>
                        {costVariance >= 0 && '+'}{formatCurrency(costVariance)}
                    </div>
                    <div style={styles.kpiDescription}>
                        EV - AC
                    </div>
                </div>
            </div>

            {/* Budget Overview */}
            <div style={styles.sectionSubtitle}>Budget Overview</div>
            <div style={styles.topRow}>
                <div style={styles.mainMetric}>
                    <div style={styles.metricLabel}>Allocated Budget</div>
                    <div style={styles.metricValue}>{formatCurrency(cost.allocatedBudget)}</div>
                    <div style={styles.metricSubtext}>Total project budget</div>
                </div>
                <div style={styles.mainMetric}>
                    <div style={styles.metricLabel}>Actual Cost</div>
                    <div style={styles.metricValue}>{formatCurrency(cost.actualCost)}</div>
                    <div style={styles.metricSubtext}>Spent to date</div>
                </div>
                <div style={styles.mainMetric}>
                    <div style={styles.metricLabel}>Remaining Budget</div>
                    <div style={{
                        ...styles.metricValue,
                        color: remainingBudget < 0 ? '#991b1b' : '#065f46'
                    }}>
                        {formatCurrency(remainingBudget)}
                    </div>
                    <div style={styles.metricSubtext}>Available funds</div>
                </div>
            </div>

            {/* Earned Value Metrics */}
            <div style={styles.sectionSubtitle}>Earned Value Analysis</div>
            <div style={styles.breakdown}>
                <table style={styles.table}>
                    <tbody>
                        <tr style={styles.row}>
                            <td style={styles.cell}>
                                <div style={styles.cellWithIcon}>
                                    <FaDollarSign style={styles.cellIcon} />
                                    <span>Budget at Completion (BAC)</span>
                                </div>
                            </td>
                            <td style={{...styles.cell, textAlign: 'right', fontWeight: '600'}}>
                                {formatCurrency(cost.budgetAtCompletion)}
                            </td>
                        </tr>
                        <tr style={styles.row}>
                            <td style={styles.cell}>
                                <div style={styles.cellWithIcon}>
                                    <FaCheckCircle style={{...styles.cellIcon, color: '#10b981'}} />
                                    <span>Earned Value (EV)</span>
                                </div>
                            </td>
                            <td style={{...styles.cell, textAlign: 'right', fontWeight: '600'}}>
                                {formatCurrency(cost.earnedValue)}
                            </td>
                        </tr>
                        <tr style={styles.row}>
                            <td style={styles.cell}>
                                <div style={styles.cellWithIcon}>
                                    <FaDollarSign style={styles.cellIcon} />
                                    <span>Actual Cost (AC)</span>
                                </div>
                            </td>
                            <td style={{...styles.cell, textAlign: 'right', fontWeight: '600'}}>
                                {formatCurrency(cost.actualCost)}
                            </td>
                        </tr>
                        <tr style={styles.row}>
                            <td style={styles.cell}>
                                <div style={styles.cellWithIcon}>
                                    <FaDollarSign style={styles.cellIcon} />
                                    <span>Planned Value (PV)</span>
                                </div>
                            </td>
                            <td style={{...styles.cell, textAlign: 'right', fontWeight: '600'}}>
                                {formatCurrency(progress.details?.budget?.plannedValuePV ? parseFloat(progress.details.budget.plannedValuePV) : 0)}
                            </td>
                        </tr>
                        <tr style={styles.highlightRow}>
                            <td style={styles.cell}>
                                <div style={styles.cellWithIcon}>
                                    <FaChartLine style={styles.cellIcon} />
                                    <span>Estimate at Completion (EAC)</span>
                                </div>
                            </td>
                            <td style={{...styles.cell, textAlign: 'right', fontWeight: '700', fontSize: '14px'}}>
                                {formatCurrency(cost.estimateAtCompletion)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Work Order Costs by Status */}
            {cost.workOrderCosts && Object.keys(cost.workOrderCosts).some(status => cost.workOrderCosts[status]?.count > 0) && (
                <>
                    <div style={styles.sectionSubtitle}>Work Order Costs by Status</div>
                    <div style={styles.workOrderGrid}>
                        {['pending', 'in_progress', 'on_hold', 'completed', 'cancelled'].map((status) => {
                            const costs = cost.workOrderCosts[status];
                            if (!costs || costs.count === 0) return null;
                            
                            const statusLabel = status.split('_').map(word => 
                                word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ');
                            const statusColor = {
                                pending: "#f59e0b",
                                in_progress: "#3b82f6",
                                completed: "#10b981",
                                on_hold: "#f97316",
                                cancelled: "#ef4444"
                            }[status] || "#6b7280";
                            
                            const variance = costs.actual - costs.estimated;
                            
                            return (
                                <div key={status} style={styles.workOrderCard}>
                                    <div style={styles.workOrderHeader}>
                                        <div style={{...styles.statusDot, backgroundColor: statusColor}}></div>
                                        <span style={styles.workOrderTitle}>{statusLabel}</span>
                                        <span style={styles.workOrderCount}>({costs.count})</span>
                                    </div>
                                    <div style={styles.workOrderDetails}>
                                        <div style={styles.workOrderRow}>
                                            <span style={styles.workOrderLabel}>Estimated:</span>
                                            <span style={styles.workOrderValue}>{formatCurrency(costs.estimated)}</span>
                                        </div>
                                        <div style={styles.workOrderRow}>
                                            <span style={styles.workOrderLabel}>Actual:</span>
                                            <span style={styles.workOrderValue}>{formatCurrency(costs.actual)}</span>
                                        </div>
                                        {costs.estimated > 0 && (
                                            <div style={{...styles.workOrderRow, borderTop: '1px solid #e5e7eb', paddingTop: '4px', marginTop: '4px'}}>
                                                <span style={styles.workOrderLabel}>Variance:</span>
                                                <span style={{
                                                    ...styles.workOrderValue,
                                                    fontWeight: '700',
                                                    color: variance > 0 ? "#dc2626" : variance < 0 ? "#059669" : "#6b7280"
                                                }}>
                                                    {variance > 0 && '+'}{formatCurrency(variance)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
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
    kpiRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '2px solid #e5e7eb',
    },
    kpiCard: {
        textAlign: 'center',
        padding: '12px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
    },
    kpiLabel: {
        fontSize: '10px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '6px',
    },
    kpiValue: {
        fontSize: '20px',
        fontWeight: '700',
        marginBottom: '4px',
    },
    kpiDescription: {
        fontSize: '10px',
        color: '#6b7280',
        fontStyle: 'italic',
    },
    cpiGood: {
        color: '#065f46',
    },
    cpiWarning: {
        color: '#92400e',
    },
    cpiBad: {
        color: '#991b1b',
    },
    topRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '12px',
    },
    mainMetric: {
        textAlign: 'center',
        padding: '10px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb',
    },
    metricLabel: {
        fontSize: '10px',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: '4px',
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
    varianceGood: {
        color: '#065f46',
    },
    varianceBad: {
        color: '#991b1b',
    },
    varianceNeutral: {
        color: '#6b7280',
    },
    breakdown: {
        marginBottom: '12px',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    row: {
        borderBottom: '1px solid #f3f4f6',
    },
    highlightRow: {
        borderTop: '2px solid #e5e7eb',
        borderBottom: '2px solid #e5e7eb',
        backgroundColor: '#f9fafb',
    },
    cell: {
        padding: '6px 0',
        fontSize: '11px',
        color: '#374151',
    },
    cellWithIcon: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    },
    cellIcon: {
        fontSize: '11px',
        color: '#6b7280',
    },
    workOrderGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
        marginTop: '8px',
    },
    workOrderCard: {
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        padding: '10px',
        border: '1px solid #e5e7eb',
    },
    workOrderHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '8px',
        paddingBottom: '6px',
        borderBottom: '1px solid #e5e7eb',
    },
    statusDot: {
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    workOrderTitle: {
        fontSize: '10px',
        fontWeight: '600',
        color: '#111827',
        flex: 1,
    },
    workOrderCount: {
        fontSize: '9px',
        color: '#6b7280',
        fontWeight: '500',
    },
    workOrderDetails: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    workOrderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    workOrderLabel: {
        fontSize: '9px',
        color: '#6b7280',
        fontWeight: '500',
    },
    workOrderValue: {
        fontSize: '10px',
        fontWeight: '600',
        color: '#111827',
    },
};

export default ReportFinancial;