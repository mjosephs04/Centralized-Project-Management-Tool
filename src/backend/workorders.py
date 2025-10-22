from __future__ import annotations

import uuid
from datetime import datetime, date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from .models import db, User, Project, WorkOrder, WorkOrderStatus, UserRole, Audit, AuditEntityType


workorders_bp = Blueprint("workorders", __name__, url_prefix="/api/workorders")


def create_audit_log(entity_type: AuditEntityType, entity_id: int, user_id: int, field: str, old_value: str, new_value: str, session_id: str = None, project_id: int = None):
    """Helper function to create an audit log entry"""
    audit_log = Audit(
        entityType=entity_type,
        entityId=entity_id,
        userId=user_id,
        field=field,
        oldValue=old_value,
        newValue=new_value,
        sessionId=session_id,
        projectId=project_id
    )
    db.session.add(audit_log)


@workorders_bp.get("/test")
def test_endpoint():
    """Test endpoint without JWT to verify routing works"""
    return jsonify({"message": "Work orders endpoint is working"}), 200


def require_project_manager():
    """Decorator to ensure only project managers can access certain endpoints"""
    user_id = get_jwt_identity()
    user = User.query.filter_by(id=user_id, isActive=True).first()
    if not user or user.role != UserRole.PROJECT_MANAGER:
        return jsonify({"error": "Only project managers can perform this action"}), 403
    return None


