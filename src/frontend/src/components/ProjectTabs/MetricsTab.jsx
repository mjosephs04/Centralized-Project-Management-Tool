import React, { useEffect, useState } from "react";
import { 
  FaChartLine, FaDollarSign, FaCalendarAlt, FaUsers, FaShieldAlt, 
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaClock,
  FaSortUp, FaSortDown, FaMinus
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
          <div>
            <div style={{ ...styles.healthScore, color: healthColor.text }}>{healthScore.toFixed(0)}</div>
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
          />
          <MetricCard
            title="Cost Performance Index (CPI)"
            value={metrics.progress?.CPI?.toFixed(2) || "N/A"}
            icon={getStatusIcon(metrics.progress?.CPI)}
            description={metrics.progress?.CPI >= 1 ? "Under budget" : "Over budget"}
          />
          <MetricCard
            title="Work Order Completion"
            value={`${((metrics.progress?.workOrderCompletion || 0) * 100).toFixed(1)}%`}
            icon={metrics.progress?.workOrderCompletion >= 0.8 ? <FaCheckCircle style={{ color: "#059669" }} /> : <FaClock style={{ color: "#d97706" }} />}
            description={`${metrics.progress?.details?.counts?.completed || 0} of ${metrics.progress?.details?.counts?.total || 0} completed`}
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
          />
          <DetailCard
            label="Actual Duration"
            value={formatDays(metrics.schedule?.actualDuration)}
            icon={<FaClock />}
          />
          <DetailCard
            label="Schedule Variance"
            value={formatDays(metrics.schedule?.scheduleVariance)}
            icon={metrics.schedule?.scheduleVariance < 0 ? <FaTimesCircle style={{ color: "#dc2626" }} /> : <FaCheckCircle style={{ color: "#059669" }} />}
          />
          <DetailCard
            label="Forecasted Completion"
            value={formatDate(metrics.schedule?.forecastEndDate)}
            icon={<FaCalendarAlt />}
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
          />
          <DetailCard
            label="Actual Cost (AC)"
            value={formatCurrency(metrics.cost?.actualCost)}
            icon={<FaDollarSign />}
          />
          <DetailCard
            label="Cost Variance (CV)"
            value={formatCurrency(metrics.cost?.costVariance)}
            icon={metrics.cost?.costVariance >= 0 ? <FaCheckCircle style={{ color: "#059669" }} /> : <FaTimesCircle style={{ color: "#dc2626" }} />}
          />
          <DetailCard
            label="Estimate at Completion"
            value={formatCurrency(metrics.cost?.estimateAtCompletion)}
            icon={<FaChartLine />}
          />
          <DetailCard
            label="Remaining Budget"
            value={formatCurrency(metrics.cost?.remainingBudget)}
            icon={<FaDollarSign />}
          />
          <DetailCard
            label="Budget at Completion"
            value={formatCurrency(metrics.cost?.budgetAtCompletion)}
            icon={<FaDollarSign />}
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
          />
          <MetricCard
            title="Work Orders per Worker"
            value={metrics.workforce?.activeWorkOrdersPerWorker?.toFixed(1) || "0"}
            icon={<FaUsers />}
            description="Current workload"
          />
          <MetricCard
            title="Avg Work Order Duration"
            value={formatDays(metrics.workforce?.averageWorkOrderDurationDays)}
            icon={<FaClock />}
            description="Time to complete"
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
          />
          <DetailCard
            label="Overdue Orders"
            value={metrics.quality?.overdueOrders || 0}
            icon={<FaExclamationTriangle style={{ color: "#dc2626" }} />}
          />
          <DetailCard
            label="Cost Overruns"
            value={metrics.quality?.costOverruns || 0}
            icon={<FaTimesCircle style={{ color: "#dc2626" }} />}
          />
          <DetailCard
            label="Total Completed"
            value={metrics.quality?.totalCompleted || 0}
            icon={<FaCheckCircle style={{ color: "#059669" }} />}
          />
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, description }) => (
  <div style={styles.metricCard}>
    <div style={styles.metricHeader}>
      {icon}
      <h4 style={styles.metricTitle}>{title}</h4>
    </div>
    <div style={styles.metricValue}>{value}</div>
    {description && <div style={styles.metricDescription}>{description}</div>}
  </div>
);

const DetailCard = ({ label, value, icon, description }) => (
  <div style={styles.detailCard}>
    <div style={styles.detailHeader}>
      {icon && <span style={styles.detailIcon}>{icon}</span>}
      <span style={styles.detailLabel}>{label}</span>
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
    padding: "24px",
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
    marginBottom: "32px",
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
    gap: "12px",
    padding: "16px 24px",
    borderRadius: "12px",
    border: "2px solid",
  },
  healthIcon: {
    fontSize: "32px",
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
    marginBottom: "32px",
    backgroundColor: "white",
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "2px solid #f3f4f6",
  },
  sectionIcon: {
    fontSize: "24px",
    color: "#3b82f6",
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },
  metricCard: {
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "20px",
  },
  metricHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "12px",
  },
  metricTitle: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#6b7280",
    margin: 0,
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
    gap: "16px",
  },
  detailCard: {
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
    padding: "16px",
  },
  detailHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  detailIcon: {
    fontSize: "16px",
    color: "#6b7280",
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
    marginTop: "20px",
    paddingTop: "20px",
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

