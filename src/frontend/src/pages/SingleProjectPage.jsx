import React, {useState, useEffect, useRef} from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserNavbar from "../components/UserNavbar";
import { FaArrowLeft, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import html2pdf from 'html2pdf.js';
import OverviewTab from '../components/ProjectTabs/OverviewTab'
import { projectsAPI, authAPI } from "../services/api";
import TeamTab from "../components/ProjectTabs/TeamTab";
import TeamViewTab from "../components/ProjectTabs/TeamViewTab";
import CalendarTab from "../components/ProjectTabs/CalendarTab";
import WorkOrdersTab from "../components/ProjectTabs/WorkOrderTabs/WorkOrders";
import LogsTab from "../components/ProjectTabs/LogsTab";
import SuppliesTab from "../components/ProjectTabs/SuppliesTab";
import { useSnackbar } from "../contexts/SnackbarContext";
import MetricsTab from "../components/ProjectTabs/MetricsTab";
import ReportButton from '../components/Reports/ReportButton';
import ProjectReport from '../components/Reports/ProjectReport';

const styleSheet = document.styleSheets[0];
if (!document.querySelector('#tabAnimation')) {
    const style = document.createElement('style');
    style.id = 'tabAnimations';
    style.textContent = `
        @keyframes fadeIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideIn {
            from {
                transform: scaleX(0);
            }
            to {
                transform: scaleX(1);
            }
        }
    `;
    document.head.appendChild(style);
}


const SingleProjectPage = ({ projects }) => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const reportRef = useRef();

    // Load active tab from localStorage or default to 'overview'
    const getInitialTab = () => {
        const savedTab = localStorage.getItem(`project_${projectId}_activeTab`);
        if (savedTab) {
            // Validate that the saved tab is a valid tab option
            const validTabs = ['overview', 'calendar', 'metrics', 'team', 'workorders', 'logs', 'supplies'];
            if (validTabs.includes(savedTab)) {
                return savedTab;
            }
        }
        return 'overview';
    };

    const [activeTab, setActiveTab] = useState(getInitialTab);
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [highlightedWorkOrderId, setHighlightedWorkOrderId] = useState(null);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    const [reportData, setReportData] = useState(null);
    const [selectedWorkOrderForSupplies, setSelectedWorkOrderForSupplies] = useState(null);

    // Check if project is in a terminal/frozen status
    const isProjectFrozen = () => {
        const terminalStatuses = ['archived', 'cancelled'];
        return terminalStatuses.includes(project?.status);
    };

    useEffect(() => {
        fetchInitialData();
        // Update active tab when projectId changes
        const savedTab = localStorage.getItem(`project_${projectId}_activeTab`);
        if (savedTab) {
            const validTabs = ['overview', 'calendar', 'metrics', 'team', 'workorders', 'logs', 'supplies'];
            if (validTabs.includes(savedTab)) {
                setActiveTab(savedTab);
            }
        } else {
            setActiveTab('overview');
        }
    }, [projectId]);

    const fetchProject = async () => {
        try {
            setLoading(true);
            const data = await projectsAPI.getProject(projectId);
            setProject(data);
        } catch (err) {
            if (err.response?.status === 403) {
                setError("Access denied. You don't have permission to view this project.");
            } else if (err.response?.status === 404) {
                setError("Project not found.");
            } else {
                setError(err.message);
            }
            console.error('Error fetching projects', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const me = await authAPI.me();
            setUserRole(me?.role || null);
            const data = await projectsAPI.getProject(projectId);
            setProject(data);
            setEditedDescription(data.description || '');
        } catch (err) {
            if (err.response?.status === 403) {
                setError("Access denied. You don't have permission to view this project.");
            } else if (err.response?.status === 404) {
                setError("Project not found.");
            } else {
                setError(err.message);
            }
            console.error('Error loading project page', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProject = async (updatedData) => {
        try {
            // Use worker-specific endpoint if user is a worker
            const updated = userRole === 'worker' 
                ? await projectsAPI.workerUpdateProject(projectId, updatedData)
                : await projectsAPI.updateProject(projectId, updatedData);
            setProject(updated);
            // Trigger refresh for LogsTab when project is updated
            triggerRefresh();
        } catch (err) {
            console.error('Error updating project:', err);
            alert('Failed to update project: ' + err.message);
        }
    };

    const handleEditDescription = () => {
        setEditedDescription(project.description || '');
        setIsEditingDescription(true);
    };

    const handleSaveDescription = async () => {
        try {
            const updated = await projectsAPI.updateProject(projectId, {
                description: editedDescription
            });
            setProject(updated);
            setIsEditingDescription(false);
            showSnackbar('Project description updated successfully!', 'success');
            triggerRefresh();
        } catch (err) {
            console.error('Error updating description:', err);
            showSnackbar('Failed to update project description', 'error');
        }
    };

    const handleCancelDescription = () => {
        setEditedDescription(project.description || '');
        setIsEditingDescription(false);
        showSnackbar('Changes discarded', 'warning');
    };

    const handleDelete = () => {
        navigate('/projects', { state: { projectDeleted: true }});
    };

    const triggerRefresh = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    // Handler for calendar navigation to work orders
    const handleNavigateToWorkOrder = (workOrderId) => {
        console.log('=== NAVIGATE TO WORK ORDER ===');
        console.log('Work Order ID:', workOrderId);
        console.log('Switching to workorders tab');
        
        // Switch to work orders tab
        setActiveTab('workorders');
        
        // Set which work order to highlight
        setHighlightedWorkOrderId(workOrderId);
        
        // Show feedback to user
        showSnackbar('Navigating to work order...', 'info');
        
        // Clear highlight after 3 seconds
        setTimeout(() => {
            setHighlightedWorkOrderId(null);
        }, 3000);
    };


    const handleGenerateReport = async () => {
        try {
            showSnackbar('Fetching project data...', 'info');

            // Fetch project and metrics data - same as MetricsTab uses
            const [projectData, metricsData] = await Promise.all([
                projectsAPI.getProject(projectId),
                projectsAPI.getMetrics.all(projectId)
            ]);

            const data = {
                project: projectData,
                metrics: metricsData
            };

            console.log('Report Data:', data); // Debug log
            setReportData(data);

            // Wait for React to render the report
            await new Promise(resolve => setTimeout(resolve, 100));

            // Generate PDF
            showSnackbar('Generating PDF...', 'info');

            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: `Project_${project.name.replace(/[^a-z0-9]/gi, '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    letterRendering: true
                },
                jsPDF: {
                    unit: 'in',
                    format: 'letter',
                    orientation: 'portrait'
                },
                pagebreak: {
                    mode: ['avoid-all', 'css', 'legacy']
                }
            };

            await html2pdf().set(opt).from(reportRef.current).save();

            showSnackbar('Report downloaded successfully!', 'success');

            // Clear report data after generation
            setTimeout(() => setReportData(null), 500);

        } catch (error) {
            console.error('Error generating report:', error);
            showSnackbar('Failed to generate report. Please try again.', 'error');
        }
    };

    if (loading) {
        return (
            <>
                <UserNavbar />
                <div style={styles.pageContainer}>
                    <p>Loading project...</p>
                </div>
            </>
        );
    }

    if (error || !project) {
        return (
            <>
                <UserNavbar />
                <div style={styles.pageContainer}>
                    <p>Project not found.</p>
                    <button onClick={() => navigate('/projects')}>Return to Dashboard</button>
                </div>
            </>
        )
    }

    const managerTabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'calendar', label: 'Calendar'},
        { id: 'metrics', label: 'Metrics'},
        { id: 'team', label: 'Team'},
        { id: 'workorders', label: 'Work Orders'},
        { id: 'logs', label: 'Logs'},
        { id: 'supplies', label: 'Supplies'},
    ];

    // Worker-specific tabs (no Metrics, but includes read-only Team)
    const workerTabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'calendar', label: 'Calendar'},
        { id: 'team', label: 'Team' },
        { id: 'workorders', label: 'Work Orders'},
        { id: 'logs', label: 'Logs'},
        { id: 'supplies', label: 'Supplies'},
    ];

    const tabs = userRole === 'worker' ? workerTabs : managerTabs;

    const renderTabContent = () => {
        switch(activeTab) {
            case 'overview':
                return <OverviewTab project={project} onUpdate={handleUpdateProject} onDelete={handleDelete} userRole={userRole} />;
            case 'metrics':
                return <MetricsTab project={project} />;
            case 'team':
                return userRole === 'worker' 
                    ? <TeamViewTab project={project} />
                    : <TeamTab project={project} onUpdate={handleUpdateProject} userRole={userRole} />;
            case 'calendar':
                return <CalendarTab project={project} onNavigateToWorkOrder={handleNavigateToWorkOrder} userRole={userRole} />
            case 'workorders':
                return <WorkOrdersTab project={project} userRole={userRole} onWorkOrderUpdate={triggerRefresh} highlightedWorkOrderId={highlightedWorkOrderId} onNavigateToSupplies={(workOrderId) => {
                    setSelectedWorkOrderForSupplies(workOrderId);
                    setActiveTab('supplies');
                }} />
            case 'logs':
                return <LogsTab project={project} refreshTrigger={refreshTrigger} onNavigateToTab={setActiveTab} />
            case 'supplies':
                return <SuppliesTab project={project} userRole={userRole} selectedWorkOrderId={selectedWorkOrderForSupplies} onWorkOrderChange={setSelectedWorkOrderForSupplies}/>
            default:
                return <p>Nothing to show here...</p>
        }
    };

    return (
        <>
            <UserNavbar />
            <div style={styles.pageContainer}>
                <div style={styles.header}>
                    <button style={styles.backButton} onClick={() => navigate('/projects')}>
                        <FaArrowLeft />
                        <span>Return to Dashboard</span>
                    </button>
                    <div style={styles.titleSection}>
                        <h1 style={styles.projectTitle}>{project.name}</h1>
                        <p style={styles.location}>{project.location}</p>
                    </div>
                    {/* Report Button - Only visible to PMs */}
                    <div style={styles.headerRight}>
                        <ReportButton
                            project={project}
                            userRole={userRole}
                            onGenerateReport={handleGenerateReport}
                        />
                    </div>
                </div>
            </div>
            <div style={styles.contentContainer}>
                <div style={styles.descriptionSection}>
                    <div style={styles.descriptionHeader}>
                        <h2 style={styles.sectionTitle}>Project Description</h2>
                        {userRole !== 'worker' && !isEditingDescription && (
                            <button 
                                style={isProjectFrozen() ? styles.editIconButtonDisabled : styles.editIconButton}
                                onClick={isProjectFrozen() ? null : handleEditDescription}
                                title={isProjectFrozen() ? "Cannot edit archived/cancelled project" : "Edit description"}
                                disabled={isProjectFrozen()}
                            >
                                <FaEdit />
                            </button>
                        )}
                        {userRole !== 'worker' && isEditingDescription && (
                            <div style={styles.descriptionActions}>
                                <button 
                                    style={styles.saveIconButton}
                                    onClick={handleSaveDescription}
                                    title="Save changes"
                                >
                                    <FaSave />
                                </button>
                                <button 
                                    style={styles.cancelIconButton}
                                    onClick={handleCancelDescription}
                                    title="Cancel"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        )}
                    </div>
                    {isEditingDescription ? (
                        <textarea
                            value={editedDescription}
                            onChange={(e) => setEditedDescription(e.target.value)}
                            style={styles.descriptionTextarea}
                            placeholder="Enter project description..."
                        />
                    ) : (
                        <p style={styles.description}>
                            {project.description || "No description available for this project."}
                        </p>
                    )}
                </div>
            </div>
            <div style={styles.tabContainer}>
                <div style={styles.tabNav}>
                    {tabs.map(tab =>(
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                // Save active tab to localStorage
                                localStorage.setItem(`project_${projectId}_activeTab`, tab.id);
                            }}
                            style={{
                                ...styles.tabButton,
                                ...(activeTab === tab.id ? styles.tabButtonActive : {})
                            }}
                        >
                            {tab.label}
                            {activeTab === tab.id && <div style={styles.tabIndicator}></div>}
                        </button>
                    ))}
                </div>
                <div style={styles.tabContent}>
                    {renderTabContent()}
                </div>
            </div>

            {/* Hidden Report Component - Only rendered during PDF generation */}
            {reportData && (
                <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                    <ProjectReport ref={reportRef} reportData={reportData} />
                </div>
            )}
        </>
    )
};

const styles = {
    pageContainer: {
        padding: '1rem 2.5rem',
        fontFamily: 'sans-serif',
        borderBottom: '1.5px solid rgba(54, 69, 79, 0.8)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.2rem',
        minHeight: '80px',
        position: 'relative',
    },
    backButton: {
        background: '#ffffff',
        border: '1px solid #ddd',
        borderRadius: '20px',
        padding: '0.6rem 1.2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
        justifyContent: 'center',
        cursor: 'pointer',
        fontSize: '0.9rem',
        color: '#333',
        boxShadow: '0 2px 5px rgba(0, 0, 0, 0.02)',
        transition: 'background-color 0.2s, box-shadow 0.2s',
        whiteSpace: 'nonwrap',
        position: 'absolute',
        zIndex: 1,
        left: 0,
    },
    titleSection: {
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        position: 'absolute',
        right: 0,
        zIndex: 1,
    },
    spacer: {
        width: '200px',
        flexShrink: 0,
    },
    projectTitle: {
        fontSize: '2.8rem',
        fontWeight: '700',
        color: '#2c3e50',
        margin: 0,
        letterSpacing: '-1px',
    },
    location: {
        fontSize: '1.1rem',
        fontWeight: '400',
        color: '#6c757d',
        margin: 0,
    },
    contentContainer: {
        padding: '3rem 2.5rem',
        background: '#5692bc',
        minHeight: '100px'
    },
    descriptionSection: {
        maxWidth: '1200px',
        margin: '0 auto',
        background: '#ffffff',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
    },
    descriptionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
    },
    sectionTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#2c3e50',
        margin: 0,
    },
    descriptionActions: {
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
    },
    editIconButton: {
        background: 'none',
        border: '2px solid #5692bc',
        cursor: 'pointer',
        padding: '0.5rem 0.5rem 0.5rem 0.6rem',
        color: '#5692bc',
        fontSize: '1.1rem',
        transition: 'all 0.2s',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editIconButtonDisabled: {
        background: 'none',
        border: '2px solid #d1d5db',
        cursor: 'not-allowed',
        padding: '0.5rem 0.5rem 0.5rem 0.6rem',
        color: '#9ca3af',
        fontSize: '1.1rem',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.5,
    },
    saveIconButton: {
        background: '#77DD77',
        border: 'none',
        cursor: 'pointer',
        padding: '0.6rem',
        color: 'white',
        fontSize: '1rem',
        transition: 'all 0.2s',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelIconButton: {
        background: 'white',
        border: '2px solid #bc8056',
        cursor: 'pointer',
        padding: '0.6rem',
        color: '#bc8056',
        fontSize: '1rem',
        transition: 'all 0.2s',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    description: {
        fontSize: '1rem',
        lineHeight: '1.7',
        color: '#4a5568',
        margin: 0,
        whiteSpace: 'pre-wrap',
    },
    descriptionTextarea: {
        width: '100%',
        minHeight: '150px',
        padding: '0.75rem',
        fontSize: '1rem',
        lineHeight: '1.7',
        color: '#4a5568',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        resize: 'vertical',
        fontFamily: 'inherit',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    },
    tabContainer: {
        width: '100%',
        background: '#5692bc',
        minHeight: 'calc(100vh - 400px)',
    },
    tabNav: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '3rem',
        borderBottom: '2px solid #e5e7eb',
        padding: '0',
        margin: '0',
    },
    tabButton: {
        background: 'none',
        border: 'none',
        padding: '1rem 1.5rem',
        fontSize: '1rem',
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.7)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'color 0.2s',
    },
    tabButtonActive: {
        color: 'rgb(255, 255, 255)',
        fontWeight: '700',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: '-2px',
        left: 0,
        right: 0,
        height: '5px',
        background: 'white',
        borderRadius: '3px 3px 0 0',
        animation: 'slideIn 0.3s ease',
    },
    tabContent: {
        padding: '3rem 2.5rem',
        backgroundColor: '#fff4ed',
        minHeight: 'calc(100vh - 500px)',
        animation: 'fadeIn 0.4s ease',
    }
};

export default SingleProjectPage;