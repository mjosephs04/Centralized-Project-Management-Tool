import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlusCircle, FaMinusCircle, FaArrowLeft } from 'react-icons/fa';
import { projectsAPI } from '../services/api';

const ProjectCreationForm = ({ onCreate }) => {
    const navigate = useNavigate(); 
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: '',
        startDate: '',
        endDate: '',
        estimatedBudget: '',
        status: 'planning',
        priority: 'medium',
        crewMembers: [''],
    });
    
    const handleChange = (e, index = null) => {
        const { name, value } = e.target;
        if (name === 'crewMembers') {
            const newMembers = [...formData.crewMembers];
            newMembers[index] = value;
            setFormData({ ...formData, crewMembers: newMembers });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const addCrewMember = () => {
        setFormData({ ...formData, crewMembers: [...formData.crewMembers, ''] });
    };

    const removeCrewMember = (index) => {
        const newCrew = formData.crewMembers.filter((_, i) => i !== index);
        setFormData({ ...formData, crewMembers: newCrew });
    };

    const handleSubmit = async (e) => {
       e.preventDefault();
       setIsSubmitting(true);
       setError(null);

       try {
            const projectData = {
                name: formData.name,
                description: formData.description,
                location: formData.location,
                startDate: formData.startDate,
                endDate: formData.endDate,
                estimatedBudget: formData.estimatedBudget ? parseFloat(formData.estimatedBudget) : null,
                status: formData.status.toLowerCase(),
                priority: formData.priority.toLowerCase(),
            };
            
            const createdProject = await projectsAPI.createProject(projectData);
            navigate(`/projects/${createdProject.id}`);
       } catch (err) {
            setError(err.response?.data?.error || err.message);
            console.error('Error creating project:', err);
       } finally {
            setIsSubmitting(false);
       }
    };

    const handleCancel = () => {
        navigate("/projects");
    }

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
        titleSection: {
            flex: 1,
        },
        pageTitle: {
            fontSize: '2.5rem',
            fontWeight: '700',
            color: '#1a202c',
            margin: '0 0 0.5rem 0',
            background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            MozBackgroundClip: 'text',
            MozTextFillColor: 'transparent',
        },
        subtitle: {
            fontSize: '1rem',
            color: '#718096',
            margin: 0,
        },
        actionButtons: {
            display: 'flex',
            gap: '1rem',
        },
        createButton: {
            padding: '0.9rem 2rem',
            border: 'none',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2373f3 0%, #4facfe 100%)',
            color: 'white',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 15px rgba(35, 115, 243, 0.4)',
        },
        cancelButton: {
            padding: '0.9rem 2rem',
            border: '2px solid #cbd5e0',
            borderRadius: '10px',
            backgroundColor: 'white',
            color: '#4a5568',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
        },
        formContainer: {
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '16px',
            padding: '2.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem',
        },
        formGroup: {
            display: 'flex',
            flexDirection: 'column',
        },
        label: {
            fontSize: '0.95rem',
            fontWeight: '600',
            color: '#4a5568',
            marginBottom: '0.5rem',
        },
        input: {
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            border: '2px solid #e2e8f0',
            fontSize: '1rem',
            transition: 'all 0.3s ease',
            outline: 'none',
            fontFamily: 'sans-serif',
            color: '#2c3e50',
        },
        inputFocus: {
            borderColor: '#2373f3',
            boxShadow: '0 0 0 3px rgba(35, 115, 243, 0.1)',
        },
        textarea: {
            minHeight: '120px',
            resize: 'vertical',
            fontFamily: 'sans-serif',
        },
        crewMembersSection: {
            gridColumn: '1 / -1',
            marginTop: '1rem',
        },
        crewMembersContainer: {
            backgroundColor: '#f7fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            marginTop: '1rem',
        },
        crewMemberInputGroup: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
        },
        crewMemberInput: {
            flex: 1,
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            border: '2px solid #e2e8f0',
            outline: 'none',
            fontSize: '1rem',
            transition: 'all 0.3s ease',
        },
        iconButton: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.95rem',
            fontWeight: '600',
        },
        addButton: {
            color: '#2373f3',
            marginTop: '0.5rem',
        },
        removeButton: {
            color: '#dc2626',
            padding: '0.5rem',
        },
        errorBanner: {
            padding: '1rem 1.5rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '12px',
            marginBottom: '1.5rem',
            border: '1px solid #fca5a5',
            fontSize: '0.95rem',
            fontWeight: '600',
        },
    };

    const [focusedInput, setFocusedInput] = useState(null);

    const getInputStyle = (inputName) => ({
        ...styles.input,
        ...(focusedInput === inputName ? styles.inputFocus : {}),
    });

    const getCrewInputStyle = (inputName) => ({
        ...styles.crewMemberInput,
        ...(focusedInput === inputName ? styles.inputFocus : {}),
    });

    return (
        <div style={styles.pageContainer}>
            <div style={styles.header}>
                <div style={styles.titleSection}>
                    <h1 style={styles.pageTitle}>Create New Project</h1>
                    <p style={styles.subtitle}>Fill in the details to create a new project</p>
                </div>
                <div style={styles.actionButtons}>
                    <button
                        type="button"
                        style={styles.cancelButton}
                        onClick={handleCancel}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="project-form"
                        style={{
                            ...styles.createButton,
                            opacity: isSubmitting ? 0.6 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Creating...' : 'Create Project'}
                    </button>
                </div>
            </div>

            <div style={styles.formContainer}>
                {error && (
                    <div style={styles.errorBanner}>
                        ⚠️ Error: {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={styles.formGrid} id="project-form">
                    <div style={styles.formGroup}>
                        <label style={styles.label}>Project Title *</label>
                        <input
                            style={getInputStyle('name')}
                            type="text"
                            name="name"
                            required
                            placeholder="Enter project name"
                            value={formData.name}
                            onChange={handleChange}
                            onFocus={() => setFocusedInput('name')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Location *</label>
                        <input
                            style={getInputStyle('location')}
                            type="text"
                            name="location"
                            required
                            placeholder="Project location"
                            value={formData.location}
                            onChange={handleChange}
                            onFocus={() => setFocusedInput('location')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                        <label style={styles.label}>Description</label>
                        <textarea
                            style={{ ...getInputStyle('description'), ...styles.textarea }}
                            name="description"
                            placeholder="Provide a detailed description of the project..."
                            value={formData.description}
                            onChange={handleChange}
                            onFocus={() => setFocusedInput('description')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>


                    <div style={styles.formGroup}>
                        <label style={styles.label}>Start Date *</label>
                        <input
                            style={getInputStyle('startDate')}
                            type="date"
                            name="startDate"
                            required
                            value={formData.startDate}
                            onChange={handleChange}
                            onFocus={() => setFocusedInput('startDate')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>End Date *</label>
                        <input
                            style={getInputStyle('endDate')}
                            type="date"
                            name="endDate"
                            required
                            value={formData.endDate}
                            onChange={handleChange}
                            onFocus={() => setFocusedInput('endDate')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={styles.formGroup}>
                        <label style={styles.label}>Estimated Budget *</label>
                        <input
                            style={getInputStyle('estimatedBudget')}
                            type="number"
                            name="estimatedBudget"
                            required
                            placeholder="e.g., 50000"
                            value={formData.estimatedBudget}
                            onChange={handleChange}
                            onFocus={() => setFocusedInput('estimatedBudget')}
                            onBlur={() => setFocusedInput(null)}
                        />
                    </div>

                    <div style={styles.crewMembersSection}>
                        <label style={styles.label}>Crew Members (Optional)</label>
                        <div style={styles.crewMembersContainer}>
                            {formData.crewMembers.map((member, index) => (
                                <div key={index} style={styles.crewMemberInputGroup}>
                                    <input
                                        style={getCrewInputStyle(`crewMember-${index}`)}
                                        type="text"
                                        name="crewMembers"
                                        placeholder={`Crew Member ${index + 1}`}
                                        value={member}
                                        onChange={(e) => handleChange(e, index)}
                                        onFocus={() => setFocusedInput(`crewMember-${index}`)}
                                        onBlur={() => setFocusedInput(null)}
                                    />
                                    {formData.crewMembers.length > 1 && (
                                        <button
                                            type="button"
                                            style={{ ...styles.iconButton, ...styles.removeButton }}
                                            onClick={() => removeCrewMember(index)}
                                        >
                                            <FaMinusCircle size={20} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                type="button"
                                style={{ ...styles.iconButton, ...styles.addButton }}
                                onClick={addCrewMember}
                            >
                                <FaPlusCircle size={18} />
                                Add Crew Member
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectCreationForm;