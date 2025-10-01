import React, {useState} from "react";
import { useParams, useNavigate } from "react-router-dom";
import UserNavbar from "../components/UserNavbar";
import { FaArrowLeft } from "react-icons/fa";

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
    const [activeTab, setActiveTab] = useState('overview');

    const project = projects.find(p =>
        (p.id && p.id.toString() === projectId) ||
        p.name.toLowerCase().replace(/\s+/g, '-') === projectId
    );

    if (!project) {
        return (
            <>
                <UserNavbar />
                <div style={styles.pageContainer}>
                    <p>Project not found.</p>
                </div>
            </>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'metrics', label: 'Metrics'},
        { id: 'team', label: 'Team'},
        { id: 'calendar', label: 'Calendar'},
        { id: 'workorders', label: 'Work Orders'},
    ];

    const renderTabContent = () => {
        switch(activeTab) {
            case 'overview':
                return <p>Overview content goes here...</p>;
            case 'metrics':
                return <p>Metrics content goes here...</p>;
            case 'team':
                return <p>Team content goes here...</p>
            case 'calendar':
                return <p>Calendar goes here...</p>
            case 'workorders':
                return <p>Work Orders goes here...</p>
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
                </div>
            </div>
            <div style={styles.contentContainer}>
                <div style={styles.descriptionSection}>
                    <h2 style={styles.sectionTitle}>Project Description</h2>
                    <p style={styles.description}>
                        {project.description || "No description available for this project."}
                    </p>
                </div>
            </div>
            <div style={styles.tabContainer}>
                <div style={styles.tabNav}>
                    {tabs.map(tab =>(
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
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
        </>
    )
};

const styles = {
    pageContainer: {
        padding: '1rem 4rem',
        fontFamily: 'sans-serif',
        borderBottom: '1.5px solid rgba(54, 69, 79, 0.8)',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.2rem',
        minHeight: '80px',
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
        left: 10,
    },
    titleSection: {
        width: '100%',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
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
        margin: '0 auto',
        padding: '3rem 4rem',
        backgroundColor: 'rgba(20, 48, 136, 0.7)',
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
    sectionTitle: {
        fontSize: '1rem',
        fontWeight: '600',
        color: '#2c3e50',
        marginTop: 0,
        marginBottom: '0.2rem',
    },
    description: {
        fontSize: '1rem',
        lineHeight: '1.7',
        color: '#4a5568',
        margin: 0,
    },
    tabContainer: {
        width: '100%',
        background: 'rgba(20, 48, 136, 0.7)',
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
        width: '100%',
        padding: '3rem 4rem',
        backgroundColor: '#f8f0fa',
        minHeight: 'calc(100vh - 500px)',
        animation: 'fadeIn 0.4s ease',
    }
};

export default SingleProjectPage;