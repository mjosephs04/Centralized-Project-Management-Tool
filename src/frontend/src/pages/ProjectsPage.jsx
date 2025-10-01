import React from "react";
import { Link } from 'react-router-dom';
import UserNavbar from "../components/UserNavbar";
import ProjectCard from "../components/ProjectCard";

const ProjectsPage = ({ projects }) => {
    return (
        <>
            <UserNavbar />
            <div style={styles.pageContainer}>
                <div style={styles.header}>
                    <h2 style={styles.pageTitle}>Ongoing Projects</h2>
                    <Link to="/projects/create" style={styles.createButtonLink}>
                        Create New Project
                    </Link>
                </div>
            </div>
            {projects.length === 0 ? (
                <p>No projects underway!</p>
            ) : (
                <div style={styles.projectsGrid}>
                    {projects.map((project, idx) => (
                        <ProjectCard key={idx} project={project} />
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
};

export default ProjectsPage;