@workorders_bp.post("/")
@jwt_required()
def create_workorder():
    """Create a new work order"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error
    
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    # Required fields
    required_fields = ["name", "startDate", "endDate", "priority", "projectId"]
    missing = [f for f in required_fields if not payload.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
    
    # Validate project exists
    project = Project.query.filter_by(id=payload["projectId"], isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # Validate dates
    try:
        start_date = datetime.strptime(payload["startDate"], "%Y-%m-%d").date()
        end_date = datetime.strptime(payload["endDate"], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    if start_date >= end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    # Validate priority (1-5)
    try:
        priority = int(payload["priority"])
        if priority < 1 or priority > 5:
            return jsonify({"error": "Priority must be between 1 and 5"}), 400
    except ValueError:
        return jsonify({"error": "Priority must be a number between 1 and 5"}), 400
    
    # Validate status if provided
    status = WorkOrderStatus.PENDING  # default
    if payload.get("status"):
        try:
            status = WorkOrderStatus(payload["status"].lower())
        except ValueError:
            return jsonify({"error": "Invalid status. Must be pending, in_progress, on_hold, completed, or cancelled"}), 400
    
    # Validate budget if provided
    estimated_budget = None
    if payload.get("estimatedBudget"):
        try:
            estimated_budget = float(payload["estimatedBudget"])
            if estimated_budget < 0:
                return jsonify({"error": "Estimated budget must be positive"}), 400
        except ValueError:
            return jsonify({"error": "Invalid estimated budget format"}), 400
    
    workorder = WorkOrder(
        name=payload["name"],
        description=payload.get("description"),
        location=payload.get("location"),
        suppliesList=payload.get("suppliesList"),
        startDate=start_date,
        endDate=end_date,
        status=status,
        priority=priority,
        estimatedBudget=estimated_budget,
        projectId=payload["projectId"],
    )
    
    db.session.add(workorder)
    db.session.flush()  # Flush to get the workorder ID
    
    # Create audit log for work order creation
    user_id = get_jwt_identity()
    create_audit_log(
        AuditEntityType.WORK_ORDER, 
        workorder.id, 
        user_id, 
        "work_order_created", 
        None, 
        workorder.name,
        project_id=payload["projectId"]
    )
    
    db.session.commit()
    
    return jsonify({"workorder": workorder.to_dict()}), 201


@workorders_bp.get("/")
@jwt_required()
def get_workorders():
    """Get all work orders (accessible by all authenticated users)"""
    workorders = WorkOrder.query.all()
    return jsonify({"workorders": [workorder.to_dict() for workorder in workorders]}), 200


@workorders_bp.get("/<int:workorder_id>")
@jwt_required()
def get_workorder(workorder_id):
    """Get a specific work order by ID"""
    workorder = WorkOrder.query.filter_by(id=workorder_id, isActive=True).first()
    if not workorder:
        return jsonify({"error": "Work order not found"}), 404
    
    return jsonify({"workorder": workorder.to_dict()}), 200


@workorders_bp.get("/project/<int:project_id>")
@jwt_required()
def get_workorders_by_project(project_id):
    """Get all work orders for a specific project"""
    # Validate project exists
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    workorders = WorkOrder.query.filter_by(projectId=project_id, isActive=True).all()
    return jsonify({"workorders": [workorder.to_dict() for workorder in workorders]}), 200


@workorders_bp.put("/<int:workorder_id>")
@jwt_required()
def update_workorder(workorder_id):
    """Update a work order"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error
    
    workorder = WorkOrder.query.filter_by(id=workorder_id, isActive=True).first()
    if not workorder:
        return jsonify({"error": "Work order not found"}), 404
    
    user_id = get_jwt_identity()
    # Generate a session ID for this update to group all changes together
    session_id = str(uuid.uuid4())
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    # Store original values for audit logging
    original_values = {
        "name": workorder.name,
        "description": workorder.description,
        "location": workorder.location,
        "suppliesList": workorder.suppliesList,
        "startDate": workorder.startDate.isoformat() if workorder.startDate else None,
        "endDate": workorder.endDate.isoformat() if workorder.endDate else None,
        "actualStartDate": workorder.actualStartDate.isoformat() if workorder.actualStartDate else None,
        "actualEndDate": workorder.actualEndDate.isoformat() if workorder.actualEndDate else None,
        "status": workorder.status.value if workorder.status else None,
        "priority": str(workorder.priority),
        "estimatedBudget": f"{workorder.estimatedBudget:.2f}" if workorder.estimatedBudget else None,
        "actualCost": f"{workorder.actualCost:.2f}" if workorder.actualCost else None,
    }
    
    # Update fields if provided with audit logging
    if "name" in payload and payload["name"] != original_values["name"]:
        create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "name", original_values["name"], payload["name"], session_id, workorder.projectId)
        workorder.name = payload["name"]
    
    if "description" in payload and payload["description"] != original_values["description"]:
        create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "description", original_values["description"], payload["description"], session_id, workorder.projectId)
        workorder.description = payload["description"]
    
    if "location" in payload and payload["location"] != original_values["location"]:
        create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "location", original_values["location"], payload["location"], session_id, workorder.projectId)
        workorder.location = payload["location"]
    
    if "suppliesList" in payload and payload["suppliesList"] != original_values["suppliesList"]:
        create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "suppliesList", original_values["suppliesList"], payload["suppliesList"], session_id, workorder.projectId)
        workorder.suppliesList = payload["suppliesList"]
    
    if "startDate" in payload:
        try:
            new_start_date = datetime.strptime(payload["startDate"], "%Y-%m-%d").date()
            new_start_date_str = new_start_date.isoformat()
            if new_start_date_str != original_values["startDate"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "startDate", original_values["startDate"], new_start_date_str, session_id, workorder.projectId)
                workorder.startDate = new_start_date
        except ValueError:
            return jsonify({"error": "Invalid start date format. Use YYYY-MM-DD"}), 400
    
    if "endDate" in payload:
        try:
            new_end_date = datetime.strptime(payload["endDate"], "%Y-%m-%d").date()
            new_end_date_str = new_end_date.isoformat()
            if new_end_date_str != original_values["endDate"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "endDate", original_values["endDate"], new_end_date_str, session_id, workorder.projectId)
                workorder.endDate = new_end_date
        except ValueError:
            return jsonify({"error": "Invalid end date format. Use YYYY-MM-DD"}), 400
    
    if "actualStartDate" in payload:
        if payload["actualStartDate"]:
            try:
                new_actual_start_date = datetime.strptime(payload["actualStartDate"], "%Y-%m-%d").date()
                new_actual_start_date_str = new_actual_start_date.isoformat()
                if new_actual_start_date_str != original_values["actualStartDate"]:
                    create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "actualStartDate", original_values["actualStartDate"], new_actual_start_date_str, session_id, workorder.projectId)
                    workorder.actualStartDate = new_actual_start_date
            except ValueError:
                return jsonify({"error": "Invalid actual start date format. Use YYYY-MM-DD"}), 400
        else:
            if original_values["actualStartDate"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "actualStartDate", original_values["actualStartDate"], None, session_id, workorder.projectId)
            workorder.actualStartDate = None
    
    if "actualEndDate" in payload:
        if payload["actualEndDate"]:
            try:
                new_actual_end_date = datetime.strptime(payload["actualEndDate"], "%Y-%m-%d").date()
                new_actual_end_date_str = new_actual_end_date.isoformat()
                if new_actual_end_date_str != original_values["actualEndDate"]:
                    create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "actualEndDate", original_values["actualEndDate"], new_actual_end_date_str, session_id, workorder.projectId)
                    workorder.actualEndDate = new_actual_end_date
            except ValueError:
                return jsonify({"error": "Invalid actual end date format. Use YYYY-MM-DD"}), 400
        else:
            if original_values["actualEndDate"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "actualEndDate", original_values["actualEndDate"], None, session_id, workorder.projectId)
            workorder.actualEndDate = None
    
    if "status" in payload:
        try:
            new_status = WorkOrderStatus(payload["status"].lower())
            if new_status.value != original_values["status"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "status", original_values["status"], new_status.value, session_id, workorder.projectId)
                workorder.status = new_status
        except ValueError:
            return jsonify({"error": "Invalid status. Must be pending, in_progress, on_hold, completed, or cancelled"}), 400
    
    if "priority" in payload:
        try:
            priority = int(payload["priority"])
            if priority < 1 or priority > 5:
                return jsonify({"error": "Priority must be between 1 and 5"}), 400
            priority_str = str(priority)
            if priority_str != original_values["priority"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "priority", original_values["priority"], priority_str, session_id, workorder.projectId)
                workorder.priority = priority
        except ValueError:
            return jsonify({"error": "Priority must be a number between 1 and 5"}), 400
    
    if "estimatedBudget" in payload:
        if payload["estimatedBudget"]:
            try:
                estimated_budget = float(payload["estimatedBudget"])
                if estimated_budget < 0:
                    return jsonify({"error": "Estimated budget must be positive"}), 400
                budget_str = f"{estimated_budget:.2f}"
                if budget_str != original_values["estimatedBudget"]:
                    create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "estimatedBudget", original_values["estimatedBudget"], budget_str, session_id, workorder.projectId)
                    workorder.estimatedBudget = estimated_budget
            except ValueError:
                return jsonify({"error": "Invalid estimated budget format"}), 400
        else:
            if original_values["estimatedBudget"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "estimatedBudget", original_values["estimatedBudget"], None, session_id, workorder.projectId)
            workorder.estimatedBudget = None
    
    if "actualCost" in payload:
        if payload["actualCost"]:
            try:
                actual_cost = float(payload["actualCost"])
                if actual_cost < 0:
                    return jsonify({"error": "Actual cost must be positive"}), 400
                cost_str = f"{actual_cost:.2f}"
                if cost_str != original_values["actualCost"]:
                    create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "actualCost", original_values["actualCost"], cost_str, session_id, workorder.projectId)
                    workorder.actualCost = actual_cost
            except ValueError:
                return jsonify({"error": "Invalid actual cost format"}), 400
        else:
            if original_values["actualCost"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "actualCost", original_values["actualCost"], None, session_id, workorder.projectId)
            workorder.actualCost = None
    
    # Validate date consistency after updates
    if workorder.startDate >= workorder.endDate:
        return jsonify({"error": "End date must be after start date"}), 400
    
    db.session.commit()
    
    return jsonify({"workorder": workorder.to_dict()}), 200


