from __future__ import annotations

from datetime import datetime, date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from .models import db, User, Project, WorkOrder, WorkOrderStatus, UserRole


workorders_bp = Blueprint("workorders", __name__, url_prefix="/api/workorders")


@workorders_bp.get("/test")
def test_endpoint():
    """Test endpoint without JWT to verify routing works"""
    return jsonify({"message": "Work orders endpoint is working"}), 200


def require_project_manager():
    """Decorator to ensure only project managers can access certain endpoints"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
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
    project = Project.query.get(payload["projectId"])
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
    workorder = WorkOrder.query.get(workorder_id)
    if not workorder:
        return jsonify({"error": "Work order not found"}), 404
    
    return jsonify({"workorder": workorder.to_dict()}), 200


@workorders_bp.get("/project/<int:project_id>")
@jwt_required()
def get_workorders_by_project(project_id):
    """Get all work orders for a specific project"""
    # Validate project exists
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    workorders = WorkOrder.query.filter_by(projectId=project_id).all()
    return jsonify({"workorders": [workorder.to_dict() for workorder in workorders]}), 200


@workorders_bp.put("/<int:workorder_id>")
@jwt_required()
def update_workorder(workorder_id):
    """Update a work order"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error
    
    workorder = WorkOrder.query.get(workorder_id)
    if not workorder:
        return jsonify({"error": "Work order not found"}), 404
    
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    # Update fields if provided
    if "name" in payload:
        workorder.name = payload["name"]
    
    if "description" in payload:
        workorder.description = payload["description"]
    
    if "location" in payload:
        workorder.location = payload["location"]
    
    if "suppliesList" in payload:
        workorder.suppliesList = payload["suppliesList"]
    
    if "startDate" in payload:
        try:
            workorder.startDate = datetime.strptime(payload["startDate"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid start date format. Use YYYY-MM-DD"}), 400
    
    if "endDate" in payload:
        try:
            workorder.endDate = datetime.strptime(payload["endDate"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid end date format. Use YYYY-MM-DD"}), 400
    
    if "actualStartDate" in payload:
        if payload["actualStartDate"]:
            try:
                workorder.actualStartDate = datetime.strptime(payload["actualStartDate"], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Invalid actual start date format. Use YYYY-MM-DD"}), 400
        else:
            workorder.actualStartDate = None
    
    if "actualEndDate" in payload:
        if payload["actualEndDate"]:
            try:
                workorder.actualEndDate = datetime.strptime(payload["actualEndDate"], "%Y-%m-%d").date()
            except ValueError:
                return jsonify({"error": "Invalid actual end date format. Use YYYY-MM-DD"}), 400
        else:
            workorder.actualEndDate = None
    
    if "status" in payload:
        try:
            workorder.status = WorkOrderStatus(payload["status"].lower())
        except ValueError:
            return jsonify({"error": "Invalid status. Must be pending, in_progress, on_hold, completed, or cancelled"}), 400
    
    if "priority" in payload:
        try:
            priority = int(payload["priority"])
            if priority < 1 or priority > 5:
                return jsonify({"error": "Priority must be between 1 and 5"}), 400
            workorder.priority = priority
        except ValueError:
            return jsonify({"error": "Priority must be a number between 1 and 5"}), 400
    
    if "estimatedBudget" in payload:
        if payload["estimatedBudget"]:
            try:
                estimated_budget = float(payload["estimatedBudget"])
                if estimated_budget < 0:
                    return jsonify({"error": "Estimated budget must be positive"}), 400
                workorder.estimatedBudget = estimated_budget
            except ValueError:
                return jsonify({"error": "Invalid estimated budget format"}), 400
        else:
            workorder.estimatedBudget = None
    
    if "actualCost" in payload:
        if payload["actualCost"]:
            try:
                actual_cost = float(payload["actualCost"])
                if actual_cost < 0:
                    return jsonify({"error": "Actual cost must be positive"}), 400
                workorder.actualCost = actual_cost
            except ValueError:
                return jsonify({"error": "Invalid actual cost format"}), 400
        else:
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

    payload = request.get_json(silent=True) or request.form.to_dict() or {}

    if "description" in payload:
        workorder.description = payload["description"]

    if "location" in payload:
        workorder.location = payload["location"]

    if "priority" in payload:
        try:
            priority = int(payload["priority"])
            if priority < 1 or priority > 5:
                return jsonify({"error": "Priority must be between 1 and 5"}), 400
            workorder.priority = priority
        except ValueError:
            return jsonify({"error": "Priority must be a number between 1 and 5"}), 400

    if "status" in payload:
        try:
            workorder.status = WorkOrderStatus(payload["status"].lower())
        except ValueError:
            return jsonify({"error": "Invalid status. Must be pending, in_progress, on_hold, completed, or cancelled"}), 400

    if "actualCost" in payload:
        if payload["actualCost"] == "" or payload["actualCost"] is None:
            workorder.actualCost = None
        else:
            try:
                actual_cost = float(payload["actualCost"])
                if actual_cost < 0:
                    return jsonify({"error": "Actual cost must be positive"}), 400
                workorder.actualCost = actual_cost
            except ValueError:
                return jsonify({"error": "Invalid actual cost format"}), 400

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
    
    workorder = WorkOrder.query.get(workorder_id)
    if not workorder:
        return jsonify({"error": "Work order not found"}), 404
    
    db.session.delete(workorder)
    db.session.commit()
    
    return jsonify({"message": "Work order deleted successfully"}), 200
