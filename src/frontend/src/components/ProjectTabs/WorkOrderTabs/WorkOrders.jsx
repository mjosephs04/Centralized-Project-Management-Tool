import React from "react";
import WorkerWorkOrders from "./WorkerWorkOrders";
import PMWorkOrders from "./PMWorkOrders";

/**
 * Role-aware wrapper so legacy imports keep working:
 *   import WorkOrders from "../components/ProjectTabs/WorkOrders";
 *
 * Props:
 *  - project (required)
 *  - userRole: "worker" | "project_manager" | "admin"
 */
const WorkOrders = ({ project, userRole, onWorkOrderUpdate, onNavigateToSupplies, highlightedWorkOrderId }) => {
  if (!project) return null;

  // Admins see the PM view by default (adjust if you have a separate admin UI)
  if (userRole === "project_manager" || userRole === "admin") {
    return <PMWorkOrders project={project} onWorkOrderUpdate={onWorkOrderUpdate} onNavigateToSupplies={onNavigateToSupplies} highlightedWorkOrderId={highlightedWorkOrderId} />;
  }

  // Workers get the DnD board with Actual Cost updates
  if (userRole === "worker") {
    return <WorkerWorkOrders project={project} onWorkOrderUpdate={onWorkOrderUpdate} onNavigateToSupplies={onNavigateToSupplies} highlightedWorkOrderId={highlightedWorkOrderId} />;
  }

  // Fallback if auth hasn’t loaded or role is unknown
  return (
    <div style={{ padding: "1rem", color: "#6b7280" }}>
      Unable to determine role. Please sign in again.
    </div>
  );
};

export default WorkOrders;