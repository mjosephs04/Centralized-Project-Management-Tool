import React, { useState } from "react";
import { FaEdit, FaSave, FaTimes, FaMapMarkerAlt, FaCalendarAlt, FaDollarSign, FaFlag, FaChartLine, FaTrashAlt} from "react-icons/fa";
import { projectsAPI } from "../../services/api";
import { useSnackbar } from '../../contexts/SnackbarContext';
import { PROJECT_STATUS_CONFIG } from "../../utils/projectStatusConfig";

const OverviewTab = ({ project, onUpdate, onDelete, userRole }) => {
    const { showSnackbar } = useSnackbar();
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [password, setPassword] = useState('');
    const [deleteError, setDeleteError] = useState('');

    // Check if project is in a terminal/frozen status
    const isProjectFrozen = () => {
        const terminalStatuses = ['archived', 'cancelled'];
        return terminalStatuses.includes(project.status);
    };

    // Check if user can edit status (only PMs can change status of frozen projects)
    const canEditStatus = () => {
        const isManager = userRole === 'project_manager' || userRole === 'manager';
        return isManager; // PMs can always edit status, even on frozen projects
    };

    // Check if user can edit other fields (frozen projects can't be edited except status)
    const canEditFields = () => {
        if (isProjectFrozen()) return false; // No one can edit frozen project fields
        return true; // Normal projects are editable
    };

    // Helper functions defined before use
    const parseLocation = (locationString) => {
        if (!locationString) return { address: '', address2: '', city: '', state: '', zipCode: '' };
        
        const parts = locationString.split(',').map(part => part.trim());
        
        // Expected format: "123 Main St, Unit 4B, City, State, 12345" or "123 Main St, City, State, 12345"
        // Check if we have 5 parts (with address2) or 4 parts (without address2)
        if (parts.length >= 5) {
            return {
                address: parts[0] || '',
                address2: parts[1] || '',
                city: parts[2] || '',
                state: parts[3] || '',
                zipCode: parts[4] || ''
            };
        } else {
            return {
                address: parts[0] || '',
                address2: '',
                city: parts[1] || '',
                state: parts[2] || '',
                zipCode: parts[3] || ''
            };
        }
    };

    const formatLocation = (address, address2, city, state, zipCode) => {
        const parts = [address, address2, city, state, zipCode].filter(part => part && part.trim());
        return parts.join(', ');
    };

    // Helper function to capitalize priority for display
    const capitalizePriority = (priority) => {
        if (!priority) return 'Medium';
        return priority.charAt(0).toUpperCase() + priority.slice(1);
    };

    // Get status display config
    const getStatusDisplayConfig = (statusValue) => {
        const config = Object.values(PROJECT_STATUS_CONFIG).find(s => s.value === statusValue);
        return config || PROJECT_STATUS_CONFIG.PLANNING;
    };

    const [editedData, setEditedData] = useState({
        ...parseLocation(project.location),
        actualStartDate: project.actualStartDate || '',
        endDate: project.endDate || '',
        priority: capitalizePriority(project.priority),
        status: project.status || 'planning',
        estimatedBudget: project.estimatedBudget || ''
    });

    const handleSave = async () => {
        try {
            if (onUpdate) {
                // If project is frozen, only save status change
                if (isProjectFrozen()) {
                    const processedData = {
                        status: editedData.status,
                    };
                    await onUpdate(processedData);
                    showSnackbar('Project status updated successfully!', 'success');
                } else {
                    // Normal save - all fields
                    const location = formatLocation(
                        editedData.address,
                        editedData.address2,
                        editedData.city,
                        editedData.state,
                        editedData.zipCode
                    );
        
                    const processedData = {
                        location: location,
                        priority: editedData.priority.toLowerCase(),
                        status: editedData.status,
                        estimatedBudget: editedData.estimatedBudget ? parseFloat(editedData.estimatedBudget) : null,
                        actualStartDate: editedData.actualStartDate || null,
                        endDate: editedData.endDate || null
                    };
                    await onUpdate(processedData);
                    showSnackbar('Project details updated successfully!', 'success');
                }
            }
            setIsEditing(false);
        } catch (error) {
            showSnackbar('Failed to update project details', 'error');
        }
    };
    
    const handleCancel = () => {
        setEditedData({
            ...parseLocation(project.location),
            actualStartDate: project.actualStartDate || '',
            endDate: project.endDate || '',
            priority: capitalizePriority(project.priority),
            status: project.status || 'planning',
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

    const currentStatusConfig = getStatusDisplayConfig(project.status);
    const priorityStyle = getPriorityStyle(isEditing ? editedData.priority : project.priority);

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Project Information</h2>
                {isProjectFrozen() && !isEditing && (
                    <div style={styles.frozenBanner}>
                        <span style={styles.frozenIcon}>🔒</span>
                        <div style={styles.frozenText}>
                            <strong>Project {project.status === 'archived' ? 'Archived' : 'Cancelled'}</strong>
                            <p style={styles.frozenSubtext}>
                                {canEditStatus() 
                                    ? 'Only status can be changed to reactivate this project' 
                                    : 'This project is locked and cannot be edited'}
                            </p>
                        </div>
                    </div>
                )}
                {!isEditing ? (
                    canEditStatus() ? (
                        <button style={styles.editButton} onClick={() => setIsEditing(true)}>
                            <FaEdit /> {isProjectFrozen() ? 'Change Status' : 'Edit Details'}
                        </button>
                    ) : isProjectFrozen() ? (
                        <button style={styles.disabledButton} disabled>
                            <FaEdit /> Project Locked
                        </button>
                    ) : (
                        <button style={styles.editButton} onClick={() => setIsEditing(true)}>
                            <FaEdit /> Edit Details
                        </button>
                    )
                ) : (
                    <div style={styles.editActions}>
                        {!isProjectFrozen() && (
                            <button style={styles.deleteButton} onClick={handleDeleteClick}>
                                <FaTrashAlt /> Delete Project
                            </button>
                        )}
                        <button style={styles.saveButton} onClick={handleSave}>
                            <FaSave /> Save
                        </button>
                        <button style={styles.cancelButton} onClick={handleCancel}>
                            <FaTimes /> Cancel
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
                    )
                )}
            </div>
            {isEditing ? (
                // Edit Mode - Clean Form Layout
                <div style={styles.editForm}>
                    {/* Status Section - NEW */}
                    <div style={styles.formSection}>
                        <h3 style={styles.sectionTitle}>
                            <FaChartLine style={styles.sectionIcon} />
                            Project Status
                        </h3>
                        <div style={styles.formGrid}>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={styles.inputLabel}>Current Status *</label>
                                <select
                                    value={editedData.status}
                                    onChange={(e) => setEditedData({...editedData, status: e.target.value})}
                                    style={{
                                        ...styles.formSelect,
                                        color: getStatusDisplayConfig(editedData.status).color,
                                        fontWeight: '600'
                                    }}
                                >
                                    <option value="planning">Planning</option>
                                    <option value="initiated">Initiated</option>
                                    <option value="regulatory_scoping">Regulatory & Scoping</option>
                                    <option value="design_procurement">Design & Procurement</option>
                                    <option value="construction_prep">Construction Prep</option>
                                    <option value="in_construction">In Construction</option>
                                    <option value="commissioning">Commissioning</option>
                                    <option value="energized">Energized</option>
                                    <option value="closeout">Closeout</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="archived">Archived</option>
                                </select>
                                <p style={styles.helperText}>
                                    {getStatusDisplayConfig(editedData.status).description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Location Section */}
                    {!isProjectFrozen() && (
                        <div style={styles.formSection}>
                            <h3 style={styles.sectionTitle}>
                                <FaMapMarkerAlt style={styles.sectionIcon} />
                                Location
                            </h3>
                            <div style={styles.formGrid}>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label style={styles.inputLabel}>Street Address *</label>
                                    <input
                                        type='text'
                                        value={editedData.address}
                                        onChange={(e) => setEditedData({...editedData, address: e.target.value})}
                                        style={styles.formInput}
                                        placeholder="123 Main Street"
                                    />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label style={styles.inputLabel}>Unit/Suite/Apt (Optional)</label>
                                <input
                                    type='text'
                                    value={editedData.address2}
                                    onChange={(e) => setEditedData({...editedData, address2: e.target.value})}
                                    style={styles.formInput}
                                    placeholder="Unit 4B, Suite 200, Apt 5, etc."
                                />
                            </div>
                            <div>
                                <label style={styles.inputLabel}>City *</label>
                                <input
                                    type='text'
                                    value={editedData.city}
                                    onChange={(e) => setEditedData({...editedData, city: e.target.value})}
                                    style={styles.formInput}
                                    placeholder="Austin"
                                />
                            </div>
                            <div>
                                <label style={styles.inputLabel}>State *</label>
                                <input
                                    type='text'
                                    value={editedData.state}
                                    onChange={(e) => setEditedData({...editedData, state: e.target.value})}
                                    style={styles.formInput}
                                    placeholder="TX"
                                />
                            </div>
                            <div>
                                <label style={styles.inputLabel}>ZIP Code *</label>
                                <input
                                    type='text'
                                    value={editedData.zipCode}
                                    onChange={(e) => setEditedData({...editedData, zipCode: e.target.value})}
                                    style={styles.formInput}
                                    placeholder="78701"
                                />
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Dates Section */}
                    {!isProjectFrozen() && (
                    <div style={styles.formSection}>
                        <h3 style={styles.sectionTitle}>
                            <FaCalendarAlt style={styles.sectionIcon} />
                            Dates
                        </h3>
                        <div style={styles.formGrid}>
                            <div>
                                <label style={styles.inputLabel}>Actual Start Date</label>
                                <input
                                    type='date'
                                    value={editedData.actualStartDate}
                                    onChange={(e) => setEditedData({...editedData, actualStartDate: e.target.value})}
                                    style={styles.formInput}
                                />
                            </div>
                            <div>
                                <label style={styles.inputLabel}>Scheduled End Date</label>
                                <input
                                    type='date'
                                    value={editedData.endDate}
                                    onChange={(e) => setEditedData({...editedData, endDate: e.target.value})}
                                    style={styles.formInput}
                                />
                            </div>
                        </div>
                    </div>
                    )}

                    {/* Budget & Priority Section */}
                    {!isProjectFrozen() && (
                    <div style={styles.formSection}>
                        <h3 style={styles.sectionTitle}>
                            <FaDollarSign style={styles.sectionIcon} />
                            Budget & Priority
                        </h3>
                        <div style={styles.formGrid}>
                            {userRole !== 'worker' && (
                                <div>
                                    <label style={styles.inputLabel}>Allocated Budget</label>
                                    <input
                                        type='number'
                                        value={editedData.estimatedBudget}
                                        onChange={(e) => setEditedData({...editedData, estimatedBudget: e.target.value})}
                                        style={styles.formInput}
                                        placeholder="50000"
                                    />
                                </div>
                            )}
                            <div>
                                <label style={styles.inputLabel}>Priority</label>
                                <select
                                    value={editedData.priority}
                                    onChange={(e) => setEditedData({...editedData, priority: e.target.value})}
                                    style={styles.formSelect}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            ) : (
                // View Mode - Original Card Grid
                <div style={styles.grid}>
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <FaMapMarkerAlt style={styles.icon} />
                            <span style={styles.label}>Location</span>
                        </div>
                        <div>
                            <p style={styles.value}>{parseLocation(project.location).address || 'Not specified'}</p>
                            {parseLocation(project.location).address2 && (
                                <p style={{ ...styles.value, fontSize: '1.1rem', color: '#4a5568', marginTop: '0.25rem' }}>
                                    {parseLocation(project.location).address2}
                                </p>
                            )}
                            <p style={{ ...styles.value, fontSize: '0.95rem', color: '#718096', marginTop: '0.25rem' }}>
                                {(() => {
                                    const loc = parseLocation(project.location);
                                    const cityState = [loc.city, loc.state].filter(part => part).join(', ');
                                    const parts = [cityState, loc.zipCode].filter(part => part);
                                    return parts.join(' ') || '';
                                })()}
                            </p>
                        </div>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <FaCalendarAlt style={styles.icon} />
                            <span style={styles.label}>Actual Start Date</span>
                        </div>
                        <p style={styles.value}>{project.actualStartDate || 'Not specified'}</p>
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
                        <p style={styles.value}>{project.endDate || 'Not specified'}</p>
                    </div>

                    {userRole !== 'worker' && (
                        <div style={styles.card}>
                            <div style={styles.cardHeader}>
                                <FaDollarSign style={styles.icon} />
                                <span style={styles.label}>Allocated Budget</span>
                            </div>
                            <p style={styles.value}>
                                {project.estimatedBudget ? `$${parseFloat(project.estimatedBudget).toFixed(2)}` : 'Not specified'}
                            </p>
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
                        <div style={{
                            ...styles.priorityBadge,
                            backgroundColor: priorityStyle.bg,
                            color: priorityStyle.text
                        }}>
                            <span style={styles.priorityIcon}>{priorityStyle.icon}</span>
                            {capitalizePriority(project.priority)}
                        </div>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <FaChartLine style={styles.icon} />
                            <span style={styles.label}>Status</span>
                        </div>
                        <div style={{
                            ...styles.statusBadge,
                            background: currentStatusConfig.bgColor,
                            color: currentStatusConfig.color,
                            border: `2px solid ${currentStatusConfig.color}`
                        }}>
                            {currentStatusConfig.label}
                        </div>
                    </div>
                </div>
            )}

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
        padding: '1rem 0',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
    },
    title: {
        fontSize: '1.75rem',
        fontWeight: 'bold',
        margin: 0,
    },
    editButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#5692bc',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.3s',
    },
    disabledButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#9ca3af',
        color: '#d1d5db',
        border: 'none',
        borderRadius: '8px',
        cursor: 'not-allowed',
        fontSize: '1rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    frozenBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.875rem 1.25rem',
        backgroundColor: '#fef3c7',
        border: '2px solid #f59e0b',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    frozenIcon: {
        fontSize: '1.5rem',
    },
    frozenText: {
        flex: 1,
    },
    frozenSubtext: {
        margin: '0.25rem 0 0 0',
        fontSize: '0.875rem',
        color: '#92400e',
    },
    editActions: {
        display: 'flex',
        gap: '0.75rem',
    },
    saveButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    cancelButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    deleteButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
    },
    icon: {
        fontSize: '1.25rem',
        color: '#5692bc',
    },
    label: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
    },
    value: {
        fontSize: '1.25rem',
        fontWeight: '600',
        color: '#1a202c',
        margin: 0,
    },
    statusBadge: {
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        fontSize: '1rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        display: 'inline-block',
    },
    priorityBadge: {
        padding: '0.5rem 1rem',
        borderRadius: '20px',
        fontSize: '1rem',
        fontWeight: '700',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    priorityIcon: {
        fontSize: '1.25rem',
    },
    editForm: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    formSection: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.25rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        boxSizing: 'border-box',
        overflow: 'visible',
    },
    sectionTitle: {
        fontSize: '1.125rem',
        fontWeight: '600',
        marginBottom: '0.875rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: '#1a202c',
    },
    sectionIcon: {
        fontSize: '1.25rem',
        color: '#5692bc',
    },
    formGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
    },
    inputLabel: {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '0.375rem',
    },
    formInput: {
        width: '100%',
        padding: '0.625rem 0.75rem',
        borderRadius: '8px',
        border: '2px solid #e5e7eb',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.3s',
        boxSizing: 'border-box',
    },
    formSelect: {
        width: '100%',
        padding: '0.625rem 0.75rem',
        borderRadius: '8px',
        border: '2px solid #e5e7eb',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.3s',
        cursor: 'pointer',
        backgroundColor: 'white',
        boxSizing: 'border-box',
    },
    helperText: {
        fontSize: '0.8125rem',
        color: '#6b7280',
        marginTop: '0.5rem',
        fontStyle: 'italic',
    },
    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
    },
    modalTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        margin: 0,
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        cursor: 'pointer',
        color: '#6b7280',
    },
    modalContent: {
        marginBottom: '1.5rem',
    },
    warningText: {
        fontSize: '1rem',
        color: '#ef4444',
        marginBottom: '1rem',
    },
    confirmText: {
        fontSize: '1rem',
        color: '#374151',
        marginBottom: '1rem',
    },
    passwordInput: {
        width: '100%',
        padding: '0.75rem',
        borderRadius: '8px',
        border: '2px solid #e5e7eb',
        fontSize: '1rem',
    },
    errorText: {
        fontSize: '0.875rem',
        color: '#ef4444',
        marginTop: '0.5rem',
    },
    modalActions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '1rem',
    },
    modalCancelButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
    },
    modalDeleteButton: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#ef4444',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
    },
};

export default OverviewTab;