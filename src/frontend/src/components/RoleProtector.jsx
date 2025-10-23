import React from 'react';
import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const RoleProtector = ({ children, allowedRoles }) => {
    const [userRole, setUserRole] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        try {
            const user = await authAPI.me();
            setUserRole(user?.role || null);
        } catch (error) {
            console.error('Error fetching user role:', error);
            setUserRole(null);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loader}></div>
                <p style={styles.loadingText}>Checking permissions...</p>
            </div>
        );
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
        // Redirect to projects page with error message
        return <Navigate to="/projects" replace />;
    }

    return children;
};

const styles = {
    loadingContainer: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
    loader: {
        width: '50px',
        height: '50px',
        border: '4px solid rgba(255, 255, 255, 0.3)',
        borderTop: '4px solid #ffffff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        marginTop: '1rem',
        color: '#ffffff',
        fontSize: '1rem',
        fontWeight: '600',
    }
};

export default RoleProtector;