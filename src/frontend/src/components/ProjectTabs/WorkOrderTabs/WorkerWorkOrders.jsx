import React, { useEffect, useMemo, useState } from "react";
import { FaEye, FaTimes } from "react-icons/fa";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { workOrdersAPI, usersAPI } from "../../../services/api";
import { useSnackbar } from '../../../contexts/SnackbarContext';

const COLUMNS = [
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "on_hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const WorkerWorkOrders = ({ project, onWorkOrderUpdate, onNavigateToSupplies, highlightedWorkOrderId }) => {
  const { showSnackbar } = useSnackbar();
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allWorkers, setAllWorkers] = useState([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);

  // Modals
  const [showUpdate, setShowUpdate] = useState(false);
  const [showView, setShowView] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    startDate: "",
    endDate: "",
    priority: 3,
    status: "pending",
    actualCost: "",
  });

  const columns = useMemo(() => {
    const byCol = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
    for (const wo of workOrders) {
      const k = (wo.status || "pending").toLowerCase();
      (byCol[k] ?? byCol["pending"]).push(wo);
    }
    for (const k of Object.keys(byCol)) {
      byCol[k].sort((a, b) => {
        const pr = (b.priority ?? 0) - (a.priority ?? 0);
        if (pr !== 0) return pr;
        return String(a.startDate).localeCompare(String(b.startDate));
      });
    }
    return byCol;
  }, [workOrders]);

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
    } finally {
      setLoadingWorkers(false);
    }
  };

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const data = await workOrdersAPI.getWorkOrdersByProject(project.id);
      setWorkOrders(data);
    } catch (err) {
      console.error("Error fetching work orders:", err);
      showSnackbar("Failed to load work orders", "error");
    } finally {
      setLoading(false);
    }
  };

  const openUpdateModal = (wo) => {
    setSelectedWorkOrder(wo);
    setFormData({
      name: wo.name || "",
      description: wo.description || "",
      location: wo.location || "",
      startDate: wo.startDate || "",
      endDate: wo.endDate || "",
      priority: wo.priority || 3,
      status: wo.status || "pending",
      actualCost: wo.actualCost ?? "",
    });
    setFormErrors({});
    setShowUpdate(true);
  };

  const openViewModal = (wo) => {
    setSelectedWorkOrder(wo);
    setShowView(true);
  };

  const validateForm = () => {
    const errors = {};
    // Workers can only update actualCost and status, no validation needed
    setFormErrors(errors);
    return true;
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
      actualCost: "",
    });
    setFormErrors({});
  };

  // Drag & Drop: workers can move cards to change status
  const onDragEnd = async (result) => {
    const { destination, source } = result;
    if (!destination) return;
    const fromCol = source.droppableId;
    const toCol = destination.droppableId;
    if (fromCol === toCol && source.index === destination.index) return;
    const moved = columns[fromCol][source.index];
    if (!moved) return;

    // Get readable status names
    const fromLabel = COLUMNS.find(c => c.key === fromCol)?.label || fromCol;
    const toLabel = COLUMNS.find(c => c.key === toCol)?.label || toCol;

    // optimistic UI
    setWorkOrders((prev) => prev.map((wo) => (wo.id === moved.id ? { ...wo, status: toCol } : wo)));
    
    try {
        await workOrdersAPI.workerUpdate(moved.id, { status: toCol });
        showSnackbar(`Work order moved to ${toLabel}`, 'success');
        if (onWorkOrderUpdate) onWorkOrderUpdate();
    } catch (err) {
      console.error('Error updating work order status:', err);
      showSnackbar(err.response?.data?.error || 'Failed to update work order status', 'error');
      await fetchWorkOrders(); // revert on error
    }
  };

  const handleUpdate = async () => {
    if (!validateForm()) return;
    try {
      await workOrdersAPI.workerUpdate(selectedWorkOrder.id, {
        status: formData.status,
        actualCost: formData.actualCost === "" ? null : parseFloat(formData.actualCost),
      });
      await fetchWorkOrders();
      setShowUpdate(false);
      showSnackbar('Work order updated successfully!', 'success');
      if (onWorkOrderUpdate) onWorkOrderUpdate();
    } catch (err) {
      console.error('Error updating work order:', err);
      showSnackbar(err.response?.data?.error || 'Failed to update work order', 'error');
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

  const getStatusColor = (status) => {
    switch ((status || "").toLowerCase()) {
      case "pending": return { bg: "#fef3c7", text: "#92400e" };
      case "in_progress": return { bg: "#dbeafe", text: "#1e40af" };
      case "completed": return { bg: "#d1fae5", text: "#065f46" };
      case "on_hold": return { bg: "#fee2e2", text: "#991b1b" };
      case "cancelled": return { bg: "#e5e7eb", text: "#374151" };
      default: return { bg: "#f3f4f6", text: "#6b7280" };
    }
  };
  const getPriorityLabel = (p) => ["", "Very Low", "Low", "Medium", "High", "Critical"][p] || "Medium";
  const getPriorityColor = (p) => (p >= 4 ? "#ef4444" : p === 3 ? "#f59e0b" : "#10b981");

  const getWorkerName = (workerId) => {
    const worker = allWorkers.find(w => w.id === workerId);
    if (!worker) return `Worker #${workerId}`;
    return `${worker.firstName || ''} ${worker.lastName || ''}`.trim() || worker.emailAddress || `Worker #${workerId}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Work Orders</h2>
        {/* Workers have no Create/Delete; view & update only */}
      </div>

      {loading ? (
        <p>Loading work orders...</p>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div style={styles.board}>
            {COLUMNS.map((col) => {
              const items = columns[col.key] || [];
              return (
                <div key={col.key} style={styles.column}>
                  <div style={styles.columnHeader}>
                    <span style={styles.columnTitle}>{col.label}</span>
                    <span style={styles.columnCount}>{items.length}</span>
                  </div>
                  <Droppable droppableId={col.key}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        style={{
                          ...styles.droppable,
                          backgroundColor: snapshot.isDraggingOver ? "#eef2ff" : "#f8fafc",
                        }}
                      >
                        {items.length === 0 ? (
                          <div style={styles.emptyLane}>Drop items here</div>
                        ) : (
                          items.map((wo, index) => {
                            const statusStyle = getStatusColor(wo.status);
                            return (
                              <Draggable key={String(wo.id)} draggableId={String(wo.id)} index={index}>
                                {(dragProvided, dragSnapshot) => (
                                  <div
                                    ref={dragProvided.innerRef}
                                    {...dragProvided.draggableProps}
                                    {...dragProvided.dragHandleProps}
                                    style={{
                                      ...styles.card,
                                      ...(dragSnapshot.isDragging ? styles.cardDragging : {}),
                                      ...dragProvided.draggableProps.style,
                                    }}
                                  >
                                    <div style={styles.cardTop}>
                                      <strong style={styles.cardTitle}>{wo.name}</strong>
                                      <span style={{
                                        ...styles.statusBadge,
                                        backgroundColor: statusStyle.bg,
                                        color: statusStyle.text,
                                      }}>
                                        {formatStatus(wo.status)}
                                      </span>
                                    </div>

                                    {wo.description && <div style={styles.cardDesc}>{wo.description}</div>}

                                    <div style={styles.cardMeta}>
                                      <span style={{ color: getPriorityColor(wo.priority), fontWeight: 700 }}>
                                        {getPriorityLabel(wo.priority)}
                                      </span>
                                      <span style={styles.metaDot}>•</span>
                                      <span style={styles.metaClamp}>
                                        <span style={styles.smallLabel}></span>&nbsp;{wo.location || "-"}
                                      </span>
                                    </div>

                                    {wo.assignedWorkers && wo.assignedWorkers.length > 0 && (
                                      <div style={styles.cardAssignedWorkers}>
                                        <span style={styles.assignedLabel}>Assigned:</span>
                                        <div style={styles.workerBadgesContainer}>
                                          {wo.assignedWorkers.map(workerId => (
                                            <span key={workerId} style={styles.workerBadge}>
                                              {getWorkerName(workerId)}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div style={styles.cardFooter}>
                                      <button
                                        style={{ ...styles.cardBtn, background: "#5692bc", color: 'white' }}
                                        onClick={() => openViewModal(wo)}
                                        title="View"
                                      >
                                        <FaEye style={{ marginRight: 6 }} /> View
                                      </button>
                                      <button style={{...styles.cardBtn, background: '#b356bc', color: 'white'}} onClick={() => openUpdateModal(wo)}>
                                        Update
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* View Modal (no budget; show Actual Cost) */}
      {showView && selectedWorkOrder && (
        <div style={styles.overlay} onClick={() => setShowView(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Work Order Details</h3>
              <button style={styles.closeButton} onClick={() => setShowView(false)}>
                <FaTimes />
              </button>
            </div>
            <div style={styles.viewBody}>
              <div style={styles.viewRow}><strong>Name:</strong> {selectedWorkOrder.name}</div>
              <div style={styles.viewRow}><strong>Status:</strong> {formatStatus(selectedWorkOrder.status)}</div>
              <div style={styles.viewRow}><strong>Priority:</strong> {getPriorityLabel(selectedWorkOrder.priority)}</div>
              <div style={styles.viewRow}><strong>Location:</strong> {selectedWorkOrder.location || "-"}</div>
              <div style={styles.viewRow}><strong>Dates:</strong> {selectedWorkOrder.startDate} — {selectedWorkOrder.endDate}</div>
              {selectedWorkOrder.description && (
                <div style={styles.viewRow}><strong>Description:</strong><br />{selectedWorkOrder.description}</div>
              )}
              <div style={styles.viewRow}>
                <strong>Actual Cost:</strong>{" "}
                {selectedWorkOrder.actualCost != null ? `$${selectedWorkOrder.actualCost.toLocaleString()}` : "-"}
              </div>
              {selectedWorkOrder.assignedWorkers && selectedWorkOrder.assignedWorkers.length > 0 && (
                <div style={styles.viewRow}>
                  <strong>Assigned Workers:</strong>{" "}
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
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Update Modal (workers can set Actual Cost; cannot edit Estimated Budget) */}
      {showUpdate && (
        <div style={styles.overlay} onClick={handleCancelUpdate}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Update Work Order</h3>
              <button style={styles.closeButton} onClick={handleCancelUpdate}>
                <FaTimes />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdate();
              }}
              style={styles.form}
            >
              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  value={formData.description}
                  readOnly
                  style={{ ...styles.input, ...styles.textArea, ...styles.readOnlyInput }}
                  placeholder="Add a detailed description"
                />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    readOnly
                    style={{ ...styles.input, ...styles.readOnlyInput }}
                    placeholder="Work location"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Priority</label>
                  <select
                    value={formData.priority}
                    disabled
                    style={{ ...styles.select, ...styles.readOnlyInput }}
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
                  <label style={styles.label}>Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    readOnly
                    style={{ ...styles.input, ...styles.readOnlyInput }}
                  />
                  {formErrors.startDate && <div style={styles.error}>{formErrors.startDate}</div>}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    readOnly
                    style={{ ...styles.input, ...styles.readOnlyInput }}
                  />
                  {formErrors.endDate && <div style={styles.error}>{formErrors.endDate}</div>}
                  {formErrors.dateOrder && <div style={styles.error}>{formErrors.dateOrder}</div>}
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
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
                  <label style={styles.label}>Actual Cost</label>
                  <div style={styles.inputWrapper}>
                    <span style={styles.inputPrefix}>$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.actualCost}
                      onChange={(e) => setFormData({ ...formData, actualCost: e.target.value })}
                      style={styles.inputWithPrefix}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={handleCancelUpdate}>
                  Cancel
                </button>
                {onNavigateToSupplies && selectedWorkOrder && (
                  <button 
                    type="button" 
                    style={{...styles.submitBtn, backgroundColor: "#5692bc", marginRight: "0.5rem"}}
                    onClick={() => {
                      onNavigateToSupplies(selectedWorkOrder.id);
                      setShowUpdate(false);
                    }}
                  >
                    View Supplies
                  </button>
                )}
                <button
                  type="submit"
                  style={{...styles.submitBtn, backgroundColor: "#10b981"}}
                >
                  Update Work Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles (updated to match PMWorkOrders and CalendarTab)
const styles = {
  container: { maxWidth: "1400px", margin: "0 auto" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
  title: { fontSize: "1.8rem", fontWeight: "600", color: "#2c3e50", margin: 0 },
  board: { display: "grid", gridTemplateColumns: "repeat(5, minmax(240px, 1fr))", gap: "1rem", alignItems: "start", minHeight: "320px" },
  column: { background: "#ffffff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", display: "flex", flexDirection: "column", minHeight: "320px" },
  columnHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1rem", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, background: "#fff", borderTopLeftRadius: "12px", borderTopRightRadius: "12px", zIndex: 1 },
  columnTitle: { fontWeight: 700, color: "#334155" },
  columnCount: { fontWeight: 700, fontSize: "0.8rem", background: "#f1f5f9", borderRadius: "9999px", padding: "0.15rem 0.5rem" },
  droppable: { padding: "0.75rem", flex: 1, borderBottomLeftRadius: "12px", borderBottomRightRadius: "12px", minHeight: "260px", transition: "background-color 0.15s" },
  emptyLane: { border: "2px dashed #cbd5e1", borderRadius: "10px", padding: "1rem", textAlign: "center", color: "#94a3b8", fontWeight: 600 },
  card: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "0.75rem", marginBottom: "0.75rem", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  cardDragging: { boxShadow: "0 8px 20px rgba(0,0,0,0.15)", transform: "rotate(1deg)" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" },
  cardTitle: { color: "#111827" },
  cardDesc: { color: "#6b7280", fontSize: "0.9rem", margin: "0.25rem 0 0.5rem" },
  cardMeta: { display: "flex", alignItems: "center", gap: "0.4rem", color: "#475569", fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden" },
  metaDot: { opacity: 0.6, padding: "0 4px", flex: "0 0 auto" },
  metaClamp: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: "1 1 auto" },
  cardFooter: { marginTop: "0.6rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
  smallLabel: { color: "#6b7280", fontWeight: 600 },
  statusBadge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.75rem", fontWeight: "700", textTransform: "capitalize", textAlign: "center" },
  cardBtn: { padding: "0.35rem 0.6rem", background: "#dbeafe", color: "#111827", border: "none", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "700", cursor: "pointer" },
  
  // Modals - Enhanced styling to match PMWorkOrders
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
  readOnlyInput: {
    backgroundColor: "#f9fafb",
    color: "#6b7280",
    cursor: "not-allowed",
    borderColor: "#e5e7eb",
    opacity: 0.8
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
};

export default WorkerWorkOrders;