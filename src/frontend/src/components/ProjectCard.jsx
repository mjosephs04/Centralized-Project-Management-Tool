import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
    FaClock, 
    FaUsers, 
    FaClipboardList,
    FaChartLine
} from "react-icons/fa";
import { projectsAPI } from "../services/api";
import { getStatusConfig } from "../utils/projectStatusConfig";

// Helper Functions - Define before component
const getHealthColor = (score) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#f97316';
    return '#ef4444';
};

const getHealthLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
};

// Styles - Define before component
const styles = {
    cardLink: {
        textDecoration: 'none',
        color: 'inherit',
        display: 'block',
    },
    projectCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        minHeight: '420px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
    },
    cardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
    },
    titleSection: {
        flex: 1,
    },
    cardTitle: {
        margin: '0 0 0.375rem 0',
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#111827',
        lineHeight: '1.3',
    },
    cardLocation: {
        margin: 0,
        color: '#6b7280',
        fontSize: '0.875rem',
        fontWeight: '500',
    },
    headerRight: {
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
    },
    statusBadge: {
        padding: '0.375rem 0.875rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    metricsSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
    },
    primaryMetric: {
        display: 'flex',
        justifyContent: 'center',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #e5e7eb',
    },
    healthScoreContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
    },
    healthScoreCircle: {
        width: '70px',
        height: '70px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    healthScoreInner: {
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    healthScoreValue: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#111827',
    },
    healthScoreLabel: {
        display: 'flex',
        flexDirection: 'column',
    },
    metricLabel: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151',
    },
    metricSubtext: {
        fontSize: '0.75rem',
        color: '#6b7280',
    },
    secondaryMetrics: {
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.75rem',
    },
    metricPill: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        padding: '0.625rem',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
    },
    pillIcon: {
        fontSize: '1.125rem',
    },
    pillContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.125rem',
    },
    pillLabel: {
        fontSize: '0.6875rem',
        color: '#6b7280',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
    },
    pillValue: {
        fontSize: '0.9375rem',
        fontWeight: '700',
        color: '#111827',
    },
    crewInfoSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.875rem',
    },
    crewInfoItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.875rem',
        padding: '0.75rem',
        backgroundColor: 'white',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
    },
    crewIcon: {
        fontSize: '1.375rem',
        color: '#5692bc',
    },
    crewLabel: {
        margin: 0,
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '500',
    },
    crewValue: {
        margin: 0,
        fontSize: '0.9375rem',
        fontWeight: '700',
        color: '#111827',
    },
    progressSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    progressHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressLabel: {
        fontSize: '0.8125rem',
        fontWeight: '600',
        color: '#374151',
    },
    progressValue: {
        fontSize: '0.8125rem',
        fontWeight: '700',
        color: '#111827',
    },
    progressBarContainer: {
        width: '100%',
        height: '8px',
        backgroundColor: '#e5e7eb',
        borderRadius: '4px',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        transition: 'width 0.5s ease',
        borderRadius: '4px',
    },
    workOrderProgress: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '0.25rem',
    },
    workOrderLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
    },
    workOrderValue: {
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#111827',
    },
    cardFooter: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '0.75rem',
        paddingTop: '1rem',
        borderTop: '1px solid #e5e7eb',
    },
    footerItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    footerLabel: {
        fontSize: '0.6875rem',
        color: '#6b7280',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: '0.3px',
    },
    footerValue: {
        fontSize: '0.875rem',
        fontWeight: '700',
        color: '#111827',
    },
    loadingMetrics: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2rem',
    },
    loadingSpinner: {
        fontSize: '0.875rem',
        color: '#6b7280',
    },
    hoverOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(to top, rgba(17, 24, 39, 0.9), transparent)',
        padding: '2rem 1.5rem 1.5rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    viewDetailsButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#5692bc',
        color: 'white',
        borderRadius: '8px',
        fontSize: '0.9375rem',
        fontWeight: '600',
        textAlign: 'center',
        cursor: 'pointer',
    },
};

// Helper Component - Define before main component
const MetricPill = ({ icon, label, value, status }) => {
    const getStatusColor = () => {
        switch (status) {
            case 'good': return '#10b981';
            case 'warning': return '#f59e0b';
            case 'danger': return '#ef4444';
            default: return '#5692bc';
        }
    };

    return (
        <div style={styles.metricPill}>
            <div style={{ ...styles.pillIcon, color: getStatusColor() }}>
                {icon}
            </div>
            <div style={styles.pillContent}>
                <span style={styles.pillLabel}>{label}</span>
                <span style={styles.pillValue}>{value}</span>
            </div>
        </div>
    );
};

