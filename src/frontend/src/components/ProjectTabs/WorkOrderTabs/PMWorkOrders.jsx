import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaTimes, FaMapMarkerAlt } from "react-icons/fa";
import { workOrdersAPI, usersAPI } from "../../../services/api";
import { useSnackbar } from '../../../contexts/SnackbarContext';

const STATUS_ORDER = ["pending", "in_progress", "on_hold", "completed", "cancelled"];
const STATUS_LABEL = {
  pending: "Pending",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PMWorkOrders = ({ project, onWorkOrderUpdate, onNavigateToSupplies, highlightedWorkOrderId }) => {
  const { showSnackbar } = useSnackbar();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allWorkers, setAllWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showView, setShowView] = useState(false);

  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    address: "",
    address2: "",
    city: "",
    state: "",
    zipCode: "",
    startDate: "",
    endDate: "",
    priority: 3,
    status: "pending",
    estimatedBudget: "",
    selectedWorkers: [],
  });

  // Helper function to format location from address components
  const formatLocation = (address, address2, city, state, zipCode) => {
    const parts = [address, address2, city, state, zipCode].filter(part => part && part.trim());
    return parts.join(', ');
  };

  // Helper function to parse location string into components
  const parseLocation = (locationString) => {
    if (!locationString) return { address: '', address2: '', city: '', state: '', zipCode: '' };
    
    const parts = locationString.split(',').map(part => part.trim());
    
    // Expected format: "123 Main St, Unit 4B, City, State, 12345" or "123 Main St, City, State, 12345"
    if (parts.length >= 5) {
      return {
        address: parts[0] || '',
        address2: parts[1] || '',
        city: parts[2] || '',
        state: parts[3] || '',
        zipCode: parts[4] || ''
      };
    } else if (parts.length >= 4) {
      return {
        address: parts[0] || '',
        address2: '',
        city: parts[1] || '',
        state: parts[2] || '',
        zipCode: parts[3] || ''
      };
    }
    
    return { address: '', address2: '', city: '', state: '', zipCode: '' };
  };

  // Check if project is in a terminal/frozen status
  const isProjectFrozen = () => {
    const terminalStatuses = ['archived', 'cancelled'];
    return terminalStatuses.includes(project.status);
  };

  useEffect(() => {
    fetchWorkOrders();
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

  const fetchWorkers = async () => {
    try {
      setLoadingWorkers(true);
      const workers = await usersAPI.getWorkers();
      setAllWorkers(workers || []);
    } catch (err) {
      console.error("Error fetching workers:", err);
      showSnackbar("Failed to load workers list", "error");
    } finally {
      setLoadingWorkers(false);
    }
  };

  // Filter workers to only show those assigned to the project
  const projectWorkers = useMemo(() => {
    if (!project?.crewMembers || !Array.isArray(project.crewMembers)) {
      return [];
    }
    const crewMemberIds = new Set(project.crewMembers.map(id => String(id)));
    return allWorkers.filter(worker => crewMemberIds.has(String(worker.id)));
  }, [allWorkers, project?.crewMembers]);

  const grouped = useMemo(() => {
    const by = Object.fromEntries(STATUS_ORDER.map((s) => [s, []]));
    for (const wo of workOrders) (by[(wo.status || "pending").toLowerCase()] || by.pending).push(wo);
    for (const s of STATUS_ORDER) {
      by[s].sort((a, b) => {
        const pr = (b.priority ?? 0) - (a.priority ?? 0);
        if (pr !== 0) return pr;
        return String(a.startDate).localeCompare(String(b.startDate));
      });
    }
    return by;
  }, [workOrders]);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const data = await workOrdersAPI.getWorkOrdersByProject(project.id);
      setWorkOrders(data);
    } catch (err) {
      console.error("Error fetching work orders:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    // Check if project is frozen
    if (isProjectFrozen()) {
      showSnackbar('Cannot create work orders on archived or cancelled projects', 'error');
      return;
    }
    
    setFormData({
      name: "",
      description: "",
      address: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      startDate: "",
      endDate: "",
      priority: 3,
      status: "pending",
      estimatedBudget: "",
      selectedWorkers: [],
    });
    setFormErrors({});
    setShowCreate(true);
  };

  const openView = (wo) => {
    setSelectedWorkOrder(wo);
    setShowView(true);
  };

  const openUpdate = (wo) => {
    // Check if project is frozen
    if (isProjectFrozen()) {
      showSnackbar('Cannot update work orders on archived or cancelled projects', 'error');
      return;
    }
    
    const locationParts = parseLocation(wo.location);
    
    setSelectedWorkOrder(wo);
    setFormData({
      name: wo.name || "",
      description: wo.description || "",
      address: locationParts.address,
      address2: locationParts.address2,
      city: locationParts.city,
      state: locationParts.state,
      zipCode: locationParts.zipCode,
      startDate: wo.startDate || "",
      endDate: wo.endDate || "",
      priority: wo.priority || 3,
      status: wo.status || "pending",
      estimatedBudget: wo.estimatedBudget ?? "",
      selectedWorkers: wo.assignedWorkers || [],
    });
    setFormErrors({});
    setShowUpdate(true);
  };

  const validateForm = () => {
    const e = {};
    if (!formData.name?.trim()) e.name = "Name is required";
    if (!formData.startDate) e.startDate = "Start date is required";
    if (!formData.endDate) e.endDate = "End date is required";
    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      e.dateOrder = "End date must be after start date";
    }
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const createWorkOrder = async (ev) => {
    ev.preventDefault();
    
    // Double-check frozen status
    if (isProjectFrozen()) {
      showSnackbar('Cannot create work orders on archived or cancelled projects', 'error');
      return;
    }
    
    if (!validateForm()) return;
    
    try {
      // Format location from address components
      const location = formatLocation(
        formData.address,
        formData.address2,
        formData.city,
        formData.state,
        formData.zipCode
      );

      const payload = {
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        priority: parseInt(formData.priority),
        status: formData.status,
        projectId: project.id,
      };
      if (formData.description?.trim()) payload.description = formData.description;
      if (location && location.trim()) payload.location = location;
      if (formData.estimatedBudget !== "") payload.estimatedBudget = parseFloat(formData.estimatedBudget);

      const newWorkOrder = await workOrdersAPI.createWorkOrder(payload);
      
      // Assign workers if any were selected
      if (formData.selectedWorkers && formData.selectedWorkers.length > 0) {
        await workOrdersAPI.assignWorkers(newWorkOrder.id, formData.selectedWorkers);
      }
      
      await fetchWorkOrders();
      setShowCreate(false);
      showSnackbar('Work order created successfully!', 'success');
    } catch (err) {
      console.error('Error creating work order:', err);
      showSnackbar(err.response?.data?.error || 'Failed to create work order', 'error');
    }
  };

  const handleCancelCreate = () => {
    setShowCreate(false);
    setFormData({
      name: "",
      description: "",
      address: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      startDate: "",
      endDate: "",
      priority: 3,
      status: "pending",
      estimatedBudget: "",
      selectedWorkers: [],
    });
    setFormErrors({});
    showSnackbar('Work order creation cancelled', 'warning');
  };

  const updateWorkOrder = async () => {
    // Double-check frozen status
    if (isProjectFrozen()) {
      showSnackbar('Cannot update work orders on archived or cancelled projects', 'error');
      return;
    }
    
    if (!validateForm()) return;
    
    try {
      // Format location from address components
      const location = formatLocation(
        formData.address,
        formData.address2,
        formData.city,
        formData.state,
        formData.zipCode
      );

      await workOrdersAPI.updateWorkOrder(selectedWorkOrder.id, {
        name: formData.name,
        description: formData.description,
        location: location,
        startDate: formData.startDate,
        endDate: formData.endDate,
        priority: formData.priority,
        status: formData.status,
        estimatedBudget: formData.estimatedBudget === "" ? null : parseFloat(formData.estimatedBudget),
      });
      
      // Update worker assignments only if they've changed
      const originalWorkerIds = new Set(selectedWorkOrder.assignedWorkers || []);
      const newWorkerIds = new Set(formData.selectedWorkers || []);
      const workersChanged = originalWorkerIds.size !== newWorkerIds.size || 
                             [...originalWorkerIds].some(id => !newWorkerIds.has(id));
      
      if (workersChanged) {
        await workOrdersAPI.assignWorkers(selectedWorkOrder.id, formData.selectedWorkers || []);
      }
      
      await fetchWorkOrders();
      setShowUpdate(false);
      showSnackbar('Work order updated successfully!', 'success');
      if (onWorkOrderUpdate) onWorkOrderUpdate();
    } catch (err) {
      console.error('Error updating work order:', err);
      showSnackbar(err.response?.data?.error || 'Failed to update work order', 'error');
    }
  };

  const handleCancelUpdate = () => {
    setShowUpdate(false);
    setFormData({
      name: "",
      description: "",
      address: "",
      address2: "",
      city: "",
      state: "",
      zipCode: "",
      startDate: "",
      endDate: "",
      priority: 3,
      status: "pending",
      estimatedBudget: "",
      selectedWorkers: [],
    });
    setFormErrors({});
  };

  const getWorkerName = (workerId) => {
    const worker = allWorkers.find(w => w.id === workerId);
    if (!worker) return `Worker #${workerId}`;
    return `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.emailAddress || `Worker #${workerId}`;
  };

  const toggleWorkerSelection = (workerId) => {
    setFormData(prev => {
      const current = prev.selectedWorkers || [];
      const isSelected = current.includes(workerId);
      return {
        ...prev,
        selectedWorkers: isSelected
          ? current.filter(id => id !== workerId)
          : [...current, workerId]
      };
    });
  };

  const deleteWorkOrder = async (woId) => {
    // Check if project is frozen
    if (isProjectFrozen()) {
      showSnackbar('Cannot delete work orders on archived or cancelled projects', 'error');
      return;
    }
    
    if (!window.confirm("Delete this work order?")) {
      showSnackbar('Work order deletion cancelled', 'warning');
      return;
    }
    try {
      await workOrdersAPI.deleteWorkOrder(woId);
      await fetchWorkOrders();
      showSnackbar('Work order deleted successfully!', 'success');
      if (onWorkOrderUpdate) onWorkOrderUpdate();
    } catch (err) {
      console.error('Error deleting work order:', err);
      showSnackbar(err.response?.data?.error || 'Failed to delete work order', 'error');
    }
  };

  const formatStatus = (status) => {
    if (!status) return "Pending";
    const statusMap = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'on_hold': 'On Hold',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const getStatusBadge = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending": return { bg: "#fef3c7", text: "#92400e" };
      case "in_progress": return { bg: "#dbeafe", text: "#1e40af" };
      case "completed": return { bg: "#d1fae5", text: "#065f46" };
      case "on_hold": return { bg: "#fee2e2", text: "#991b1b" };
      case "cancelled": return { bg: "#e5e7eb", text: "#374151" };
      default: return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };
  const priorityLabel = (p) => ["", "Very Low", "Low", "Medium", "High", "Critical"][p] || "Medium";

  return (
    <div style={styles.container}>
      {/* Frozen Project Banner */}
      {isProjectFrozen() && (
        <div style={styles.frozenBanner}>
          <span style={styles.frozenIcon}>🔒</span>
          <div style={styles.frozenText}>
            <strong>Project {project.status === 'archived' ? 'Archived' : 'Cancelled'}</strong>
            <p style={styles.frozenSubtext}>
              Work orders are view-only. No work orders can be created, updated, or deleted.
            </p>
          </div>
        </div>
      )}

      <div style={styles.header}>
        <h2 style={styles.title}>Work Orders</h2>
        {!isProjectFrozen() && (
          <button style={styles.createButton} onClick={openCreate}>
            <FaPlus /> Create Work Order
          </button>
        )}
      </div>

      {loading ? (
        <p>Loading work orders...</p>
      ) : (
        <div style={styles.groupWrap}>
          {STATUS_ORDER.map((statusKey) => {
            const list = grouped[statusKey] || [];
            return (
              <div key={statusKey} style={styles.group}>
                <div style={styles.groupHead}>
                  <h3 style={styles.groupTitle}>{STATUS_LABEL[statusKey]}</h3>
                  <span style={styles.groupCount}>{list.length}</span>
                </div>

                <div style={styles.tableContainer}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeader}>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Location</th>
                        <th style={styles.th}>Dates</th>
                        <th style={styles.th}>Priority</th>
                        <th style={styles.th}>Status</th>
                        <th style={styles.th}>Assigned Workers</th>
                        <th style={styles.th}>Est. Budget</th>
                        <th style={styles.th}>Actual Cost</th>
                        <th style={styles.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.length === 0 ? (
                        <tr><td style={styles.td} colSpan={9}>&mdash; No items &mdash;</td></tr>
                      ) : (
                        list.map((wo) => {
                          const badge = getStatusBadge(wo.status);
                          return (
                            <tr key={wo.id} style={styles.tableRow}>
                              <td style={styles.td}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                  <strong>{wo.name}</strong>
                                  {wo.description && <span style={styles.description}>{wo.description}</span>}
                                </div>
                              </td>
                              <td style={styles.td}>{wo.location || "-"}</td>
                              <td style={styles.td}>{wo.startDate} — {wo.endDate}</td>
                              <td style={styles.td}>{priorityLabel(wo.priority)}</td>
                              <td style={styles.td}>
                                <span style={{ ...styles.statusBadge, backgroundColor: badge.bg, color: badge.text }}>
                                  {formatStatus(wo.status)}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {wo.assignedWorkers && wo.assignedWorkers.length > 0 ? (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                                    {wo.assignedWorkers.map(workerId => {
                                      const worker = allWorkers.find(w => w.id === workerId);
                                      const fullName = worker ? `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.emailAddress : `Worker #${workerId}`;
                                      return (
                                        <span key={workerId} style={styles.workerBadge}>
                                          {fullName}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td style={styles.td}>{wo.estimatedBudget != null ? `$${wo.estimatedBudget.toLocaleString()}` : "-"}</td>
                              <td style={styles.td}>{wo.actualCost != null ? `$${wo.actualCost.toLocaleString()}` : "-"}</td>
                              <td style={styles.td}>
                                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                  <button
                                    style={{ ...styles.cardBtn, background: "#5692bc", color: 'white' }}
                                    onClick={() => openView(wo)}
                                    title="View"
                                  >
                                    View
                                  </button>
                                  {!isProjectFrozen() && (
                                    <>
                                      <button
                                        style={{...styles.cardBtn, background: '#b356bc', color: 'white'}}
                                        onClick={() => openUpdate(wo)}
                                        title="Update"
                                      >
                                        Update
                                      </button>
                                      <button
                                        style={{ ...styles.cardBtn, background: "#FF6961", color: "#fff" }}
                                        onClick={() => deleteWorkOrder(wo.id)}
                                        title="Delete"
                                      >
                                        Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal - WITH ADDRESS FIELDS */}
      {showCreate && (
        <div style={styles.overlay} onClick={handleCancelCreate}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create Work Order</h3>
              <button style={styles.closeButton} onClick={handleCancelCreate}><FaTimes /></button>
            </div>
            <form onSubmit={createWorkOrder} style={styles.form}>
              {/* Basic Information Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>Basic Information</h4>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    style={styles.input}
                    placeholder="Enter work order name"
                  />
                  {formErrors.name && <div style={styles.error}>{formErrors.name}</div>}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    style={{ ...styles.input, ...styles.textArea }}
                    placeholder="Add a detailed description"
                  />
                </div>
              </div>

              {/* Location Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>
                  <FaMapMarkerAlt style={styles.sectionIcon} />
                  Location
                </h4>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Street Address</label>
                  <input 
                    type="text" 
                    value={formData.address} 
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    style={styles.input}
                    placeholder="123 Main Street"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Unit/Suite/Apt (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.address2} 
                    onChange={(e) => setFormData({ ...formData, address2: e.target.value })} 
                    style={styles.input}
                    placeholder="Unit 4B, Suite 200, Apt 5, etc."
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>City</label>
                    <input 
                      type="text" 
                      value={formData.city} 
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                      style={styles.input}
                      placeholder="Austin"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>State</label>
                    <input 
                      type="text" 
                      value={formData.state} 
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })} 
                      style={styles.input}
                      placeholder="TX"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>ZIP Code</label>
                    <input 
                      type="text" 
                      value={formData.zipCode} 
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} 
                      style={styles.input}
                      placeholder="78701"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule & Priority Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>Schedule & Priority</h4>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.startDate} 
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
                      style={styles.input}
                    />
                    {formErrors.startDate && <div style={styles.error}>{formErrors.startDate}</div>}
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>End Date *</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.endDate} 
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} 
                      style={styles.input}
                    />
                    {formErrors.endDate && <div style={styles.error}>{formErrors.endDate}</div>}
                    {formErrors.dateOrder && <div style={styles.error}>{formErrors.dateOrder}</div>}
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Priority *</label>
                    <select 
                      value={formData.priority} 
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} 
                      style={styles.select}
                    >
                      <option value="1">Very Low</option>
                      <option value="2">Low</option>
                      <option value="3">Medium</option>
                      <option value="4">High</option>
                      <option value="5">Critical</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status *</label>
                    <select 
                      value={formData.status} 
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                      style={styles.select}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Budget & Workers Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>Budget & Team Assignment</h4>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estimated Budget</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputPrefix}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.estimatedBudget}
                      onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                      style={styles.inputWithPrefix}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Assign Workers</label>
                  {loadingWorkers ? (
                    <div style={{ padding: "0.5rem", color: "#6b7280" }}>Loading workers...</div>
                  ) : (
                    <div style={styles.workerSelectContainer}>
                      {projectWorkers.length === 0 ? (
                        <div style={{ padding: "0.5rem", color: "#6b7280" }}>
                          {project?.crewMembers && project.crewMembers.length === 0 
                            ? "No workers assigned to this project. Please add workers to the project first."
                            : "No workers available"}
                        </div>
                      ) : (
                        projectWorkers.map(worker => {
                          const isSelected = (formData.selectedWorkers || []).includes(worker.id);
                          return (
                            <label key={worker.id} style={styles.workerCheckbox}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleWorkerSelection(worker.id)}
                                style={styles.checkboxInput}
                              />
                              <span>
                                {`${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.emailAddress || `Worker #${worker.id}`}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={handleCancelCreate}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Create Work Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && selectedWorkOrder && (
        <div style={styles.overlay} onClick={() => setShowView(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Work Order Details</h3>
              <button style={styles.closeButton} onClick={() => setShowView(false)}><FaTimes /></button>
            </div>
            <div style={styles.viewBody}>
              <div style={styles.viewRow}><strong>Name:</strong> {selectedWorkOrder.name}</div>
              <div style={styles.viewRow}><strong>Status:</strong> {formatStatus(selectedWorkOrder.status)}</div>
              <div style={styles.viewRow}><strong>Priority:</strong> {priorityLabel(selectedWorkOrder.priority)}</div>
              <div style={styles.viewRow}><strong>Location:</strong> {selectedWorkOrder.location || "-"}</div>
              <div style={styles.viewRow}><strong>Dates:</strong> {selectedWorkOrder.startDate} — {selectedWorkOrder.endDate}</div>
              {selectedWorkOrder.description && <div style={styles.viewRow}><strong>Description:</strong><br />{selectedWorkOrder.description}</div>}
              <div style={styles.viewRow}>
                <strong>Assigned Workers:</strong>{" "}
                {selectedWorkOrder.assignedWorkers && selectedWorkOrder.assignedWorkers.length > 0 ? (
                  <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {selectedWorkOrder.assignedWorkers.map(workerId => {
                      const worker = allWorkers.find(w => w.id === workerId);
                      return (
                        <span key={workerId} style={styles.workerBadge}>
                          {worker ? `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.emailAddress : `Worker #${workerId}`}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  "None"
                )}
              </div>
              <div style={styles.viewRow}><strong>Estimated Budget:</strong> {selectedWorkOrder.estimatedBudget != null ? `$${selectedWorkOrder.estimatedBudget.toLocaleString()}` : "-"}</div>
              <div style={styles.viewRow}><strong>Actual Cost:</strong> {selectedWorkOrder.actualCost != null ? `$${selectedWorkOrder.actualCost.toLocaleString()}` : "-"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal - WITH ADDRESS FIELDS */}
      {showUpdate && (
        <div style={styles.overlay} onClick={handleCancelUpdate}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Update Work Order</h3>
              <button style={styles.closeButton} onClick={handleCancelUpdate}><FaTimes /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateWorkOrder();
              }}
              style={styles.form}
            >
              {/* Basic Information Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>Basic Information</h4>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Name *</label>
                  <input 
                    type="text" 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    style={styles.input}
                    placeholder="Enter work order name"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description</label>
                  <textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    style={{ ...styles.input, ...styles.textArea }}
                    placeholder="Add a detailed description"
                  />
                </div>
              </div>

              {/* Location Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>
                  <FaMapMarkerAlt style={styles.sectionIcon} />
                  Location
                </h4>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Street Address</label>
                  <input 
                    type="text" 
                    value={formData.address} 
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                    style={styles.input}
                    placeholder="123 Main Street"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Unit/Suite/Apt (Optional)</label>
                  <input 
                    type="text" 
                    value={formData.address2} 
                    onChange={(e) => setFormData({ ...formData, address2: e.target.value })} 
                    style={styles.input}
                    placeholder="Unit 4B, Suite 200, Apt 5, etc."
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>City</label>
                    <input 
                      type="text" 
                      value={formData.city} 
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })} 
                      style={styles.input}
                      placeholder="Austin"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>State</label>
                    <input 
                      type="text" 
                      value={formData.state} 
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })} 
                      style={styles.input}
                      placeholder="TX"
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>ZIP Code</label>
                    <input 
                      type="text" 
                      value={formData.zipCode} 
                      onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} 
                      style={styles.input}
                      placeholder="78701"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule & Priority Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>Schedule & Priority</h4>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Start Date *</label>
                    <input 
                      type="date" 
                      value={formData.startDate} 
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} 
                      style={styles.input}
                    />
                    {formErrors.startDate && <div style={styles.error}>{formErrors.startDate}</div>}
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>End Date *</label>
                    <input 
                      type="date" 
                      value={formData.endDate} 
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} 
                      style={styles.input}
                    />
                    {formErrors.endDate && <div style={styles.error}>{formErrors.endDate}</div>}
                    {formErrors.dateOrder && <div style={styles.error}>{formErrors.dateOrder}</div>}
                  </div>
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Priority *</label>
                    <select 
                      value={formData.priority} 
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} 
                      style={styles.select}
                    >
                      <option value="1">Very Low</option>
                      <option value="2">Low</option>
                      <option value="3">Medium</option>
                      <option value="4">High</option>
                      <option value="5">Critical</option>
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status *</label>
                    <select 
                      value={formData.status} 
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                      style={styles.select}
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="on_hold">On Hold</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Budget & Workers Section */}
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>Budget & Team Assignment</h4>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estimated Budget</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputPrefix}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.estimatedBudget}
                      onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                      style={styles.inputWithPrefix}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Assign Workers</label>
                  {loadingWorkers ? (
                    <div style={{ padding: "0.5rem", color: "#6b7280" }}>Loading workers...</div>
                  ) : (
                    <div style={styles.workerSelectContainer}>
                      {projectWorkers.length === 0 ? (
                        <div style={{ padding: "0.5rem", color: "#6b7280" }}>
                          {project?.crewMembers && project.crewMembers.length === 0 
                            ? "No workers assigned to this project. Please add workers to the project first."
                            : "No workers available"}
                        </div>
                      ) : (
                        projectWorkers.map(worker => {
                          const isSelected = (formData.selectedWorkers || []).includes(worker.id);
                          return (
                            <label key={worker.id} style={styles.workerCheckbox}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleWorkerSelection(worker.id)}
                                style={styles.checkboxInput}
                              />
                              <span>
                                {`${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.emailAddress || `Worker #${worker.id}`}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={handleCancelUpdate}>Close</button>
                {onNavigateToSupplies && selectedWorkOrder && (
                  <button 
                    type="button" 
                    style={{...styles.submitBtn, backgroundColor: "#5692bc"}}
                    onClick={() => {
                      onNavigateToSupplies(selectedWorkOrder.id);
                      setShowUpdate(false);
                    }}
                  >
                    View Supplies
                  </button>
                )}
                <button type="submit" style={{...styles.submitBtn, backgroundColor: "#10b981"}}>Update Work Order</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { maxWidth: "1400px", margin: "0 auto" },
  frozenBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1.25rem',
    backgroundColor: '#fef3c7',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    marginBottom: '1.5rem',
  },
  frozenIcon: {
    fontSize: '1.5rem',
  },
  frozenText: {
    flex: 1,
  },
  frozenSubtext: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.875rem',
    color: '#92400e',
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" },
  title: { fontSize: "1.8rem", fontWeight: "600", color: "#2c3e50", margin: 0 },
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.7rem 1.5rem',
    background: '#5692bc',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  groupWrap: { display: "grid", gap: "1.25rem" },
  group: { background: "#ffffff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" },
  groupHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.9rem 1rem", borderBottom: "1px solid #e5e7eb" },
  groupTitle: { margin: 0, fontSize: "1.1rem", color: "#374151" },
  groupCount: { fontWeight: 700, fontSize: "0.8rem", background: "#f1f5f9", borderRadius: "9999px", padding: "0.15rem 0.5rem" },

  tableContainer: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  tableHeader: { backgroundColor: "#f8fafc" },
  th: { padding: "0.9rem", textAlign: "left", fontWeight: "600", color: "#4b5563", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "2px solid #e5e7eb" },
  tableRow: { borderBottom: "1px solid #f3f4f6" },
  td: { padding: "0.9rem", color: "#374151", verticalAlign: "top" },
  description: { fontSize: "0.875rem", color: "#6b7280" },
  statusBadge: { display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", textTransform: "capitalize", textAlign: "center" },
  cardBtn: {padding: "0.35rem 0.6rem", background: "#dbeafe", color: "#111827", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" },
  
  // Modals
  overlay: { 
    position: "fixed", 
    inset: 0, 
    backgroundColor: "rgba(0, 0, 0, 0.6)", 
    backdropFilter: "blur(4px)", 
    display: "flex", 
    alignItems: "center", 
    justifyContent: "center", 
    zIndex: 1000, 
    padding: "1rem" 
  },
  modal: { 
    backgroundColor: "white", 
    borderRadius: "16px", 
    width: "90%", 
    maxWidth: "700px", 
    maxHeight: "90vh", 
    overflow: "hidden",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    display: "flex",
    flexDirection: "column"
  },
  modalHeader: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: "1.75rem 2rem", 
    borderBottom: "1px solid #e5e7eb",
    backgroundColor: "#fafbfc",
    flexShrink: 0
  },
  modalTitle: { 
    fontSize: "1.5rem", 
    fontWeight: "700", 
    color: "#1f2937", 
    margin: 0,
    letterSpacing: "-0.02em"
  },
  closeButton: { 
    background: "none", 
    border: "none", 
    fontSize: "1.5rem", 
    color: "#6b7280", 
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "8px",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  form: { 
    padding: "2rem",
    overflowY: "auto",
    flex: 1
  },
  formSection: {
    marginBottom: "2rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid #f3f4f6",
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: "600",
    color: "#374151",
    marginBottom: "1rem",
    marginTop: 0,
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  sectionIcon: {
    fontSize: "1rem",
    color: "#5692bc",
  },
  formGroup: { 
    marginBottom: "1.25rem", 
    flex: 1 
  },
  formRow: { 
    display: "flex", 
    gap: "1rem",
    marginBottom: "0"
  },
  label: { 
    display: "block", 
    marginBottom: "0.5rem", 
    fontWeight: "600", 
    color: "#374151", 
    fontSize: "0.875rem",
    letterSpacing: "0.01em"
  },
  input: { 
    width: "100%", 
    padding: "0.75rem 1rem", 
    border: "1.5px solid #e5e7eb", 
    borderRadius: "8px", 
    fontSize: "0.95rem", 
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    fontFamily: "inherit",
    boxSizing: "border-box"
  },
  select: {
    width: "100%",
    padding: "0.75rem 1rem",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "0.95rem",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    fontFamily: "inherit",
    cursor: "pointer",
    boxSizing: "border-box"
  },
  textArea: { 
    minHeight: "100px", 
    resize: "vertical",
    lineHeight: "1.5",
    fontFamily: "inherit"
  },
  inputWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center"
  },
  inputPrefix: {
    position: "absolute",
    left: "1rem",
    color: "#6b7280",
    fontSize: "0.95rem",
    fontWeight: "500",
    pointerEvents: "none",
    zIndex: 1
  },
  inputWithPrefix: {
    width: "100%",
    padding: "0.75rem 1rem 0.75rem 2rem",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "0.95rem",
    outline: "none",
    transition: "all 0.2s",
    backgroundColor: "#ffffff",
    color: "#1f2937",
    fontFamily: "inherit",
    boxSizing: "border-box"
  },
  actions: { 
    display: "flex", 
    gap: "1rem", 
    justifyContent: "flex-end", 
    marginTop: "1.5rem",
    paddingTop: "1.5rem",
    borderTop: "1px solid #f3f4f6"
  },
  cancelBtn: {
    padding: '0.875rem 1.75rem',
    backgroundColor: 'white',
    color: '#bc8056',
    border: '2px solid #bc8056',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '0.01em',
  },
  submitBtn: {
    padding: '0.875rem 1.75rem',
    background: '#5692bc',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    letterSpacing: '0.01em',
    boxShadow: '0 4px 6px -1px rgba(35, 115, 243, 0.2), 0 2px 4px -1px rgba(35, 115, 243, 0.1)',
  },
  viewBody: { 
    padding: "2rem", 
    display: "grid", 
    gap: "1rem",
    overflowY: "auto",
    flex: 1
  },
  viewRow: { 
    lineHeight: 1.6,
    padding: "0.75rem",
    backgroundColor: "#f8fafc",
    borderRadius: "8px"
  },
  error: { 
    marginTop: "0.5rem", 
    color: "#dc2626", 
    fontSize: "0.875rem", 
    fontWeight: "600"
  },
  workerSelectContainer: {
    maxHeight: "200px",
    overflowY: "auto",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    padding: "0.75rem",
    backgroundColor: "#ffffff",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem"
  },
  workerCheckbox: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
    padding: "0.5rem",
    borderRadius: "6px",
    transition: "background-color 0.2s",
    fontSize: "0.95rem",
    color: "#374151"
  },
  checkboxInput: {
    width: "18px",
    height: "18px",
    cursor: "pointer",
    accentColor: "#5692bc"
  },
  workerBadge: {
    display: "inline-block",
    padding: "0.35rem 0.75rem",
    backgroundColor: "#dbeafe",
    color: "#1e40af",
    borderRadius: "9999px",
    fontSize: "0.8rem",
    fontWeight: "600"
  },
};

export default PMWorkOrders;