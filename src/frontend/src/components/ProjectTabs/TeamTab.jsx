import React , { useState } from 'react';
import { FaEdit, FaSave, FaTimes, FaUserPlus, FaTrash, FaUser } from 'react-icons/fa';

const TeamTab = ({ project, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [crewMembers, setCrewMembers] = useState(project.crewMembers || []);
    const [newMemberName, setNewMemberName] = useState('');

    const handleAddMember = () => {
        if (newMemberName.trim()) {
            setCrewMembers([...crewMembers, newMemberName.trim()]);
            setNewMemberName('');
        }
    };

    const handleRemoveMember = (index) => {
        setCrewMembers(crewMembers.filter((__, i) => i !== index));
    };

    const handleSave = () => {
        if (onUpdate) {
            onUpdate({crewMembers});
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setCrewMembers(project.crewMembers || []);
        setNewMemberName('');
        setIsEditing(false);
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Team Members</h2>
                {!isEditing ? (
                    <button style={styles.editButton} onClick={() => setIsEditing(true)}>
                        <FaEdit /> Edit Team
                    </button>
                ) : (
                    <div style={styles.editActions}>
                        <button style={styles.saveButton} onClick={handleSave}>
                            <FaSave /> Save
                        </button>
                        <button style={styles.cancelButton} onClick={handleCancel}>
                            <FaTimes /> Cancel
                        </button>
                    </div>
                )}
            </div>

            {isEditing && (
                <div style={styles.addMemberSection}>
                    <input
                        type="text"
                        placeholder="Enter Crew Member Name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
                        style={styles.addInput}
                    />
                    <button
                        onClick={handleAddMember}
                        style={styles.addButton}
                        disabled={!newMemberName.trim()}
                    > <FaUserPlus /> Add Member </button>
                </div>
            )}

            {crewMembers.length === 0 ? (
                <div style={styles.emptyState}>
                    <FaUser style={styles.emptyIcon} />
                    <p style={styles.emptyText}>No team members yet.</p>
                    {!isEditing && (
                        <button
                            style={styles.addFirstButton}
                            onClick={() => setIsEditing(true)}
                        >Add First Member</button>
                    )}
                </div>
            ) : (
                <div style={styles.grid}>
                    {crewMembers.map((member, index) => (
                        <div key={index} style={styles.card}>
                            {isEditing && (
                                <button
                                    style={styles.removeButton}
                                    onClick={() => handleRemoveMember(index)}
                                    title="Remove member"
                                > <FaTrash /> </button>
                            )}

                            <div style={styles.avatarContainer}>
                                <div style={styles.avatar}>
                                    <FaUser style={styles.avatarIcon} />
                                </div>
                            </div>

                            <div style={styles.cardContent}>
                                <h3 style={styles.memberName}>{member}</h3>

                                <div style={styles.contactInfo}>
                                    <div style={styles.contactItem}>
                                        <span style={styles.label}>Email:</span>
                                        <span style={styles.value}>member@email.com</span>
                                    </div>
                                    <div style={styles.contactItem}>
                                        <span style={styles.label}>Phone:</span>
                                        <span style={styles.value}>(555) 123-4567</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

    
};

const styles = {
    container: {
        maxWidth: '1400px',
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
    editButton: {
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
    editActions: {
        display: 'flex',
        gap: '0.75rem',
    },
    saveButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.7rem 1.5rem',
        backgroundColor: '#10b981',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    cancelButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.7rem 1.5rem',
        backgroundColor: '#6b7280',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    addMemberSection: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1.5rem',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '2px dashed #cbd5e1',
    },
    addInput: {
        flex: 1,
        padding: '0.8rem 1rem',
        fontSize: '1rem',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        outline: 'none',
        transition: 'border-color 0.2s',
    },
    addButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.8rem 1.5rem',
        background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '0.95rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        whiteSpace: 'nowrap',
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1.5rem',
    },
    card: {
        position: 'relative',
        backgroundColor: 'white',
        padding: '1rem',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        transition: 'transform 0.2s, box-shadow 0.2s',
    },
    removeButton: {
        position: 'absolute',
        top: '0.75rem',
        right: '0.75rem',
        backgroundColor: '#fee2e2',
        color: '#dc2626',
        border: 'none',
        borderRadius: '6px',
        padding: '0.5rem',
        cursor: 'pointer',
        fontSize: '0.9rem',
        transition: 'background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '0.75rem',
    },
    avatar: {
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        backgroundColor: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid #f3f4f6',
    },
    avatarIcon: {
        fontSize: '2rem',
        color: '#9ca3af',
    },
    cardContent: {
        textAlign: 'center',
    },
    memberName: {
        fontSize: '1.1rem',
        fontWeight: '700',
        color: '#2c3e50',
        marginBottom: '0.75rem',
        margin: 0,
    },
    contactInfo: {
        marginTop: '0.75rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        textAlign: 'left',
        backgroundColor: '#f8fafc',
        padding: '0.75rem',
        borderRadius: '8px',
    },
    contactItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.85rem',
    },
    label: {
        fontWeight: '600',
        color: '#6b7280',
    },
    value: {
        color: '#2c3e50',
    },
    emptyState: {
        textAlign: 'center',
        padding: '4rem 2rem',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '2px dashed #cbd5e1',
    },
    emptyIcon: {
        fontSize: '4rem',
        color: '#cbd5e1',
        marginBottom: '1rem',
    },
    emptyText: {
        fontSize: '1.1rem',
        color: '#6b7280',
        marginBottom: '1.5rem',
    },
    addFirstButton: {
        padding: '0.8rem 1.5rem',
        background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    }
};

export default TeamTab;