import React, { useState, useEffect } from "react";
import { FaUser, FaCalendarAlt, FaDollarSign, FaMapMarkerAlt, FaFlag, FaCog } from "react-icons/fa";
import { projectsAPI } from "../../services/api";

const LogsTab = ({ project, refreshTrigger }) => {
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all', 'project', 'workorder', 'team'
    const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month'

    useEffect(() => {
        fetchAuditLogs();
    }, [project.id, refreshTrigger]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await projectsAPI.getProjectAuditLogs(project.id);
            setAuditLogs(response.auditLogs || []);
        } catch (err) {
            console.error('Error fetching audit logs:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getFieldIcon = (field) => {
        switch (field) {
            case 'name':
            case 'description':
                return <FaCog style={styles.fieldIcon} />;
            case 'location':
                return <FaMapMarkerAlt style={styles.fieldIcon} />;
            case 'startDate':
            case 'endDate':
            case 'actualStartDate':
            case 'actualEndDate':
                return <FaCalendarAlt style={styles.fieldIcon} />;
            case 'estimatedBudget':
            case 'actualCost':
                return <FaDollarSign style={styles.fieldIcon} />;
            case 'priority':
            case 'status':
                return <FaFlag style={styles.fieldIcon} />;
            case 'crewMembers':
            case 'assignedWorkers':
                return <FaUser style={styles.fieldIcon} />;
            default:
                return <FaCog style={styles.fieldIcon} />;
        }
    };

    const formatFieldName = (field) => {
        const fieldMap = {
            'name': 'Project Name',
            'description': 'Description',
            'location': 'Location',
            'startDate': 'Start Date',
            'endDate': 'End Date',
            'actualStartDate': 'Actual Start Date',
            'actualEndDate': 'Actual End Date',
            'estimatedBudget': 'Estimated Budget',
            'actualCost': 'Actual Cost',
            'priority': 'Priority',
            'status': 'Status',
            'crewMembers': 'Team Members',
            'teamMembers': 'Team Members',
            'assignedWorkers': 'Assigned Workers',
            'work_order_created': 'Work Order Created',
            'work_order_deleted': 'Work Order Deleted'
        };
        return fieldMap[field] || field;
    };

    const formatValue = (value, field) => {
        if (value === null || value === undefined || value === '') {
            return 'Not set';
        }
        
        // Format priority values
        if (field === 'priority') {
            const priorityMap = {
                '1': 'Very Low',
                '2': 'Low', 
                '3': 'Medium',
                '4': 'High',
                '5': 'Critical',
                'very_low': 'Very Low',
                'low': 'Low',
                'medium': 'Medium', 
                'high': 'High',
                'critical': 'Critical'
            };
            return priorityMap[value] || value;
        }
        
        return value;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString();
        } catch {
            return dateString;
        }
    };

    const isToday = (dateString) => {
        if (!dateString) return false;
        const logDate = new Date(dateString);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
    };

    const isThisWeek = (dateString) => {
        if (!dateString) return false;
        const logDate = new Date(dateString);
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return logDate >= startOfWeek && logDate <= endOfWeek;
    };

    const isThisMonth = (dateString) => {
        if (!dateString) return false;
        const logDate = new Date(dateString);
        const today = new Date();
        return logDate.getMonth() === today.getMonth() && 
               logDate.getFullYear() === today.getFullYear();
    };

    const matchesTimeFilter = (log) => {
        if (timeFilter === 'all') return true;
        if (timeFilter === 'today') return isToday(log.createdAt);
        if (timeFilter === 'week') return isThisWeek(log.createdAt);
        if (timeFilter === 'month') return isThisMonth(log.createdAt);
        return true;
    };

    const getEntityTypeIcon = (entityType, field) => {
        if (entityType === 'project' && field === 'crewMembers') {
            return <FaUser style={styles.entityIcon} />;
        }
        switch (entityType) {
            case 'project':
                return <FaCog style={styles.entityIcon} />;
            case 'work_order':
                return <FaCalendarAlt style={styles.entityIcon} />;
            default:
                return <FaCog style={styles.entityIcon} />;
        }
    };

    const getEntityTypeLabel = (entityType, field) => {
        if (entityType === 'project' && field === 'crewMembers') {
            return 'Team';
        }
        switch (entityType) {
            case 'project':
                return 'Project';
            case 'work_order':
                return 'Work Order';
            default:
                return entityType;
        }
    };

    const getEntityTypeColor = (entityType, field) => {
        if (entityType === 'project' && field === 'crewMembers') {
            return '#8b5cf6'; // purple
        }
        switch (entityType) {
            case 'project':
                return '#3b82f6'; // blue
            case 'work_order':
                return '#10b981'; // green
            default:
                return '#6b7280'; // gray
        }
    };

    // Group logs by sessionId for batching
    const groupLogsBySession = (logs) => {
        const grouped = {};
        logs.forEach(log => {
            const sessionKey = log.sessionId || `single_${log.id}`;
            if (!grouped[sessionKey]) {
                grouped[sessionKey] = {
                    sessionId: log.sessionId,
                    logs: [],
                    createdAt: log.createdAt,
                    user: log.user,
                    entityType: log.entityType,
                    primaryField: log.field // Track the primary field for display
                };
            }
            grouped[sessionKey].logs.push(log);
        });
        
        // Convert to array and sort by creation time
        return Object.values(grouped).sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    };

    // Filter logs based on selected filter and time filter
    const filteredLogs = auditLogs.filter(log => {
        // Apply entity type filter
        let matchesEntityFilter = true;
        if (filter === 'all') matchesEntityFilter = true;
        else if (filter === 'project') matchesEntityFilter = log.entityType === 'project' && log.field !== 'crewMembers' && log.field !== 'teamMembers';
        else if (filter === 'workorder') matchesEntityFilter = log.entityType === 'work_order';
        else if (filter === 'team') matchesEntityFilter = log.entityType === 'project' && (log.field === 'crewMembers' || log.field === 'teamMembers');
        
        // Apply time filter
        const matchesTime = matchesTimeFilter(log);
        
        return matchesEntityFilter && matchesTime;
    });

    // Group the filtered logs
    const groupedLogs = groupLogsBySession(filteredLogs);

    if (loading) {
        return (
            <div style={styles.container}>
                <h2 style={styles.title}>Project Activity Logs</h2>
                <div style={styles.loadingBox}>
                    <p style={styles.loadingText}>Loading audit logs...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.container}>
                <h2 style={styles.title}>Project Activity Logs</h2>
                <div style={styles.errorBox}>
                    <p style={styles.errorText}>Error loading audit logs: {error}</p>
                    <button style={styles.retryButton} onClick={fetchAuditLogs}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Project Activity Logs</h2>
            
            {/* Filter Controls */}
            <div style={styles.filterContainer}>
                <div style={styles.filterLabel}>Filter by type:</div>
                <div style={styles.filterButtons}>
                    <button 
                        style={{
                            ...styles.filterButton,
                            ...(filter === 'all' ? styles.filterButtonActive : {})
                        }}
                        onClick={() => setFilter('all')}
                    >
                        All ({auditLogs.length})
                    </button>
                    <button 
                        style={{
                            ...styles.filterButton,
                            ...(filter === 'project' ? styles.filterButtonActive : {})
                        }}
                        onClick={() => setFilter('project')}
                    >
                        Project ({auditLogs.filter(log => log.entityType === 'project' && log.field !== 'crewMembers' && log.field !== 'teamMembers').length})
                    </button>
                    <button 
                        style={{
                            ...styles.filterButton,
                            ...(filter === 'workorder' ? styles.filterButtonActive : {})
                        }}
                        onClick={() => setFilter('workorder')}
                    >
                        Work Orders ({auditLogs.filter(log => log.entityType === 'work_order').length})
                    </button>
                    <button 
                        style={{
                            ...styles.filterButton,
                            ...(filter === 'team' ? styles.filterButtonActive : {})
                        }}
                        onClick={() => setFilter('team')}
                    >
                        Team ({auditLogs.filter(log => log.entityType === 'project' && (log.field === 'crewMembers' || log.field === 'teamMembers')).length})
                    </button>
                </div>
            </div>
            
            {/* Time Filter Controls */}
            <div style={styles.timeFilterContainer}>
                <div style={styles.filterLabel}>Filter by time:</div>
                <div style={styles.filterButtons}>
                    <button 
                        style={{
                            ...styles.filterButton,
                            ...(timeFilter === 'all' ? styles.filterButtonActive : {})
                        }}
                        onClick={() => setTimeFilter('all')}
                    >
                        All Time
                    </button>
                    <button 
                        style={{
                            ...styles.filterButton,
                            ...(timeFilter === 'today' ? styles.filterButtonActive : {})
                        }}
                        onClick={() => setTimeFilter('today')}
                    >
                        Today ({auditLogs.filter(log => isToday(log.createdAt)).length})
                    </button>
                    <button 
                        style={{
                            ...styles.filterButton,
                            ...(timeFilter === 'week' ? styles.filterButtonActive : {})
                        }}
                        onClick={() => setTimeFilter('week')}
                    >
                        This Week ({auditLogs.filter(log => isThisWeek(log.createdAt)).length})
                    </button>
                    <button 
                        style={{
                            ...styles.filterButton,
                            ...(timeFilter === 'month' ? styles.filterButtonActive : {})
                        }}
                        onClick={() => setTimeFilter('month')}
                    >
                        This Month ({auditLogs.filter(log => isThisMonth(log.createdAt)).length})
                    </button>
                </div>
            </div>
            
            {groupedLogs.length === 0 ? (
                <div style={styles.emptyBox}>
                    <p style={styles.emptyText}>
                        {timeFilter === 'all' 
                            ? "No activity logs found for this project yet. Changes will appear here once you start updating project details."
                            : timeFilter === 'today'
                            ? "No activity logs found for today. Try selecting a different time period or check back later."
                            : timeFilter === 'week'
                            ? "No activity logs found for this week. Try selecting a different time period or check back later."
                            : timeFilter === 'month'
                            ? "No activity logs found for this month. Try selecting a different time period or check back later."
                            : "No activity logs found matching your current filters."
                        }
                    </p>
                </div>
            ) : (
                <div style={styles.logsContainer}>
                    {groupedLogs.map((session, sessionIndex) => (
                        <div key={session.sessionId || `session_${sessionIndex}`} style={styles.logEntry}>
                            <div style={styles.logHeader}>
                                <div style={styles.logField}>
                                    {session.logs.length === 1 
                                        ? getFieldIcon(session.logs[0].field)
                                        : <FaCog style={styles.fieldIcon} />
                                    }
                                    <span style={styles.fieldName}>
                                        {session.logs.length === 1 
                                            ? formatFieldName(session.logs[0].field)
                                            : `${session.logs.length} fields updated`
                                        }
                                    </span>
                                    <div style={{
                                        ...styles.entityTypeBadge,
                                        backgroundColor: getEntityTypeColor(session.entityType, session.primaryField) + '20',
                                        color: getEntityTypeColor(session.entityType, session.primaryField),
                                        borderColor: getEntityTypeColor(session.entityType, session.primaryField) + '40'
                                    }}>
                                        {getEntityTypeIcon(session.entityType, session.primaryField)}
                                        <span style={styles.entityTypeText}>
                                            {getEntityTypeLabel(session.entityType, session.primaryField)}
                                        </span>
                                    </div>
                                </div>
                                <div style={styles.logTime}>
                                    {formatDate(session.createdAt)}
                                </div>
                            </div>
                            <div style={styles.logContent}>
                                {session.logs.map((log, logIndex) => (
                                    <div key={log.id} style={styles.changeGroup}>
                                        {/* Special handling for work order creation/deletion */}
                                        {(log.field === 'work_order_created' || log.field === 'work_order_deleted') ? (
                                            <div style={styles.specialEventRow}>
                                                <span style={{
                                                    ...styles.specialEventLabel,
                                                    color: log.field === 'work_order_created' ? '#059669' : '#dc2626'
                                                }}>
                                                    {log.field === 'work_order_created' ? '✓' : '✗'}
                                                </span>
                                                <span style={styles.specialEventText}>
                                                    {log.field === 'work_order_created' 
                                                        ? `Work order "${log.newValue}" was created`
                                                        : `Work order "${log.oldValue}" was deleted`
                                                    }
                                                </span>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={styles.changeRow}>
                                                    <span style={styles.changeLabel}>
                                                        {formatFieldName(log.field)}
                                                        {log.field === 'assignedWorkers' && log.workOrderName && (
                                                            <span style={styles.workOrderName}> for "{log.workOrderName}"</span>
                                                        )}:
                                                    </span>
                                                </div>
                                                 <div style={styles.changeRow}>
                                                     <span style={styles.changeLabel}>From:</span>
                                                     <span style={styles.oldValue}>{formatValue(log.oldValue, log.field)}</span>
                                                 </div>
                                                 <div style={styles.changeRow}>
                                                     <span style={styles.changeLabel}>To:</span>
                                                     <span style={styles.newValue}>{formatValue(log.newValue, log.field)}</span>
                                                 </div>
                                            </>
                                        )}
                                        {logIndex < session.logs.length - 1 && (
                                            <div style={styles.changeSeparator}></div>
                                        )}
                                    </div>
                                ))}
                                {session.user && (
                                    <div style={styles.userInfo}>
                                        <FaUser style={styles.userIcon} />
                                        <span style={styles.userName}>
                                            {session.user.firstName} {session.user.lastName}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '0 auto',
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: '600',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '0.25rem',
    },
    subtitle: {
        color: '#6b7280',
        marginTop: 0,
        marginBottom: '2rem',
    },
    loadingBox: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px solid #e5e7eb',
        padding: '2rem',
        marginTop: '1rem',
        textAlign: 'center',
    },
    loadingText: {
        margin: 0,
        color: '#6b7280',
        fontSize: '1rem',
    },
    errorBox: {
        backgroundColor: '#fef2f2',
        borderRadius: '12px',
        border: '2px solid #fecaca',
        padding: '2rem',
        marginTop: '1rem',
        textAlign: 'center',
    },
    errorText: {
        margin: 0,
        color: '#dc2626',
        fontSize: '1rem',
        marginBottom: '1rem',
    },
    retryButton: {
        padding: '0.5rem 1rem',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.9rem',
    },
    emptyBox: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px dashed #cbd5e1',
        padding: '2rem',
        marginTop: '1rem',
        textAlign: 'center',
    },
    emptyText: {
        margin: 0,
        color: '#6b7280',
        lineHeight: 1.6,
    },
    logsContainer: {
        marginTop: '1rem',
    },
    logEntry: {
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    logHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        paddingBottom: '0.75rem',
        borderBottom: '1px solid #f3f4f6',
    },
    logField: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    fieldIcon: {
        color: '#3b82f6',
        fontSize: '1rem',
    },
    fieldName: {
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#1f2937',
    },
    logTime: {
        fontSize: '0.9rem',
        color: '#6b7280',
    },
    logContent: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    changeRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    changeLabel: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#6b7280',
        minWidth: '40px',
    },
    oldValue: {
        fontSize: '0.9rem',
        color: '#dc2626',
        backgroundColor: '#fef2f2',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        border: '1px solid #fecaca',
    },
    newValue: {
        fontSize: '0.9rem',
        color: '#059669',
        backgroundColor: '#ecfdf5',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        border: '1px solid #a7f3d0',
    },
    userInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginTop: '0.5rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid #f3f4f6',
    },
    userIcon: {
        color: '#6b7280',
        fontSize: '0.9rem',
    },
    userName: {
        fontSize: '0.9rem',
        color: '#6b7280',
        fontWeight: '500',
    },
    changeGroup: {
        marginBottom: '0.5rem',
    },
    changeSeparator: {
        height: '1px',
        backgroundColor: '#e5e7eb',
        margin: '0.75rem 0',
    },
    filterContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
    },
    timeFilterContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f0f9ff',
        borderRadius: '8px',
        border: '1px solid #bae6fd',
    },
    filterLabel: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#374151',
    },
    filterButtons: {
        display: 'flex',
        gap: '0.5rem',
    },
    filterButton: {
        padding: '0.5rem 1rem',
        fontSize: '0.85rem',
        fontWeight: '500',
        color: '#6b7280',
        backgroundColor: 'white',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    filterButtonActive: {
        color: '#3b82f6',
        backgroundColor: '#eff6ff',
        borderColor: '#3b82f6',
    },
    entityIcon: {
        fontSize: '0.8rem',
        marginRight: '0.25rem',
    },
    entityTypeBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        padding: '0.25rem 0.5rem',
        borderRadius: '4px',
        fontSize: '0.75rem',
        fontWeight: '600',
        marginLeft: '0.75rem',
        border: '1px solid',
    },
    entityTypeText: {
        fontSize: '0.75rem',
        fontWeight: '600',
    },
    specialEventRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.75rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
    },
    specialEventLabel: {
        fontSize: '1.2rem',
        fontWeight: 'bold',
        minWidth: '24px',
        textAlign: 'center',
    },
    specialEventText: {
        fontSize: '1rem',
        fontWeight: '500',
        color: '#374151',
    },
    workOrderName: {
        fontWeight: '600',
        color: '#6b7280',
    }
};

export default LogsTab;


