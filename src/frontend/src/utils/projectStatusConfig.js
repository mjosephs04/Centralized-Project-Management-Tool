// projectStatusConfig.js
// Status configuration for project status badges and filtering

export const PROJECT_STATUS_CONFIG = {
  PLANNING: {
    value: "planning",
    label: "Planning",
    color: "#9333ea", // Purple
    bgColor: "#f3e8ff", // Light purple
    borderColor: "#9333ea",
    description: "Initial project planning phase",
  },
  INITIATED: {
    value: "initiated",
    label: "Initiated",
    color: "#3b82f6", // Blue
    bgColor: "#dbeafe",
    borderColor: "#3b82f6",
    description: "Project has been approved and initiated",
  },
  REGULATORY_SCOPING: {
    value: "regulatory_scoping",
    label: "Regulatory & Scoping",
    color: "#0891b2", // Cyan
    bgColor: "#cffafe",
    borderColor: "#0891b2",
    description: "Obtaining permits and defining project scope",
  },
  DESIGN_PROCUREMENT: {
    value: "design_procurement",
    label: "Design & Procurement",
    color: "#059669", // Emerald
    bgColor: "#d1fae5",
    borderColor: "#059669",
    description: "Design finalization and material procurement",
  },
  CONSTRUCTION_PREP: {
    value: "construction_prep",
    label: "Construction Prep",
    color: "#84cc16", // Lime
    bgColor: "#ecfccb",
    borderColor: "#84cc16",
    description: "Site preparation and mobilization",
  },
  IN_CONSTRUCTION: {
    value: "in_construction",
    label: "In Construction",
    color: "#f59e0b", // Amber (brand color)
    bgColor: "#fef3c7",
    borderColor: "#f59e0b",
    description: "Active construction phase",
  },
  COMMISSIONING: {
    value: "commissioning",
    label: "Commissioning",
    color: "#f97316", // Orange
    bgColor: "#ffedd5",
    borderColor: "#f97316",
    description: "Testing and system commissioning",
  },
  ENERGIZED: {
    value: "energized",
    label: "Energized",
    color: "#10b981", // Green
    bgColor: "#d1fae5",
    borderColor: "#10b981",
    description: "System energized and operational",
  },
  CLOSEOUT: {
    value: "closeout",
    label: "Closeout",
    color: "#06b6d4", // Sky blue
    bgColor: "#cffafe",
    borderColor: "#06b6d4",
    description: "Final documentation and project closeout",
  },
  ON_HOLD: {
    value: "on_hold",
    label: "On Hold",
    color: "#eab308", // Yellow
    bgColor: "#fef9c3",
    borderColor: "#eab308",
    description: "Project temporarily paused",
  },
  CANCELLED: {
    value: "cancelled",
    label: "Cancelled",
    color: "#ef4444", // Red
    bgColor: "#fee2e2",
    borderColor: "#ef4444",
    description: "Project cancelled",
  },
  ARCHIVED: {
    value: "archived",
    label: "Archived",
    color: "#6b7280", // Gray
    bgColor: "#f3f4f6",
    borderColor: "#6b7280",
    description: "Project archived",
  },
};

// Helper function to get status config by value
export const getStatusConfig = (statusValue) => {
  const statusKey = Object.keys(PROJECT_STATUS_CONFIG).find(
    (key) => PROJECT_STATUS_CONFIG[key].value === statusValue
  );
  return statusKey ? PROJECT_STATUS_CONFIG[statusKey] : null;
};

// Get list of active statuses (excludes Cancelled and Archived by default)
export const getActiveStatuses = () => {
  return Object.values(PROJECT_STATUS_CONFIG).filter(
    (status) => status.value !== "cancelled" && status.value !== "archived"
  );
};

// Get all statuses including Cancelled and Archived
export const getAllStatuses = () => {
  return Object.values(PROJECT_STATUS_CONFIG);
};

// Get terminal statuses (Cancelled and Archived)
export const getTerminalStatuses = () => {
  return [PROJECT_STATUS_CONFIG.CANCELLED, PROJECT_STATUS_CONFIG.ARCHIVED];
};

// Check if status is terminal
export const isTerminalStatus = (statusValue) => {
  return statusValue === "cancelled" || statusValue === "archived";
};

// Status order for sorting (represents typical project lifecycle)
export const STATUS_SORT_ORDER = {
  planning: 1,
  initiated: 2,
  regulatory_scoping: 3,
  design_procurement: 4,
  construction_prep: 5,
  in_construction: 6,
  commissioning: 7,
  energized: 8,
  closeout: 9,
  on_hold: 10,
  cancelled: 11,
  archived: 12,
};

export default PROJECT_STATUS_CONFIG;
