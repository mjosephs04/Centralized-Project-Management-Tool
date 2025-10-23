import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { workOrdersAPI } from "../../services/api";
import { FaPlus, FaTimes } from "react-icons/fa";

const CalendarTab = ({ project }) => {
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
    const events =[];

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

    if (project.startDate) {
        events.push({
            title: 'Project Start',
            start: project.startDate,
            allDay: true,
            backgroundColor: '#10b981',
            borderColor: '#10b981',
            textColor: '#ffffff',
        });
    }

    if (project.endDate) {
        events.push({
            title: 'Scheduled End Date',
            start: project.endDate,
            allDay: true,
            backgroundColor: '#ef4444',
            borderColor: '#ef4444',
            textColor: '#ffffff',
        });
    }

    workOrders.forEach(wo => {
        const getPriorityColor = (priority) => {
            if (priority >= 4) return '#dc2626';
            if (priority === 3) return '#f59e0b';
            return '#8b5cf6'; 
        };

        events.push({
            title: wo.name,
            start: wo.startDate,
            end: wo.endDate,
            allDay: true,
            backgroundColor: getPriorityColor(wo.priority),
            borderColor: getPriorityColor(wo.priority),
            textColor: '#ffffff',
            extendedProps: {
                type: 'workorder',
                priority: wo.priority,
                status: wo.status,
                location: wo.location,
                description: wo.description,
            }
        });
    });

    const handleEventClick = (clickInfo) => {
        alert(`Event: ${clickInfo.event.title}\nDate: ${clickInfo.event.start.toLocaleDateString()}`);
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Project Calendar</h2>
                <button style={styles.createButton} onClick={() => setShowCreate(true)}>
                    <FaPlus /> Create Work Order
                </button>
            </div>

            <div style={styles.legend}>
                <div style={styles.legendItem}>
                    <div style={{...styles.legendDot, background: '#10b981'}}></div>
                    <span>Project Start</span>
                </div>
                <div style={styles.legendItem}>
                    <div style={{...styles.legendDot, background: '#ef4444'}}></div>
                    <span>Scheduled Project End</span>
                </div>
                <div style={styles.legendItem}>
                    <div style={{...styles.legendDot, background: '#8b5cf6'}}></div>
                    <span>Work Orders (Low Priority)</span>
                </div>
                <div style={styles.legendItem}>
                    <div style={{...styles.legendDot, background: '#f59e0b'}}></div>
                    <span>Work Orders (Medium Priority)</span>
                </div>
                <div style={styles.legendItem}>
                    <div style={{...styles.legendDot, background: '#dc2626'}}></div>
                    <span>Work Orders (High Priority)</span>
                </div>
            </div>

            <div style={styles.mainContent}>
                <div style={styles.calendarCard}>
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        events={events}
                        eventClick={handleEventClick}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,dayGridWeek'
                        }}
                        height="auto"
                        eventDisplay="block"
                        displayEventTime={false}
                        eventTextColor="#ffffff"
                        eventBorderColor="transparent"
                        eventBackgroundColor="#0052D4"
                        dayMaxEvents={3}
                        moreLinkClick="popover"
                        buttonText={{
                            today: 'Today',
                            month: 'Month',
                            week: 'Week'
                        }}
                        style={styles.calendar}
                    />
                </div>

                <div style={styles.milestonesSection}>
                    <h3 style={styles.milestonesTitle}>Project Milestones</h3>
                    <div style={styles.milestonesList}>
                        {project.startDate && (
                            <div style={styles.milestoneItem}>
                                <div style={{...styles.milestoneMarker, backgroundColor: '#10b981'}}></div>
                                <div style={styles.milestoneContent}>
                                    <div style={styles.milestoneName}>Project Start Date</div>
                                    <div style={styles.milestoneDate}>{project.startDate}</div>
                                </div>
                            </div>
                        )}
                        {project.endDate && (
                            <div style={styles.milestoneItem}>
                                <div style={{...styles.milestoneMarker, backgroundColor: '#ef4444'}}></div>
                                <div style={styles.milestoneContent}>
                                    <div style={styles.milestoneName}>Project Schedueled End Date</div>
                                    <div style={styles.milestoneDate}>{project.endDate}</div>
                                </div>
                            </div>
                        )}
                        {workOrders.length > 0 && (
                            <>
                                <h4 style={styles.sectionSubtitle}>Work Orders ({workOrders.length})</h4>
                                {workOrders.map(wo => (
                                    <div key={wo.id} style={styles.milestoneItem}>
                                        <div style={{
                                            ...styles.milestoneMarker,
                                            backgroundColor: wo.priority >= 4 ? '#dc2626' : wo.priority === 3 ? '#f59e0b' : '#8b5cf6'
                                        }}></div>
                                        <div style={styles.milestoneContent}>
                                            <div style={styles.milestoneName}>{wo.name}</div>
                                            <div style={styles.milestoneDate}>
                                                {wo.startDate} ➟ {wo.endDate}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                        {events.length === 0 && (
                            <p style={styles.noMilestones}>No milestones set for this project yet.</p>
                        )}
                    </div>
                </div>
            </div>
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
                                    placeholder="Enter work order name"
                                />
                            </div>

                            <div style={styles.formGroup}>
                                <label style={styles.label}>Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    style={{...styles.input, ...styles.textArea}}
                                    placeholder="Add a detailed description"
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
                                        placeholder="Work location"
                                    />
                                </div>

                                <div style={styles.formGroup}>
                                    <label style={styles.label}>Priority *</label>
                                    <select
                                        required
                                        value={formData.priority}
                                        onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                                        style={styles.select}
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
                                    <label style={styles.label}>Start Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                        style={styles.input}
                                    />
                                </div>
                                <div style={styles.formGroup}>
                                    <label style={styles.label}>End Date *</label>
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
                                <div style={styles.inputWrapper}>
                                    <span style={styles.inputPrefix}>$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.estimatedBudget}
                                        onChange={(e) => setFormData({...formData, estimatedBudget: e.target.value})}
                                        style={styles.inputWithPrefix}
                                        placeholder="0.00"
                                    />
                                </div>
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
    legend: {
        display: 'flex',
        gap: '2rem',
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        flexWrap: 'wrap',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        fontSize: '0.9rem',
        color: '#6b7280',
    },
    legendDot: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
    },
    mainContent: {
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'flex-start',
    },
    calendarCard: {
        flex: '1 1 65%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        marginBottom: '2rem',
        height: '575px'
    },
    calendar: {
        fontFamily: 'sans-serif',
    },
    milestonesSection: {
        flex: '0 0 35%',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        maxHeight: '575px',
        display: 'flex',
        flexDirection: 'column',
    },
    milestonesTitle: {
        fontSize: '1.2rem',
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: '1rem',
        marginTop: 0,
        flexShrink: 0,
    },
    milestonesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        overflowY: 'auto',
        paddingRight: '0.5rem',
    },
    milestoneItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        flexShrink: 0,
    },
    milestoneMarker: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    milestoneContent: {
        flex: 1,
        minWidth: 0,
    },
    milestoneName: {
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: '0.25rem',
    },
    milestoneDate: {
        fontSize: '0.9rem',
        color: '#6b7280',
    },
    noMilestones: {
        textAlign: 'center',
        color: '#9ca3af',
        padding: '2rem',
        margin: 0,
    },
    sectionSubtitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#4b5563',
        marginTop: '1rem',
        marginBottom: '0.5rem',
        flexShrink: 0,
    },
    creatorOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
    },
    creator: {
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '650px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
    },
    creatorHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.75rem 2rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#fafbfc',
        flexShrink: 0,
    },
    creatorTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1f2937',
        margin: 0,
        letterSpacing: '-0.02em',
    },
    closeButton: {
        background: 'none',
        border: 'none',
        fontSize: '1.5rem',
        color: '#6b7280',
        cursor: 'pointer',
        padding: '0.5rem',
        borderRadius: '8px',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ':hover': {
            backgroundColor: '#f3f4f6',
            color: '#374151',
        }
    },
    form: {
        padding: '2rem',
        overflowY: 'auto',
        flex: 1,
    },
    formGroup: {
        marginBottom: '1.5rem',
        flex: 1,
    },
    formRow: {
        display: 'flex',
        gap: '1.25rem',
        marginBottom: '0',
    },
    label: {
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: '600',
        color: '#374151',
        fontSize: '0.875rem',
        letterSpacing: '0.01em',
    },
    input: {
        width: '100%',
        padding: '0.875rem 1rem',
        border: '1.5px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.2s',
        backgroundColor: '#ffffff',
        color: '#1f2937',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    select: {
        width: '100%',
        padding: '0.875rem 1rem',
        border: '1.5px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.2s',
        backgroundColor: '#ffffff',
        color: '#1f2937',
        fontFamily: 'inherit',
        cursor: 'pointer',
        boxSizing: 'border-box',
    },
    textArea: {
        minHeight: '120px',
        resize: 'vertical',
        lineHeight: '1.5',
        fontFamily: 'inherit',
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    inputPrefix: {
        position: 'absolute',
        left: '1rem',
        color: '#6b7280',
        fontSize: '0.95rem',
        fontWeight: '500',
        pointerEvents: 'none',
        zIndex: 1,
    },
    inputWithPrefix: {
        width: '100%',
        padding: '0.875rem 1rem 0.875rem 2rem',
        border: '1.5px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.2s',
        backgroundColor: '#ffffff',
        color: '#1f2937',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
    },
    creatorActions: {
        display: 'flex',
        gap: '1rem',
        justifyContent: 'flex-end',
        marginTop: '2rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid #f3f4f6',
    },
    cancelBtn: {
        padding: '0.875rem 1.75rem',
        backgroundColor: '#f3f4f6',
        color: '#4b5563',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '0.01em',
    },
    submitBtn: {
        padding: '0.875rem 1.75rem',
        background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '0.01em',
        boxShadow: '0 4px 6px -1px rgba(35, 115, 243, 0.2), 0 2px 4px -1px rgba(35, 115, 243, 0.1)',
    },
    createButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.7rem 1.5rem',
        background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
};

export default CalendarTab;