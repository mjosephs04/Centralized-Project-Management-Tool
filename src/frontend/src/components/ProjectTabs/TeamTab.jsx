import React, { useEffect, useMemo, useState } from "react";
import { FaEdit, FaSave, FaTimes, FaUserPlus, FaTrash, FaUser } from "react-icons/fa";
import { usersAPI, projectsAPI } from "../../services/api";
import { useSnackbar } from '../../contexts/SnackbarContext';

const TeamTab = ({ project, onUpdate, userRole }) => {
  // Local state
  const { showSnackbar } = useSnackbar();
  const [isEditing, setIsEditing] = useState(false);

  // Normalize incoming crew members to objects { id?, name? } in local state
  // project.crewMembers might be an array of strings or IDs; we'll store objects internally.
  const [crew, setCrew] = useState([]);

  const [allWorkers, setAllWorkers] = useState([]); // full list from API
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [filter, setFilter] = useState("");
  const [focusedInput, setFocusedInput] = useState(null);
  const [hoveredButton, setHoveredButton] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("worker");
  const [inviteWorkerType, setInviteWorkerType] = useState("crew_member");
  const [inviteContractorExpiration, setInviteContractorExpiration] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");

  // Full team fetched from backend (includes project managers and members)
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);

  // Load initial crew + workers
  useEffect(() => {
    // Normalize project.crewMembers -> local objects { id | name }
    const incoming = (project?.crewMembers ?? []).map((m) => {
      if (typeof m === "string") return { name: m }; // old data format
      if (typeof m === "number") return { id: m };    // ids only
      if (m && typeof m === "object") return m;       // already an object
      return { name: String(m) };
    });
    setCrew(incoming);
  }, [project]);

  useEffect(() => {
    const loadWorkers = async () => {
      try {
        setLoadingWorkers(true);
        const users = await usersAPI.getWorkers();
        // Expect users: [{id, firstName, lastName, email, phoneNumber}, ...]
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

  // Load full team list (project managers + members) for PM/Admin view
  useEffect(() => {
    const fetchTeam = async () => {
      if (!project?.id) return;
      try {
        setLoadingTeam(true);
        const members = await projectsAPI.getProjectMembers(project.id);
        setTeamMembers(members || []);
      } catch (e) {
        console.error("Failed to load team members", e);
      } finally {
        setLoadingTeam(false);
      }
    };
    const fetchInvitations = async () => {
      if (!project?.id) return;
      try {
        setLoadingInvites(true);
        const invs = await projectsAPI.getProjectInvitations(project.id);
        setInvitations(invs || []);
      } catch (e) {
        console.error("Failed to load invitations", e);
      } finally {
        setLoadingInvites(false);
      }
    };
    // Show full team for non-worker roles
    if (userRole && userRole !== "worker") {
      fetchTeam();
      fetchInvitations();
    } else {
      setTeamMembers([]);
      setInvitations([]);
    }
  }, [project?.id, userRole]);

  // Helpers
  const getName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
  const getEmail = (u) => u?.email ?? u?.emailAddress ?? "";
  const getPhone = (u) => u?.phoneNumber ?? u?.phone ?? "";

  const workerDisplayName = (u) => getName(u) || getEmail(u) || "Unnamed";
  
  // Enhanced search function that searches across name, email, and phone
  const searchWorkers = (workers, searchTerm) => {
    if (!searchTerm.trim()) return workers;
    
    const term = searchTerm.toLowerCase().trim();
    return workers.filter((worker) => {
      const name = getName(worker).toLowerCase();
      const email = getEmail(worker).toLowerCase();
      const phone = getPhone(worker).toLowerCase();
      
      // Search in individual fields and also in combined text
      return name.includes(term) || 
             email.includes(term) || 
             phone.includes(term) ||
             `${name} ${email} ${phone}`.includes(term);
    });
  };

  const findWorkerById = (id) => allWorkers.find((w) => String(w.id) === String(id));

  const crewResolved = useMemo(() => {
    // Resolve each crew entry with worker details if id matches
    return crew.map((member) => {
      if (member.id) {
        const w = findWorkerById(member.id);
        if (w) {
          return {
            id: w.id,
            name: workerDisplayName(w),
            email: getEmail(w),
            phoneNumber: getPhone(w),
            profileImageUrl: w.profileImageUrl || ""
          };
        }
        // unresolved ID — show ID as name fallback
        return { id: member.id, name: `Worker #${member.id}`, email: "", phoneNumber: "" };
      }
      // name-only legacy entry
      return { name: member.name, email: "", phoneNumber: "" };
    });
  }, [crew, allWorkers]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(filter);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [filter]);

  const filteredWorkers = useMemo(() => {
    return searchWorkers(allWorkers, searchTerm);
  }, [searchTerm, allWorkers]);

  // Show dropdown when there's a search term or when focused
  useEffect(() => {
    setShowDropdown(focusedInput === 'search' && (searchTerm || filter));
  }, [focusedInput, searchTerm, filter]);

  const existingIds = new Set(crew.filter((m) => m.id != null).map((m) => String(m.id)));
  const existingNames = new Set(crew.filter((m) => m.name).map((m) => m.name.toLowerCase()));

  // Actions
  const handleAddMember = (workerId = selectedWorkerId) => {
    if (!workerId) return;
    if (existingIds.has(String(workerId))) return; // prevent duplicate by id
    setCrew((prev) => [...prev, { id: workerId }]);
    setSelectedWorkerId("");
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
    const memberName = crewResolved[index]?.name || "Team member";
    setCrew((prev) => prev.filter((_, i) => i !== index));
    showSnackbar(`${memberName} removed from team`, 'warning');
  };

  const handleSave = async () => {
    // Persist IDs if available; fallback to names for legacy compatibility.
    const payload = crew.map((m) => (m.id != null ? m.id : m.name));
    try {
      await onUpdate?.({ crewMembers: payload });
      setIsEditing(false);
      showSnackbar("Team changes saved successfully!", "success");
    } catch (e) {
      console.error("Failed to save crew", e);
      showSnackbar("Failed to save team changes", "error");
    }
  };

  const handleCancel = () => {
    // Revert to project data
    const incoming = (project?.crewMembers ?? []).map((m) => {
      if (typeof m === "string") return { name: m };
      if (typeof m === "number") return { id: m };
      if (m && typeof m === "object") return m;
      return { name: String(m) };
    });
    setCrew(incoming);
    setSelectedWorkerId("");
    setFilter("");
    setShowDropdown(false);
    setHighlightedIndex(-1);
    setIsEditing(false);
    showSnackbar("Team changes discarded", "warning");
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) return;
    
    // Validate contractor expiration date if needed
    if (inviteRole === "worker" && inviteWorkerType === "contractor" && !inviteContractorExpiration.trim()) {
      setInviteMessage("❌ Contractor expiration date is required for contractor invitations");
      showSnackbar("Contractor expiration date is required", "error");
      return;
    }
    
    setIsInviting(true);
    setInviteMessage("");
    
    try {
      const invitationData = {
        email: inviteEmail.trim(),
        role: inviteRole,
        workerType: inviteRole === "worker" ? inviteWorkerType : null,
        contractorExpirationDate: inviteRole === "worker" && inviteWorkerType === "contractor" ? inviteContractorExpiration : null,
      };
      
      console.log("Sending invitation data:", invitationData);
      const response = await projectsAPI.inviteUser(project.id, invitationData);
      console.log("Invitation response:", response);
      
      if (response.message) {
        setInviteMessage(`✅ ${response.message}`);
        showSnackbar(response.message, "success");
        setInviteEmail("");
        setInviteRole("worker");
        setInviteWorkerType("crew_member");
        setInviteContractorExpiration("");
        // Refresh team and invitations
        const members = await projectsAPI.getProjectMembers(project.id);
        setTeamMembers(members || []);
        const invs = await projectsAPI.getProjectInvitations(project.id);
        setInvitations(invs || []);
      } else if (response.warning) {
        setInviteMessage(`⚠️ ${response.warning}`);
        showSnackbar(response.warning, "warning");
      }
    } catch (error) {
      console.error("Failed to send invitation:", error);
      console.error("Error response:", error.response?.data);
      const errorMessage = error.response?.data?.error || "Failed to send invitation";
      setInviteMessage(`❌ ${errorMessage}`);
      showSnackbar(errorMessage, "error");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveTeamMember = async (memberId, isManager = false) => {
    if (!window.confirm("Are you sure you want to remove this person from the project?")) {
      return;
    }
    
    try {
      if (isManager) {
        await projectsAPI.removeProjectManager(project.id, memberId);
      } else {
        await projectsAPI.removeProjectMember(project.id, memberId);
      }
      // Refresh team list
      const members = await projectsAPI.getProjectMembers(project.id);
      setTeamMembers(members || []);
    } catch (error) {
      console.error("Failed to remove member:", error);
      alert(error.response?.data?.error || "Failed to remove member");
    }
  };

  const canEdit = userRole !== "worker"; // Only PM/Admin edit; adjust as needed

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Team Members</h2>

        {!isEditing ? (
          <button
            style={{ ...styles.editButton, ...(canEdit ? {} : styles.btnDisabled) }}
            onClick={() => canEdit && setIsEditing(true)}
            disabled={!canEdit}
            title={canEdit ? "Edit Team" : "Workers cannot edit team"}
          >
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
          <div style={styles.unifiedSearchContainer}>
            <div style={styles.searchInputContainer}>
              <input
                type="text"
                placeholder="Search and select workers by name, email, or phone..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                onFocus={() => setFocusedInput('search')}
                onBlur={() => {
                  // Delay hiding dropdown to allow clicking on options
                  setTimeout(() => setFocusedInput(null), 200);
                }}
                onKeyDown={handleKeyDown}
                style={{
                  ...styles.unifiedSearchInput,
                  borderColor: focusedInput === 'search' ? '#0052D4' : '#e5e7eb',
                  boxShadow: focusedInput === 'search' ? '0 0 0 3px rgba(0, 82, 212, 0.1)' : 'none',
                }}
              />
              {filter && (
                <button
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
        </div>
      )}
      

      {/* Invite User Section - Only for Project Managers/Admins */}
      {canEdit && (
        <div style={styles.inviteSection}>
          <h3 style={styles.inviteTitle}>Invite New User</h3>
          <p style={styles.inviteDescription}>
            Send an email invitation to add a new user to this project.
          </p>
          
          {inviteMessage && (
            <div style={styles.inviteMessage}>
              {inviteMessage}
            </div>
          )}
          
          <div style={styles.inviteForm}>
            <div style={styles.inviteInputGroup}>
              <input
                type="email"
                placeholder="Enter user's email address..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onFocus={() => setFocusedInput('invite')}
                onBlur={() => setFocusedInput(null)}
                style={{
                  ...styles.inviteInput,
                  borderColor: focusedInput === 'invite' ? '#10b981' : '#d1d5db',
                  boxShadow: focusedInput === 'invite' ? '0 0 0 3px rgba(16, 185, 129, 0.1)' : 'none',
                }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={styles.inviteSelect}
              >
                <option value="worker">Worker</option>
                <option value="project_manager">Project Manager</option>
                <option value="admin">Admin</option>
              </select>
              
              {inviteRole === "worker" && (
                <select
                  value={inviteWorkerType}
                  onChange={(e) => setInviteWorkerType(e.target.value)}
                  style={styles.inviteSelect}
                >
                  <option value="crew_member">Crew Member</option>
                  <option value="contractor">Contractor</option>
                </select>
              )}
              
              {inviteRole === "worker" && inviteWorkerType === "contractor" && (
                <input
                  type="date"
                  value={inviteContractorExpiration}
                  onChange={(e) => setInviteContractorExpiration(e.target.value)}
                  style={styles.inviteSelect}
                  required
                  title="Contractor expiration date is required"
                />
              )}
            </div>
            
            <button
              style={{
                ...styles.inviteButton,
                ...(inviteEmail.trim() && !isInviting ? {} : styles.buttonDisabled),
                backgroundColor: hoveredButton === 'invite' && inviteEmail.trim() && !isInviting ? '#059669' : 
                  inviteEmail.trim() && !isInviting ? '#10b981' : '#9ca3af',
              }}
              disabled={!inviteEmail.trim() || isInviting}
              onMouseEnter={() => setHoveredButton('invite')}
              onMouseLeave={() => setHoveredButton(null)}
              onClick={handleInviteUser}
            >
              <FaUserPlus style={styles.inviteIcon} />
              {isInviting ? "Sending..." : "Send Invitation"}
            </button>
          </div>
        </div>
      )}

      {/* Prefer backend-provided team list for PM/Admin; fallback to local crew */}
      {teamMembers.length > 0 ? (
        <>
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: 0, color: "#374151" }}>Project Managers</h3>
            <div style={styles.grid}>
              {teamMembers.filter((m) => m.role === "project_manager").map((m, idx) => (
                <div key={`pm-${idx}`} style={styles.card}>
                  {canEdit && (
                    <button
                      style={styles.removeButton}
                      onClick={() => handleRemoveTeamMember(m.id, true)}
                      title="Remove project manager"
                    >
                      <FaTrash />
                    </button>
                  )}
                  <div style={styles.avatarContainer}>
                    {m.profileImageUrl ? (
                      <img src={m.profileImageUrl} alt={(m.firstName||"User") + " profile"} style={styles.avatarImage} onError={(e) => (e.target.style.display = "none")} />
                    ) : (
                      <div style={styles.avatar}>
                        <FaUser style={styles.avatarIcon} />
                      </div>
                    )}
                  </div>
                  <div style={styles.cardContent}>
                    <h3 style={styles.memberName}>{[m.firstName, m.lastName].filter(Boolean).join(" ") || m.emailAddress || "Project Manager"}</h3>
                    <div style={styles.contactInfo}>
                      <div style={styles.contactItem}>
                        <span style={styles.label}>Email:</span>
                        <span style={styles.value}>{m.emailAddress || "—"}</span>
                      </div>
                      {m.phoneNumber && (
                        <div style={styles.contactItem}>
                          <span style={styles.label}>Phone:</span>
                          <span style={styles.value}>{m.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
            <h3 style={{ margin: 0, color: "#374151" }}>Team Members</h3>
            {loadingTeam && <span style={{ color: "#6b7280", fontStyle: "italic" }}>(loading)</span>}
          </div>
          {teamMembers.filter((m) => m.role !== "project_manager").length === 0 ? (
            <div style={styles.emptyState}>
              <FaUser style={styles.emptyIcon} />
              <p style={styles.emptyText}>No team members yet.</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {teamMembers.filter((m) => m.role !== "project_manager").map((m, idx) => (
                <div key={`mem-${idx}`} style={styles.card}>
                  {canEdit && (
                    <button
                      style={styles.removeButton}
                      onClick={() => handleRemoveTeamMember(m.id, false)}
                      title="Remove member"
                    >
                      <FaTrash />
                    </button>
                  )}
                  <div style={styles.avatarContainer}>
                    {m.profileImageUrl ? (
                      <img src={m.profileImageUrl} alt={(m.firstName||"User") + " profile"} style={styles.avatarImage} onError={(e) => (e.target.style.display = "none")} />
                    ) : (
                      <div style={styles.avatar}>
                        <FaUser style={styles.avatarIcon} />
                      </div>
                    )}
                  </div>
                  <div style={styles.cardContent}>
                    <h3 style={styles.memberName}>{[m.firstName, m.lastName].filter(Boolean).join(" ") || m.emailAddress || "Member"}</h3>
                    <div style={styles.contactInfo}>
                      <div style={styles.contactItem}>
                        <span style={styles.label}>Email:</span>
                        <span style={styles.value}>{m.emailAddress || "—"}</span>
                      </div>
                      {m.phoneNumber && (
                        <div style={styles.contactItem}>
                          <span style={styles.label}>Phone:</span>
                          <span style={styles.value}>{m.phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : crewResolved.length === 0 ? (
        <div style={styles.emptyState}>
          <FaUser style={styles.emptyIcon} />
          <p style={styles.emptyText}>No team members yet.</p>
          {!isEditing && canEdit && (
            <button style={styles.addFirstButton} onClick={() => setIsEditing(true)}>
              Add First Member
            </button>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {crewResolved.map((member, index) => (
            <div key={index} style={styles.card}>
              {isEditing && (
                <button
                  style={styles.removeButton}
                  onClick={() => handleRemoveMember(index)}
                  title="Remove member"
                >
                  <FaTrash />
                </button>
              )}

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
                            <FaUser style={styles.avatarIcon}/>
                        </div>
                    )}
                </div>

                <div style={styles.cardContent}>
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

      {/* Pending Invitations (PM/Admin only) - moved to bottom */}
      {userRole !== "worker" && (
        <div style={{ marginTop: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "0.5rem" }}>
            <h3 style={{ margin: 0, color: "#374151" }}>Pending Invitations</h3>
            {loadingInvites && <span style={{ color: "#6b7280", fontStyle: "italic" }}>(loading)</span>}
          </div>
          {invitations.filter((i) => i.status === "pending").length === 0 ? (
            <div style={styles.emptyState}>
              <FaUser style={styles.emptyIcon} />
              <p style={styles.emptyText}>No pending invitations.</p>
            </div>
          ) : (
            <div style={styles.grid}>
              {invitations
                .filter((i) => i.status === "pending")
                .map((inv, idx) => (
                  <div key={`inv-${idx}`} style={styles.card}>
                    <div style={styles.cardContent}>
                      <h3 style={styles.memberName}>{inv.email}</h3>
                      <div style={styles.contactInfo}>
                        <div style={styles.contactItem}>
                          <span style={styles.label}>Role:</span>
                          <span style={styles.value}>{inv.role || "—"}</span>
                        </div>
                        {inv.workerType && (
                          <div style={styles.contactItem}>
                            <span style={styles.label}>Worker Type:</span>
                            <span style={styles.value}>{inv.workerType}</span>
                          </div>
                        )}
                        <div style={styles.contactItem}>
                          <span style={styles.label}>Expires:</span>
                          <span style={styles.value}>{inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles = {
    container: { maxWidth: "1400px", margin: "0 auto" },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
    },
    title: { fontSize: "1.8rem", fontWeight: "600", color: "#2c3e50", margin: 0 },
    editButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.7rem 1.5rem",
        background: "linear-gradient(135deg, #2373f3 0%, #4facfe 100%)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "background-color 0.2s",
    },
    btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
    editActions: { display: "flex", gap: "0.75rem" },
    saveButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.7rem 1.5rem",
        backgroundColor: "#10b981",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "background-color 0.2s",
    },
    cancelButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.7rem 1.5rem",
        backgroundColor: "#6b7280",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "background-color 0.2s",
    },
    addMemberSection: {
        marginBottom: "2rem",
        padding: "1.5rem",
        backgroundColor: "#f8fafc",
        borderRadius: "12px",
        border: "2px dashed #cbd5e1",
    },
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
        top: "100%",
        left: 0,
        right: 0,
        backgroundColor: "white",
        border: "1px solid #e5e7eb",
        borderRadius: "0 0 8px 8px",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
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
    addButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.8rem 1.5rem",
        background: "linear-gradient(135deg, #2373f3 0%, #4facfe 100%)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "background-color 0.2s",
        whiteSpace: "nowrap",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "1.5rem",
    },
    card: {
        position: "relative",
        backgroundColor: "white",
        padding: "1rem",
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        transition: "transform 0.2s, box-shadow 0.2s",
    },
    removeButton: {
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
    avatarContainer: { display: "flex", justifyContent: "center", marginBottom: "0.75rem" },
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
    avatarIcon: { fontSize: "2rem", color: "#9ca3af" },
    cardContent: { textAlign: "center" },
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
    contactItem: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" },
    label: { fontWeight: "600", color: "#6b7280" },
    value: { color: "#2c3e50" },
    emptyState: {
        textAlign: "center",
        padding: "4rem 2rem",
        backgroundColor: "#f8fafc",
        borderRadius: "12px",
        border: "2px dashed #cbd5e1",
    },
    emptyIcon: { fontSize: "4rem", color: "#cbd5e1", marginBottom: "1rem" },
    emptyText: { fontSize: "1.1rem", color: "#6b7280", marginBottom: "1.5rem" },
    addFirstButton: {
        padding: "0.8rem 1.5rem",
        background: "linear-gradient(135deg, #2373f3 0%, #4facfe 100%)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "background-color 0.2s",
    },
    // Invite section styles
    inviteSection: {
        backgroundColor: "#f8fafc",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "1.5rem",
        marginBottom: "2rem",
    },
    inviteTitle: {
        fontSize: "1.2rem",
        fontWeight: "600",
        color: "#2c3e50",
        margin: "0 0 0.5rem 0",
    },
    inviteDescription: {
        fontSize: "0.9rem",
        color: "#6b7280",
        margin: "0 0 1.5rem 0",
        lineHeight: "1.4",
    },
    inviteForm: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    inviteInputGroup: {
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-end",
        flexWrap: "wrap",
    },
    inviteInput: {
        flex: 1,
        minWidth: "200px",
        padding: "0.75rem 1rem",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "1rem",
        outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
    },
    inviteSelect: {
        padding: "0.75rem 1rem",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "1rem",
        outline: "none",
        backgroundColor: "white",
        cursor: "pointer",
        minWidth: "150px",
    },
    inviteMessage: {
        padding: "0.75rem 1rem",
        borderRadius: "8px",
        fontSize: "0.9rem",
        fontWeight: "500",
        backgroundColor: "#f0f9ff",
        border: "1px solid #0ea5e9",
        color: "#0c4a6e",
    },
    inviteButton: {
        padding: "0.75rem 1.5rem",
        backgroundColor: "#10b981",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "background-color 0.2s",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        alignSelf: "flex-start",
    },
    inviteIcon: {
        fontSize: "0.9rem",
    },
    buttonDisabled: {
        backgroundColor: "#9ca3af",
        cursor: "not-allowed",
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

export default TeamTab;