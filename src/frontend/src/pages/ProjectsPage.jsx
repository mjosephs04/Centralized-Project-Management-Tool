import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from 'react-router-dom';
import { FaChevronLeft, FaChevronRight, FaPlus, FaFilter, FaSortAmountDown, FaSearch } from "react-icons/fa";
import { Snackbar, Alert } from '@mui/material';
import UserNavbar from "../components/UserNavbar";
import ProjectCard from "../components/ProjectCard";
import { projectsAPI, authAPI } from "../services/api";
import { getActiveStatuses, getAllStatuses, STATUS_SORT_ORDER } from "../utils/projectStatusConfig";

const ProjectsPage = () => {
    const [projects, setProjects] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [filteredProjects, setFilteredProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [showFiltersSort, setShowFiltersSort] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const scrollContainerRef = useRef(null);
    const location = useLocation();

    const [filters, setFilters] = useState({
        minBudget: '',
        maxBudget: '',
        startDate: '',
        endDate: '',
        status: '', // New status filter
    });

    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchInitialData();

        if (location.state?.projectDeleted) {
            setSnackbarMessage('Project deleted successfully');
            setSnackbarOpen(true);

            window.history.replaceState({}, document.title);
        }
    }, []);

    useEffect(() => {
        checkScrollingButtons();
    }, [filteredProjects]);

    useEffect(() => {
        applyFilters();
    }, [projects, filters, sortBy, sortOrder, searchQuery])

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
    };

    const applyFilters = () => {
        let filtered = [...projects];

        // ALWAYS filter out Cancelled and Archived unless explicitly selected
        if (!filters.status || (filters.status !== 'cancelled' && filters.status !== 'archived')) {
            filtered = filtered.filter(project => 
                project.status !== 'cancelled' && project.status !== 'archived'
            );
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered =filtered.filter(project => {
                const name = (project.name || '').toLowerCase();
                const location = (project.location || '').toLowerCase();
                const description = (project.description || '').toLowerCase();

                return name.includes(query) ||
                       location.includes(query) ||
                       description.includes(query);
            });
        }

        if (filters.minBudget) {
            filtered = filtered.filter(project => project.estimatedBudget >= parseFloat(filters.minBudget));
        }
        if (filters.maxBudget) {
            filtered = filtered.filter(project => project.estimatedBudget <= parseFloat(filters.maxBudget));
        }

        if (filters.startDate) {
            filtered = filtered.filter(project => new Date(project.startDate) >= new Date(filters.startDate));
        }

        if (filters.endDate) {
            filtered = filtered.filter(project => new Date(project.endDate) <= new Date(filters.endDate));
        }

        // Filter by status - use database status directly
        if (filters.status) {
            filtered = filtered.filter(project => project.status === filters.status);
        }

        filtered = sortProjects(filtered);
        setFilteredProjects(filtered);
    };

    const sortProjects = (projectsToSort) => {
        const sorted = [...projectsToSort];

        sorted.sort((a, b) => {
            let compareValue = 0;

            switch (sortBy) {
                case 'name':
                    compareValue = (a.name || '').localeCompare(b.name || '');
                    break;
                case 'budget':
                    compareValue = (a.estimatedBudget || 0) - (b.estimatedBudget || 0);
                    break;
                case 'startDate':
                    compareValue = new Date(a.startDate) - new Date(b.startDate);
                    break;
                case 'endDate':
                    compareValue = new Date(a.endDate) - new Date(b.endDate);
                    break;
                case 'location':
                    compareValue = (a.location || '').localeCompare(b.location || '');
                    break;
                case 'status':
                    // Use STATUS_SORT_ORDER from config
                    const orderA = STATUS_SORT_ORDER[a.status] || 999;
                    const orderB = STATUS_SORT_ORDER[b.status] || 999;
                    compareValue = orderA - orderB;
                    break;
                default:
                    compareValue = 0;
            }
            return sortOrder === 'asc' ? compareValue : -compareValue;
        });
        return sorted;
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const clearFilters = () => {
        setFilters({
            minBudget: '',
            maxBudget: '',
            startDate: '',
            endDate: '',
            status: '',
        });
    };

    const clearSort = () => {
        setSortBy('name');
        setSortOrder('asc');
    }

    const clearAll = () => {
        clearFilters();
        clearSort();
    }

    const hasActiveFilters = () => {
        return filters.minBudget || filters.maxBudget || filters.startDate || filters.endDate || filters.status;
    };

    const hasActiveSort = () => {
        return sortBy !== 'name' || sortOrder !== 'asc';
    }

    const hasActiveFiltersOrSort = () => {
        return hasActiveFilters() || hasActiveSort();
    }

    const checkScrollingButtons = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setCanScrollLeft(scrollLeft > 0);
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
        }
    };

    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
            const newScrollLeft = direction === 'left'
                ? scrollContainerRef.current.scrollLeft - scrollAmount
                : scrollContainerRef.current.scrollLeft + scrollAmount;

            scrollContainerRef.current.scrollTo({
                left: newScrollLeft,
                behavior: 'smooth'
            });

            setTimeout(checkScrollingButtons, 300);
        }
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    }

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const me = await authAPI.me();
            setCurrentUser(me);
            setUserRole(me?.role || null);
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
                    <div>
                        <h1 style={styles.pageTitle}>Project Dashboard</h1>
                        <p style={styles.subtitle}>Manage And Track All Ongoing Projects</p>
                    </div>
                    <div style={styles.headerButtons}>
                        <button
                            onClick={() => setShowFiltersSort(!showFiltersSort)}
                            style={{
                                ...styles.filterButton,
                                ...(showFiltersSort || hasActiveFiltersOrSort() ? styles.filterButtonActive : {})
                            }}
                        >
                            <FaFilter style={styles.buttonIcon} />
                            Filter & Sort {hasActiveFiltersOrSort() && '(Active)'}
                        </button>
                        {userRole !== 'worker' && (
                            <Link to="/projects/create" style={styles.createButton}>
                                <FaPlus style={styles.buttonIcon} />
                                New Project
                            </Link>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div style={styles.centerContent}>
                        <div style={styles.loader}></div>
                        <p style={styles.loadingText}>Loading projects...</p>
                    </div>
                ) : error ? (
                    <div style={styles.centerContent}>
                        <p style={styles.errorText}>Error loading projects: {error}</p>
                        <button onClick={fetchProjects} style={styles.retryButton}>
                            Retry
                        </button>
                    </div>
                ) : filteredProjects.length === 0 && !showFiltersSort && !searchQuery ? (
                    <div style={styles.emptyState}>
                        <div style={styles.emptyIcon}>📋</div>
                        <h3 style={styles.emptyTitle}>
                            {userRole === 'worker' ? 'You are not assigned to any projects yet.' : 'No Projects Yet'}
                        </h3>
                        <p style={styles.emptyText}>
                            {userRole === 'worker' ? 'Contact your project manager to get assigned to projects.' : 'Get started by creating your first project'}
                        </p>
                    </div>
                ) : (
                    <div style={styles.mainContainer}>
                        {/* Search Bar */}
                        <div style={styles.searchContainer}>
                            <FaSearch style={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search projects by name, location, or description..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={styles.searchInput}
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    style={styles.clearSearchButton}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {/* Status Legend - Moved above project cards */}
                        <div style={styles.legendContainer}>
                            <span style={styles.legendTitle}>Status Key:</span>
                            <div style={styles.legendItems}>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#9333ea' }}></div>
                                    <span style={styles.legendLabel}>Planning</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#3b82f6' }}></div>
                                    <span style={styles.legendLabel}>Initiated</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#0891b2' }}></div>
                                    <span style={styles.legendLabel}>Reg & Scoping</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#059669' }}></div>
                                    <span style={styles.legendLabel}>Design & Proc</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#84cc16' }}></div>
                                    <span style={styles.legendLabel}>Construction Prep</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#f59e0b' }}></div>
                                    <span style={styles.legendLabel}>In Construction</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#f97316' }}></div>
                                    <span style={styles.legendLabel}>Commissioning</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#10b981' }}></div>
                                    <span style={styles.legendLabel}>Energized</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#06b6d4' }}></div>
                                    <span style={styles.legendLabel}>Closeout</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#eab308' }}></div>
                                    <span style={styles.legendLabel}>On Hold</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#ef4444' }}></div>
                                    <span style={styles.legendLabel}>Cancelled</span>
                                </div>
                                <div style={styles.legendItem}>
                                    <div style={{ ...styles.legendBar, backgroundColor: '#6b7280' }}></div>
                                    <span style={styles.legendLabel}>Archived</span>
                                </div>
                            </div>
                        </div>

                        {/* Filter & Sort Section */}
                        {showFiltersSort && (
                            <div style={styles.filterSortWrapper}>
                                {/* Sort Section */}
                                <div style={styles.sortSection}>
                                    <h3 style={styles.sectionTitle}>
                                        <FaSortAmountDown style={styles.sectionIcon} />
                                        Sort Projects
                                    </h3>
                                    <div style={styles.sortContainer}>
                                        <div style={styles.sortGroup}>
                                            <label style={styles.sortLabel}>Sort By:</label>
                                            <select
                                                value={sortBy}
                                                onChange={(e) => setSortBy(e.target.value)}
                                                style={styles.sortSelect}
                                            >
                                                <option value="name">Name</option>
                                                <option value="status">Status</option>
                                                <option value="budget">Budget</option>
                                                <option value="startDate">Start Date</option>
                                                <option value="endDate">End Date</option>
                                                <option value="location">Location</option>
                                            </select>
                                        </div>
                                        <div style={styles.sortGroup}>
                                            <label style={styles.sortLabel}>Order:</label>
                                            <select
                                                value={sortOrder}
                                                onChange={(e) => setSortOrder(e.target.value)}
                                                style={styles.sortSelect}
                                            >
                                                <option value="asc">Ascending</option>
                                                <option value="desc">Descending</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={styles.divider}></div>

                                {/* Filter Section */}
                                <div style={styles.filterSection}>
                                    <h3 style={styles.sectionTitle}>
                                        <FaFilter style={styles.sectionIcon} />
                                        Filter Projects
                                    </h3>
                                    <div style={styles.filtersGrid}>
                                        <div style={styles.filterGroup}>
                                            <label style={styles.filterLabel}>Project Status</label>
                                            <select
                                                value={filters.status}
                                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                                style={{
                                                    ...styles.filterInput,
                                                    paddingRight: '2.5rem',
                                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%232373f3' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                                                    backgroundRepeat: 'no-repeat',
                                                    backgroundPosition: 'right 1rem center',
                                                    backgroundSize: '12px',
                                                }}
                                            >
                                                <option value="">All Active Statuses</option>
                                                <option value="planning">Planning</option>
                                                <option value="initiated">Initiated</option>
                                                <option value="regulatory_scoping">Regulatory & Scoping</option>
                                                <option value="design_procurement">Design & Procurement</option>
                                                <option value="construction_prep">Construction Prep</option>
                                                <option value="in_construction">In Construction</option>
                                                <option value="commissioning">Commissioning</option>
                                                <option value="energized">Energized</option>
                                                <option value="closeout">Closeout</option>
                                                <option value="on_hold">On Hold</option>
                                                <option value="cancelled">Cancelled</option>
                                                <option value="archived">Archived</option>
                                            </select>
                                        </div>
                                        <div style={styles.filterGroup}>
                                            <label style={styles.filterLabel}>Min Budget ($)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g., 50000"
                                                value={filters.minBudget}
                                                onChange={(e) => handleFilterChange('minBudget', e.target.value)}
                                                style={styles.filterInput}
                                            />
                                        </div>
                                        <div style={styles.filterGroup}>
                                            <label style={styles.filterLabel}>Max Budget ($)</label>
                                            <input
                                                type="number"
                                                placeholder="e.g., 500000"
                                                value={filters.maxBudget}
                                                onChange={(e) => handleFilterChange('maxBudget', e.target.value)}
                                                style={styles.filterInput}
                                            />
                                        </div>
                                        <div style={styles.filterGroup}>
                                            <label style={styles.filterLabel}>Project Starts On or After</label>
                                            <input
                                                type="date"
                                                value={filters.startDate}
                                                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                                                style={styles.filterInput}
                                            />
                                        </div>
                                        <div style={styles.filterGroup}>
                                            <label style={styles.filterLabel}>Project Ends On or Before</label>
                                            <input
                                                type="date"
                                                value={filters.endDate}
                                                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                                                style={styles.filterInput}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Clear Button */}
                                {hasActiveFiltersOrSort() && (
                                    <div style={styles.clearButtonContainer}>
                                        <button onClick={clearAll} style={styles.clearButton}>
                                            Clear All Filters & Sort
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Projects Display */}
                        {filteredProjects.length === 0 ? (
                            <div style={styles.emptyStateInside}>
                                <div style={styles.emptyIcon}>📋</div>
                                <h3 style={styles.emptyTitle}>No Projects Match Filters</h3>
                                <p style={styles.emptyText}>Try adjusting your filters to see more results</p>
                                {hasActiveFiltersOrSort() && (
                                    <button onClick={clearAll} style={styles.clearButton}>
                                        Clear All Filters & Sort
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div style={styles.projectsWrapper}>
                                    {canScrollLeft && (
                                        <button
                                            style={styles.scrollButton}
                                            onClick={() => scroll('left')}
                                            aria-label="Scroll left"
                                        >
                                            <FaChevronLeft />
                                        </button>
                                    )}

                                    <div
                                        style={styles.projectsScroll}
                                        ref={scrollContainerRef}
                                        onScroll={checkScrollingButtons}
                                    >
                                        {filteredProjects.map((project) => (
                                            <div key={project.id} style={styles.projectCardWrapper}>
                                                <ProjectCard 
                                                    project={project}
                                                    userRole={userRole}
                                                    currentUserId={currentUser?.id}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {canScrollRight && (
                                        <button
                                            style={{...styles.scrollButton, ...styles.scrollButtonRight}}
                                            onClick={() => scroll('right')}
                                            aria-label="Scroll right"
                                        >
                                            <FaChevronRight />
                                        </button>
                                    )}
                                </div>
                                <div style={styles.projectCount}>
                                    Showing {filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={handleSnackbarClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleSnackbarClose}
                    severity="success"
                    sx={{ 
                        width: '100%',
                        background: 'rgba(255, 255, 255, 0.85)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '12px',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                        color: '#059669',
                        fontWeight: '600',
                        '& .MuiAlert-icon': {
                            color: '#10b981'
                        }
                    }}
                    variant="filled"
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    );
};

const styles = {
    pageContainer: {
        padding: '1.5rem 1rem',
        background: 'rgb(219, 219, 219)',
        minHeight: 'calc(100vh - 80px)',
        fontFamily: 'sans-serif',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
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
    headerButtons: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
    },
    createButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        textDecoration: 'none',
        color: 'white',
        backgroundColor: '#5692bc',
        padding: '0.9rem 1.8rem',
        borderRadius: '10px',
        fontWeight: '600',
        fontSize: '1rem',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 0.3s',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
    },
    buttonIcon: {
        fontSize: '0.9rem',
    },
    centerContent: {
        textAlign: 'center',
        padding: '6rem 2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        maxWidth: '600px',
        margin: '0 auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    },
    loader: {
        width: '50px',
        height: '50px',
        border: '4px solid #e5e7eb',
        borderTop: '4px solid #0052D4',
        borderRadius: '50%',
        margin: '0 auto 1rem',
        animation: 'spin 1s linear infinite',
    },
    loadingText: {
        fontSize: '1.1rem',
        color: '#4a5568',
    },
    errorText: {
        color: '#dc2626',
        marginBottom: '1.5rem',
        fontSize: '1.1rem',
    },
    retryButton: {
        padding: '0.9rem 1.8rem',
        background: '#5692bc',
        color: 'white',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
    },
    emptyState: {
        textAlign: 'center',
        padding: '6rem 2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        maxWidth: '500px',
        margin: '0 auto',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },
    emptyStateInside: {
        textAlign: 'center',
        padding: '3rem 2rem',
    },
    emptyIcon: {
        fontSize: '4rem',
        marginBottom: '1.5rem',
    },
    emptyTitle: {
        fontSize: '1.5rem',
        fontWeight: '600',
        color: '#1a202c',
        marginBottom: '0.5rem',
    },
    emptyText: {
        fontSize: '1rem',
        color: '#4a5568',
        marginBottom: '1.5rem',
    },
    mainContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        padding: '1.5rem',
    },
    searchContainer: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    searchIcon: {
        position: 'absolute',
        left: '1rem',
        fontSize: '1.1rem',
        color: '#9ca3af',
        pointerEvents: 'none',
    },
    searchInput: {
        flex: 1,
        padding: '0.75rem 3rem 0.75rem 3rem',
        borderRadius: '10px',
        border: '2px solid #e2e8f0',
        fontSize: '1rem',
        outline: 'none',
        transition: 'border-color 0.3s',
        backgroundColor: 'white',
    },
    clearSearchButton: {
        position: 'absolute',
        right: '1rem',
        background: 'none',
        border: 'none',
        fontSize: '1.2rem',
        color: '#9ca3af',
        cursor: 'pointer',
        padding: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
    },
    filterSortWrapper: {
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        padding: '0 1rem 0 1rem',
        marginBottom: '1rem',

    },
    sortSection: {
        marginBottom: '1.5rem',
    },
    filterSection: {
        marginBottom: '1rem',
    },
    sectionTitle: {
        fontSize: '1.1rem',
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    sectionIcon: {
        fontSize: '1rem',
        color: '#b356bc',
    },
    divider: {
        height: '1px',
        backgroundColor: '#e2e8f0',
        marginBottom: '1.5rem',
    },
    sortContainer: {
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    sortGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
    },
    sortLabel: {
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#4a5568',
        minWidth: '70px',
    },
    sortSelect: {
        padding: '0.65rem 2.5rem 0.65rem 1rem',
        borderRadius: '8px',
        border: '2px solid #e2e8f0',
        fontSize: '0.95rem',
        fontWeight: '500',
        color: '#2c3e50',
        backgroundColor: 'white',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.3s',
        minWidth: '180px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%232373f3' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 1rem center',
        backgroundSize: '12px',
    },
    filtersGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
    },
    filterLabel: {
        fontSize: '0.9rem',
        fontWeight: '600',
        color: '#4a5568',
        marginBottom: '0.5rem',
    },
    filterInput: {
        padding: '0.65rem 0.75rem',
        borderRadius: '8px',
        border: '2px solid #e2e8f0',
        fontSize: '0.95rem',
        transition: 'all 0.3s',
        outline: 'none',
        backgroundColor: 'white',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
    },
    filterButton: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        textDecoration: 'none',
        color: '#b356bc',
        background: 'white',
        padding: '0.9rem 1.8rem',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        border: '2px solid #b356bc',
        cursor: 'pointer',
        transition: 'all 0.3s',
    },
    filterButtonActive: {
        background: '#b356bc',
        color: 'white',
        border: '2px solid transparent',
    },
    clearButtonContainer: {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '0.5rem',
    },
    clearButton: {
        padding: '0.75rem 1.5rem',
        background: '#718096',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.95rem',
        fontWeight: '600',
        transition: 'background 0.3s',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
    },
    projectsWrapper: {
        position: 'relative',
        paddingBottom: '4rem',
        marginTop: '1rem',
    },
    projectsScroll: {
        display: 'flex',
        gap: '1.5rem',
        overflowX: 'auto',
        scrollBehavior: 'smooth',
        padding: '0.5rem 0',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
    },
    projectCardWrapper: {
        flex: '0 0 calc(25% - 1.125rem)',
        minWidth: '320px',
    },
    scrollButton: {
        position: 'absolute',
        bottom: '-0.5rem',
        left: '50%',
        transform: 'translateX(-70px)',
        zIndex: 10,
        background: '#5692bc',
        border: 'none',
        borderRadius: '12px',
        width: '56px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
        fontSize: '1.3rem',
        color: 'white',
        transition: 'all 0.3s',
    },
    scrollButtonRight: {
        left: '50%',
        transform: 'translateX(14px)',
    },
    projectCount: {
        textAlign: 'center',
        marginTop: '1rem',
        fontSize: '0.95rem',
        color: '#4a5568',
        fontWeight: '600',
    },
    legendContainer: {
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: '0.75rem',
        marginTop: '1rem',
        marginBottom: '0.5rem',
        padding: '1rem 1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '10px',
        flexWrap: 'wrap',
    },
    legendTitle: {
        fontSize: '0.875rem',
        fontWeight: '600',
        color: '#374151',
        marginRight: '0.5rem',
        whiteSpace: 'nowrap',
    },
    legendItems: {
        display: 'flex',
        gap: '0.875rem',
        flexWrap: 'wrap',
        alignItems: 'center',
    },
    legendItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.375rem',
    },
    legendBar: {
        width: '20px',
        height: '4px',
        borderRadius: '2px',
    },
    legendLabel: {
        fontSize: '0.75rem',
        color: '#6b7280',
        fontWeight: '500',
        whiteSpace: 'nowrap',
    },
};

export default ProjectsPage;