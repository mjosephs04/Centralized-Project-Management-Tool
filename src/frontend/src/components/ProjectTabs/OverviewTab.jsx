import React, { useState } from "react";
import { FaEdit, FaSave, FaTimes, FaMapMarkerAlt, FaCalendarAlt, FaDollarSign, FaFlag, FaChartLine } from "react-icons/fa";

const OverviewTab = ({ project, onUpdate, userRole }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState({
        location: project.location || '',
        actualStartDate: project.startDate || '',
        scheduledEndDate: project.endDate || '',
        priority: project.priority || 'Medium',
        allocatedBudget: project.estimatedBudget || ''
    });

    const handleSave = () => {
        if (onUpdate) {
            onUpdate(editedData);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedData({
            location: project.location || '',
            actualStartDate: project.startDate || '',
            scheduledEndDate: project.endDate || '',
            priority: project.priority || 'Medium',
            allocatedBudget: project.estimatedBudget || ''
        });
        setIsEditing(false);
    }

    const getStatusColor = (status) => {
        switch(status?.toLowerCase()) {
            case 'behind':
                return { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5'};
            case 'on track':
                return { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7'};
            case 'ahead':
                return { bg: '#d1fae5', text: '#047857', border: '#34d399'};
            default:
                return { bg: '#e5e7eb', text: '#374151', border: '#d1d5db'};
        }
    };

    const getPriorityStyle = (priority) => {
        switch(priority?.toLowerCase()) {
            case 'high':
                return { bg: '#fef3c7', text: '#92400e', icon: '🔴'};
            case 'medium':
                return { bg: '#dbeafe', text: '#1e40af', icon: '🟡'};
            case 'low':
                return { bg: '#e0e7ff', text: '#3730a3', border: '🟢'};
            default:
                return { bg: '#f3f4f6', text: '374151', border: '⚪️'};
        }
    };

    const statusColors = getStatusColor(project.status);
    const priorityStyle = getPriorityStyle(isEditing ? editedData.priority : project.priority);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Project Information</h2>
                {!isEditing ?(
                    <button style={styles.editButton} onClick={() => setIsEditing(true)}>
                        <FaEdit /> Edit Details
                    </button>
                ) : (
                    <div style={styles.editActions}>
                        <button style={styles.editButton} onClick={handleSave}>
                            <FaSave /> Save
                        </button>
                        <button style={styles.cancelButton} onClick={handleCancel}>
                            <FaTimes /> Cancel
                        </button>
                    </div>
                )}
            </div>

            <div style={styles.grid}>
                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <FaMapMarkerAlt style={styles.icon} />
                        <span style={styles.label}>Location</span>
                    </div>
                    {isEditing ? (
                        <input
                            type='text'
                            value={editedData.location}
                            onChange={(e) => setEditedData({...editedData, location: e.target.value})}
                            style={styles.input}
                        />
                    ) : (
                        <p style={styles.value}>{project.location || 'Not specified'}</p>
                    )}
                </div>

                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <FaCalendarAlt style={styles.icon} />
                        <span style={styles.label}>Actual Start Date</span>
                    </div>
                    {isEditing ? (
                        <input
                            type='date'
                            value={editedData.actualStartDate}
                            onChange={(e) => setEditedData({...editedData, actualStartDate: e.target.value})}
                            style={styles.input}
                        />
                    ) : (
                        <p style={styles.value}>{project.startDate || 'Not specified'}</p>
                    )}
                </div>

                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <FaCalendarAlt style={styles.icon} />
                        <span style={styles.label}>Estimated End Date</span>
                    </div>
                    <p style={styles.value}>Not Specified, will be added with algorithm introduction</p> 
                </div>

                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <FaCalendarAlt style={styles.icon} />
                        <span style={styles.label}>Scheduled End Date</span>
                    </div>
                    {isEditing ? (
                        <input
                            type='date'
                            value={editedData.scheduledEndDate}
                            onChange={(e) => setEditedData({...editedData, scheduledEndDate: e.target.value})}
                            style={styles.input}
                        />
                    ) : (
                        <p style={styles.value}>{project.endDate || 'Not specified'}</p>
                    )}
                </div>

                {userRole !== 'worker' && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <FaDollarSign style={styles.icon} />
                            <span style={styles.label}>Allocated Budget</span>
                        </div>
                        {isEditing ? (
                            <input
                                type='text'
                                value={editedData.allocatedBudget}
                                onChange={(e) => setEditedData({...editedData, allocatedBudget: e.target.value})}
                                style={styles.input}
                                placeholder="$0.00"
                            />
                        ) : (
                            <p style={styles.value}>{project.estimatedBudget || 'Not specified'}</p>
                        )}
                    </div>
                )}

                {userRole !== 'worker' && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <FaDollarSign style={styles.icon} />
                            <span style={styles.label}>Current Cost</span>
                        </div>
                        <p style={styles.value}>Not specified will be introduced with database update and work orders.</p>
                    </div>
                )}

                {userRole !== 'worker' && (
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <FaDollarSign style={styles.icon} />
                            <span style={styles.label}>Estimated Cost</span>
                        </div>
                        <p style={styles.value}>Not specified, will be added with algorithm introduction.</p>
                    </div>
                )}

                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <FaFlag style={styles.icon} />
                        <span style={styles.label}>Priority</span>
                    </div>
                    {isEditing ? (
                        <select
                            value={editedData.priority}
                            onChange={(e) => setEditedData({...editedData, priority: e.target.value})}
                            style={styles.select}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                        </select>
                    ) : (
                        <div style={{
                            ...styles.priorityBadge,
                            backgroundColor: priorityStyle.bg,
                            color: priorityStyle.text
                        }}>
                            <span style={styles.priorityIcon}>{priorityStyle.icon}</span>
                            {project.priority || 'Medium'}
                        </div>
                    )}
                </div>

                <div style={styles.card}>
                    <div style={styles.cardHeader}>
                        <FaChartLine style={styles.icon} />
                        <span style={styles.label}>Status</span>
                    </div>
                    <div style={{
                        ...styles.statusBadge,
                        background: statusColors.bg,
                        color: statusColors.text,
                        border: `2px solid ${statusColors.border}`
                    }}>

                    </div>
                </div>
            </div>
        </div>
    )


}

const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
    },
    title: {
        fontSize: '1.8rem',
        fontWeight: '600',
        color: '#2c3e50',
        margin: 0,
    },
    editButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.7rem 1.5rem',
        backgroundColor: '#0052D4',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    editActions: {
        display: 'flex',
        gap: '0.75rem',
    },
    saveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.7rem 1.5rem',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    cancelButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.7rem 1.5rem',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit minmax(300px, 1fr))',
        gap: '1.5rem',
    },
    card: {
        backgroundColor: 'white',
        padding: '1.5rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
    },
    icon: {
        color: '#0052D4',
        fontSize: '1.1rem',
    },
    label: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    value: {
        fontSize: '1.3rem',
        fontWeight: '600',
        color: '#2c3e50',
        margin: 0,
    },
    input: {
        width: '100%',
        padding: '0.6rem',
        fontSize: '1rem',
        border: '2px solid #e5e7eb',
        borderRadius: '6px',
        fontWeight: '600',
        color: '#2c3e50',
        transition: 'border-color 0.2s',
        outline: 'none',
    },
    select: {
        width: '100%',
        padding: '0.6rem',
        fontSize: '1rem',
        border: '2px solid #e5e7eb',
        borderRadius: '6px',
        fontWeight: '600',
        color: '#2c3e50',
        backgroundColor: 'white',
        cursor: 'pointer',
        outline: 'none',
    },
    statusBadge: {
        display: 'inline-block',
        padding: '0.5rem 1.2rem',
        borderRadius: '20px',
        fontSize: '1rem',
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    priorityBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1.2rem',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    priorityIcon: {
        fontSize: '1.2rem',
    }
};

export default OverviewTab;