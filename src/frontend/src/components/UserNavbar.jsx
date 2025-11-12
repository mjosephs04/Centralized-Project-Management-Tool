import React, { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { FaEnvelope, FaUserCircle, FaSignOutAlt } from "react-icons/fa";
import { FaShareFromSquare } from "react-icons/fa6";
import logo from '../imgs/LSGSLogo.png';
import { authAPI } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';

const styles = {
    navbar: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 2.5rem',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(0, 82, 212, 0.1)',
        boxShadow: '0 2px 20px rgba(0, 0, 0, 0.12)',
        position: 'sticky',
        top: 0,
        width: '100%',
        boxSizing: 'border-box',
        zIndex: 1000,
    },

    leftSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem',
        minWidth: 'fit-content',
    },

    logoContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        textDecoration: 'none',
        padding: '0.5rem',
        borderRadius: '8px',
        transition: 'background 0.2s ease',
    },

    logoImage: {
        height: '48px',
        width: 'auto',
        display: 'block',
    },

    companyName: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#1a202c',
        letterSpacing: '-0.02em',
    },

    divider: {
        width: '1px',
        height: '32px',
        background: 'linear-gradient(180deg, transparent, rgba(0, 82, 212, 1), transparent)',
    },

    roleContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        background: 'linear-gradient(135deg, #0052D4 0%, #4facfe 100%)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 82, 212, 0.25)',
    },

    roleIcon: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: '#10b981',
        boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
    },

    roleText: {
        color: '#ffffff',
        fontSize: '0.9rem',
        fontWeight: '600',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap',
    },

    navbarIcons: {
        display: 'flex',
        gap: '0.75rem',
        alignItems: 'center',
        minWidth: 'fit-content',
    },

    iconButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '10px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
    },

    iconButtonHover: {
        background: 'rgba(0, 82, 212, 0.08)',
        transform: 'translateY(-2px)',
    },

    icon: {
        color: '#4a5568',
        transition: 'color 0.2s ease-in-out',
    },

    iconHover: {
        color: '#0052D4',
    },

    badge: {
        position: 'absolute',
        top: '6px',
        right: '6px',
        width: '8px',
        height: '8px',
        background: '#ef4444',
        borderRadius: '50%',
        border: '2px solid white',
    },

    tooltip: {
        position: 'absolute',
        bottom: '-35px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1a202c',
        color: 'white',
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: '600',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        opacity: 0,
        transition: 'opacity 0.2s ease',
        zIndex: 1000,
    },

    tooltipVisible: {
        opacity: 1,
    },

    tooltipArrow: {
        position: 'absolute',
        top: '-4px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '0',
        height: '0',
        borderLeft: '4px solid transparent',
        borderRight: '4px solid transparent',
        borderBottom: '4px solid #1a202c',
    },

    logoutButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.6rem 1.2rem',
        background: 'transparent',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '8px',
        color: '#dc2626',
        fontSize: '0.9rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
    },

    logoutButtonHover: {
        background: '#dc2626',
        color: 'white',
        borderColor: '#dc2626',
    }
};

const UserNavbar = () => {
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [isHovered, setIsHovered] = useState({
        login_dist: false,
        mail: false,
        profile: false,
        logout: false,
    });
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        try {
            const user = await authAPI.me();
            setUserRole(user?.role || null);
        } catch (error) {
            console.error('Error fetching user role:', error);
        }
    };

    const formatRole = (role) => {
        if (!role) return '';
        if (role === 'project_manager') return 'Project Manager';
        if (role === 'worker') return 'Crew Member';
        if (role === 'admin') return 'Admin';
        return role.replace(/_/g, ' ');
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        showSnackbar('Successfully logged out', 'info');
        navigate('/login');
    };

    return (
        <nav style={styles.navbar}>
            <div style={styles.leftSection}>
                <Link to="/projects" style={styles.logoContainer}>
                    <img src={logo} alt="Logo" style={styles.logoImage} />
                    <span style={styles.companyName}>Lone Star</span>
                </Link>
                
                <div style={styles.divider}></div>

                {userRole && (
                    <div style={styles.roleContainer}>
                        <div style={styles.roleIcon}></div>
                        <span style={styles.roleText}>
                            {formatRole(userRole)}
                        </span>
                    </div>
                )}
            </div>

            <div style={styles.navbarIcons}>
            {userRole === 'project_manager' && (
                    <Link to="/login-distribution">
                        <button
                            style={{
                                ...styles.iconButton,
                                ...(isHovered.distribution ? styles.iconButtonHover : {})
                            }}
                            onMouseEnter={() => setIsHovered({ ...isHovered, distribution: true })}
                            onMouseLeave={() => setIsHovered({ ...isHovered, distribution: false })}
                        >
                            <FaShareFromSquare
                                size={20}
                                style={{
                                    ...styles.icon,
                                    ...(isHovered.distribution ? styles.iconHover : {})
                                }}
                            />
                            
                            <div style={{
                                ...styles.tooltip,
                                ...(isHovered.distribution ? styles.tooltipVisible : {})
                            }}>
                                <div style={styles.tooltipArrow}></div>
                                Login Distribution
                            </div>
                        </button>
                    </Link>
                )}

                <button
                    style={{
                        ...styles.iconButton,
                        ...(isHovered.mail ? styles.iconButtonHover : {})
                    }}
                    onMouseEnter={() => setIsHovered({ ...isHovered, mail: true })}
                    onMouseLeave={() => setIsHovered({ ...isHovered, mail: false })}
                >
                    <FaEnvelope
                        size={20}
                        style={{
                            ...styles.icon,
                            ...(isHovered.mail ? styles.iconHover : {})
                        }}
                    />
                    
                    <div style={{
                        ...styles.tooltip,
                        ...(isHovered.mail ? styles.tooltipVisible : {})
                    }}>
                        <div style={styles.tooltipArrow}></div>
                        Messages
                    </div>
                </button>

                <Link to="/profile">
                    <button
                        style={{
                            ...styles.iconButton,
                            ...(isHovered.profile ? styles.iconButtonHover : {})
                        }}
                        onMouseEnter={() => setIsHovered({ ...isHovered, profile: true })}
                        onMouseLeave={() => setIsHovered({ ...isHovered, profile: false })}
                    >
                        <FaUserCircle
                            size={20}
                            style={{
                                ...styles.icon,
                                ...(isHovered.profile ? styles.iconHover : {})
                            }}
                        />
                        
                        <div style={{
                            ...styles.tooltip,
                            ...(isHovered.profile ? styles.tooltipVisible : {})
                        }}>
                            <div style={styles.tooltipArrow}></div>
                            Profile
                        </div>
                    </button>
                </Link>

                <button
                    style={{
                        ...styles.logoutButton,
                        ...(isHovered.logout ? styles.logoutButtonHover : {})
                    }}
                    onClick={handleLogout}
                    onMouseEnter={() => setIsHovered({ ...isHovered, logout: true })}
                    onMouseLeave={() => setIsHovered({ ...isHovered, logout: false })}
                >
                    <FaSignOutAlt size={16} />
                    Logout
                </button>
            </div>
        </nav>
    );
}

export default UserNavbar;
