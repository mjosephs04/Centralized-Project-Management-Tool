import React, { useState } from "react";
import { Snackbar, Alert, Slide } from "@mui/material";
import { FaUserPlus, FaUserMinus, FaCalendarAlt } from 'react-icons/fa';
import UserNavbar from "../components/UserNavbar";

function TransitionDown(props) {
    return <Slide {...props} direction="down" />;
}

const LoginDistributionPage = () => {
    const [grantFormData, setGrantFormData] = useState({
        email: '',
        expirationDate: '',
    });

    const [revokeEmail, setRevokeEmail] = useState('');

    const [toast, setToast] = useState({
        open: false,
        message: '',
        severity: 'info',
    });

    const openToast = (message, severity = "info") => 
        setToast({ open: true, message, severity});

    const closeToast = (_, reason) => {
        if (reason === 'clickaway') return;
        setToast((t) => ({ ...t, open: false}));
    };

    const handleGrantAccess = (e) => {
        e.preventDefault();

        if (!grantFormData.email) {
            openToast('Please enter an email address', 'error');
            return;
        }

        //TODO: Backend calls for approval/email system
        openToast("Access request confirmed. Awaiting approval from administrator.", 'success');

        setGrantFormData({
            email: '',
            expirationDate: '',
        });
    };

    const handleRevokeAccess = (e) => {
        e.preventDefault();

        if(!revokeEmail) {
            openToast('Please enter an email address', 'error');
            return;
        }

        //TODO: Backend calls for removal/email system
        openToast("Access revoation request submitted. Awaiting approval from administrator.", 'success');

        setRevokeEmail('');
    };

    const handleGrantInputChange = (e) => {
        const { name, value } = e.target;
        setGrantFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    return (
        <>
            <UserNavbar />
            <div style={styles.pageContainer}>
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.pageTitle}>Login Distribution</h1>
                        <p style={styles.subtitle}>Manage user access requests and revocations</p>
                    </div>
                </div>

                <div style={styles.contentGrid}>
                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={styles.cardIcon}>
                                <FaUserPlus size={24} />
                            </div>
                            <div>
                                <h2 style={styles.cardTitle}>Grant Access</h2>
                                <p style={styles.cardSubtitle}>Request access for a new user</p>
                            </div>
                        </div>

                        <form onSubmit={handleGrantAccess} style={styles.form}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email Address *</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={grantFormData.email}
                                    onChange={handleGrantInputChange}
                                    placeholder="user@example.com"
                                    style={styles.input}
                                    required
                                />
                            </div>

                            <div style={styles.inputGroup}>
                                <label style={styles.label}>
                                    <FaCalendarAlt style={styles.labelIcon} />
                                    Expiration Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    name="expirationDate"
                                    value={grantFormData.expirationDate}
                                    onChange={handleGrantInputChange}
                                    style={styles.input}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                                <p style={styles.helpText}>
                                    Leave blank for permanent access
                                </p>
                            </div>

                            <button type="submit" style={styles.grantButton}>
                                <FaUserPlus style={styles.buttonIcon} />
                                Grant Access
                            </button>
                        </form>
                    </div>

                    <div style={styles.card}>
                        <div style={styles.cardHeader}>
                            <div style={{...styles.cardIcon, background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'}}>
                                <FaUserMinus size={24} />
                            </div>
                            <div>
                                <h2 style={styles.cardTitle}>Revoke Access</h2>
                                <p style={styles.cardSubtitle}>Request to remove user access</p>
                            </div>
                        </div>

                        <form onSubmit={handleRevokeAccess} style={styles.form}>
                            <div style={styles.inputGroup}>
                                <label style={styles.label}>Email Address *</label>
                                <input
                                    type="email"
                                    value={revokeEmail}
                                    onChange={(e) => setRevokeEmail(e.target.value)}
                                    placeholder="user@example.com"
                                    style={styles.input}
                                    required
                                />
                                <p style={styles.helpText}>
                                    Enter the email of the user whose access should be revoked
                                </p>
                            </div>

                            <button type="submit" style={styles.revokeButton}>
                                <FaUserMinus style={styles.buttonIcon} />
                                Request Revocation
                            </button>
                        </form>
                    </div>
                </div>

                <div style={styles.infoBox}>
                    <h3 style={styles.infoTitle}>📋 Important Notes</h3>
                    <ul style={styles.infoList}>
                        <li>All access requests require administrator approval before taking effect</li>
                        <li>Users will receive a registration link via email once their access is approved</li>
                        <li>Temporary access will automatically expire on the specified date</li>
                        <li>Revocation requests will be reviewed by an administrator</li>
                    </ul>
                </div>
            </div>

            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={closeToast}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                TransitionComponent={TransitionDown}
            >
                <Alert
                    onClose={closeToast}
                    severity={toast.severity}
                    variant="filled"
                    sx={{
                        width: '100%',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        borderRadius: '12px',
                        boxShadow: 3,
                    }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </>
    );
};

const styles = {
    pageContainer: {
        padding: '2.5rem 2.5rem',
        background: 'linear-gradient(135deg, rgb(35, 115, 243) 0%, #4facfe 100%)',
        minHeight: 'calc(100vh - 80px)',
        fontFamily: 'sans-serif',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '2rem',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
    pageTitle: {
        fontSize: '2.5rem',
        fontWeight: '700',
        color: '#1a202c',
        margin: '0 0 0.5rem 0',
        background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: {
        fontSize: '1rem',
        color: '#718096',
        margin: 0,
    },
    contentGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '2rem',
        marginBottom: '2rem',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.2s ease',
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        paddingBottom: '1.5rem',
        borderBottom: '2px solid #e2e8f0',
    },
    cardIcon: {
        width: '56px',
        height: '56px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        boxShadow: '0 4px 12px rgba(35, 115, 243, 0.3)',
    },
    cardTitle: {
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1a202c',
        margin: 0,
    },
    cardSubtitle: {
        fontSize: '0.9rem',
        color: '#718096',
        margin: '0.25rem 0 0 0',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    label: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#4a5568',
        marginBottom: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    labelIcon: {
        fontSize: '0.9rem',
        color: '#2373f3',
    },
    input: {
        padding: '0.85rem 1rem',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
        fontSize: '1rem',
        transition: 'all 0.3s ease',
        outline: 'none',
        fontFamily: 'sans-serif',
    },
    helpText: {
        fontSize: '0.8rem',
        color: '#718096',
        marginTop: '0.5rem',
        fontStyle: 'italic',
    },
    grantButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(35, 115, 243, 0.4)',
        marginTop: '0.5rem',
    },
    revokeButton: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
        padding: '1rem 1.5rem',
        background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
        marginTop: '0.5rem',
    },
    buttonIcon: {
        fontSize: '1.1rem',
    },
    infoBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        padding: '2rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        borderLeft: '4px solid #2373f3',
    },
    infoTitle: {
        fontSize: '1.25rem',
        fontWeight: '700',
        color: '#1a202c',
        marginTop: 0,
        marginBottom: '1rem',
    },
    infoList: {
        margin: 0,
        paddingLeft: '1.5rem',
        color: '#4a5568',
        fontSize: '0.95rem',
        lineHeight: '1.8',
    },
};

export default LoginDistributionPage;