@workorders_bp.post("/<int:workorder_id>/complete")
@jwt_required()
def complete_workorder(workorder_id):
    """Allow any authenticated user to mark a work order as completed.
    Sets status to completed and actualEndDate to today."""
    workorder = WorkOrder.query.get(workorder_id)
    if not workorder:
        return jsonify({"error": "Work order not found"}), 404

    workorder.status = WorkOrderStatus.COMPLETED
    workorder.actualEndDate = date.today()

    # Ensure date consistency; if planned end before start, keep as is
    db.session.commit()
    return jsonify({"workorder": workorder.to_dict()}), 200


@workorders_bp.post("/<int:workorder_id>/start")
@jwt_required()
def start_workorder(workorder_id):
    """Allow any authenticated user to set actualStartDate to today and move to in_progress."""
    workorder = WorkOrder.query.get(workorder_id)
    if not workorder:
        return jsonify({"error": "Work order not found"}), 404

    workorder.actualStartDate = date.today()
    workorder.status = WorkOrderStatus.IN_PROGRESS
    db.session.commit()
    return jsonify({"workorder": workorder.to_dict()}), 200


@workorders_bp.patch("/<int:workorder_id>/worker-update")
@jwt_required()
def worker_update_workorder(workorder_id):
    """Limited update endpoint for workers: allow description, location, priority, status, actualCost."""
    workorder = WorkOrder.query.get(workorder_id)
    if not workorder:
        return jsonify({"error": "Work order not found"}), 404

    user_id = get_jwt_identity()
    # Generate a session ID for this update to group all changes together
    session_id = str(uuid.uuid4())
    payload = request.get_json(silent=True) or request.form.to_dict() or {}

    # Store original values for audit logging
    original_values = {
        "description": workorder.description,
        "location": workorder.location,
        "priority": str(workorder.priority),
        "status": workorder.status.value if workorder.status else None,
        "actualCost": f"{workorder.actualCost:.2f}" if workorder.actualCost else None,
        "startDate": workorder.startDate.isoformat() if workorder.startDate else None,
        "endDate": workorder.endDate.isoformat() if workorder.endDate else None,
    }

    # Update fields with audit logging
    if "description" in payload and payload["description"] != original_values["description"]:
        create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "description", original_values["description"], payload["description"], session_id, workorder.projectId)
        workorder.description = payload["description"]

    if "location" in payload and payload["location"] != original_values["location"]:
        create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "location", original_values["location"], payload["location"], session_id, workorder.projectId)
        workorder.location = payload["location"]

    if "priority" in payload:
        try:
            priority = int(payload["priority"])
            if priority < 1 or priority > 5:
                return jsonify({"error": "Priority must be between 1 and 5"}), 400
            priority_str = str(priority)
            if priority_str != original_values["priority"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "priority", original_values["priority"], priority_str, session_id, workorder.projectId)
                workorder.priority = priority
        except ValueError:
            return jsonify({"error": "Priority must be a number between 1 and 5"}), 400

    if "status" in payload:
        try:
            new_status = WorkOrderStatus(payload["status"].lower())
            if new_status.value != original_values["status"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "status", original_values["status"], new_status.value, session_id, workorder.projectId)
                workorder.status = new_status
        except ValueError:
            return jsonify({"error": "Invalid status. Must be pending, in_progress, on_hold, completed, or cancelled"}), 400

    if "actualCost" in payload:
        if payload["actualCost"] == "" or payload["actualCost"] is None:
            if original_values["actualCost"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "actualCost", original_values["actualCost"], None, session_id, workorder.projectId)
            workorder.actualCost = None
        else:
            try:
                actual_cost = float(payload["actualCost"])
                if actual_cost < 0:
                    return jsonify({"error": "Actual cost must be positive"}), 400
                cost_str = f"{actual_cost:.2f}"
                if cost_str != original_values["actualCost"]:
                    create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "actualCost", original_values["actualCost"], cost_str, session_id, workorder.projectId)
                    workorder.actualCost = actual_cost
            except ValueError:
                return jsonify({"error": "Invalid actual cost format"}), 400

    # Handle date updates
    if "startDate" in payload:
        try:
            new_start_date = datetime.strptime(payload["startDate"], "%Y-%m-%d").date()
            new_start_date_str = new_start_date.isoformat()
            if new_start_date_str != original_values["startDate"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "startDate", original_values["startDate"], new_start_date_str, session_id, workorder.projectId)
                workorder.startDate = new_start_date
        except ValueError:
            return jsonify({"error": "Invalid start date format. Use YYYY-MM-DD"}), 400

    if "endDate" in payload:
        try:
            new_end_date = datetime.strptime(payload["endDate"], "%Y-%m-%d").date()
            new_end_date_str = new_end_date.isoformat()
            if new_end_date_str != original_values["endDate"]:
                create_audit_log(AuditEntityType.WORK_ORDER, workorder_id, user_id, "endDate", original_values["endDate"], new_end_date_str, session_id, workorder.projectId)
                workorder.endDate = new_end_date
        except ValueError:
            return jsonify({"error": "Invalid end date format. Use YYYY-MM-DD"}), 400

    # Validate date consistency after updates
    if workorder.startDate >= workorder.endDate:
        return jsonify({"error": "End date must be after start date"}), 400

    db.session.commit()
    return jsonify({"workorder": workorder.to_dict()}), 200


@workorders_bp.delete("/<int:workorder_id>")
@jwt_required()
def delete_workorder(workorder_id):
    """Delete a work order"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error
    
    workorder = WorkOrder.query.filter_by(id=workorder_id, isActive=True).first()
    if not workorder:
        return jsonify({"error": "Work order not found"}), 404
    
    # Store work order details before deletion for audit log
    workorder_name = workorder.name
    project_id = workorder.projectId
    
    # Create audit log for work order deletion before deleting
    user_id = get_jwt_identity()
    create_audit_log(
        AuditEntityType.WORK_ORDER, 
        workorder_id, 
        user_id, 
        "work_order_deleted", 
        workorder_name, 
        None,
        project_id=project_id
    )
    
    db.session.delete(workorder)
    db.session.commit()
    
    return jsonify({"message": "Work order deleted successfully"}), 200
