import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaTimes } from "react-icons/fa";
import { workOrdersAPI } from "../../../services/api";

const STATUS_ORDER = ["pending", "in_progress", "on_hold", "completed", "cancelled"];
const STATUS_LABEL = {
  pending: "Pending",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PMWorkOrders = ({ project }) => {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
  });

  useEffect(() => {
    fetchWorkOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id]);

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

      await workOrdersAPI.createWorkOrder(payload);
      await fetchWorkOrders();
      setShowCreate(false);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
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
      await fetchWorkOrders();
      setShowUpdate(false);
    } catch (err) {
      alert(err.response?.data?.error || err.message);
    }
  };

  const deleteWorkOrder = async (woId) => {
    if (!window.confirm("Delete this work order?")) return;
    try {
      await workOrdersAPI.deleteWorkOrder(woId);
      await fetchWorkOrders();
    } catch (err) {
      alert(err.response?.data?.error || err.message);
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
                        <th style={styles.th}>Est. Budget</th>
                        <th style={styles.th}>Actual Cost</th>
                        <th style={styles.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.length === 0 ? (
                        <tr><td style={styles.td} colSpan={8}>&mdash; No items &mdash;</td></tr>
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
        <div style={styles.overlay} onClick={() => setShowCreate(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Create Work Order</h3>
              <button style={styles.closeButton} onClick={() => setShowCreate(false)}><FaTimes /></button>
            </div>
            <form onSubmit={createWorkOrder} style={styles.form}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Name *</label>
                <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={styles.input} />
                {formErrors.name && <div style={styles.error}>{formErrors.name}</div>}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ ...styles.input, ...styles.textArea }} />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} style={styles.input}>
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
                  <input type="date" required value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} style={styles.input} />
                  {formErrors.startDate && <div style={styles.error}>{formErrors.startDate}</div>}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>End Date</label>
                  <input type="date" required value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} style={styles.input} />
                  {formErrors.endDate && <div style={styles.error}>{formErrors.endDate}</div>}
                  {formErrors.dateOrder && <div style={styles.error}>{formErrors.dateOrder}</div>}
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={styles.input}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estimated Budget</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.estimatedBudget}
                    onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                    style={styles.input}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>Create</button>
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
              <div style={styles.viewRow}><strong>Estimated Budget:</strong> {selectedWorkOrder.estimatedBudget != null ? `$${selectedWorkOrder.estimatedBudget.toLocaleString()}` : "-"}</div>
              <div style={styles.viewRow}><strong>Actual Cost:</strong> {selectedWorkOrder.actualCost != null ? `$${selectedWorkOrder.actualCost.toLocaleString()}` : "-"}</div>
            </div>
          </div>
        </div>
      )}

      {/* Update (PM edits only Estimated Budget; can still change Status via dropdown) */}
      {showUpdate && (
        <div style={styles.overlay} onClick={() => setShowUpdate(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Update Work Order</h3>
              <button style={styles.closeButton} onClick={() => setShowUpdate(false)}><FaTimes /></button>
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
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={styles.input} />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} style={{ ...styles.input, ...styles.textArea }} />
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Priority</label>
                  <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })} style={styles.input}>
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
                  <label style={styles.label}>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={styles.input}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Estimated Budget</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.estimatedBudget}
                    onChange={(e) => setFormData({ ...formData, estimatedBudget: e.target.value })}
                    style={styles.input}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div style={styles.formRow}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Start Date</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} style={styles.input} />
                  {formErrors.startDate && <div style={styles.error}>{formErrors.startDate}</div>}
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>End Date</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} style={styles.input} />
                  {formErrors.endDate && <div style={styles.error}>{formErrors.endDate}</div>}
                  {formErrors.dateOrder && <div style={styles.error}>{formErrors.dateOrder}</div>}
                </div>
              </div>

              <div style={styles.actions}>
                <button type="button" style={styles.cancelBtn} onClick={() => setShowUpdate(false)}>Close</button>
                <button type="submit" style={styles.submitBtn}>Update</button>
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
  // Modals
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { backgroundColor: "white", borderRadius: "12px", width: "90%", maxWidth: "640px", maxHeight: "90vh", overflow: "auto" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem", borderBottom: "1px solid #e5e7eb" },
  modalTitle: { fontSize: "1.25rem", fontWeight: "700", color: "#111827", margin: 0 },
  closeButton: { background: "none", border: "none", fontSize: "1.25rem", color: "#6b7280", cursor: "pointer" },
  form: { padding: "1.25rem" },
  formGroup: { marginBottom: "1rem", flex: 1 },
  formRow: { display: "flex", gap: "1rem" },
  label: { display: "block", marginBottom: "0.4rem", fontWeight: "700", color: "#374151", fontSize: "0.9rem" },
  input: { width: "100%", padding: "0.7rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "1rem", outline: "none" },
  textArea: { minHeight: "100px", resize: "vertical" },
  actions: { display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" },
  cancelBtn: { padding: "0.7rem 1.2rem", backgroundColor: "#e5e7eb", color: "#374151", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" },
  submitBtn: { padding: "0.7rem 1.2rem", backgroundColor: "#0052D4", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" },
  viewBody: { padding: "1.25rem", display: "grid", gap: "0.6rem" },
  viewRow: { lineHeight: 1.4 },
  error: { marginTop: "0.25rem", color: "#b91c1c", fontSize: "0.85rem", fontWeight: "700" },
};

export default PMWorkOrders;