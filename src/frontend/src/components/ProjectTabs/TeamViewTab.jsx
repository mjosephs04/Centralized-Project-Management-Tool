import React, { useEffect, useMemo, useState } from "react";
import { FaUser } from "react-icons/fa";
import { usersAPI, projectsAPI } from "../../services/api";

const TeamViewTab = ({ project }) => {
  const [allWorkers, setAllWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  // Load workers data
  useEffect(() => {
    const loadWorkers = async () => {
      try {
        setLoadingWorkers(true);
        const users = await usersAPI.getWorkers();
        setAllWorkers(users || []);
      } catch (e) {
        console.error("Failed to load workers", e);
      } finally {
        setLoadingWorkers(false);
      }
    };
    loadWorkers();
  }, []);

  // Load full team list (project managers + members) for worker view
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
    fetchTeam();
  }, [project?.id]);

  // Helper functions
  const getName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(" ").trim();
  const getEmail = (u) => u?.email ?? u?.emailAddress ?? "";
  const getPhone = (u) => u?.phoneNumber ?? u?.phone ?? "";
  const findWorkerById = (id) => allWorkers.find((w) => String(w.id) === String(id));
  const hasValidProfileImage = (url) => {
    // Return false for null, undefined, empty string, or non-string values
    if (!url || typeof url !== 'string' || url.trim() === '') return false;
    // Check if it's the malformed default URL (has duplicate storage.googleapis.com)
    if (url.includes('https://storage.googleapis.com/https://storage.googleapis.com')) return false;
    // Check if it's just whitespace or invalid URL pattern
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    return true;
  };

  // Get project managers from team members
  const projectManagers = useMemo(() => {
    if (teamMembers.length > 0) {
      return teamMembers.filter((m) => m.role === "project_manager");
    }
    // Fallback to single project manager if team members not loaded yet
    const pm = project?.projectManager;
    if (pm) {
      return [{
        id: pm.id,
        firstName: pm.firstName,
        lastName: pm.lastName,
        emailAddress: pm.emailAddress || pm.email,
        phoneNumber: pm.phoneNumber || pm.phone,
        profileImageUrl: pm.profileImageUrl || "",
        role: "project_manager"
      }];
    }
    return [];
  }, [teamMembers, project?.projectManager]);

  // Get crew members info
  const crewMembers = useMemo(() => {
    if (!project?.crewMembers || !Array.isArray(project.crewMembers)) {
      return [];
    }
    
    return project.crewMembers.map((memberId) => {
      const worker = findWorkerById(memberId);
      if (worker) {
        return {
          id: worker.id,
          name: getName(worker),
          email: getEmail(worker),
          phoneNumber: getPhone(worker),
          profileImageUrl: worker.profileImageUrl || "",
          role: "Worker"
        };
      }
      return {
        id: memberId,
        name: `Worker #${memberId}`,
        email: "",
        phoneNumber: "",
        profileImageUrl: "",
        role: "Worker"
      };
    });
  }, [project?.crewMembers, allWorkers]);

  if (loadingWorkers) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <p>Loading team information...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Project Team</h2>
      </div>

      {/* Project Managers Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Project Managers</h3>
        {loadingTeam ? (
          <p style={styles.noData}>Loading project managers...</p>
        ) : projectManagers.length === 0 ? (
          <p style={styles.noData}>No project managers assigned</p>
        ) : (
          <div style={styles.grid}>
            {projectManagers.map((pm, idx) => (
              <div key={pm.id || idx} style={styles.card}>
                <div style={styles.avatarContainer}>
                  {hasValidProfileImage(pm.profileImageUrl) ? (
                    <img
                      src={pm.profileImageUrl}
                      alt={`${getName(pm) || "Project Manager"} profile`}
                      style={styles.avatarImage}
                      onError={(e) => {
                        e.target.style.display = "none";
                        const fallback = e.target.nextSibling;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div style={{ ...styles.avatar, display: hasValidProfileImage(pm.profileImageUrl) ? "none" : "flex" }}>
                    <FaUser style={styles.avatarIcon} />
                  </div>
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.memberName}>{getName(pm) || "Project Manager"}</h3>
                  <div style={styles.contactInfo}>
                    <div style={styles.contactItem}>
                      <span style={styles.label}>Email:</span>
                      <span style={styles.value}>{getEmail(pm) || "—"}</span>
                    </div>
                    <div style={styles.contactItem}>
                      <span style={styles.label}>Phone:</span>
                      <span style={styles.value}>{getPhone(pm) || "—"}</span>
                    </div>
                    <div style={styles.contactItem}>
                      <span style={styles.label}>Role:</span>
                      <span style={styles.value}>Project Manager</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Members Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Team Members</h3>
        {crewMembers.length === 0 ? (
          <div style={styles.emptyState}>
            <FaUser style={styles.emptyIcon} />
            <p style={styles.emptyText}>No team members assigned yet.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {crewMembers.map((member, index) => (
              <div key={member.id || index} style={styles.card}>
                <div style={styles.avatarContainer}>
                  {hasValidProfileImage(member.profileImageUrl) ? (
                    <img
                      src={member.profileImageUrl}
                      alt={`${member.name || "Worker"} profile`}
                      style={styles.avatarImage}
                      onError={(e) => {
                        e.target.style.display = "none";
                        const fallback = e.target.nextSibling;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div style={{ ...styles.avatar, display: hasValidProfileImage(member.profileImageUrl) ? "none" : "flex" }}>
                    <FaUser style={styles.avatarIcon} />
                  </div>
                </div>
                <div style={styles.cardContent}>
                  <h3 style={styles.memberName}>{member.name || "Team Member"}</h3>
                  <div style={styles.contactInfo}>
                    <div style={styles.contactItem}>
                      <span style={styles.label}>Email:</span>
                      <span style={styles.value}>{member.email || "—"}</span>
                    </div>
                    <div style={styles.contactItem}>
                      <span style={styles.label}>Phone:</span>
                      <span style={styles.value}>{member.phoneNumber || "—"}</span>
                    </div>
                    <div style={styles.contactItem}>
                      <span style={styles.label}>Role:</span>
                      <span style={styles.value}>Worker</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "1rem",
  },
  header: {
    marginBottom: "2rem",
  },
  title: {
    fontSize: "1.8rem",
    fontWeight: "600",
    color: "#2c3e50",
    margin: 0,
  },
  section: {
    marginBottom: "3rem",
  },
  sectionTitle: {
    fontSize: "1.3rem",
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: "1rem",
    borderBottom: "2px solid #e5e7eb",
    paddingBottom: "0.5rem",
  },
  loadingContainer: {
    textAlign: "center",
    padding: "4rem 2rem",
    color: "#6b7280",
  },
  noData: {
    textAlign: "center",
    padding: "2rem",
    color: "#6b7280",
    fontStyle: "italic",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    backgroundColor: "white",
    padding: "1rem",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    transition: "transform 0.2s, box-shadow 0.2s",
  },
  avatarContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "0.75rem",
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
    color: "#9ca3af",
  },
  cardContent: {
    textAlign: "center",
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
    fontSize: "0.85rem",
  },
  label: {
    fontWeight: "600",
    color: "#6b7280",
  },
  value: {
    color: "#2c3e50",
  },
  emptyState: {
    textAlign: "center",
    padding: "4rem 2rem",
    backgroundColor: "#f8fafc",
    borderRadius: "12px",
    border: "2px dashed #cbd5e1",
  },
  emptyIcon: {
    fontSize: "4rem",
    color: "#cbd5e1",
    marginBottom: "1rem",
  },
  emptyText: {
    fontSize: "1.1rem",
    color: "#6b7280",
    marginBottom: "1.5rem",
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

export default TeamViewTab;
