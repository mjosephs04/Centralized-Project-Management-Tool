import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaTimes } from "react-icons/fa";
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

const PMWorkOrders = ({ project, onWorkOrderUpdate }) => {
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
    location: "",
    startDate: "",
    endDate: "",
    priority: 3,
    status: "pending",
    estimatedBudget: "",
    selectedWorkers: [],
  });

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
    setFormData({
      name: "",
      description: "",
      location: "",
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
    setSelectedWorkOrder(wo);
    setFormData({
      name: wo.name || "",
      description: wo.description || "",
      location: wo.location || "",
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
    if (!validateForm()) return;
    try {
      const payload = {
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        priority: parseInt(formData.priority),
        status: formData.status,
        projectId: project.id,
      };
      if (formData.description?.trim()) payload.description = formData.description;
      if (formData.location?.trim()) payload.location = formData.location;
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
      location: "",
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
    if (!validateForm()) return;
    try {
      // PMs: can update est. budget (not actual cost)
      await workOrdersAPI.updateWorkOrder(selectedWorkOrder.id, {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        startDate: formData.startDate,
        endDate: formData.endDate,
        priority: formData.priority,
        status: formData.status,
        estimatedBudget: formData.estimatedBudget === "" ? null : parseFloat(formData.estimatedBudget),
      });
      
      // Update worker assignments
      if (formData.selectedWorkers) {
        await workOrdersAPI.assignWorkers(selectedWorkOrder.id, formData.selectedWorkers);
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
      location: "",
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
      <div style={styles.header}>
        <h2 style={styles.title}>Work Orders</h2>
        <button style={styles.createButton} onClick={openCreate}><FaPlus /> Create Work Order</button>
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
                                  {wo.status}
                                </span>
                              </td>
                              <td style={styles.td}>
                                {wo.assignedWorkers && wo.assignedWorkers.length > 0 ? (
                                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                                    {wo.assignedWorkers.slice(0, 2).map(workerId => {
                                      const worker = allWorkers.find(w => w.id === workerId);
                                      const fullName = worker ? `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.emailAddress : `Worker #${workerId}`;
                                      return (
                                        <span key={workerId} style={styles.workerBadge}>
                                          {fullName}
                                        </span>
                                      );
                                    })}
                                    {wo.assignedWorkers.length > 2 && (
                                      <span style={styles.workerBadge}>+{wo.assignedWorkers.length - 2}</span>
                                    )}
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
                                    style={{ ...styles.cardBtn, background: "#e5e7eb" }}
                                    onClick={() => openView(wo)}
                                    title="View"
                                  >
                                    View
                                  </button>
                                  <button
                                    style={styles.cardBtn}
                                    onClick={() => openUpdate(wo)}
                                    title="Update"
                                  >
                                    Update
                                  </button>
                                  <button
                                    style={{ ...styles.cardBtn, background: "#ef4444", color: "#fff" }}
                                    onClick={() => deleteWorkOrder(wo.id)}
                                    title="Delete"
                                  >
                                    Delete
                                  </button>
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

      {/* Create (PM) */}
      {showCreate && (
        <div style={styles.overlay} onClick={handleCancelCreate}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create Work Order</h3>
              <button style={styles.closeButton} onClick={handleCancelCreate}><FaTimes /></button>
            </div>
            <form onSubmit={createWorkOrder} style={styles.form}>
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

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Location</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    style={styles.input}
                    placeholder="Work location"
                  />
                </div>
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
              </div>

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
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Assign Workers</label>
                {loadingWorkers ? (
                  <div style={{ padding: "0.5rem", color: "#6b7280" }}>Loading workers...</div>
                ) : (
                  <div style={styles.workerSelectContainer}>
                    {allWorkers.length === 0 ? (
                      <div style={{ padding: "0.5rem", color: "#6b7280" }}>No workers available</div>
                    ) : (
                      allWorkers.map(worker => {
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
                {(formData.selectedWorkers || []).length > 0 && (
                  <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {formData.selectedWorkers.map(workerId => {
                      const worker = allWorkers.find(w => w.id === workerId);
                      return (
                        <span key={workerId} style={styles.workerBadge}>
                          {worker ? `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.emailAddress : `Worker #${workerId}`}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={handleCancelCreate}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Create Work Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View (PM sees both Est. Budget & Actual Cost) */}
      {showView && selectedWorkOrder && (
        <div style={styles.overlay} onClick={() => setShowView(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Work Order Details</h3>
              <button style={styles.closeButton} onClick={() => setShowView(false)}><FaTimes /></button>
            </div>
            <div style={styles.viewBody}>
              <div style={styles.viewRow}><strong>Name:</strong> {selectedWorkOrder.name}</div>
              <div style={styles.viewRow}><strong>Status:</strong> {selectedWorkOrder.status}</div>
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

      {/* Update (PM edits only Estimated Budget; can still change Status via dropdown) */}
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

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Location</label>
                  <input 
                    type="text" 
                    value={formData.location} 
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
                    style={styles.input}
                    placeholder="Work location"
                  />
                </div>
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
              </div>

              <div style={styles.formRow}>
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
              </div>

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

              <div style={styles.formGroup}>
                <label style={styles.label}>Assign Workers</label>
                {loadingWorkers ? (
                  <div style={{ padding: "0.5rem", color: "#6b7280" }}>Loading workers...</div>
                ) : (
                  <div style={styles.workerSelectContainer}>
                    {allWorkers.length === 0 ? (
                      <div style={{ padding: "0.5rem", color: "#6b7280" }}>No workers available</div>
                    ) : (
                      allWorkers.map(worker => {
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
                {(formData.selectedWorkers || []).length > 0 && (
                  <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {formData.selectedWorkers.map(workerId => {
                      const worker = allWorkers.find(w => w.id === workerId);
                      return (
                        <span key={workerId} style={styles.workerBadge}>
                          {worker ? `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.emailAddress : `Worker #${workerId}`}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={handleCancelUpdate}>Close</button>
                <button type="submit" style={styles.submitBtn}>Update Work Order</button>
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
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" },
  title: { fontSize: "1.8rem", fontWeight: "600", color: "#2c3e50", margin: 0 },
  createButton: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.7rem 1.5rem", backgroundColor: "#0052D4", color: "white", border: "none", borderRadius: "8px", fontSize: "0.95rem", fontWeight: "600", cursor: "pointer" },

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
  statusBadge: { display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600", textTransform: "capitalize" },
  cardBtn: {padding: "0.35rem 0.6rem", background: "#dbeafe", color: "#111827", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" },
  
  // Modals - Enhanced styling to match CalendarTab
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
    maxWidth: "650px", 
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
  formGroup: { 
    marginBottom: "1.5rem", 
    flex: 1 
  },
  formRow: { 
    display: "flex", 
    gap: "1.25rem",
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
    padding: "0.875rem 1rem", 
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
    padding: "0.875rem 1rem",
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
    minHeight: "120px", 
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
    padding: "0.875rem 1rem 0.875rem 2rem",
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
    marginTop: "2rem",
    paddingTop: "1.5rem",
    borderTop: "1px solid #f3f4f6"
  },
  cancelBtn: { 
    padding: "0.875rem 1.75rem", 
    backgroundColor: "#f3f4f6", 
    color: "#4b5563", 
    border: "none", 
    borderRadius: "8px", 
    fontWeight: "600", 
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: "0.01em"
  },
  submitBtn: { 
    padding: "0.875rem 1.75rem", 
    backgroundColor: "#0052D4", 
    color: "white", 
    border: "none", 
    borderRadius: "8px", 
    fontWeight: "600", 
    cursor: "pointer",
    transition: "all 0.2s",
    letterSpacing: "0.01em",
    boxShadow: "0 4px 6px -1px rgba(0, 82, 212, 0.2), 0 2px 4px -1px rgba(0, 82, 212, 0.1)"
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
    accentColor: "#0052D4"
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