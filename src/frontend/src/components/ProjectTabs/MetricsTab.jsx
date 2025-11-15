import React, { useEffect, useState } from "react";
import { 
  FaChartLine, FaDollarSign, FaCalendarAlt, FaUsers, FaShieldAlt, 
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaClock,
  FaSortUp, FaSortDown, FaMinus, FaInfoCircle
} from "react-icons/fa";
import { projectsAPI } from "../../services/api";

const MetricsTab = ({ project }) => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMetrics();
  }, [project.id]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.getMetrics.all(project.id);
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error("Error loading metrics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return { bg: "#d1fae5", text: "#065f46", icon: "🟢", label: "Excellent" };
    if (score >= 60) return { bg: "#fef3c7", text: "#92400e", icon: "🟡", label: "Good" };
    if (score >= 40) return { bg: "#fed7aa", text: "#9a3412", icon: "🟠", label: "Fair" };
    return { bg: "#fee2e2", text: "#991b1b", icon: "🔴", label: "Poor" };
  };

  const getStatusIcon = (value) => {
    if (value > 1) return <FaSortUp style={{ color: "#059669" }} />;
    if (value < 0.9) return <FaSortDown style={{ color: "#dc2626" }} />;
    return <FaMinus style={{ color: "#6b7280" }} />;
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return "N/A";
    return new Intl.NumberFormat("en-US", { 
      style: "currency", 
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDays = (value) => {
    if (value === null || value === undefined) return "N/A";
    return `${value} ${Math.abs(value) === 1 ? 'day' : 'days'}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}>Loading metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <FaExclamationTriangle style={styles.errorIcon} />
        <p style={styles.errorText}>Failed to load metrics: {error}</p>
        <button style={styles.retryButton} onClick={loadMetrics}>
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  const healthColor = getHealthColor(metrics.health?.healthScore || 0);
  const healthScore = metrics.health?.healthScore || 0;

  return (
    <div style={styles.container}>
      {/* Header with Health Score */}
      <div style={styles.header}>
        <h2 style={styles.title}>Project Metrics & Analytics</h2>
        <div style={{ ...styles.healthBadge, backgroundColor: healthColor.bg, borderColor: healthColor.text }}>
          <span style={{ ...styles.healthIcon, color: healthColor.text }}>{healthColor.icon}</span>
          <div style={styles.healthBadgeContent}>
            <div style={styles.healthScoreContainer}>
              <div style={{ ...styles.healthScore, color: healthColor.text }}>{healthScore.toFixed(0)}</div>
              <InfoTooltip 
                content="The overall project health score (0-100) is calculated using a weighted combination of schedule performance, cost performance, work order completion, and risk factors. Health Score = (Schedule Health × 35%) + (Cost Health × 35%) + (Completion Health × 20%) + (Risk Penalty × 10%)" 
                iconColor={healthColor.text}
                alignRight={true}
              />
            </div>
            <div style={{ ...styles.healthLabel, color: healthColor.text }}>{healthColor.label}</div>
          </div>
        </div>
      </div>

      {/* Progress Metrics */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <FaChartLine style={styles.sectionIcon} />
          <h3>Progress Overview</h3>
        </div>
        <div style={styles.metricGrid}>
          <MetricCard
            title="Schedule Performance Index (SPI)"
            value={metrics.progress?.SPI?.toFixed(2) || "N/A"}
            icon={getStatusIcon(metrics.progress?.SPI)}
            description={metrics.progress?.SPI >= 1 ? "On track" : "Behind schedule"}
            tooltip="Schedule Performance Index measures how efficiently the project is progressing compared to the planned schedule.SPI = EV / PV"
          />
          <MetricCard
            title="Cost Performance Index (CPI)"
            value={metrics.progress?.CPI?.toFixed(2) || "N/A"}
            icon={getStatusIcon(metrics.progress?.CPI)}
            description={metrics.progress?.CPI >= 1 ? "Under budget" : "Over budget"}
            tooltip="Cost Performance Index measures how efficiently the project is using its budget.CPI = EV / AC"
          />
          <MetricCard
            title="Work Order Completion"
            value={`${((metrics.progress?.workOrderCompletion || 0) * 100).toFixed(1)}%`}
            icon={metrics.progress?.workOrderCompletion >= 0.8 ? <FaCheckCircle style={{ color: "#059669" }} /> : <FaClock style={{ color: "#d97706" }} />}
            description={`${metrics.progress?.details?.counts?.completed || 0} of ${(metrics.progress?.details?.counts?.total || 0) - (metrics.progress?.details?.counts?.cancelled || 0)} completed`}
            tooltip="Work Order Completion measures the percentage of work orders that have been completed, giving partial credit for in-progress work.Completion = (Completed + 0.5 × In Progress) / Active Total"
          />
        </div>
      </div>

      {/* Schedule Metrics */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <FaCalendarAlt style={styles.sectionIcon} />
          <h3>Schedule & Timeline</h3>
        </div>
        <div style={styles.detailGrid}>
          <DetailCard
            label="Planned Duration"
            value={formatDays(metrics.schedule?.plannedDuration)}
            icon={<FaCalendarAlt />}
            tooltip="The original planned number of days for the project from start to end date. Duration = endDate - startDate"
          />
          <DetailCard
            label="Actual Duration"
            value={formatDays(metrics.schedule?.actualDuration)}
            icon={<FaClock />}
            tooltip="The actual number of days the project has taken or is currently taking. Duration = actualEndDate - actualStartDate (if completed) or today - actualStartDate (if in progress)"
          />
          <DetailCard
            label="Schedule Variance"
            value={formatDays(metrics.schedule?.scheduleVariance)}
            icon={metrics.schedule?.scheduleVariance < 0 ? <FaTimesCircle style={{ color: "#dc2626" }} /> : <FaCheckCircle style={{ color: "#059669" }} />}
            tooltip="Schedule Variance shows the difference between planned and actual project duration. Variance = Planned Duration - Actual Duration"
          />
          <DetailCard
            label="Forecasted Completion"
            value={formatDate(metrics.schedule?.forecastEndDate)}
            icon={<FaCalendarAlt />}
            tooltip="The projected completion date based on current schedule performance. Duration = Planned Duration / SPI"
          />
          <DetailCard
            label="Planned Value (PV)"
            value={formatCurrency(metrics.progress?.details?.budget?.plannedValuePV ? parseFloat(metrics.progress.details.budget.plannedValuePV) : null)}
            icon={<FaDollarSign />}
            tooltip="The budgeted cost of work that should have been completed by now based on the planned schedule. PV = (Days Elapsed / Total Planned Days) × Total Estimated Budget"
          />
        </div>
      </div>

      {/* Cost Metrics */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <FaDollarSign style={styles.sectionIcon} />
          <h3>Cost & Budget</h3>
        </div>
        <div style={styles.detailGrid}>
          <DetailCard
            label="Earned Value (EV)"
            value={formatCurrency(metrics.cost?.earnedValue)}
            icon={<FaCheckCircle style={{ color: "#059669" }} />}
            tooltip="The value of work actually completed to date, expressed in dollar terms.  EV = Sum of completed work orders' budgets + (50% × in-progress work orders' budgets)"
          />
          <DetailCard
            label="Actual Cost (AC)"
            value={formatCurrency(metrics.cost?.actualCost)}
            icon={<FaDollarSign />}
            tooltip="The total cost actually incurred so far on the project.  AC = Sum of all work order actual costs"
          />
          <DetailCard
            label="Cost Variance (CV)"
            value={formatCurrency(metrics.cost?.costVariance)}
            icon={metrics.cost?.costVariance >= 0 ? <FaCheckCircle style={{ color: "#059669" }} /> : <FaTimesCircle style={{ color: "#dc2626" }} />}
            tooltip="Cost Variance shows the difference between earned value and actual cost.  CV = EV - AC"
          />
          <DetailCard
            label="Estimate at Completion"
            value={formatCurrency(metrics.cost?.estimateAtCompletion)}
            icon={<FaChartLine />}
            tooltip="The forecasted total cost of the project when complete, based on current cost performance.  EAC = BAC / CPI"
          />
          <DetailCard
            label="Remaining Budget"
            value={formatCurrency(metrics.cost?.remainingBudget)}
            icon={<FaDollarSign />}
            tooltip="The amount of budget remaining for the rest of the project.  RB = BAC - AC"
          />
          <DetailCard
            label="Budget at Completion"
            value={formatCurrency(metrics.cost?.budgetAtCompletion)}
            icon={<FaDollarSign />}
            tooltip="The total planned budget for the entire project.  BAC = Sum of all active work orders' estimated budgets"
          />
        </div>
      </div>

      {/* Workforce Metrics */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <FaUsers style={styles.sectionIcon} />
          <h3>Workforce & Resources</h3>
        </div>
        <div style={styles.metricGrid}>
          <MetricCard
            title="Team Size"
            value={metrics.workforce?.teamSize || 0}
            icon={<FaUsers />}
            description="Active members"
            tooltip="The number of active team members assigned to this project.  Size = Count of active project members"
          />
          <MetricCard
            title="Work Orders per Worker"
            value={metrics.workforce?.activeWorkOrdersPerWorker?.toFixed(1) || "0"}
            icon={<FaUsers />}
            description="Current workload"
            tooltip="The average number of active work orders assigned per team member.  WOPW = (Pending + In-Progress work orders) / Team Size"
          />
          <MetricCard
            title="Avg Work Order Duration"
            value={formatDays(metrics.workforce?.averageWorkOrderDurationDays)}
            icon={<FaClock />}
            description="Time to complete"
            tooltip="The average number of days it takes to complete a work order, calculated from completed work orders only.  AWOD = Average of (actualEndDate - actualStartDate) for all completed work orders"
          />
        </div>
        
        {/* Status Distribution */}
        <div style={styles.statusContainer}>
          <h4 style={styles.statusTitle}>Work Order Status Distribution</h4>
          <div style={styles.statusGrid}>
            <StatusBadge label="Pending" count={metrics.workforce?.statusDistribution?.pending || 0} color="#f59e0b" />
            <StatusBadge label="In Progress" count={metrics.workforce?.statusDistribution?.in_progress || 0} color="#3b82f6" />
            <StatusBadge label="Completed" count={metrics.workforce?.statusDistribution?.completed || 0} color="#10b981" />
            <StatusBadge label="On Hold" count={metrics.workforce?.statusDistribution?.on_hold || 0} color="#f97316" />
            <StatusBadge label="Cancelled" count={metrics.workforce?.statusDistribution?.cancelled || 0} color="#ef4444" />
          </div>
        </div>
      </div>

      {/* Quality & Risk Metrics */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <FaShieldAlt style={styles.sectionIcon} />
          <h3>Quality & Risk</h3>
        </div>
        <div style={styles.detailGrid}>
          <DetailCard
            label="Risk Index"
            value={`${(metrics.quality?.riskIndex || 0).toFixed(1)}%`}
            icon={<FaShieldAlt style={{ color: metrics.quality?.riskIndex > 50 ? "#dc2626" : "#059669" }} />}
            description={metrics.quality?.riskIndex > 50 ? "High risk" : "Low risk"}
            tooltip="A composite risk score (0-100%) calculated from overdue orders and cost overruns.  RI = (Overdue Ratio × 50% + Cost Overrun Ratio × 50%) × 100"
            tooltipAlignLeft={true}
          />
          <DetailCard
            label="Overdue Orders"
            value={metrics.quality?.overdueOrders || 0}
            icon={<FaExclamationTriangle style={{ color: "#dc2626" }} />}
            tooltip="The number of work orders that are past their end date and not yet completed or cancelled.  Overdue = Count of work orders where status ≠ Completed/Cancelled AND endDate < today"
          />
          <DetailCard
            label="Cost Overruns"
            value={metrics.quality?.costOverruns || 0}
            icon={<FaTimesCircle style={{ color: "#dc2626" }} />}
            tooltip="The number of work orders where the actual cost exceeded the estimated budget.  Overruns = Count of work orders where actualCost > estimatedBudget"
            tooltipAlignRight={true}
          />
          <DetailCard
            label="Total Completed"
            value={metrics.quality?.totalCompleted || 0}
            icon={<FaCheckCircle style={{ color: "#059669" }} />}
            tooltip="The total number of work orders that have been marked as completed.  Completed = Count of work orders with status = Completed"
            tooltipAlignRight={true}
          />
        </div>
      </div>
    </div>
  );
};

const InfoTooltip = ({ content, iconColor, alignRight, alignLeft }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Split content into description and formula
  // Look for pattern where equation starts (contains " = ")
  const equationIndex = content.indexOf(' = ');
  let description = content;
  let formula = '';
  
  if (equationIndex > 0) {
    // Find the start of the equation (look backwards for start of word)
    let equationStart = equationIndex;
    while (equationStart > 0 && content[equationStart - 1] !== ' ' && content[equationStart - 1] !== '.') {
      equationStart--;
    }
    description = content.substring(0, equationStart).trim();
    formula = content.substring(equationStart).trim();
  }

  // Use smart positioning based on alignment preference
  let tooltipStyle;
  let arrowStyle;
  
  if (alignRight) {
    tooltipStyle = { ...styles.tooltip, ...styles.tooltipSmartRight };
    arrowStyle = { ...styles.tooltipArrow, ...styles.tooltipArrowRight };
  } else if (alignLeft) {
    tooltipStyle = { ...styles.tooltip, ...styles.tooltipSmartLeft };
    arrowStyle = { ...styles.tooltipArrow, ...styles.tooltipArrowLeft };
  } else {
    tooltipStyle = { ...styles.tooltip, ...styles.tooltipCentered };
    arrowStyle = styles.tooltipArrow;
  }

  return (
    <div style={styles.tooltipContainer}>
      <FaInfoCircle
        style={{ ...styles.infoIcon, color: iconColor || styles.infoIcon.color }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      {showTooltip && (
        <div style={tooltipStyle}>
          <div style={styles.tooltipContent}>
            <div style={styles.tooltipDescription}>{description}</div>
            {formula && (
              <div style={styles.tooltipFormula}>{formula}</div>
            )}
          </div>
          <div style={arrowStyle}></div>
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, icon, description, tooltip }) => (
  <div style={styles.metricCard}>
    <div style={styles.metricHeader}>
      {icon}
      <div style={styles.titleContainer}>
        <h4 style={styles.metricTitle}>{title}</h4>
        {tooltip && <InfoTooltip content={tooltip} />}
      </div>
    </div>
    <div style={styles.metricValue}>{value}</div>
    {description && <div style={styles.metricDescription}>{description}</div>}
  </div>
);

const DetailCard = ({ label, value, icon, description, tooltip, tooltipAlignRight, tooltipAlignLeft }) => (
  <div style={styles.detailCard}>
    <div style={styles.detailHeader}>
      {icon && <span style={styles.detailIcon}>{icon}</span>}
      <div style={styles.detailLabelContainer}>
        <span style={styles.detailLabel}>{label}</span>
        {tooltip && <InfoTooltip content={tooltip} alignRight={tooltipAlignRight} alignLeft={tooltipAlignLeft} />}
      </div>
    </div>
    <div style={styles.detailValue}>{value}</div>
    {description && <div style={styles.detailDescription}>{description}</div>}
  </div>
);

const StatusBadge = ({ label, count, color }) => (
  <div style={styles.statusBadge}>
    <div style={{ ...styles.statusDot, backgroundColor: color }}></div>
    <span style={styles.statusLabel}>{label}</span>
    <span style={styles.statusCount}>{count}</span>
  </div>
);

const styles = {
  container: {
    padding: "16px",
    backgroundColor: "#f9fafb",
    minHeight: "100vh",
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "400px",
  },
  spinner: {
    fontSize: "18px",
    color: "#6b7280",
  },
  errorContainer: {
    padding: "40px",
    textAlign: "center",
  },
  errorIcon: {
    fontSize: "48px",
    color: "#dc2626",
    marginBottom: "16px",
  },
  errorText: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "16px",
  },
  retryButton: {
    padding: "10px 20px",
    backgroundColor: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#111827",
    margin: 0,
  },
  healthBadge: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "12px 18px",
    borderRadius: "12px",
    border: "2px solid",
  },
  healthIcon: {
    fontSize: "32px",
  },
  healthBadgeContent: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  healthScoreContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  healthScore: {
    fontSize: "32px",
    fontWeight: "bold",
  },
  healthLabel: {
    fontSize: "14px",
    fontWeight: "500",
  },
  section: {
    marginBottom: "16px",
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
    paddingBottom: "10px",
    borderBottom: "2px solid #f3f4f6",
  },
  sectionIcon: {
    fontSize: "24px",
    color: "#3b82f6",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "12px",
  },
  metricCard: {
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "14px",
  },
  metricHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "8px",
  },
  titleContainer: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flex: 1,
  },
  metricTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    margin: 0,
  },
  tooltipContainer: {
    position: "relative",
    display: "inline-block",
  },
  infoIcon: {
    fontSize: "14px",
    color: "#6b7280",
    cursor: "help",
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    marginBottom: "8px",
    backgroundColor: "#1f2937",
    color: "white",
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "12px",
    lineHeight: "1.5",
    whiteSpace: "normal",
    maxWidth: "min(400px, calc(100vw - 40px))",
    width: "max-content",
    minWidth: "250px",
    zIndex: 1000,
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
  },
  tooltipCentered: {
    left: "50%",
    transform: "translateX(-50%)",
    maxWidth: "min(400px, calc(100vw - 40px))",
  },
  tooltipSmartLeft: {
    left: "0",
    transform: "none",
    maxWidth: "min(400px, calc(100vw - 20px))",
  },
  tooltipSmartRight: {
    right: "0",
    left: "auto",
    transform: "none",
    maxWidth: "min(400px, calc(100vw - 20px))",
  },
  tooltipContent: {
    maxWidth: "100%",
  },
  tooltipDescription: {
    marginBottom: "8px",
  },
  tooltipFormula: {
    fontFamily: "monospace",
  },
  tooltipArrow: {
    position: "absolute",
    bottom: "-6px",
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "6px solid transparent",
    borderRight: "6px solid transparent",
    borderTop: "6px solid #1f2937",
  },
  tooltipArrowLeft: {
    left: "20px",
    transform: "none",
  },
  tooltipArrowRight: {
    left: "auto",
    right: "20px",
    transform: "none",
  },
  metricValue: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#111827",
  },
  metricDescription: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "8px",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "12px",
  },
  detailCard: {
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "12px",
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "6px",
  },
  detailIcon: {
    fontSize: "16px",
    color: "#6b7280",
  },
  detailLabelContainer: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    flex: 1,
  },
  detailLabel: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#6b7280",
  },
  detailValue: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#111827",
  },
  detailDescription: {
    fontSize: "11px",
    color: "#6b7280",
    marginTop: "4px",
  },
  statusContainer: {
    marginTop: "12px",
    paddingTop: "12px",
    borderTop: "1px solid #e5e7eb",
  },
  statusTitle: {
    fontSize: "16px",
    fontWeight: "600",
    marginBottom: "12px",
    color: "#111827",
  },
  statusGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    backgroundColor: "#f9fafb",
    borderRadius: "20px",
    border: "1px solid #e5e7eb",
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
  },
  statusLabel: {
    fontSize: "14px",
    color: "#6b7280",
  },
  statusCount: {
    fontSize: "14px",
    fontWeight: "bold",
    color: "#111827",
  },
};

export default MetricsTab;

