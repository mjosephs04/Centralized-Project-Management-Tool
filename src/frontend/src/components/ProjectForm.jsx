import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlusCircle, FaMinusCircle } from 'react-icons/fa';
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

    // --- Inline Styles Object ---
    const styles = {
        pageContainter: {
            display: 'flex',
            flexDirection:'column',
            padding: '2rem 5rem',
            backgroundColor: '#f5f5f5',
            minHeight: 'calc(100vh-70px)',
        },
        headerContainer: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem',
        },
        formTitle: {
            fontSize: '2rem',
            fontWeight: 'bold',
            color: '#333',
            margin: 0,
        },
        actionButtons: {
            display: 'flex',
            gap: '1rem',
        },
        createButton: {
            padding: '0.8rem 2.2rem',
            border: 'none',
            borderRadius: '25px',
            backgroundColor: '#f0e6e4',
            color: '#c45a55',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
        },
        cancelButton: {
            padding: '0.8rem 2.2rem',
            border: 'none',
            borderRadius: '25px',
            backgroundColor: '#e6908a',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2.5rem 3rem',
            backgroundColor: '#ffffff',
            padding: '2.5rem',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        },
        formGroup: {
            marginBottom: '0'
        },
        label: {
            display: 'block',
            fontWeight: '600',
            marginBottom: '0.6rem',
            color: "#333",
            fontSize: '1.05rem',
        },
        input: {
            width: '100%',
            padding: '0.8rem 0.5rem',
            border: 'none',
            borderBottom: '1px solid #ddd',
            outline: 'none',
            fontSize: '1rem',
            color: '#333',
            backgroundColor: 'transparent',
            transition: 'border-color 0.3s ease',
        },
        inputFocus: {
            borderBottom: '1px solid #0052D4',
        },
        textarea: {
            height: '100px',
            resize: 'vertical',
        },
        crewMembersContainer: {
            gridColumn: '1 / -1',
            backgroundColor: '#fcfcfc',
            border: '1px solid #eee',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
        },
        crewMemberInputGroup: {
            display: 'flex',
            alignItems: 'center',
            marginBottom: '0.8rem',
        },
        crewMemberInput: {
            flex: 1,
            marginRight: '0.75rem',
            padding: '0.8rem 0.5',
            border: 'none',
            borderBottom: '1px solid #ddd',
            outline: 'none',
            backgroundColor: 'transparent',
        },
        crewIconButton: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#888',
            fontSize: '1.2rem',
            padding: '0.3rem',
            transition: 'color 0.2s',
        },
        crewIconButtonHover: {
            color: '#0052D4',
        },
        crewRemoveButtonHover: {
            color: '#dc3545',
        },
        formSubmitButton: {
            gridColumn: '1 / -1',
            marginTop: '2rem',
            padding: '1rem',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: '#0052D4',
            color: 'white',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            boxShadow: '0 4px 10px rgba(0, 82, 212, 0.2)',
        },
        halfWidthGroup: {
            flex: 1,
        },
        errorBanner: {
            padding: '1rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '8px',
            marginBottom: '1rem',
            border: '1px solid #fca5a5',
        }
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
        <div style={styles.pageContainter}>
            {error && (
                <div style={styles.errorBanner}>
                    Error: {error}
                </div>
            )}
            <div style={styles.headerContainer}>
                <h2 style={styles.formTitle}>Project Details</h2>
                <div style={styles.actionButtons}>
                    <button
                        type="submit"
                        form="project-form"
                        style={{
                            ...styles.createButton,
                            opacity: isSubmitting ? 0.6 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                        }}
                        disabled={isSubmitting}
                    >{isSubmitting ? 'Creating...' : 'Create'}</button>
                    <button
                        type="button"
                        style={styles.cancelButton}
                        onClick={handleCancel}
                    >Cancel</button>
                </div>
            </div>
            <form onSubmit={handleSubmit} style={styles.formGrid} id="project-form">
                <div style={styles.formGroup}>
                    <label style={styles.label}>Title</label>
                    <input
                        style={getInputStyle('name')}
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        onFocus={() => setFocusedInput('name')}
                        onBlur={() => setFocusedInput(null)}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Location</label>
                        <input
                            style={getInputStyle('location')}
                            type="text"
                            name="location"
                            required
                            value={formData.location}
                            onChange={handleChange}
                            onFocus={() => setFocusedInput('location')}
                            onBlur={() => setFocusedInput(null)}
                        />
                </div>
                <div style={{ ...styles.formGroup, gridColumn: '1 / -1'}}>
                    <label style={styles.label}>Description</label>
                    <textarea
                        style={{ ...getInputStyle('description'), ...styles.textarea}}
                        name='description'
                        value={formData.description}
                        onChange={handleChange}
                        onFocus={() => setFocusedInput('description')}
                        onBlur={() => setFocusedInput(null)}
                    />
                </div>
                <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date</label>
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
                    <label style={styles.label}>End Date</label>
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
                    <label style={styles.label}>Allocated Budget</label>
                        <input
                            style={getInputStyle('estimatedBudget')}
                            type="number"
                            name="estimatedBudget"
                            required
                            placeholder='e.g., 50000'
                            value={formData.estimatedBudget}
                            onChange={handleChange}
                            onFocus={() => setFocusedInput('estimatedBudget')}
                            onBlur={() => setFocusedInput(null)}
                        />
                </div>

                <div style={styles.crewMembersContainer}>
                    <label style={styles.label}>Crew Members</label>
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
                                <FaMinusCircle
                                    style={{
                                        ...styles.crewIconButton,
                                        ...(focusedInput === `removeCrew-${index}` ? styles.crewRemoveButtonHover : {}),
                                        color: '#dc3545',
                                    }}
                                    onMouseEnter={() => setFocusedInput(`removeCrew-${index}`)}
                                    onMouseLeave={() => setFocusedInput(null)}
                                    onClick={() => removeCrewMember(index)}
                                    size={20}
                                />
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        style={{ ...styles.crewIconButton, ...styles.crewIconButtonHover, color: '#0052D4'}}
                        onClick={addCrewMember}
                        onMouseEnter={() => setFocusedInput('addCrew')}
                        onMouseLeave={() => setFocusedInput(null)}
                    > <FaPlusCircle size={20}/> Add Member </button>
                </div>
            </form>
        </div>
    );
};

export default ProjectCreationForm;