import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlusCircle, FaMinusCircle, FaArrowLeft, FaTimes, FaTrash, FaUser } from 'react-icons/fa';
import { projectsAPI, usersAPI } from '../services/api';
import { useSnackbar } from '../contexts/SnackbarContext';

const ProjectCreationForm = ({ onCreate }) => {
    const navigate = useNavigate(); 
    const { showSnackbar } = useSnackbar();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        startDate: '',
        endDate: '',
        estimatedBudget: '',
        status: 'planning',
        priority: 'medium',
    });

    // Worker selection state (similar to TeamTab)
    const [crew, setCrew] = useState([]); // Array of { id: number } objects
    const [allWorkers, setAllWorkers] = useState([]);
    const [filter, setFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingWorkers, setLoadingWorkers] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [focusedInput, setFocusedInput] = useState(null);
    const [hoveredButton, setHoveredButton] = useState(null);
    
    const handleChange = (e) => {
        const { name, value } = e.target;
            setFormData({ ...formData, [name]: value });
    };

    // Load workers on component mount
    useEffect(() => {
        const loadWorkers = async () => {
            try {
                setLoadingWorkers(true);
                const users = await usersAPI.getWorkers();
                setAllWorkers(users || []);
            } catch (e) {
                console.error("Failed to load workers", e);
                showSnackbar("Failed to load workers list", "error");
            } finally {
                setLoadingWorkers(false);
            }
        };
        loadWorkers();
    }, []);

    // Helper functions for worker data
    const getName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
    const getEmail = (u) => u?.email ?? u?.emailAddress ?? "";
    const getPhone = (u) => u?.phoneNumber ?? u?.phone ?? "";
    const workerDisplayName = (u) => getName(u) || getEmail(u) || "Unnamed";

    // Enhanced search function
    const searchWorkers = (workers, searchTerm) => {
        if (!searchTerm.trim()) return workers;
        
        const term = searchTerm.toLowerCase().trim();
        return workers.filter((worker) => {
            const name = getName(worker).toLowerCase();
            const email = getEmail(worker).toLowerCase();
            const phone = getPhone(worker).toLowerCase();
            
            return name.includes(term) || 
                   email.includes(term) || 
                   phone.includes(term) ||
                   `${name} ${email} ${phone}`.includes(term);
        });
    };

    // Resolve crew members with worker details
    const crewResolved = useMemo(() => {
        return crew.map((member) => {
            if (member.id) {
                const w = allWorkers.find((worker) => String(worker.id) === String(member.id));
                if (w) {
                    return {
                        id: w.id,
                        name: workerDisplayName(w),
                        email: getEmail(w),
                        phoneNumber: getPhone(w),
                        profileImageUrl: w.profileImageUrl || ""
                    };
                }
                return { id: member.id, name: `Worker #${member.id}`, email: "", phoneNumber: "" };
            }
            return { name: member.name, email: "", phoneNumber: "" };
        });
    }, [crew, allWorkers]);

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(filter);
        }, 300);
        return () => clearTimeout(timer);
    }, [filter]);

    const filteredWorkers = useMemo(() => {
        return searchWorkers(allWorkers, searchTerm);
    }, [searchTerm, allWorkers]);

    // Show dropdown when there's a search term or when focused
    useEffect(() => {
        setShowDropdown(focusedInput === 'worker-search' && (searchTerm || filter));
    }, [focusedInput, searchTerm, filter]);

    const existingIds = new Set(crew.filter((m) => m.id != null).map((m) => String(m.id)));

    // Worker selection handlers
    const handleAddMember = (workerId) => {
        if (!workerId) return;
        if (existingIds.has(String(workerId))) return; // prevent duplicate
        setCrew((prev) => [...prev, { id: workerId }]);
        setFilter("");
        setShowDropdown(false);
        setHighlightedIndex(-1);
    };

    const handleWorkerSelect = (worker) => {
        handleAddMember(worker.id);
    };

    const handleKeyDown = (e) => {
        if (!showDropdown) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev < filteredWorkers.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev > 0 ? prev - 1 : filteredWorkers.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredWorkers[highlightedIndex]) {
                    handleWorkerSelect(filteredWorkers[highlightedIndex]);
                }
                break;
            case 'Escape':
                setShowDropdown(false);
                setHighlightedIndex(-1);
                break;
        }
    };

    const handleRemoveMember = (index) => {
        setCrew((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
       e.preventDefault();
       setIsSubmitting(true);
       setError(null);

       try {
            // Combine address fields into single location string
            const locationParts = [
                formData.address,
                formData.city,
                formData.state,
                formData.zipCode
            ].filter(part => part.trim()); // Remove empty parts
            
            const location = locationParts.join(', ');

            const projectData = {
                name: formData.name,
                description: formData.description,
                location: location,
                startDate: formData.startDate,
                endDate: formData.endDate,
                estimatedBudget: formData.estimatedBudget ? parseFloat(formData.estimatedBudget) : null,
                status: formData.status.toLowerCase(),
                priority: formData.priority.toLowerCase(),
            };
            
            // Create the project first
            const createdProject = await projectsAPI.createProject(projectData);
            
            // Update crew members if any are selected
            if (crew.length > 0) {
                const memberIds = crew.map((m) => m.id).filter(id => id != null);
                if (memberIds.length > 0) {
                    await projectsAPI.updateProject(createdProject.id, { crewMembers: memberIds });
                }
            }
            
            showSnackbar('Project created successfully!', 'success');
            navigate(`/projects/${createdProject.id}`);
       } catch (err) {
            const errorMessage = err.response?.data?.error || err.message;
            setError(errorMessage);
            showSnackbar(`Failed to create project: ${errorMessage}`, 'error');
            console.error('Error creating project:', err);
       } finally {
            setIsSubmitting(false);
       }
    };

    const handleCancel = () => {
        showSnackbar('Project creation cancelled', 'warning');
        navigate("/projects");
    }

    const styles = {
        pageContainer: {
            padding: '1.5rem 1rem',
            paddingBottom: '4rem',
            background: 'rgb(219, 219, 219)',
            minHeight: 'calc(100vh - 80px)',
            fontFamily: 'sans-serif',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
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
            background: '#515557',
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
            background: '#5692bc',
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
        locationSection: {
            gridColumn: '1 / -1',
            backgroundColor: '#f7fafc',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            marginTop: '1rem',
        },
        locationSectionTitle: {
            fontSize: '1.1rem',
            fontWeight: '600',
            color: '#2c3e50',
            marginBottom: '1rem',
        },
        locationGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
        },
        crewMembersSection: {
            gridColumn: '1 / -1',
            marginTop: '1rem',
            marginBottom: '2rem',
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
            color: '#5692bc',
            marginTop: '0.5rem',
        },
        removeButton: {
            color: '#FF6961',
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
        // Worker selection styles (from TeamTab)
        unifiedSearchContainer: {
            position: "relative",
            flex: 1,
        },
        searchInputContainer: {
            position: "relative",
            display: "flex",
            alignItems: "center",
        },
        unifiedSearchInput: {
            width: "100%",
            padding: "0.8rem 1rem",
            paddingRight: "2.5rem",
            fontSize: "1rem",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            outline: "none",
            transition: "border-color 0.2s",
            backgroundColor: "white",
        },
        clearButton: {
            position: "absolute",
            right: "0.5rem",
            background: "none",
            border: "none",
            color: "#6b7280",
            cursor: "pointer",
            padding: "0.25rem",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.875rem",
            transition: "color 0.2s",
        },
        dropdown: {
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            marginBottom: "0.5rem",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px 8px 0 0",
            boxShadow: "0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06)",
            maxHeight: "300px",
            overflowY: "auto",
            zIndex: 1000,
        },
        dropdownItem: {
            padding: "0.75rem 1rem",
            borderBottom: "1px solid #f3f4f6",
            transition: "background-color 0.2s",
        },
        workerInfo: {
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
        },
        workerName: {
            fontSize: "0.95rem",
            fontWeight: "600",
            color: "#2c3e50",
        },
        workerDetails: {
            display: "flex",
            gap: "0.75rem",
            fontSize: "0.85rem",
            color: "#6b7280",
        },
        workerDetail: {
            fontSize: "0.85rem",
            color: "#6b7280",
        },
        alreadyAddedText: {
            color: "#9ca3af",
            fontStyle: "italic",
        },
        loadingText: {
            textAlign: "center",
            color: "#6b7280",
            fontStyle: "italic",
        },
        noResultsText: {
            textAlign: "center",
            color: "#6b7280",
            fontStyle: "italic",
        },
        searchResultsCount: {
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            color: "#6b7280",
            backgroundColor: "#f8fafc",
            borderTop: "1px solid #e5e7eb",
            textAlign: "center",
            fontStyle: "italic",
        },
        crewGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginTop: "1rem",
        },
        crewCard: {
            position: "relative",
            backgroundColor: "white",
            padding: "1rem",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            transition: "transform 0.2s, box-shadow 0.2s",
        },
        crewRemoveButton: {
            position: "absolute",
            top: "0.75rem",
            right: "0.75rem",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            border: "none",
            borderRadius: "6px",
            padding: "0.5rem",
            cursor: "pointer",
            fontSize: "0.9rem",
            transition: "background-color 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
        },
        avatarContainer: { 
            display: "flex", 
            justifyContent: "center", 
            marginBottom: "0.75rem" 
        },
        avatar: {
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            backgroundColor: "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "3px solid #f3f4f6",
        },
        avatarIcon: { 
            fontSize: "2rem", 
            color: "#9ca3af" 
        },
        crewCardContent: { 
            textAlign: "center" 
        },
        memberName: {
            fontSize: "1.1rem",
            fontWeight: "700",
            color: "#2c3e50",
            marginBottom: "0.75rem",
            margin: 0,
        },
        contactInfo: {
            marginTop: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            textAlign: "left",
            backgroundColor: "#f8fafc",
            padding: "0.75rem",
            borderRadius: "8px",
        },
        contactItem: { 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            fontSize: "0.85rem" 
        },
        label: { 
            fontWeight: "600", 
            color: "#6b7280" 
        },
        value: { 
            color: "#2c3e50" 
        },
        avatarImage: {
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "3px solid #f3f4f6",
            backgroundColor: "#f9fafb",
        },
    };

    const getInputStyle = (inputName) => ({
        ...styles.input,
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

                    {/* Location Section */}
                    <div style={styles.locationSection}>
                        <div style={styles.locationSectionTitle}>Project Location *</div>
                        <div style={styles.locationGrid}>
                            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                                <label style={styles.label}>Street Address</label>
                                <input
                                    style={getInputStyle('address')}
                                    type="text"
                                    name="address"
                                    required
                                    placeholder="123 Main Street"
                                    value={formData.address}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedInput('address')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>City</label>
                                <input
                                    style={getInputStyle('city')}
                                    type="text"
                                    name="city"
                                    required
                                    placeholder="City"
                                    value={formData.city}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedInput('city')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>State</label>
                                <input
                                    style={getInputStyle('state')}
                                    type="text"
                                    name="state"
                                    required
                                    placeholder="State"
                                    value={formData.state}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedInput('state')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                            </div>
                            <div style={styles.formGroup}>
                                <label style={styles.label}>ZIP Code</label>
                                <input
                                    style={getInputStyle('zipCode')}
                                    type="text"
                                    name="zipCode"
                                    required
                                    placeholder="12345"
                                    value={formData.zipCode}
                                    onChange={handleChange}
                                    onFocus={() => setFocusedInput('zipCode')}
                                    onBlur={() => setFocusedInput(null)}
                                />
                            </div>
                        </div>
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
                            {/* Worker Search Input */}
                            <div style={styles.unifiedSearchContainer}>
                                <div style={styles.searchInputContainer}>
                                    <input
                                        type="text"
                                        placeholder="Search and select workers by name, email, or phone..."
                                        value={filter}
                                        onChange={(e) => setFilter(e.target.value)}
                                        onFocus={() => setFocusedInput('worker-search')}
                                        onBlur={() => {
                                            setTimeout(() => setFocusedInput(null), 200);
                                        }}
                                        onKeyDown={handleKeyDown}
                                        style={{
                                            ...styles.unifiedSearchInput,
                                            borderColor: focusedInput === 'worker-search' ? '#0052D4' : '#e5e7eb',
                                            boxShadow: focusedInput === 'worker-search' ? '0 0 0 3px rgba(0, 82, 212, 0.1)' : 'none',
                                        }}
                                    />
                                    {filter && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFilter("");
                                                setShowDropdown(false);
                                                setHighlightedIndex(-1);
                                            }}
                                            onMouseEnter={() => setHoveredButton('clear')}
                                            onMouseLeave={() => setHoveredButton(null)}
                                            style={{
                                                ...styles.clearButton,
                                                color: hoveredButton === 'clear' ? '#374151' : '#6b7280',
                                                backgroundColor: hoveredButton === 'clear' ? '#f3f4f6' : 'transparent',
                                            }}
                                            title="Clear search"
                                        >
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>

                                {showDropdown && (
                                    <div style={styles.dropdown}>
                                        {loadingWorkers ? (
                                            <div style={styles.dropdownItem}>
                                                <div style={styles.loadingText}>Loading workers...</div>
                                            </div>
                                        ) : filteredWorkers.length === 0 ? (
                                            <div style={styles.dropdownItem}>
                                                <div style={styles.noResultsText}>
                                                    {searchTerm ? "No workers found matching your search" : "Start typing to search workers..."}
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {filteredWorkers.map((worker, index) => (
                                                    <div
                                                        key={worker.id}
                                                        onClick={() => handleWorkerSelect(worker)}
                                                        onMouseEnter={() => setHighlightedIndex(index)}
                                                        style={{
                                                            ...styles.dropdownItem,
                                                            backgroundColor: highlightedIndex === index ? '#f3f4f6' : 'white',
                                                            opacity: existingIds.has(String(worker.id)) ? 0.5 : 1,
                                                            cursor: existingIds.has(String(worker.id)) ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        <div style={styles.workerInfo}>
                                                            <div style={styles.workerName}>
                                                                {getName(worker) || "Unnamed"}
                                                                {existingIds.has(String(worker.id)) && (
                                                                    <span style={styles.alreadyAddedText}> (Already added)</span>
                                                                )}
                                                            </div>
                                                            <div style={styles.workerDetails}>
                                                                {getEmail(worker) && (
                                                                    <span style={styles.workerDetail}>{getEmail(worker)}</span>
                                                                )}
                                                                {getPhone(worker) && (
                                                                    <span style={styles.workerDetail}>{getPhone(worker)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                </div>
                            ))}
                                                {searchTerm && (
                                                    <div style={styles.searchResultsCount}>
                                                        {filteredWorkers.length} worker{filteredWorkers.length !== 1 ? 's' : ''} found
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Selected Crew Members Display */}
                            {crewResolved.length > 0 && (
                                <div style={styles.crewGrid}>
                                    {crewResolved.map((member, index) => (
                                        <div key={index} style={styles.crewCard}>
                            <button
                                type="button"
                                                style={styles.crewRemoveButton}
                                                onClick={() => handleRemoveMember(index)}
                                                title="Remove member"
                            >
                                                <FaTrash />
                            </button>
                                            <div style={styles.avatarContainer}>
                                                {member.profileImageUrl ? (
                                                    <img
                                                        src={member.profileImageUrl}
                                                        alt={`${member.name || "User"} profile`}
                                                        style={styles.avatarImage}
                                                        onError={(e) => (e.target.style.display = "none")}
                                                    />
                                                ) : (
                                                    <div style={styles.avatar}>
                                                        <FaUser style={styles.avatarIcon} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={styles.crewCardContent}>
                                                <h3 style={styles.memberName}>{member.name || "Member"}</h3>
                                                <div style={styles.contactInfo}>
                                                    <div style={styles.contactItem}>
                                                        <span style={styles.label}>Email:</span>
                                                        <span style={styles.value}>{member.email || "—"}</span>
                                                    </div>
                                                    <div style={styles.contactItem}>
                                                        <span style={styles.label}>Phone:</span>
                                                        <span style={styles.value}>{member.phoneNumber || "—"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProjectCreationForm;