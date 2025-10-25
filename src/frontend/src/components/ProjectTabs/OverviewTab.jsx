import React, { useState } from "react";
import { FaEdit, FaSave, FaTimes, FaMapMarkerAlt, FaCalendarAlt, FaDollarSign, FaFlag, FaChartLine, FaTrashAlt } from "react-icons/fa";
import { projectsAPI } from "../../services/api";
import { useSnackbar } from '../../contexts/SnackbarContext';

const OverviewTab = ({ project, onUpdate, onDelete, userRole }) => {
    const { showSnackbar } = useSnackbar();
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [password, setPassword] = useState('');
    const [deleteError, setDeleteError] = useState('');

    // Helper function to capitalize priority for display
    const capitalizePriority = (priority) => {
        if (!priority) return 'Medium';
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    };

    const [editedData, setEditedData] = useState({
        location: project.location || '',
        actualStartDate: project.actualStartDate || '',
        endDate: project.endDate || '',
        priority: capitalizePriority(project.priority),
        estimatedBudget: project.estimatedBudget || ''
    });

    const handleSave = async () => {
        try {
            if (onUpdate) {
                // Convert data to match backend expectations
                const processedData = {
                    ...editedData,
                    priority: editedData.priority.toLowerCase(),
                    estimatedBudget: editedData.estimatedBudget ? parseFloat(editedData.estimatedBudget) : null,
                    // Only include dates if they have values
                    actualStartDate: editedData.actualStartDate || null,
                    endDate: editedData.endDate || null
                };
                await onUpdate(processedData);
                showSnackbar('Project details updated successfully!', 'success');
            }
            setIsEditing(false);
        } catch (error) {
            showSnackbar('Failed to update project details', 'error');
        }
    };

    const handleCancel = () => {
        setEditedData({
            location: project.location || '',
            actualStartDate: project.actualStartDate || '',
            endDate: project.endDate || '',
            priority: capitalizePriority(project.priority),
            estimatedBudget: project.estimatedBudget || ''
        });
        setIsEditing(false);
        showSnackbar('Changes discarded', 'warning');
    }

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
        setDeleteError('');
        setPassword('');
    };

    const handleDeleteCancel = () => {
        setShowDeleteConfirm(false);
        setDeleteError('');
        setPassword('');
        showSnackbar('Project deletion cancelled', 'warning');
    };

    const handleDeleteConfirm = async () => {
        if (!password || password.trim() === '') {
            setDeleteError('Please enter a password to confirm');
            return;
        }

        try {
            await projectsAPI.deleteProject(project.id);

            setShowDeleteConfirm(false);
            showSnackbar('Project deleted successfully', 'success');

            if(onDelete) {
                onDelete();
            }
        } catch (err) {
            console.error('Error deleting project:', err);
            setDeleteError(err.response?.data?.message || 'Failed to delete project');
            showSnackbar(err.response?.data?.message || 'Failed to delete project', 'error');
        }
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
                return { bg: '#e0e7ff', text: '#3730a3', icon: '🟢'};
            default:
                return { bg: '#f3f4f6', text: '#374151', icon: '⚪️'};
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
                        <button style={styles.deleteButton} onClick={handleDeleteClick}>
                            <FaTrashAlt /> Delete Project
                        </button>
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
                        <p style={styles.value}>{project.actualStartDate || 'Not specified'}</p>
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
                            value={editedData.endDate}
                            onChange={(e) => setEditedData({...editedData, endDate: e.target.value})}
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
                                value={editedData.estimatedBudget}
                                onChange={(e) => setEditedData({...editedData, estimatedBudget: e.target.value})}
                                style={styles.input}
                                placeholder="$0.00"
                            />
                        ) : (
                            <p style={styles.value}>
                                {project.estimatedBudget ? `$${parseFloat(project.estimatedBudget).toFixed(2)}` : 'Not specified'}
                            </p>
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
                            {capitalizePriority(project.priority)}
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
                        {project.status || 'Not Set'}
                    </div>
                </div>
            </div>
            {showDeleteConfirm && (
                <div style={styles.modalOverlay} onClick={handleDeleteCancel}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>Confirm Project Deletion</h3>
                            <button style={styles.closeButton} onClick={handleDeleteCancel}>
                                <FaTimes />
                            </button>
                        </div>
                        <div style={styles.modalContent}>
                            <p style={styles.warningText}>
                                ⚠️ This action cannot be undone. Deleting this project will permanently remove all associated data and connections.
                            </p>
                            <p style={styles.confirmText}>
                                Please enter your password to confirm deletion of <strong>{project.name}</strong>:
                            </p>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={styles.passwordInput}
                                autoFocus
                            />
                            {deleteError && (
                                <p style={styles.errorText}>{deleteError}</p>
                            )}
                        </div>
                        <div style={styles.modalActions}>
                            <button style={styles.modalCancelButton} onClick={handleDeleteCancel}>
                                Cancel
                            </button>
                            <button style={styles.modalDeleteButton} onClick={handleDeleteConfirm}>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const styles = {
    container: {
        maxWidth: '1800px',
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
        padding: '0.6rem 1.2rem',
        background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.9rem',
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
        padding: '0.6rem 1.2rem',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    cancelButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.2rem',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
    },
    card: {
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '10px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        height: '100px',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        marginBottom: '0.5rem',
    },
    icon: {
        color: '#0052D4',
        fontSize: '1rem',
    },
    label: {
        fontSize: '0.75rem',
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
        wordBreak: 'break-word'
    },
    placeholderValue: {
        fontSize: '0.95rem',
        fontWeight: '500',
        color: '#9ca3af',
        margin: 0,
        fontStyle: 'italic',
    },
    input: {
        width: '100%',
        padding: '0.5rem',
        fontSize: '1rem',
        border: '2px solid #e5e7eb',
        borderRadius: '6px',
        fontWeight: '600',
        color: '#2c3e50',
        transition: 'border-color 0.2s',
        outline: 'none',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%',
        padding: '0.5rem',
        fontSize: '1rem',
        border: '2px solid #e5e7eb',
        borderRadius: '6px',
        fontWeight: '600',
        color: '#2c3e50',
        backgroundColor: 'white',
        cursor: 'pointer',
        outline: 'none',
        boxSizing: 'border-box',
    },
    statusBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0.4rem 1rem',
        borderRadius: '16px',
        fontSize: '1.3rem',
        fontWeight: '700',
        textTransform: 'capitalize',
        height: '40px',
        width: '100px',
    },
    priorityBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.4rem',
        padding: '0.4rem 1rem',
        borderRadius: '8px',
        fontSize: '1.3rem',
        fontWeight: '700',
        textTransform: 'capitalize',
        height: '40px',
        width: '100px',
    },
    priorityIcon: {
        display: 'flex',
        fontSize: '1.2rem',
    },
    deleteButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.2rem',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '500px',
        boxShadow:'0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb',
    },
    modalTitle: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#2c3e50',
        margin: 0,
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        color: '#6b7280',
        cursor: 'pointer',
        padding: '0.25rem',
    },
    modalContent: {
        padding: '1.25rem',
    },
    warningText: {
        color: '#dc2626',
        fontSize: '0.95rem',
        marginBottom: '1rem',
        padding: '0.75rem',
        backgroundColor: '#fee2e2',
        borderRadius: '6px',
        border: '1px solid #fca5a5',
    },
    confirmText: {
        fontSize: '0.95rem',
        color: '#374151',
        marginBottom: '1rem',
    },
    passwordInput: {
        width: '100%',
        padding: '0.75rem',
        border: '2px solid #e5e7eb',
        borderRadius: '6px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    },
    errorText: {
        color: '#dc2626',
        fontSize: '0.875rem',
        marginTop: '0.5rem',
        marginBottom: 0,
    },
    modalActions: {
        display: 'flex',
        gap: '0.75rem',
        justifyContent: 'flex-end',
        padding: '1.5rem',
        borderTop: '1px solid #e5e7eb',
    },
    modalCancelButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#e5e7eb',
        color: '#374151',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    modalDeleteButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#dc2626',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
};

export default OverviewTab;