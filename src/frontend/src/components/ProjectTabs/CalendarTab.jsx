import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { workOrdersAPI } from "../../services/api";

const CalendarTab = ({ project }) => {
    const [workOrders, setWorkOrders] = useState([]);
    const [loading, setLoading] = useState(true);
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
            if (priority >= 4) return '#ef4444';
            if (priority === 3) return '#f59e0b';
            return '#10b981'; 
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
    );
};

const styles = {
    container: {
        maxWidth: '1400px',
        margin: '0 auto',
    },
    header: {
        marginBottom: '2rem'
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
    calendarCard: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        marginBottom: '2rem',
    },
    calendar: {
        fontFamily: 'sans-serif',
    },
    milestonesSection: {
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
    },
    milestonesTitle: {
        fontSize: '1.2rem',
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: '1rem',
        marginTop: 0,
    },
    milestonesList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    milestoneItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
    },
    milestoneMarker: {
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        flexShrink: 0,
    },
    milestoneContent: {
        flex: 1,
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
    },
};

export default CalendarTab;