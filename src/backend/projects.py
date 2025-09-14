from __future__ import annotations

from datetime import datetime, date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from .models import db, User, Project, ProjectStatus, UserRole


projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")


@projects_bp.get("/test")
def test_endpoint():
    """Test endpoint without JWT to verify routing works"""
    return jsonify({"message": "Projects endpoint is working"}), 200


def require_project_manager():
    """Decorator to ensure only project managers can access certain endpoints"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.role != UserRole.PROJECT_MANAGER:
        return jsonify({"error": "Only project managers can perform this action"}), 403
    return None


@projects_bp.post("/")
@jwt_required()
def create_project():
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error
    
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    # Required fields
    required_fields = ["name", "startDate", "endDate"]
    missing = [f for f in required_fields if not payload.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
    
    # Validate dates
    try:
        start_date = datetime.strptime(payload["startDate"], "%Y-%m-%d").date()
        end_date = datetime.strptime(payload["endDate"], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
    
    if start_date >= end_date:
        return jsonify({"error": "End date must be after start date"}), 400
    
    # Validate status if provided
    status = ProjectStatus.PLANNING  # default
    if payload.get("status"):
        try:
            status = ProjectStatus(payload["status"].lower())
        except ValueError:
            return jsonify({"error": "Invalid status. Must be planning, in_progress, on_hold, completed, or cancelled"}), 400
    
    # Validate priority if provided
    priority = payload.get("priority", "medium")
    if priority not in ["low", "medium", "high", "critical"]:
        return jsonify({"error": "Invalid priority. Must be low, medium, high, or critical"}), 400
    
    # Validate budget if provided
    estimated_budget = None
    if payload.get("estimatedBudget"):
        try:
            estimated_budget = float(payload["estimatedBudget"])
            if estimated_budget < 0:
                return jsonify({"error": "Estimated budget must be positive"}), 400
        except ValueError:
            return jsonify({"error": "Invalid estimated budget format"}), 400
    
    # Get current user as project manager
    user_id = get_jwt_identity()
    
    project = Project(
        name=payload["name"],
        description=payload.get("description"),
        location=payload.get("location"),
        startDate=start_date,
        endDate=end_date,
        status=status,
        priority=priority,
        estimatedBudget=estimated_budget,
        projectManagerId=user_id,
    )
    
    db.session.add(project)
    db.session.commit()
    
    return jsonify({"project": project.to_dict()}), 201


@projects_bp.delete("/<int:project_id>")
@jwt_required()
def delete_project(project_id):
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # Check if the current user is the project manager of this project
    user_id = get_jwt_identity()
    if project.projectManagerId != user_id:
        return jsonify({"error": "You can only delete projects you manage"}), 403
    
    db.session.delete(project)
    db.session.commit()
    
    return jsonify({"message": "Project deleted successfully"}), 200


@projects_bp.get("/")
@jwt_required()
def get_projects():
    """Get all projects (accessible by all authenticated users)"""
    projects = Project.query.all()
    return jsonify({"projects": [project.to_dict() for project in projects]}), 200


@projects_bp.get("/<int:project_id>")
@jwt_required()
def get_project(project_id):
    """Get a specific project by ID"""
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    return jsonify({"project": project.to_dict()}), 200


@projects_bp.get("/my-projects")
@jwt_required()
def get_my_projects():
    """Get projects managed by the current user (for project managers)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if user.role == UserRole.PROJECT_MANAGER:
        projects = Project.query.filter_by(projectManagerId=user_id).all()
    else:
        # For now, other roles see all projects
        # In the future, this could be filtered based on assignments
        projects = Project.query.all()
    
    return jsonify({"projects": [project.to_dict() for project in projects]}), 200
