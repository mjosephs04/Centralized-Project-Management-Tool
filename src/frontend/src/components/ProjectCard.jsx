import React from "react";
import { Link } from "react-router-dom";

const ProjectCard = ({ project }) => {
    const projectId = project.id || project.name.toLowerCase().replace(/\s+/g, '-');

    const formattedBudget = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(project.estimatedBudget || 0);

    return (
        <Link to={`/projects/${projectId}`} style={styles.cardLink}>
            <div style={styles.projectCard}>
                <div>
                    <h3 style={styles.cardTitle}>{project.name}</h3>
                    <p style={styles.cardLocation}>{project.location || 'No location specific'}</p>
                </div>
                <p style={styles.cardDescription}>
                    {project.description || 'No description provided.'}
                </p>
                <div style={styles.cardDetails}>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Budget</span>
                        <span style={styles.detailValue}>{formattedBudget}</span>
                    </div>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>Start Date</span>
                        <span style={styles.detailsValue}>{new Date(project.startDate).toLocaleDateString()}</span>
                    </div>
                    <div style={styles.detailItem}>
                        <span style={styles.detailLabel}>End Date</span>
                        <span style={styles.detailsValue}>{new Date(project.endDate).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

const styles = {
    cardLink: {
        textDecoration: 'none',
        color: 'inherit',
    },
    projectCard: {
        backgroundColor: 'white',
        borderRadius: '30px',
        padding: '1.5rem',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '450px',
        transition: 'transform 0.2s box-shadow 0.2s',
    },
    cardTitle: {
        margin: '0 0 0.25rem 0',
        fontSize: '1.5rem',
        color: '#212529',
    },
    cardLocation: {
        margin: 0,
        color: "#6c757d",
        fontSize: "0.9rem",
    },
    cardDescription: {
        margin: '1rem 0',
        color: '#495057',
        fontSize: '0.95rem',
        lineHeight: '1.5',
        flexGrow: 1,
    },
    cardDetails: {
        borderTop: '1px solid #eee',
        paddingTop: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
    },
    detailItem: {
        display: 'flex',
        flexDirection: 'column',
    },
    detailLabel: {
        fontSize: '0.8rem',
        color: '#6c757d',
        marginBottom: '0.25rem',
    },
    detailValue: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#212529',
    },
};

export default ProjectCard;