import React from 'react';
import { FaDollarSign } from 'react-icons/fa';

const ReportFinancial = ({ project, metrics }) => {
    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '$0.00';
        return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const costs = metrics?.costs || {};
    const variance = costs.variance || 0;
    const utilizationRate = costs.utilizationRate || 0;

    const getVarianceStyle = () => {
        if (variance === 0) return styles.varianceNeutral;
        return variance < 0 ? styles.varianceGood : styles.varianceBad;
    };

    const getUtilizationStyle = () => {
        if (utilizationRate <= 100) return styles.utilizationGood;
        if (utilizationRate <= 110) return styles.utilizationWarning;
        return styles.utilizationBad;
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.sectionTitle}>
                <FaDollarSign style={styles.icon} />
                Financial Summary
            </h2>

            <div style={styles.topRow}>
                <div style={styles.mainMetric}>
                    <div style={styles.metricLabel}>Allocated Budget</div>
                    <div style={styles.metricValue}>{formatCurrency(costs.allocatedBudget)}</div>
                </div>
                <div style={styles.mainMetric}>
                    <div style={styles.metricLabel}>Total Actual</div>
                    <div style={styles.metricValue}>{formatCurrency(costs.totalActual)}</div>
                </div>
                <div style={styles.mainMetric}>
                    <div style={styles.metricLabel}>Variance</div>
                    <div style={{...styles.metricValue, ...getVarianceStyle()}}>
                        {variance >= 0 && '+'}{formatCurrency(variance)}
                    </div>
                </div>
            </div>

            <div style={styles.breakdown}>
                <table style={styles.table}>
                    <tbody>
                        <tr style={styles.row}>
                            <td style={styles.cell}>Work Orders (Est)</td>
                            <td style={{...styles.cell, textAlign: 'right', fontWeight: '600'}}>
                                {formatCurrency(costs.workOrdersEstimated)}
                            </td>
                        </tr>
                        <tr style={styles.row}>
                            <td style={styles.cell}>Work Orders (Actual)</td>
                            <td style={{...styles.cell, textAlign: 'right', fontWeight: '600'}}>
                                {formatCurrency(costs.workOrdersActual)}
                            </td>
                        </tr>
                        {costs.suppliesCost > 0 && (
                            <tr style={styles.row}>
                                <td style={styles.cell}>Materials & Supplies</td>
                                <td style={{...styles.cell, textAlign: 'right', fontWeight: '600'}}>
                                    {formatCurrency(costs.suppliesCost)}
                                </td>
                            </tr>
                        )}
                        {costs.equipmentCost > 0 && (
                            <tr style={styles.row}>
                                <td style={styles.cell}>Equipment</td>
                                <td style={{...styles.cell, textAlign: 'right', fontWeight: '600'}}>
                                    {formatCurrency(costs.equipmentCost)}
                                </td>
                            </tr>
                        )}
                        {costs.otherExpenses > 0 && (
                            <tr style={styles.row}>
                                <td style={styles.cell}>Other Expenses</td>
                                <td style={{...styles.cell, textAlign: 'right', fontWeight: '600'}}>
                                    {formatCurrency(costs.otherExpenses)}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div style={styles.utilizationRow}>
                <div style={styles.utilizationLabel}>
                    Budget Utilization: <span style={{...styles.utilizationPercent, ...getUtilizationStyle()}}>
                        {utilizationRate.toFixed(1)}%
                    </span>
                </div>
                <div style={styles.progressBar}>
                    <div style={{
                        ...styles.progressFill,
                        width: `${Math.min(utilizationRate, 100)}%`,
                        ...getUtilizationStyle()
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
    topRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e5e7eb',
    },
    mainMetric: {
        textAlign: 'center',
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
    cell: {
        padding: '6px 0',
        fontSize: '12px',
        color: '#374151',
    },
    utilizationRow: {
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
    },
    utilizationLabel: {
        fontSize: '12px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '6px',
    },
    utilizationPercent: {
        fontWeight: '700',
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
        transition: 'width 0.3s ease',
    },
    utilizationGood: {
        backgroundColor: '#10b981',
        color: '#065f46',
    },
    utilizationWarning: {
        backgroundColor: '#f59e0b',
        color: '#92400e',
    },
    utilizationBad: {
        backgroundColor: '#ef4444',
        color: '#991b1b',
    }
};

export default ReportFinancial;