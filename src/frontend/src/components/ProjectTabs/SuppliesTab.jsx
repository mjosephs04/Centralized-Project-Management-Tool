import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { FaBox, FaPlus, FaSave, FaTimes, FaTrash, FaCheck } from "react-icons/fa";
import {projectsAPI, workOrdersAPI} from "../../services/api";

const fakeVendors = [
    { id: 1, name: "Home Depot" },
    { id: 2, name: "Lowe’s" },
    { id: 3, name: "Grainger" },
    { id: 4, name: "Ace Hardware" },
    { id: 5, name: "Amazon Business" },
];

const SuppliesTab = ({ project, userRole, selectedWorkOrderId: propSelectedWorkOrderId, onWorkOrderChange }) => {
    const [supplies, setSupplies] = useState([]);
    const [workOrders, setWorkOrders] = useState([]);
    const [selectedWorkOrderId, setSelectedWorkOrderId] = useState(propSelectedWorkOrderId || null);
    const [showModal, setShowModal] = useState(false);
    const [newSupply, setNewSupply] = useState({ 
        selectedSupplyId: "", 
        name: "", 
        vendor: "", 
        budget: "",
        supplyCategory: "",
        supplyType: "",
        supplySubtype: "",
        referenceCode: "",
        unitOfMeasure: "",
        selectedWorkOrderIds: []  // Support multiple work orders
    });
    const [loading, setLoading] = useState(false);
    
    // Catalog supplies and categories - cached separately for building and electrical
    const [buildingCatalogSupplies, setBuildingCatalogSupplies] = useState([]);
    const [electricalCatalogSupplies, setElectricalCatalogSupplies] = useState([]);
    const [buildingCategories, setBuildingCategories] = useState([]);
    const [electricalCategories, setElectricalCategories] = useState([]);
    const [catalogLoaded, setCatalogLoaded] = useState(false); // Track if initial load is complete
    const [supplySearchTerm, setSupplySearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedSupplyType, setSelectedSupplyType] = useState("building"); // 'building' or 'electrical'
    const [showSupplyDropdown, setShowSupplyDropdown] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const supplyInputRef = useRef(null);

    // Update local state when prop changes
    useEffect(() => {
        if (propSelectedWorkOrderId !== undefined) {
            setSelectedWorkOrderId(propSelectedWorkOrderId);
        }
    }, [propSelectedWorkOrderId]);

    useEffect(() => {
        const fetchWorkOrders = async () => {
            try {
                const data = await workOrdersAPI.getWorkOrdersByProject(project.id);
                setWorkOrders(data || []);
            } catch (err) {
                console.error("Error fetching work orders:", err);
            }
        };
        if (project?.id) fetchWorkOrders();
    }, [project?.id]);

    useEffect(() => {
        const fetchSupplies = async () => {
            try {
                setLoading(true);
                const res = await projectsAPI.getSupplies(project.id, selectedWorkOrderId)

                const data = res.data;
                if (res.status !== 200) throw new Error(data.error || "Failed to load supplies");
                setSupplies(data.supplies || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (project?.id) fetchSupplies();
    }, [project?.id, selectedWorkOrderId]);

    // Load all catalog supplies at once when modal opens (only once)
    useEffect(() => {
        const loadAllCatalogSupplies = async () => {
            if (!showModal || catalogLoaded) return; // Only load once when modal opens
            
            try {
                console.log("Loading all catalog supplies at once...");
                const data = await projectsAPI.getSuppliesCatalog("", "", "all");
                console.log("All catalog data received:", data);
                console.log("Building supplies count:", data.buildingSupplies?.length || 0);
                console.log("Electrical supplies count:", data.electricalSupplies?.length || 0);
                console.log("Building categories count:", data.buildingCategories?.length || 0);
                console.log("Electrical categories count:", data.electricalCategories?.length || 0);
                
                setBuildingCatalogSupplies(data.buildingSupplies || []);
                setElectricalCatalogSupplies(data.electricalSupplies || []);
                setBuildingCategories(data.buildingCategories || []);
                setElectricalCategories(data.electricalCategories || []);
                setCatalogLoaded(true);
            } catch (err) {
                console.error("Error loading all catalog supplies:", err);
                console.error("Error details:", err.response?.data || err.message);
                setBuildingCatalogSupplies([]);
                setElectricalCatalogSupplies([]);
                setBuildingCategories([]);
                setElectricalCategories([]);
            }
        };
        
        loadAllCatalogSupplies();
    }, [showModal, catalogLoaded]);

    // Reset catalog loaded state when modal closes
    useEffect(() => {
        if (!showModal) {
            setCatalogLoaded(false);
            setSupplySearchTerm("");
            setSelectedCategory("");
        }
    }, [showModal]);

    // Client-side filtering of catalog supplies based on search, category, and type
    const getFilteredCatalogSupplies = () => {
        const sourceSupplies = selectedSupplyType === "electrical" 
            ? electricalCatalogSupplies 
            : buildingCatalogSupplies;
        
        let filtered = [...sourceSupplies];
        
        // Filter by search term
        if (supplySearchTerm) {
            const searchLower = supplySearchTerm.toLowerCase();
            filtered = filtered.filter(supply => 
                (supply.name && supply.name.toLowerCase().includes(searchLower)) ||
                (supply.vendor && supply.vendor.toLowerCase().includes(searchLower))
            );
        }
        
        // Filter by category
        if (selectedCategory) {
            filtered = filtered.filter(supply => supply.supplyCategory === selectedCategory);
        }
        
        return filtered;
    };

    // Get categories for current supply type
    const getCurrentCategories = () => {
        return selectedSupplyType === "electrical" 
            ? electricalCategories 
            : buildingCategories;
    };

    // Calculate dropdown position when it's shown
    useEffect(() => {
        if (showSupplyDropdown && supplyInputRef.current) {
            const updatePosition = () => {
                const rect = supplyInputRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + 4, // Fixed positioning uses viewport coordinates
                    left: rect.left,
                    width: rect.width
                });
            };
            updatePosition();
            // Update position on scroll or resize
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [showSupplyDropdown]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showSupplyDropdown && !event.target.closest('[data-supply-dropdown]')) {
                setShowSupplyDropdown(false);
            }
        };
        if (showSupplyDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showSupplyDropdown]);

    const handleSupplySelect = (supply) => {
        if (supply) {
            setNewSupply({
                selectedSupplyId: supply.id,
                name: supply.name || "",
                vendor: supply.vendor || "",
                budget: supply.budget ? supply.budget.toString() : "",
                supplyCategory: supply.supplyCategory || "",
                supplyType: supply.supplyType || "",
                supplySubtype: supply.supplySubtype || "",
                referenceCode: supply.referenceCode || "",
                unitOfMeasure: supply.unitOfMeasure || ""
            });
            setSupplySearchTerm(supply.name || "");
            setShowSupplyDropdown(false);
        }
    };

    const handleCategoryChange = (category) => {
        setSelectedCategory(category);
        setSupplySearchTerm(""); // Reset search when category changes
        // Clear previously selected supply information
        setNewSupply({ 
            selectedSupplyId: "", 
            name: "", 
            vendor: "", 
            budget: "",
            supplyCategory: "",
            supplyType: "",
            supplySubtype: "",
            referenceCode: "",
            unitOfMeasure: "",
            selectedWorkOrderIds: []
        });
        setShowSupplyDropdown(false);
    };

    const handleAddSupply = async () => {
        if (!newSupply.selectedSupplyId || !newSupply.name || !newSupply.budget) {
            alert("Please select a supply from the catalog");
            return;
        }

        try {
            // Use selected work order from dropdown if available
            const workOrderIds = selectedWorkOrderId ? [selectedWorkOrderId] : [];

            const payload = JSON.stringify({
                name: newSupply.name.trim(),
                vendor: newSupply.vendor || null,
                budget: parseFloat(newSupply.budget),
                supplyCategory: newSupply.supplyCategory || null,
                supplyType: selectedSupplyType, // Use the selected tab type (building/electrical)
                supplySubtype: newSupply.supplySubtype || null,
                referenceCode: newSupply.referenceCode || null,
                unitOfMeasure: newSupply.unitOfMeasure || null,
                ...(workOrderIds.length > 0 && { workOrderIds: workOrderIds }),
            })

            const res = await projectsAPI.postSupplies(project.id, payload)
            const data = res.data;
            if (res.status !== 201) throw new Error(data.error || "Failed to submit supply");
            setSupplies((prev) => [data.supply, ...prev]);
            setShowModal(false);
            setNewSupply({ 
                selectedSupplyId: "", 
                name: "", 
                vendor: "", 
                budget: "",
                supplyCategory: "",
                supplyType: "",
                supplySubtype: "",
                referenceCode: "",
                unitOfMeasure: "",
                selectedWorkOrderIds: []
            });
            setSupplySearchTerm("");
            setSelectedCategory("");
        } catch (err) {
            alert(err.message);
        }
    };

    const handleStatusChange = async (id, status) => {
        try {
            const payload = JSON.stringify({ status })
            const res = await projectsAPI.patchSupplies(project.id, id, payload)
            const data = res.data;
            if (res.status !== 200) throw new Error(data.error || "Failed to update status");
            setSupplies((prev) => prev.map((s) => (s.id === id ? data.supply : s)));
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDeleteSupply = async (id) => {
        if (!window.confirm("Are you sure you want to delete this supply?")) return;

        try {
            const res = await projectsAPI.deleteSupplies(project.id, id);
            if (res.status !== 200) throw new Error(res.data.error || "Failed to delete supply");
            setSupplies((prev) => prev.filter((s) => s.id !== id));
        } catch (err) {
            console.error(err);
            alert(err.message || "Error deleting supply");
        }
    };

    const handleWorkOrderChange = (workOrderId) => {
        const id = workOrderId === "" ? null : parseInt(workOrderId);
        setSelectedWorkOrderId(id);
        if (onWorkOrderChange) {
            onWorkOrderChange(id);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.title}>Supplies</h2>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <select
                        value={selectedWorkOrderId || ""}
                        onChange={(e) => handleWorkOrderChange(e.target.value)}
                        style={styles.workOrderSelect}
                    >
                        <option value="">All Work Orders</option>
                        {workOrders.map((wo) => (
                            <option key={wo.id} value={wo.id}>
                                {wo.name}
                            </option>
                        ))}
                    </select>
                    <button style={styles.addButton} onClick={() => {
                        setShowModal(true);
                        // Reset form and fetch catalog when opening modal
                        setNewSupply({ 
                            selectedSupplyId: "", 
                            name: "", 
                            vendor: "", 
                            budget: "",
                            supplyCategory: "",
                            supplyType: "",
                            supplySubtype: "",
                            referenceCode: "",
                            unitOfMeasure: "",
                            selectedWorkOrderIds: []
                        });
                        setSupplySearchTerm("");
                        setSelectedCategory("");
                        setShowSupplyDropdown(false);
                    }}>
                    <FaPlus /> {userRole === "worker" ? "Request Supply" : "Add Supply"}
                </button>
                </div>
            </div>

            {loading ? (
                <p>Loading...</p>
            ) : supplies.length === 0 ? (
                <div style={styles.emptyState}>
                    <FaBox style={styles.emptyIcon} />
                    <p style={styles.emptyText}>No supplies yet.</p>
                </div>
            ) : (() => {
                // Group supplies by type and sort by category
                const normalizeSupplyType = (type) => {
                    if (!type) return "building"; // Default to building if not set
                    const normalized = String(type).toLowerCase().trim();
                    if (normalized.includes("electrical") || normalized.includes("electric")) {
                        return "electrical";
                    }
                    return "building"; // Default to building
                };

                const buildingSupplies = supplies
                    .filter(s => normalizeSupplyType(s.supplyType) === "building")
                    .sort((a, b) => {
                        const catA = a.supplyCategory || "";
                        const catB = b.supplyCategory || "";
                        return catA.localeCompare(catB);
                    });
                
                const electricalSupplies = supplies
                    .filter(s => normalizeSupplyType(s.supplyType) === "electrical")
                    .sort((a, b) => {
                        const catA = a.supplyCategory || "";
                        const catB = b.supplyCategory || "";
                        return catA.localeCompare(catB);
                    });

                const renderSupplyTable = (supplyList, title) => {
                    if (supplyList.length === 0) return null;

                    return (
                        <div style={{ marginBottom: "3rem" }}>
                            <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#2c3e50", marginBottom: "1rem" }}>
                                {title}
                            </h3>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Name</th>
                                        <th style={styles.th}>Code</th>
                                        <th style={styles.th}>Vendor</th>
                                        <th style={styles.th}>Price ($)</th>
                                        <th style={styles.th}>Unit of Measure</th>
                                        <th style={styles.th}>Status</th>
                                        {userRole === "project_manager" && <th style={styles.th}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {supplyList.map((supply) => (
                                        <tr key={supply.id}>
                                            <td style={styles.td}>
                                                <div>
                                                    <div style={{ fontWeight: "500" }}>{supply.name}</div>
                                                    {supply.supplySubtype && (
                                                        <div style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                                            {supply.supplySubtype}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={styles.td}>{supply.referenceCode || "-"}</td>
                                            <td style={styles.td}>{supply.vendor || "-"}</td>
                                            <td style={styles.td}>{supply.budget.toFixed(2)}</td>
                                            <td style={styles.td}>{supply.unitOfMeasure || "-"}</td>
                                            <td style={styles.td}>
                                                <span
                                                    style={{
                                                        color:
                                                            supply.status === "approved"
                                                                ? "green"
                                                                : supply.status === "rejected"
                                                                    ? "red"
                                                                    : "gray",
                                                        fontWeight: 600,
                                                        textTransform: "capitalize",
                                                    }}
                                                >
                                                    {supply.status}
                                                </span>
                                            </td>
                                            {userRole === "project_manager" && (
                                                <td style={styles.td}>
                                                    {supply.status === "pending" ? (
                                                        <>
                                                            <button
                                                                style={{
                                                                    ...styles.actionButton,
                                                                    backgroundColor: "#dcfce7",
                                                                    color: "#166534",
                                                                    border: "1px solid #86efac",
                                                                    marginRight: "0.5rem",
                                                                }}
                                                                onClick={() => handleStatusChange(supply.id, "approved")}
                                                            >
                                                                <FaCheck style={{marginRight: "0.3rem"}}/> Approve
                                                            </button>

                                                            <button
                                                                style={{
                                                                    ...styles.actionButton,
                                                                    backgroundColor: "#fee2e2",
                                                                    color: "#991b1b",
                                                                    border: "1px solid #fca5a5",
                                                                }}
                                                                onClick={() => handleDeleteSupply(supply.id)}
                                                            >
                                                                <FaTrash style={{marginRight: "0.3rem"}}/> Reject
                                                            </button>
                                                        </>
                                                    ) : supply.status === "approved" ? (
                                                        <button
                                                            style={{
                                                                ...styles.actionButton,
                                                                backgroundColor: "#fef2f2",
                                                                color: "#b91c1c",
                                                                border: "1px solid #fecaca",
                                                            }}
                                                            onClick={() => handleDeleteSupply(supply.id)}
                                                        >
                                                            <FaTrash style={{marginRight: "0.3rem"}}/> Delete
                                                        </button>
                                                    ) : null}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                };

                return (
                    <div>
                        {renderSupplyTable(buildingSupplies, "Building Supplies")}
                        {renderSupplyTable(electricalSupplies, "Electric Supplies")}
                        {buildingSupplies.length === 0 && electricalSupplies.length === 0 && (
                            <div style={styles.emptyState}>
                                <FaBox style={styles.emptyIcon} />
                                <p style={styles.emptyText}>No supplies yet.</p>
                            </div>
                        )}
                    </div>
                );
            })()}

            {showModal && (
                <div style={styles.modalOverlay} onClick={() => {
                    setShowSupplyDropdown(false);
                    setShowModal(false);
                }}>
                    <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={styles.modalTitle}>
                            {userRole === "worker" ? "Request New Supply" : "Add Supply"}
                        </h3>
                        
                        <label style={styles.label}>Supply Type</label>
                        <div style={styles.supplyTypeTabs}>
                            <button
                                type="button"
                                style={{
                                    ...styles.supplyTypeTab,
                                    backgroundColor: selectedSupplyType === "building" ? "#0052D4" : "#e5e7eb",
                                    color: selectedSupplyType === "building" ? "white" : "#374151",
                                    borderBottom: selectedSupplyType === "building" ? "3px solid #10b981" : "3px solid transparent"
                                }}
                                onClick={() => {
                                    setSelectedSupplyType("building");
                                    setSupplySearchTerm("");
                                    setSelectedCategory("");
                                    // Clear previously selected supply information
                                    setNewSupply({ 
                                        selectedSupplyId: "", 
                                        name: "", 
                                        vendor: "", 
                                        budget: "",
                                        supplyCategory: "",
                                        supplyType: "",
                                        supplySubtype: "",
                                        referenceCode: "",
                                        unitOfMeasure: "",
                                        selectedWorkOrderIds: []
                                    });
                                    setShowSupplyDropdown(false);
                                    // No API call needed - we already have the data cached
                                }}
                            >
                                Building Supplies
                            </button>
                            <button
                                type="button"
                                style={{
                                    ...styles.supplyTypeTab,
                                    backgroundColor: selectedSupplyType === "electrical" ? "#0052D4" : "#e5e7eb",
                                    color: selectedSupplyType === "electrical" ? "white" : "#374151",
                                    borderBottom: selectedSupplyType === "electrical" ? "3px solid #10b981" : "3px solid transparent"
                                }}
                                onClick={() => {
                                    setSelectedSupplyType("electrical");
                                    setSupplySearchTerm("");
                                    setSelectedCategory("");
                                    // Clear previously selected supply information
                                    setNewSupply({ 
                                        selectedSupplyId: "", 
                                        name: "", 
                                        vendor: "", 
                                        budget: "",
                                        supplyCategory: "",
                                        supplyType: "",
                                        supplySubtype: "",
                                        referenceCode: "",
                                        unitOfMeasure: "",
                                        selectedWorkOrderIds: []
                                    });
                                    setShowSupplyDropdown(false);
                                    // No API call needed - we already have the data cached
                                }}
                            >
                                Electric Supplies
                            </button>
                        </div>
                        
                        <label style={styles.label}>Supply Category</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => handleCategoryChange(e.target.value)}
                            style={styles.input}
                        >
                            <option value="">All Categories</option>
                            {getCurrentCategories().map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>

                        <label style={styles.label}>Search Supply (by name or vendor)</label>
                        <div style={{ position: "relative" }} data-supply-dropdown>
                        <input
                                ref={supplyInputRef}
                                type="text"
                                value={supplySearchTerm}
                                onChange={(e) => {
                                    setSupplySearchTerm(e.target.value);
                                    setShowSupplyDropdown(true);
                                }}
                                onFocus={() => {
                                    setShowSupplyDropdown(true);
                                }}
                                placeholder="Type to search supplies..."
                            style={styles.input}
                        />
                        </div>
                        {showSupplyDropdown && createPortal(
                            <div 
                                style={{
                                    ...styles.dropdown,
                                    position: "fixed",
                                    top: `${dropdownPosition.top}px`,
                                    left: `${dropdownPosition.left}px`,
                                    width: `${dropdownPosition.width}px`,
                                    zIndex: 2000
                                }} 
                                data-supply-dropdown
                            >
                                {(() => {
                                    const filteredSupplies = getFilteredCatalogSupplies();
                                    return filteredSupplies.length > 0 ? (
                                        <>
                                            {filteredSupplies.map((supply) => (
                                            <div
                                                key={supply.id}
                                                style={styles.dropdownItem}
                                                onClick={() => handleSupplySelect(supply)}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "white"}
                                            >
                                                <div style={{ fontWeight: "600" }}>{supply.name}</div>
                                                <div style={{ fontSize: "0.85rem", color: "#6b7280", display: "flex", gap: "1rem" }}>
                                                    {supply.budget && (
                                                        <span>Price: ${parseFloat(supply.budget).toFixed(2)}</span>
                                                    )}
                                                    {supply.referenceCode && (
                                                        <span>Code: {supply.referenceCode}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div style={{ ...styles.dropdownItem, color: "#6b7280", fontStyle: "italic", cursor: "default" }}>
                                        {!catalogLoaded 
                                            ? "Loading supplies..." 
                                            : supplySearchTerm || selectedCategory 
                                                ? "No supplies found matching your search" 
                                                : "No supplies available"}
                                    </div>
                                );
                                })()}
                            </div>,
                            document.body
                        )}

                        {newSupply.selectedSupplyId && (
                            <div style={{ 
                                padding: "1rem", 
                                backgroundColor: "#f0f9ff", 
                                borderRadius: "8px", 
                                marginBottom: "1rem",
                                border: "1px solid #bae6fd"
                            }}>
                                <div style={{ fontWeight: "600", color: "#0369a1", marginBottom: "0.5rem" }}>
                                    Selected Supply:
                                </div>
                                <div style={{ color: "#0c4a6e" }}>
                                    <div><strong>Name:</strong> {newSupply.name}</div>
                                    {newSupply.vendor && <div><strong>Vendor:</strong> {newSupply.vendor}</div>}
                                    {newSupply.budget && <div><strong>Price:</strong> ${parseFloat(newSupply.budget).toFixed(2)}</div>}
                                </div>
                            </div>
                        )}

                        {newSupply.referenceCode && (
                            <>
                                <label style={styles.label}>Reference Code</label>
                                <input
                                    type="text"
                                    value={newSupply.referenceCode}
                                    onChange={(e) => setNewSupply({...newSupply, referenceCode: e.target.value})}
                                    style={styles.input}
                                    disabled
                                />
                            </>
                        )}

                        {newSupply.supplyType && (
                            <>
                                <label style={styles.label}>Supply Type</label>
                                <input
                                    type="text"
                                    value={newSupply.supplyType}
                                    onChange={(e) => setNewSupply({...newSupply, supplyType: e.target.value})}
                                    style={styles.input}
                                    disabled
                                />
                            </>
                        )}

                        {newSupply.unitOfMeasure && (
                            <>
                                <label style={styles.label}>Unit of Measure</label>
                                <input
                                    type="text"
                                    value={newSupply.unitOfMeasure}
                                    onChange={(e) => setNewSupply({...newSupply, unitOfMeasure: e.target.value})}
                                    style={styles.input}
                                    disabled
                                />
                            </>
                        )}

                        <div style={styles.modalActions}>
                            <button style={styles.saveButton} onClick={handleAddSupply}>
                                <FaSave /> {userRole === "worker" ? "Request" : "Save"}
                            </button>
                            <button style={styles.cancelButton} onClick={() => {
                                setShowModal(false);
                                setShowSupplyDropdown(false);
                                setSupplySearchTerm("");
                                setSelectedCategory("");
                            }}>
                                <FaTimes /> Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const styles = {
    container: { maxWidth: "900px", margin: "0 auto" },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "2rem",
    },
    title: { fontSize: "1.8rem", fontWeight: "600", color: "#2c3e50", margin: 0 },
    addButton: {
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.7rem 1.5rem",
        background: "#5692bc",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: "600",
        cursor: "pointer",
    },
    table: {
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
    },
    th: {
        textAlign: "left",
        padding: "1rem",
        backgroundColor: "#f8fafc",
        fontWeight: "600",
        color: "#2c3e50",
        borderBottom: "1px solid #e5e7eb",
    },
    td: {
        padding: "1rem",
        borderBottom: "1px solid #f3f4f6",
        color: "#374151",
    },
    tr: { transition: "background-color 0.2s" },
    removeButton: {
        backgroundColor: "#fee2e2",
        color: "#dc2626",
        border: "none",
        borderRadius: "6px",
        padding: "0.5rem",
        cursor: "pointer",
    },
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
        background: "#5692bc",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "1rem",
        fontWeight: "600",
        cursor: "pointer",
    },
    modalOverlay: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
    },
    modal: {
        background: "white",
        padding: "2rem",
        borderRadius: "12px",
        width: "400px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    },
    modalTitle: { marginBottom: "1.5rem", fontSize: "1.3rem", fontWeight: "600" },
    label: { display: "block", marginBottom: "0.5rem", color: "#374151", fontWeight: "500" },
    input: {
        width: "100%",
        padding: "0.7rem",
        marginBottom: "1rem",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        outline: "none",
        fontSize: "1rem",
    },
    modalActions: { display: "flex", justifyContent: "space-between", marginTop: "1rem" },
    saveButton: {
        backgroundColor: "#77DD77",
        color: "white",
        border: "none",
        borderRadius: "8px",
        padding: "0.7rem 1.2rem",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        fontWeight: "600",
        cursor: "pointer",
    },
    cancelButton: {
        backgroundColor: "white",
        color: "#bc8056",
        border: "2px solid #bc8056",
        borderRadius: "8px",
        padding: "0.7rem 1.2rem",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
        fontWeight: "600",
        cursor: "pointer",
    },
    actionButton: {
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.5rem 1rem",
        borderRadius: "6px",
        border: "none",
        fontSize: "0.9rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
    },
    supplyTypeTabs: {
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1rem",
        borderBottom: "1px solid #e5e7eb",
    },
    supplyTypeTab: {
        flex: 1,
        padding: "0.75rem 1rem",
        border: "none",
        borderRadius: "8px 8px 0 0",
        fontSize: "0.95rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.2s ease",
        backgroundColor: "#e5e7eb",
        color: "#374151",
    },
    workOrderSelect: {
        padding: "0.7rem 1rem",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        fontSize: "0.95rem",
        fontWeight: "500",
        backgroundColor: "white",
        color: "#374151",
        cursor: "pointer",
        outline: "none",
        minWidth: "200px",
    },
    dropdown: {
        backgroundColor: "white",
        border: "1px solid #d1d5db",
        borderRadius: "8px",
        maxHeight: "320px",
        overflowY: "auto",
        overflowX: "hidden",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    },
    dropdownItem: {
        padding: "0.75rem 1rem",
        cursor: "pointer",
        borderBottom: "1px solid #f3f4f6",
        transition: "background-color 0.2s",
    },
};

export default SuppliesTab;
