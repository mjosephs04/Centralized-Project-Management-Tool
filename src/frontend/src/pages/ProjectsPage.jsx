import React, { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import UserNavbar from "../components/UserNavbar";
import ProjectCard from "../components/ProjectCard";
import { projectsAPI, authAPI } from "../services/api";

const ProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const data = await projectsAPI.getProjects();
            setProjects(data);
        } catch (err) {
            setError(err.message);
            console.error('Error fetching projects:', err);
        } finally {
            setLoading(false);
        }
    }

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            // fetch user role
            const me = await authAPI.me();
            setUserRole(me?.role || null);
            // then fetch projects
            const data = await projectsAPI.getProjects();
            setProjects(data);
        } catch (err) {
            setError(err.message);
            console.error('Error loading data:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <UserNavbar />
            <div style={styles.pageContainer}>
                <div style={styles.header}>
                    <h2 style={styles.pageTitle}>Ongoing Projects</h2>
                    {userRole !== 'worker' && (
                        <Link to="/projects/create" style={styles.createButtonLink}>
                            Create New Project
                        </Link>
                    )}
                </div>
            </div>

            { loading ? (
                <div style={styles.centerContent}>
                    <p>Loading projects...</p>
                </div>
            ) : error ? (
                <div style={styles.centerContent}>
                    <p style={styles.errorText}>Error Loading projects: {error}</p>
                    <button onClick={fetchProjects} style={styles.retryButton}>
                        Retry
                    </button>
                </div>
            ) : projects.length === 0 ? (
                <div style={styles.centerContent}>
                    <p>
                        {userRole === 'worker' 
                            ? "You are not assigned to any projects yet." 
                            : "No projects underway!"
                        }
                    </p>
                </div>
            ) : (
                <div style={styles.projectsGrid}>
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} userRole={userRole} />
                    ))}
                </div>
            )}
        </>
    );
};

const styles = {
    pageContainer: {
        padding: '2rem 8rem',
        backgroundColor: '#f8f0fa',
        fontFamily: 'sans-serif',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
    },
    pageTitle: {
        fontSize: '2rem',
        color: "#333",
        margin: 0,
    },
    createButtonLink: {
        textDecoration: 'none',
        color: 'white',
        backgroundColor: '#0052D4',
        padding: '0.8rem 1.5rem',
        borderRadius: '8px',
        fontWeight: 'bold',
        transition: 'background-color 0.2s',
    },
    projectsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
        gap: '2rem',
        maxWidth: '2000px',
        margin: '0 auto',
        marginTop: '7rem',
        marginLeft: '5rem',
    },
    centerContent: {
        textAlign: 'center',
        padding: '4rem',
        fontSize: '1.1rem',
        color: '#6b7280',
    },
    errorText: {
        color: '#dc2626',
        marginBottom: '1rem',
    },
    retryButton: {
        padding: '0.8rem 1.5rem',
        backgroundColor: '#0052D4',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '1rem',
    }
};

export default ProjectsPage;