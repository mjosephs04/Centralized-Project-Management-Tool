import React, { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaTimes } from "react-icons/fa";
import { workOrdersAPI } from "../../services/api";

const WorkOrdersTab = ({ project }) => {
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        priority: 3,
        estimatedBudget: '',
        status: 'pending',
    });

    useEffect(() => {
        fetchWorkOrders();
    }, [project.id]);

    const fetchWorkOrders = async() => {
        try {
            setLoading(true);
            const data = await workOrdersAPI.getWorkOrdersByProject(project.id);
            setWorkOrders(data)
        } catch (err) {
            console.error('Error fetching work orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateWorkOrder = async (e) => {
        e.preventDefault();
        try {
            const workOrderData = {
                name: formData.name,
                startDate: formData.startDate,
                endDate: formData.endDate,
                priority: parseInt(formData.priority),
                status: formData.status,
                projectId: project.id,
            };

            if (formData.description && formData.description.trim() !== '') {
                workOrderData.description = formData.description;
            }
    
            if (formData.location && formData.location.trim() !== '') {
                workOrderData.location = formData.location;
            }
    
            if (formData.estimatedBudget && formData.estimatedBudget !== '') {
                workOrderData.estimatedBudget = parseFloat(formData.estimatedBudget);
            }

            console.log('Sending work order data:', workOrderData); // Debug log

            await workOrdersAPI.createWorkOrder(workOrderData);

            await fetchWorkOrders();
            setShowCreate(false);
            setFormData({
                name: '',
                description: '',
                location: '',
                startDate: '',
                endDate: '',
                priority: 3,
                estimatedBudget: '',
                status: 'pending',
            });
        } catch (err) {
            console.error('Error creating work order:', err);
            alert('Failed to create work order: ' + err.message);
        }
    };

    const getStatusColor = (status) => {
        switch(status?.toLowerCase()) {
            case 'pending':
                return { bg: '#fef3c7', text: '#92400e'};
            case 'in_progress':
                return { bg: '#dbeafe', text: '#1e40af'};
            case 'completed':
                return { bg: '#d1fae5', text: '#065f46'};
            case 'on_hold':
                return { bg: '#fee2e2', text: '#991b1b'};
            case 'cancelled':
                return { bg: '#e5e7eb', text: '#374151'};
            default:
                return { bg: '#f3f4f6', text: '#6b7280'};
        }
    };

    const getPriorityLabel = (priority) => {
        const labels = ['', 'Very Low', 'Low', 'Medium', 'High', 'Critical'];
        return labels[priority] || 'Medium';
    };

    const getPriorityColor = (priority) => {
        if (priority >= 4) return '#ef4444';
        if (priority === 3) return '#f59e0b';
        return '#10b981'; 
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Work Orders</h2>
                <button style={styles.createButton} onClick={() => setShowCreate(true)}>
                    <FaPlus /> Create Work Order
                </button>
            </div>

            {loading ? (
                <p>Loading work orders...</p>
            ) : workOrders.length === 0 ? (
                <div style={styles.emptyState}>
                    <p style={styles.emptyText}>No Work Orders Yet</p>
                    <button style={styles.createButton} onClick={() => setShowCreate(true)}>
                        <FaPlus /> Create First Work Order
                    </button>
                </div>
            ) : (
                <div style={styles.tableContainer}>
                    <table style={styles.table}>
                        <thead>
                            <tr style={styles.tableHeader}>
                                <th style={styles.th}>Name</th>
                                <th style={styles.th}>Location</th>
                                <th style={styles.th}>Start Date</th>
                                <th style={styles.th}>End Date</th>
                                <th style={styles.th}>Priority</th>
                                <th style={styles.th}>Status</th>
                                <th style={styles.th}>Budget</th>
                            </tr>
                        </thead>
                        <tbody>
                            {workOrders.map((wo) => {
                                const statusStyle = getStatusColor(wo.status);
                                return (
                                    <tr key={wo.id} style={styles.tableRow}>
                                        <td style={styles.td}>
                                            <div style={styles.nameCell}>
                                                <strong>{wo.name}</strong>
                                                {wo.description && (
                                                    <span style={styles.description}>{wo.description}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={styles.td}>{wo.location || '-'}</td>
                                        <td style={styles.td}>{wo.startDate}</td>
                                        <td style={styles.td}>{wo.endDate}</td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.priorityBadge,
                                                color: getPriorityColor(wo.priority)
                                            }}>
                                                {getPriorityLabel(wo.priority)}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            <span style={{
                                                ...styles.statusBadge,
                                                backgroundColor: statusStyle.bg,
                                                color: statusStyle.text
                                            }}>
                                                {wo.status}
                                            </span>
                                        </td>
                                        <td style={styles.td}>
                                            {wo.estimatedBudget ? `$${wo.estimatedBudget.toLocaleString()}` : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {showCreate && (
                <div style={styles.creatorOverlay} onClick={() => setShowCreate(false)}>
                    <div style={styles.creator} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.creatorHeader}>
                            <h3 style={styles.creatorTitle}>Create Work Order</h3>
                            <button style={styles.closeButton} onClick={() => setShowCreate(false)}>
                                <FaTimes />
                            </button>
                        </div>
                        <form onSubmit={handleCreateWorkOrder} style={styles.form}>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    style={styles.input}
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    style={{...styles.input, ...styles.textArea}}
                                />
                            </div>

                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Location</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                                        style={styles.input}
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Priority</label>
                                    <select
                                        required
                                        value={formData.priority}
                                        onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                                        style={styles.input}
                                    >
                                        <option value="1">Very Low</option>
                                        <option value="2">Low</option>
                                        <option value="3">Medium</option>
                                        <option value="4">High</option>
                                        <option value="5">Critical</option>
                                    </select>
                                </div>
                            </div>
                            <div style={styles.formRow}>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Start Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>End Date</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                        style={styles.input}
                                    />
                                </div>
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Estimated Budget</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.estimatedBudget}
                                    onChange={(e) => setFormData({...formData, estimatedBudget: e.target.value})}
                                    style={styles.input}
                                    placeholder="0.00"
                                />
                            </div>

                            <div style={styles.creatorActions}>
                                <button type="button" style={styles.cancelBtn} onClick={() => setShowCreate(false)}>
                                    Cancel
                                </button>
                                <button type="submit" style={styles.submitBtn}>
                                    Create Work Order
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

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
    createButton: {
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
    emptyState: {
        textAlign: 'center',
        padding: '4rem 2rem',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '2px dashed #cbd5e1',
    },
    emptyText: {
        fontSize: '1.1rem',
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    tableContainer: {
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
    },
    tableHeader: {
        backgroundColor: '#f8fafc',
    },
    th: {
        padding: '1rem',
        textAlign: 'left',
        fontWeight: '600',
        color: '#4b5563',
        fontSize: '0.875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        borderBottom: '2px solid #e5e7eb',
    },
    tableRow: {
        borderBottom: '1px solid #f3f4f6',
        transition: 'background-color 0.2s',
    },
    td: {
        padding: '1rem',
        color: '#374151',
    },
    nameCell: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    description: {
        fontSize: '0.875rem',
        color: '#6b7280',
    },
    statusBadge: {
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    priorityBadge: {
        fontSize: '0.875rem',
        fontWeight: '600',
    },
    creatorOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    creator: {
        backgroundColor: 'white',
        borderRadius: '12px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto',
    },
    creatorHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem',
        borderBottom: '1px solid #e5e7eb',
    },
    creatorTitle: {
        fontSize: '1.5rem',
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
    form: {
        padding: '1.5rem',
    },
    formGroup: {
        marginBottom: '1.5rem',
        flex: 1,
    },
    formRow: {
        display: 'flex',
        gap: '1rem',
    },
    label: {
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: '600',
        color: '#374151',
        fontSize: '0.875rem',
    },
    input: {
        width: '100%',
        padding: '0.75rem',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    textArea: {
        minHeight: '100px',
        resize: 'vertical',
    },
    creatorActions: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
        marginTop: '2rem',
    },
    cancelBtn: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#e5e7eb',
        color: '#374151',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
    submitBtn: {
        padding: '0.75rem 1.5rem',
        backgroundColor: '#0052D4',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
    },
};

export default WorkOrdersTab;