// Main Component
const ProjectCard = ({ project, userRole, currentUserId }) => {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isHovered, setIsHovered] = useState(false);

    const projectId = project.id || project.name.toLowerCase().replace(/\s+/g, '-');

    const loadCardMetrics = useCallback(async () => {
        try {
            setLoading(true);
            // Use the optimized cardSummary endpoint
            const summary = await projectsAPI.getMetrics.cardSummary(project.id);
            
            const activeWorkOrders = (summary.statusDistribution?.pending || 0) + 
                                    (summary.statusDistribution?.in_progress || 0);

            setMetrics({
                ...summary,
                activeWorkOrders
            });
        } catch (err) {
            console.error("Error loading card metrics:", err);
            // Set default values on error
            setMetrics({
                healthScore: 0,
                teamSize: 0,
                statusDistribution: {},
                SPI: 1,
                CPI: 1,
                workOrderCompletion: 0,
                activeWorkOrders: 0
            });
        } finally {
            setLoading(false);
        }
    }, [project.id]);

    useEffect(() => {
        loadCardMetrics();
    }, [loadCardMetrics]);

    const getProjectStatusDisplay = () => {
        // Get status from project.status (database value)
        const statusConfig = getStatusConfig(project.status);
        
        if (!statusConfig) {
            // Fallback if status not found
            return { 
                label: project.status || "Unknown", 
                color: "#6b7280", 
                border: "#6b7280" 
            };
        }
        
        return {
            label: statusConfig.label,
            color: statusConfig.color,
            border: statusConfig.borderColor
        };
    };

    const getProgressPercentage = () => {
        if (!project.startDate || !project.endDate) return 0;
        const now = new Date();
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        const total = end - start;
        const elapsed = now - start;
        return Math.min(Math.max((elapsed / total) * 100, 0), 100);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(value || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getDaysRemaining = () => {
        const now = new Date();
        const end = new Date(project.endDate);
        const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        return diff;
    };

    const status = getProjectStatusDisplay();
    const progressPercentage = getProgressPercentage();
    const daysRemaining = getDaysRemaining();

    // Determine what to show based on role
    const isManager = userRole === 'manager' || userRole === 'project_manager';

    return (
        <Link 
            to={`/projects/${projectId}`} 
            style={styles.cardLink}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div style={{
                ...styles.projectCard,
                borderLeft: `6px solid ${status.border}`,
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                boxShadow: isHovered 
                    ? '0 8px 24px rgba(0, 0, 0, 0.12)' 
                    : '0 4px 15px rgba(0, 0, 0, 0.08)'
            }}>
                
                {/* Header Section */}
                <div style={styles.cardHeader}>
                    <div style={styles.titleSection}>
                        <h3 style={styles.cardTitle}>{project.name}</h3>
                        <p style={styles.cardLocation}>{project.location || 'No location specified'}</p>
                    </div>
                    <div style={styles.headerRight}>
                        <div style={{
                            ...styles.statusBadge,
                            backgroundColor: `${status.color}15`,
                            color: status.color,
                            border: `1px solid ${status.color}40`
                        }}>
                            {status.label}
                        </div>
                    </div>
                </div>

                {/* Metrics Section - Role Based */}
                {!loading && metrics && (
                    <div style={styles.metricsSection}>
                        {isManager ? (
                            // Manager View: Health Score, Performance Indicators, Team Info
                            <>
                                <div style={styles.primaryMetric}>
                                    <div style={styles.healthScoreContainer}>
                                        <div style={{
                                            ...styles.healthScoreCircle,
                                            background: `conic-gradient(${getHealthColor(metrics.healthScore)} ${metrics.healthScore * 3.6}deg, #e5e7eb ${metrics.healthScore * 3.6}deg)`
                                        }}>
                                            <div style={styles.healthScoreInner}>
                                                <span style={styles.healthScoreValue}>{Math.round(metrics.healthScore)}</span>
                                            </div>
                                        </div>
                                        <div style={styles.healthScoreLabel}>
                                            <span style={styles.metricLabel}>Health Score</span>
                                            <span style={styles.metricSubtext}>{getHealthLabel(metrics.healthScore)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={styles.secondaryMetrics}>
                                    <MetricPill
                                        icon={<FaChartLine />}
                                        label="SPI"
                                        value={metrics.SPI?.toFixed(2)}
                                        status={metrics.SPI >= 1 ? 'good' : 'warning'}
                                    />
                                    <MetricPill
                                        icon={<FaChartLine />}
                                        label="CPI"
                                        value={metrics.CPI?.toFixed(2)}
                                        status={metrics.CPI >= 1 ? 'good' : 'warning'}
                                    />
                                    <MetricPill
                                        icon={<FaUsers />}
                                        label="Team"
                                        value={metrics.teamSize}
                                        status="neutral"
                                    />
                                    <MetricPill
                                        icon={<FaClipboardList />}
                                        label="Active WOs"
                                        value={metrics.activeWorkOrders}
                                        status="neutral"
                                    />
                                </div>
                            </>
                        ) : (
                            // Crew Member View: Personal assignments and next work
                            <div style={styles.crewInfoSection}>
                                <div style={styles.crewInfoItem}>
                                    <FaClipboardList style={styles.crewIcon} />
                                    <div>
                                        <p style={styles.crewLabel}>Your Active Tasks</p>
                                        <p style={styles.crewValue}>
                                            {/* This would need user-specific data */}
                                            {metrics.activeWorkOrders} work orders
                                        </p>
                                    </div>
                                </div>
                                <div style={styles.crewInfoItem}>
                                    <FaClock style={styles.crewIcon} />
                                    <div>
                                        <p style={styles.crewLabel}>Next Assignment</p>
                                        <p style={styles.crewValue}>
                                            {daysRemaining > 0 ? `${daysRemaining} days` : 'Overdue'}
                                        </p>
                                    </div>
                                </div>
                                <div style={styles.crewInfoItem}>
                                    <FaUsers style={styles.crewIcon} />
                                    <div>
                                        <p style={styles.crewLabel}>Team Size</p>
                                        <p style={styles.crewValue}>{metrics.teamSize} members</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {loading && (
                    <div style={styles.loadingMetrics}>
                        <div style={styles.loadingSpinner}>Loading metrics...</div>
                    </div>
                )}

                {/* Progress Bar */}
                <div style={styles.progressSection}>
                    <div style={styles.progressHeader}>
                        <span style={styles.progressLabel}>Timeline Progress</span>
                        <span style={styles.progressValue}>{Math.round(progressPercentage)}%</span>
                    </div>
                    <div style={styles.progressBarContainer}>
                        <div style={{
                            ...styles.progressBarFill,
                            width: `${progressPercentage}%`,
                            backgroundColor: status.color
                        }}></div>
                    </div>
                    {metrics && (
                        <div style={styles.workOrderProgress}>
                            <span style={styles.workOrderLabel}>Work Order Completion:</span>
                            <span style={styles.workOrderValue}>
                                {Math.round((metrics.workOrderCompletion || 0) * 100)}%
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div style={styles.cardFooter}>
                    {isManager && (
                        <div style={styles.footerItem}>
                            <span style={styles.footerLabel}>Budget</span>
                            <span style={styles.footerValue}>{formatCurrency(project.estimatedBudget)}</span>
                        </div>
                    )}
                    <div style={styles.footerItem}>
                        <span style={styles.footerLabel}>Start</span>
                        <span style={styles.footerValue}>{formatDate(project.startDate)}</span>
                    </div>
                    <div style={styles.footerItem}>
                        <span style={styles.footerLabel}>End</span>
                        <span style={styles.footerValue}>{formatDate(project.endDate)}</span>
                    </div>
                    <div style={styles.footerItem}>
                        <span style={styles.footerLabel}>Remaining</span>
                        <span style={{
                            ...styles.footerValue,
                            color: daysRemaining < 0 ? '#ef4444' : daysRemaining < 7 ? '#f59e0b' : '#10b981'
                        }}>
                            {daysRemaining > 0 ? `${daysRemaining}d` : 'Overdue'}
                        </span>
                    </div>
                </div>

                {/* Hover Overlay */}
                {isHovered && (
                    <div style={styles.hoverOverlay}>
                        <div style={styles.viewDetailsButton}>
                            View Full Details →
                        </div>
                    </div>
                )}
            </div>
        </Link>
    );
};

export default ProjectCard;