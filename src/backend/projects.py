from __future__ import annotations

import json
import uuid
from collections import defaultdict
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from .models import db, User, Project, ProjectStatus, UserRole, WorkOrder, WorkOrderStatus, Audit, AuditEntityType, Supply, ProjectMember, ProjectInvitation, SupplyStatus, ProjectManager, WorkerType
from .progress import (
    compute_work_order_rollup, compute_schedule_stats, compute_earned_value, to_decimal, normalize_weights,
    compute_schedule_variance, compute_cost_variance, compute_workforce_metrics, compute_quality_metrics, compute_project_health_score,
    compute_project_progress
)
from .email_service import create_project_invitation, send_invitation_email, validate_invitation_token, accept_invitation

projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")


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


def get_crew_member_names(crew_json: str) -> str:
    """Convert crew member JSON to human-readable names"""
    if not crew_json or crew_json == "[]":
        return "No team members"
    
    try:
        member_ids = json.loads(crew_json)
        if not member_ids:
            return "No team members"
        
        # Get user names for the IDs
        users = User.query.filter(User.id.in_(member_ids)).all()
        user_names = []
        
        for member_id in member_ids:
            user = next((u for u in users if u.id == member_id), None)
            if user:
                user_names.append(f"{user.firstName} {user.lastName}")
            else:
                user_names.append(f"User #{member_id}")
        
        return ", ".join(user_names)
    except (json.JSONDecodeError, TypeError):
        return "Invalid team data"


@projects_bp.get("/test")
def test_endpoint():
    """Test endpoint without JWT to verify routing works"""
    return jsonify({"message": "Projects endpoint is working"}), 200


def require_project_manager():
    """Decorator to ensure only project managers can access certain endpoints"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    if not user or user.role != UserRole.PROJECT_MANAGER:
        return jsonify({"error": "Only project managers can perform this action"}), 403
    return None
def is_project_manager(user_id: int, project_id: int) -> bool:
    """Check if a user is a manager of a project (supports multi-manager)."""
    # Backward compatibility: check legacy single manager field
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if project and project.projectManagerId == user_id:
        return True
    # New relation check
    pm = ProjectManager.query.filter_by(projectId=project_id, userId=user_id, isActive=True).first()
    return pm is not None



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
    user_id = int(get_jwt_identity())
    
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
    db.session.flush()
    # Add creator as a manager in the new association table
    try:
        db.session.add(ProjectManager(projectId=project.id, userId=user_id))
    except Exception:
        pass
    db.session.commit()

    return jsonify({"project": project.to_dict()}), 201


@projects_bp.delete("/<int:project_id>")
@jwt_required()
def delete_project(project_id):
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error
    
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # Check if the current user is a manager of this project
    user_id = int(get_jwt_identity())
    if not is_project_manager(user_id, project_id):
        return jsonify({"error": "You can only delete projects you manage"}), 403
    
    # Soft delete: set isActive to False
    project.isActive = False
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

    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    return jsonify({"project": project.to_dict()}), 200




@projects_bp.get("/my-projects")
@jwt_required()
def get_my_projects():
    """Get projects managed by the current user (for project managers)"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if user.role == UserRole.ADMIN:
        # Admins can see all projects
        projects = Project.query.filter_by(isActive=True).all()
    else:
        # Collect projects where user is a manager (new table + legacy field)
        manager_proj_ids = [pm.projectId for pm in ProjectManager.query.filter_by(userId=user_id, isActive=True).all()]
        legacy_manager_ids = [p.id for p in Project.query.filter_by(projectManagerId=user_id, isActive=True).all()]
        # Collect projects where user is a member
        member_proj_ids = [m.projectId for m in ProjectMember.query.filter_by(userId=user_id, isActive=True).all()]
        # Collect projects the user is invited to (pending or accepted invitations matching their email)
        invited_proj_ids = []
        try:
            invited_proj_ids = [inv.projectId for inv in ProjectInvitation.query.filter(
                ProjectInvitation.email == user.emailAddress,
                ProjectInvitation.isActive == True,
                ProjectInvitation.status.in_(["pending", "accepted"])
            ).all()]
        except Exception:
            invited_proj_ids = []

        proj_ids = set(manager_proj_ids) | set(legacy_manager_ids) | set(member_proj_ids) | set(invited_proj_ids)
        if not proj_ids:
            projects = []
        else:
            projects = Project.query.filter(Project.isActive == True, Project.id.in_(list(proj_ids))).all()
    
    return jsonify({"projects": [project.to_dict() for project in projects]}), 200


@projects_bp.put("/<int:project_id>")
@jwt_required()
def update_project(project_id):
    """Update a project (with access control)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    project = Project.query.options(joinedload(Project.members)).get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404

    
    # Generate a session ID for this update to group all changes together
    session_id = str(uuid.uuid4())
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    # Store original values for audit logging
    original_values = {
        "name": project.name,
        "description": project.description,
        "location": project.location,
        "priority": project.priority,
        "status": project.status.value if project.status else None,
        "estimatedBudget": f"{project.estimatedBudget:.2f}" if project.estimatedBudget else None,
        "actualCost": f"{project.actualCost:.2f}" if project.actualCost else None,
        "startDate": project.startDate.isoformat() if project.startDate else None,
        "endDate": project.endDate.isoformat() if project.endDate else None,
        "actualStartDate": project.actualStartDate.isoformat() if project.actualStartDate else None,
        "actualEndDate": project.actualEndDate.isoformat() if project.actualEndDate else None,
        "crewMembers": json.dumps(project.get_crew_members()) if project.get_crew_members() else "[]",
    }
    
    # Update basic fields with audit logging
    if "name" in payload and payload["name"] != original_values["name"]:
        create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "name", original_values["name"], payload["name"], session_id, project_id)
        project.name = payload["name"]
    
    if "description" in payload and payload["description"] != original_values["description"]:
        create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "description", original_values["description"], payload["description"], session_id, project_id)
        project.description = payload["description"]
    
    if "location" in payload and payload["location"] != original_values["location"]:
        create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "location", original_values["location"], payload["location"], session_id, project_id)
        project.location = payload["location"]
    
    if "priority" in payload:
        if payload["priority"] not in ["low", "medium", "high", "critical"]:
            return jsonify({"error": "Invalid priority. Must be low, medium, high, or critical"}), 400
        if payload["priority"] != original_values["priority"]:
            create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "priority", original_values["priority"], payload["priority"], session_id, project_id)
            project.priority = payload["priority"]
    
    if "status" in payload:
        try:
            new_status = ProjectStatus(payload["status"].lower())
            if new_status.value != original_values["status"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "status", original_values["status"], new_status.value, session_id, project_id)
                project.status = new_status
        except ValueError:
            return jsonify({"error": "Invalid status. Must be planning, in_progress, on_hold, completed, or cancelled"}), 400
    
    # Update crew members if provided
    if "crewMembers" in payload:
        crew_members = payload["crewMembers"]
        print(f"[DEBUG] Updating crew members for project {project_id}: {crew_members}")
        if isinstance(crew_members, list):
            # Convert to list of integers (user IDs)
            try:
                member_ids = [int(member) if isinstance(member, (int, str)) and str(member).isdigit() else member for member in crew_members]
                new_crew_json = json.dumps(member_ids) if member_ids else "[]"
                
                # Check if crew members actually changed
                if new_crew_json != original_values["crewMembers"]:
                    # Get user names for better audit log display
                    old_member_names = get_crew_member_names(original_values["crewMembers"])
                    new_member_names = get_crew_member_names(new_crew_json)
                    
                    create_audit_log(
                        AuditEntityType.PROJECT, 
                        project_id, 
                        user_id, 
                        "teamMembers", 
                        old_member_names, 
                        new_member_names, 
                        session_id
                    )
                    project.set_crew_members(member_ids)
                    print(f"[DEBUG] Set crew members to: {member_ids}")
                    print(f"[DEBUG] Stored crew members JSON: {project.crewMembers}")
                else:
                    print(f"[DEBUG] Crew members unchanged, skipping audit log")
            except (ValueError, TypeError) as e:
                print(f"[DEBUG] Error updating crew members: {e}")
                return jsonify({"error": "Invalid crew members format"}), 400
        else:
            print(f"[DEBUG] Crew members is not a list: {type(crew_members)}")
            return jsonify({"error": "Crew members must be a list"}), 400
    
    # Update budget if provided
    if "estimatedBudget" in payload:
        try:
            budget = float(payload["estimatedBudget"]) if payload["estimatedBudget"] else None
            if budget is not None and budget < 0:
                return jsonify({"error": "Estimated budget must be positive"}), 400
            budget_str = f"{budget:.2f}" if budget is not None else None
            if budget_str != original_values["estimatedBudget"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "estimatedBudget", original_values["estimatedBudget"], budget_str, session_id, project_id)
                project.estimatedBudget = budget
        except ValueError:
            return jsonify({"error": "Invalid estimated budget format"}), 400
    
    if "actualCost" in payload:
        try:
            cost = float(payload["actualCost"]) if payload["actualCost"] else None
            if cost is not None and cost < 0:
                return jsonify({"error": "Actual cost must be positive"}), 400
            cost_str = f"{cost:.2f}" if cost is not None else None
            if cost_str != original_values["actualCost"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "actualCost", original_values["actualCost"], cost_str, session_id, project_id)
                project.actualCost = cost
        except ValueError:
            return jsonify({"error": "Invalid actual cost format"}), 400
    
    # Update dates if provided
    if "startDate" in payload:
        try:
            new_start_date = datetime.strptime(payload["startDate"], "%Y-%m-%d").date()
            new_start_date_str = new_start_date.isoformat()
            if new_start_date_str != original_values["startDate"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "startDate", original_values["startDate"], new_start_date_str, session_id, project_id)
                project.startDate = new_start_date
        except ValueError:
            return jsonify({"error": "Invalid start date format. Use YYYY-MM-DD"}), 400
    
    if "endDate" in payload:
        try:
            new_end_date = datetime.strptime(payload["endDate"], "%Y-%m-%d").date()
            new_end_date_str = new_end_date.isoformat()
            if new_end_date_str != original_values["endDate"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "endDate", original_values["endDate"], new_end_date_str, session_id, project_id)
                project.endDate = new_end_date
        except ValueError:
            return jsonify({"error": "Invalid end date format. Use YYYY-MM-DD"}), 400
    
    if "actualStartDate" in payload:
        try:
            new_actual_start_date = datetime.strptime(payload["actualStartDate"], "%Y-%m-%d").date() if payload["actualStartDate"] else None
            new_actual_start_date_str = new_actual_start_date.isoformat() if new_actual_start_date else None
            if new_actual_start_date_str != original_values["actualStartDate"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "actualStartDate", original_values["actualStartDate"], new_actual_start_date_str, session_id, project_id)
                project.actualStartDate = new_actual_start_date
        except ValueError:
            return jsonify({"error": "Invalid actual start date format. Use YYYY-MM-DD"}), 400
    
    if "actualEndDate" in payload:
        try:
            new_actual_end_date = datetime.strptime(payload["actualEndDate"], "%Y-%m-%d").date() if payload["actualEndDate"] else None
            new_actual_end_date_str = new_actual_end_date.isoformat() if new_actual_end_date else None
            if new_actual_end_date_str != original_values["actualEndDate"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "actualEndDate", original_values["actualEndDate"], new_actual_end_date_str, session_id, project_id)
                project.actualEndDate = new_actual_end_date
        except ValueError:
            return jsonify({"error": "Invalid actual end date format. Use YYYY-MM-DD"}), 400
    
    # Validate date consistency
    if project.startDate and project.endDate and project.startDate >= project.endDate:
        return jsonify({"error": "End date must be after start date"}), 400
    
    db.session.commit()
    
    return jsonify({"project": project.to_dict()}), 200


@projects_bp.patch("/<int:project_id>/worker-update")
@jwt_required()
def worker_update_project(project_id):
    """Limited update endpoint for workers: allow description, location, priority, status, estimatedBudget, actualCost, actualStartDate, actualEndDate."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # Check if user is a worker and has access to this project
    if user.role != UserRole.WORKER:
        return jsonify({"error": "This endpoint is only for workers"}), 403
    
    # Check if worker is assigned to this project
    crew_members = project.get_crew_members()
    if int(user_id) not in crew_members:
        return jsonify({"error": "Access denied - you are not assigned to this project"}), 403
    
    # Generate a session ID for this update to group all changes together
    session_id = str(uuid.uuid4())
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    # Store original values for audit logging
    original_values = {
        "description": project.description,
        "location": project.location,
        "priority": project.priority,
        "status": project.status.value if project.status else None,
        "estimatedBudget": f"{project.estimatedBudget:.2f}" if project.estimatedBudget else None,
        "actualCost": f"{project.actualCost:.2f}" if project.actualCost else None,
        "actualStartDate": project.actualStartDate.isoformat() if project.actualStartDate else None,
        "actualEndDate": project.actualEndDate.isoformat() if project.actualEndDate else None,
    }
    
    # Update fields with audit logging (limited fields for workers)
    if "description" in payload and payload["description"] != original_values["description"]:
        create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "description", original_values["description"], payload["description"], session_id, project_id)
        project.description = payload["description"]
    
    if "location" in payload and payload["location"] != original_values["location"]:
        create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "location", original_values["location"], payload["location"], session_id, project_id)
        project.location = payload["location"]
    
    if "priority" in payload:
        if payload["priority"] not in ["low", "medium", "high", "critical"]:
            return jsonify({"error": "Invalid priority. Must be low, medium, high, or critical"}), 400
        if payload["priority"] != original_values["priority"]:
            create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "priority", original_values["priority"], payload["priority"], session_id, project_id)
            project.priority = payload["priority"]
    
    if "estimatedBudget" in payload:
        if payload["estimatedBudget"]:
            try:
                estimated_budget = float(payload["estimatedBudget"])
                if estimated_budget < 0:
                    return jsonify({"error": "Estimated budget must be positive"}), 400
                budget_str = f"{estimated_budget:.2f}"
                if budget_str != original_values["estimatedBudget"]:
                    create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "estimatedBudget", original_values["estimatedBudget"], budget_str, session_id, project_id)
                    project.estimatedBudget = estimated_budget
            except ValueError:
                return jsonify({"error": "Invalid estimated budget format"}), 400
        else:
            if original_values["estimatedBudget"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "estimatedBudget", original_values["estimatedBudget"], None, session_id, project_id)
            project.estimatedBudget = None
    
    if "status" in payload:
        try:
            new_status = ProjectStatus(payload["status"].lower())
            if new_status.value != original_values["status"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "status", original_values["status"], new_status.value, session_id, project_id)
                project.status = new_status
        except ValueError:
            return jsonify({"error": "Invalid status. Must be planning, in_progress, on_hold, completed, or cancelled"}), 400
    
    if "actualCost" in payload:
        if payload["actualCost"]:
            try:
                actual_cost = float(payload["actualCost"])
                if actual_cost < 0:
                    return jsonify({"error": "Actual cost must be positive"}), 400
                cost_str = f"{actual_cost:.2f}"
                if cost_str != original_values["actualCost"]:
                    create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "actualCost", original_values["actualCost"], cost_str, session_id, project_id)
                    project.actualCost = actual_cost
            except ValueError:
                return jsonify({"error": "Invalid actual cost format"}), 400
        else:
            if original_values["actualCost"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "actualCost", original_values["actualCost"], None, session_id, project_id)
            project.actualCost = None
    
    if "actualStartDate" in payload:
        try:
            new_actual_start_date = datetime.strptime(payload["actualStartDate"], "%Y-%m-%d").date() if payload["actualStartDate"] else None
            new_actual_start_date_str = new_actual_start_date.isoformat() if new_actual_start_date else None
            if new_actual_start_date_str != original_values["actualStartDate"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "actualStartDate", original_values["actualStartDate"], new_actual_start_date_str, session_id, project_id)
                project.actualStartDate = new_actual_start_date
        except ValueError:
            return jsonify({"error": "Invalid actual start date format. Use YYYY-MM-DD"}), 400
    
    if "actualEndDate" in payload:
        try:
            new_actual_end_date = datetime.strptime(payload["actualEndDate"], "%Y-%m-%d").date() if payload["actualEndDate"] else None
            new_actual_end_date_str = new_actual_end_date.isoformat() if new_actual_end_date else None
            if new_actual_end_date_str != original_values["actualEndDate"]:
                create_audit_log(AuditEntityType.PROJECT, project_id, user_id, "actualEndDate", original_values["actualEndDate"], new_actual_end_date_str, session_id, project_id)
                project.actualEndDate = new_actual_end_date
        except ValueError:
            return jsonify({"error": "Invalid actual end date format. Use YYYY-MM-DD"}), 400
    
    db.session.commit()
    
    return jsonify({"project": project.to_dict()}), 200


@projects_bp.get("/<int:project_id>/audit-logs")
@jwt_required()
def get_project_audit_logs(project_id):
    """Get audit logs for a specific project"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # Check if user has access to this project
    has_access = False
    if user.role == UserRole.ADMIN:
        has_access = True
    elif user.role == UserRole.PROJECT_MANAGER and is_project_manager(int(user_id), project_id):
        has_access = True
    elif user.role == UserRole.WORKER:
        crew_members = project.get_crew_members()
        if int(user_id) in crew_members:
            has_access = True
    
    if not has_access:
        return jsonify({"error": "Access denied"}), 403
    
    # Get audit logs for this project (both project and work order logs)
    # First get project-level audit logs
    project_audit_logs = Audit.query.filter_by(
        entityType=AuditEntityType.PROJECT,
        entityId=project_id
    ).all()
    
    # Get work order audit logs for work orders in this project
    # Now we can use the projectId field to get all work order logs for this project
    work_order_audit_logs = Audit.query.filter(
        Audit.entityType == AuditEntityType.WORK_ORDER,
        Audit.projectId == project_id
    ).all()
    
    # Combine and sort all audit logs by creation date
    all_audit_logs = project_audit_logs + work_order_audit_logs
    all_audit_logs.sort(key=lambda log: log.createdAt, reverse=True)
    
    return jsonify({"auditLogs": [log.to_dict() for log in all_audit_logs]}), 200


#
#    DASHBOARD / PROGRESS APIs
#

def _parse_iso_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError("Invalid date format. Use YYYY-MM-DD.")


def _parse_weights_from_query(args) -> Optional[Dict[str, Decimal]]:
    q_weights = {
        "work_orders": args.get("w_work_orders"),
        "schedule": args.get("w_schedule"),
        "earned_value": args.get("w_earned_value"),
    }
    if not any(q_weights.values()):
        return None
    w = {
        "work_orders": to_decimal(q_weights.get("work_orders")),
        "schedule": to_decimal(q_weights.get("schedule")),
        "earned_value": to_decimal(q_weights.get("earned_value")),
    }
    return normalize_weights(w)


def _summary_shape(project: Project, rollup: Dict[str, Any], schedule: Dict[str, Any], ev: Dict[str, Any]) -> Dict[str, Any]:
    wo_completion = float(rollup["completion_ratio"])
    schedule_progress = float(schedule["planned_pct_time_elapsed"])
    est_total = to_decimal(rollup["budget"]["est_total"])
    ev_progress = float((ev["ev"] / est_total) if est_total > 0 else Decimal("0"))

    spi = float(ev["spi"])
    cpi = float(ev["cpi"])
    schedule_health = "ahead" if spi > 1.02 else "behind" if spi < 0.98 else "on_track"
    cost_health = "under" if cpi > 1.02 else "over" if cpi < 0.98 else "on_budget"

    overall = round((0.5 * wo_completion) + (0.2 * schedule_progress) + (0.3 * ev_progress), 4)

    return {
        "projectId": project.id,
        "name": project.name,
        "status": project.status.value if project.status else None,
        "priority": project.priority,
        "overallProgress": overall,
        "workOrderCompletion": wo_completion,
        "scheduleProgress": schedule_progress,
        "SPI": spi,
        "CPI": cpi,
        "badges": {"schedule": schedule_health, "cost": cost_health},
        "counts": {
            "total": rollup["counts"]["total"],
            "completed": rollup["counts"]["completed"],
            "in_progress": rollup["counts"]["in_progress"],
        },
    }


def _apply_sort(items: List[dict], sort_str: Optional[str]) -> List[dict]:
    if not sort_str:
        return items
    keys = [s.strip() for s in sort_str.split(",") if s.strip()]

    def sort_key(item):
        out = []
        for k in keys:
            desc = k.startswith("-")
            key = k[1:] if desc else k
            val = item.get(key)
            out.append((val if val is not None else -1e9, desc))
        return tuple((-v if d else v) if isinstance(v, (int, float)) else v for v, d in out)

    return sorted(items, key=lambda it: sort_key(it))


def _paginate(items: List[dict], page: int, page_size: int) -> Tuple[List[dict], int]:
    total = len(items)
    start = max((page - 1), 0) * page_size
    end = start + page_size
    return items[start:end], total


@projects_bp.get("/dashboard")
@jwt_required()
def get_dashboard_progress():
    """
    Bulk, lightweight summaries for dashboard.

    Query params (optional):
      status=planning|in_progress|on_hold|completed|cancelled
      managerOnly=true|false
      date=YYYY-MM-DD
      w_work_orders, w_schedule, w_earned_value
      sort=overallProgress,-priority
      page=1  pageSize=25
    """
    try:
        status_str = request.args.get("status")
        manager_only = request.args.get("managerOnly", "false").lower() == "true"
        today = _parse_iso_date(request.args.get("date"))
        weights = _parse_weights_from_query(request.args)
        sort_str = request.args.get("sort")
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("pageSize", 25))

        stmt = select(Project)
        if status_str:
            try:
                status = ProjectStatus(status_str)
            except ValueError:
                return jsonify({"error": "Invalid status value"}), 400
            stmt = stmt.where(Project.status == status)

        if manager_only:
            user_id = int(get_jwt_identity())
            # Filter projects managed by the user (new relation or legacy)
            manager_proj_ids = [pm.projectId for pm in ProjectManager.query.filter_by(userId=user_id, isActive=True).all()]
            if manager_proj_ids:
                stmt = stmt.where((Project.projectManagerId == user_id) | (Project.id.in_(manager_proj_ids)))
            else:
                stmt = stmt.where(Project.projectManagerId == user_id)

        projects: List[Project] = db.session.execute(stmt).scalars().all()
        if not projects:
            return jsonify({"count": 0, "page": page, "pageSize": page_size, "results": []}), 200

        proj_ids = [p.id for p in projects]
        wos = db.session.execute(select(WorkOrder).where(WorkOrder.projectId.in_(proj_ids))).scalars().all()
        by_project: Dict[int, List[WorkOrder]] = defaultdict(list)
        for w in wos:
            by_project[w.projectId].append(w)

        results: List[dict] = []
        for p in projects:
            rollup = compute_work_order_rollup(by_project.get(p.id, []))
            schedule = compute_schedule_stats(p, today=today)
            ev = compute_earned_value(rollup, p, schedule)
            item = _summary_shape(p, rollup, schedule, ev)

            if weights:
                wo = float(rollup["completion_ratio"])
                sc = float(schedule["planned_pct_time_elapsed"])
                est_total = to_decimal(rollup["budget"]["est_total"])
                ev_prog = float((ev["ev"] / est_total) if est_total > 0 else Decimal("0"))
                overall = float(
                    min(1.0, max(0.0, weights["work_orders"] * wo + weights["schedule"] * sc + weights["earned_value"] * ev_prog))
                )
                item["overallProgress"] = overall

            results.append(item)

        results = _apply_sort(results, sort_str)
        page_items, total = _paginate(results, page, page_size)

        return jsonify({"count": total, "page": page, "pageSize": page_size, "results": page_items}), 200

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500


@projects_bp.get("/<int:project_id>/progress/detail")
@jwt_required()
def get_project_progress_detail(project_id: int):
    """
    Full detail for a single project (drill-down page).
    Query:
      date=YYYY-MM-DD (optional)
    """
    try:
        today = _parse_iso_date(request.args.get("date"))

        project = Project.query.filter_by(id=project_id, isActive=True).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404

        wos = WorkOrder.query.filter_by(projectId=project_id, isActive=True).all()
        rollup = compute_work_order_rollup(wos)
        schedule = compute_schedule_stats(project, today=today)
        ev = compute_earned_value(rollup, project, schedule)

        est_total = to_decimal(rollup["budget"]["est_total"])
        ev_progress = (ev["ev"] / est_total) if est_total > 0 else Decimal("0")

        payload = {
            "project": project.to_dict(),
            "workOrderCompletion": float(rollup["completion_ratio"]),
            "scheduleProgress": float(schedule["planned_pct_time_elapsed"]),
            "earnedValueProgress": float(ev_progress),
            "SPI": float(ev["spi"]),
            "CPI": float(ev["cpi"]),
            "details": {
                "counts": rollup["counts"],
                "budget": {
                    "totalEstimatedWO": str(rollup["budget"]["est_total"]),
                    "earnedValueEV": str(ev["ev"]),
                    "plannedValuePV": str(ev["pv"]),
                    "actualCostAC": str(ev["ac"]),
                },
                "schedule": {
                    "plannedDaysTotal": schedule["days_planned"],
                    "plannedDaysElapsed": schedule["days_elapsed_planned"],
                    "actualPctTimeElapsed": float(schedule["actual_pct_time_elapsed"]),
                },
            },
        }
        return jsonify(payload), 200

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500


def is_project_member(user_id: int, project_id: int) -> bool:
    """Check if a user is a member of a project (either as project manager or as a member)"""
    # Check if user is any project manager
    if is_project_manager(user_id, project_id):
        return True

    # Check if user is a project member
    membership = ProjectMember.query.filter_by(projectId=project_id, userId=user_id, isActive=True).first()
    return membership is not None


@projects_bp.get("/<int:project_id>/members")
@jwt_required()
def get_project_members(project_id: int):
    """Get all members of a project (project manager + assigned members)"""
    user_id = int(get_jwt_identity())

    # Check if project exists
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Check if current user is a member of the project
    if not is_project_member(int(user_id), project_id):
        return jsonify({"error": "You must be a member of this project to view its members"}), 403

    # Get project managers (all)
    members = []
    managers = ProjectManager.query.filter_by(projectId=project_id, isActive=True).all()
    
    # Add all managers from ProjectManager table
    for pm in managers:
        manager_data = pm.user.to_dict()
        manager_data["role"] = "project_manager"
        manager_data["joinedAt"] = pm.addedAt.isoformat() if pm.addedAt else None
        members.append(manager_data)
    
    # Also include legacy projectManagerId if it exists and is not already in the list
    # This ensures we show all managers even if some are only in the legacy field
    if project.projectManager:
        legacy_manager_id = project.projectManagerId
        # Only add if not already in members (to avoid duplicates)
        if not any(m.get("id") == legacy_manager_id for m in members):
            legacy = project.projectManager
            manager_data = legacy.to_dict()
            manager_data["role"] = "project_manager"
            manager_data["joinedAt"] = project.createdAt.isoformat() if project.createdAt else None
            members.append(manager_data)

    # Get project members
    project_members = ProjectMember.query.filter_by(projectId=project_id, isActive=True).all()
    for member in project_members:
        member_data = member.user.to_dict()
        member_data["role"] = "member"
        member_data["joinedAt"] = member.joinedAt.isoformat() if member.joinedAt else None
        members.append(member_data)

    return jsonify({"members": members}), 200


@projects_bp.post("/<int:project_id>/members")
@jwt_required()
def add_project_member(project_id: int):
    """Add a user as a member to a project (only project managers can do this)"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error

    # Check if project exists
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Check if current user is a manager of this project
    user_id = int(get_jwt_identity())
    if not is_project_manager(user_id, project_id):
        return jsonify({"error": "You can only add members to projects you manage"}), 403

    payload = request.get_json(silent=True) or request.form.to_dict() or {}

    # Check if we're adding by userId or email
    if payload.get("userId"):
        # Direct user ID addition (existing functionality)
        try:
            member_user_id = int(payload["userId"])
        except ValueError:
            return jsonify({"error": "userId must be a valid integer"}), 400

        # Check if user exists
        user = User.query.filter_by(id=member_user_id, isActive=True).first()
        if not user:
            return jsonify({"error": "User not found"}), 404

        # Check if user is already a member or project manager
        if is_project_manager(member_user_id, project_id):
            return jsonify({"error": "User is already a project manager"}), 400

        existing_member = ProjectMember.query.filter_by(projectId=project_id, userId=member_user_id, isActive=True).first()
        if existing_member:
            return jsonify({"error": "User is already a member of this project"}), 400

        # Add member
        project_member = ProjectMember(
            projectId=project_id,
            userId=member_user_id
        )

        db.session.add(project_member)
        db.session.commit()

        return jsonify({"message": "Member added successfully", "member": project_member.to_dict()}), 201

    elif payload.get("email"):
        # Email-based addition - check if user exists, if not, send invitation
        email = payload["email"]

        # Validate email format (basic validation)
        if "@" not in email or "." not in email:
            return jsonify({"error": "Invalid email format"}), 400

        # Check if user exists
        existing_user = User.query.filter_by(emailAddress=email, isActive=True).first()
        if existing_user:
            # User exists, add them directly
            member_user_id = existing_user.id

            # Check if user is already a member or project manager
            if is_project_manager(member_user_id, project_id):
                return jsonify({"error": "User is already a project manager"}), 400

            existing_member = ProjectMember.query.filter_by(projectId=project_id, userId=member_user_id, isActive=True).first()
            if existing_member:
                return jsonify({"error": "User is already a member of this project"}), 400

            # Add member
            project_member = ProjectMember(
                projectId=project_id,
                userId=member_user_id
            )

            db.session.add(project_member)
            db.session.commit()

            return jsonify({"message": "Member added successfully", "member": project_member.to_dict()}), 201
        else:
            # User doesn't exist, send invitation
            try:
                invitation = create_project_invitation(email, project_id, user_id)
                email_sent = send_invitation_email(invitation)

                if email_sent:
                    return jsonify({
                        "message": "User not found. Invitation sent to email address",
                        "invitation": invitation.to_dict()
                    }), 201
                else:
                    return jsonify({
                        "message": "User not found. Invitation created but email failed to send",
                        "invitation": invitation.to_dict(),
                        "warning": "Email delivery failed"
                    }), 201

            except Exception as e:
                return jsonify({"error": f"Failed to send invitation: {str(e)}"}), 500
    else:
        return jsonify({"error": "Either userId or email is required"}), 400


@projects_bp.delete("/<int:project_id>/members/<int:member_id>")
@jwt_required()
def remove_project_member(project_id: int, member_id: int):
    """Remove a user from a project (only project managers can do this)"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error

    # Check if project exists
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Check if current user is a manager of this project
    user_id = int(get_jwt_identity())
    if not is_project_manager(user_id, project_id):
        return jsonify({"error": "You can only remove members from projects you manage"}), 403

    # Find the membership
    project_member = ProjectMember.query.filter_by(projectId=project_id, userId=member_id, isActive=True).first()
    if not project_member:
        return jsonify({"error": "User is not a member of this project"}), 404

    # Soft delete: set isActive to False
    project_member.isActive = False
    db.session.commit()

    return jsonify({"message": "Member removed successfully"}), 200


@projects_bp.delete("/<int:project_id>/managers/<int:manager_id>")
@jwt_required()
def remove_project_manager(project_id: int, manager_id: int):
    """Remove a project manager from a project (only project managers can do this)"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error

    # Check if project exists
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Check if current user is a manager of this project
    user_id = int(get_jwt_identity())
    if not is_project_manager(user_id, project_id):
        return jsonify({"error": "You can only remove managers from projects you manage"}), 403

    # Find the project manager relationship
    project_manager = ProjectManager.query.filter_by(projectId=project_id, userId=manager_id, isActive=True).first()
    if not project_manager:
        return jsonify({"error": "User is not a project manager of this project"}), 404

    # Soft delete: set isActive to False
    project_manager.isActive = False
    db.session.commit()

    return jsonify({"message": "Project manager removed successfully"}), 200


@projects_bp.post("/<int:project_id>/invite")
@jwt_required()
def invite_user_to_project(project_id: int):
    """Invite a user to join a project via email (only project managers can do this)"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error

    # Check if project exists
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Check if current user is a manager of this project
    user_id = int(get_jwt_identity())
    if not is_project_manager(user_id, project_id):
        return jsonify({"error": "You can only invite users to projects you manage"}), 403

    payload = request.get_json(silent=True) or request.form.to_dict() or {}

    # Required fields
    email = payload.get("email")
    role_str = payload.get("role")

    if not email:
        return jsonify({"error": "email is required"}), 400

    if not role_str:
        return jsonify({"error": "role is required"}), 400

    # Validate email format (basic validation)
    if "@" not in email or "." not in email:
        return jsonify({"error": "Invalid email format"}), 400

    # Validate role
    try:
        role = UserRole(role_str.lower())
    except ValueError:
        return jsonify({"error": "Invalid role. Must be admin, worker, or project_manager."}), 400

    # Validate worker type if role is worker
    worker_type = None
    if role == UserRole.WORKER:
        worker_type_str = payload.get("workerType")
        if not worker_type_str:
            return jsonify({"error": "workerType is required when role is worker."}), 400
        try:
            worker_type = WorkerType(worker_type_str.lower())
        except ValueError:
            return jsonify({"error": "Invalid workerType. Must be contractor or crew_member."}), 400

    # Validate contractor expiration date if role is contractor
    contractor_expiration_date = None
    if role == UserRole.WORKER and worker_type == WorkerType.CONTRACTOR:
        contractor_expiration_str = payload.get("contractorExpirationDate")
        if not contractor_expiration_str:
            return jsonify({"error": "contractorExpirationDate is required when inviting a contractor."}), 400
        try:
            from datetime import datetime
            contractor_expiration_date = datetime.strptime(contractor_expiration_str, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid contractorExpirationDate format. Use YYYY-MM-DD."}), 400

    # Check if user already exists; if so, add directly instead of sending invitation
    existing_user = User.query.filter_by(emailAddress=email).first()
    if existing_user:
        # If already a manager of this project
        if is_project_manager(existing_user.id, project_id):
            return jsonify({"error": "User is already a project manager of this project"}), 400

        # If already a member of this project
        existing_member = ProjectMember.query.filter_by(projectId=project_id, userId=existing_user.id, isActive=True).first()
        if existing_member:
            return jsonify({"error": "User is already a member of this project"}), 400

        # Add directly based on desired role, with sensible safeguards
        try:
            if role == UserRole.PROJECT_MANAGER and existing_user.role in [UserRole.PROJECT_MANAGER, UserRole.ADMIN]:
                db.session.add(ProjectManager(projectId=project_id, userId=existing_user.id))
                db.session.commit()
                return jsonify({
                    "message": "Existing user added as project manager",
                    "member": {"projectId": project_id, "userId": existing_user.id, "role": "project_manager"}
                }), 201
            else:
                # Default to regular project member for all other cases
                db.session.add(ProjectMember(projectId=project_id, userId=existing_user.id))
                db.session.commit()
                return jsonify({
                    "message": "Existing user added to project",
                    "member": {"projectId": project_id, "userId": existing_user.id, "role": "member"}
                }), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({"error": f"Failed to add existing user to project: {str(e)}"}), 500

    try:
        # Create invitation
        invitation = create_project_invitation(email, project_id, user_id, role, worker_type, contractor_expiration_date)

        # Send invitation email
        email_sent = send_invitation_email(invitation)

        if email_sent:
            return jsonify({
                "message": "Invitation sent successfully",
                "invitation": invitation.to_dict()
            }), 201
        else:
            # If email failed to send, we still created the invitation
            # The user could potentially use the token directly
            return jsonify({
                "message": "Invitation created but email failed to send",
                "invitation": invitation.to_dict(),
                "warning": "Email delivery failed"
            }), 201

    except Exception as e:
        return jsonify({"error": f"Failed to create invitation: {str(e)}"}), 500


@projects_bp.get("/<int:project_id>/invitations")
@jwt_required()
def get_project_invitations(project_id: int):
    """Get all invitations for a project (only project managers can view this)"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error

    # Check if project exists
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Check if current user is a manager of this project
    user_id = int(get_jwt_identity())
    if not is_project_manager(user_id, project_id):
        return jsonify({"error": "You can only view invitations for projects you manage"}), 403

    # Get all invitations for this project
    invitations = ProjectInvitation.query.filter_by(projectId=project_id, isActive=True).all()

    return jsonify({"invitations": [invitation.to_dict() for invitation in invitations]}), 200


@projects_bp.delete("/<int:project_id>/invitations/<int:invitation_id>")
@jwt_required()
def cancel_project_invitation(project_id: int, invitation_id: int):
    """Cancel a project invitation (only project managers can do this)"""
    # Check if user is a project manager
    auth_error = require_project_manager()
    if auth_error:
        return auth_error

    # Check if project exists
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        return jsonify({"error": "Project not found"}), 404

    # Check if current user is a manager of this project
    user_id = int(get_jwt_identity())
    if not is_project_manager(user_id, project_id):
        return jsonify({"error": "You can only cancel invitations for projects you manage"}), 403

    # Find the invitation
    invitation = ProjectInvitation.query.filter_by(id=invitation_id, projectId=project_id, isActive=True).first()
    if not invitation:
        return jsonify({"error": "Invitation not found"}), 404

    # Soft delete: set isActive to False
    invitation.isActive = False
    db.session.commit()

    return jsonify({"message": "Invitation cancelled successfully"}), 200


@projects_bp.get("/invitations/validate/<token>")
def validate_invitation(token: str):
    """Validate an invitation token and return invitation details (public endpoint)"""
    invitation = validate_invitation_token(token)

    if not invitation:
        return jsonify({"error": "Invalid or expired invitation token"}), 404

    return jsonify({
        "valid": True,
        "invitation": invitation.to_dict()
    }), 200


@projects_bp.get("/debug/<int:project_id>")
@jwt_required()
def debug_project_access(project_id: int):
    """Debug endpoint to check project access permissions"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    project = Project.query.filter_by(id=project_id, isActive=True).first()

    debug_info = {
        "user_id": user_id,
        "user_role": user.role.value if user else None,
        "user_email": user.emailAddress if user else None,
        "project_id": project_id,
        "project_exists": project is not None,
        "project_name": project.name if project else None,
        "project_manager_id": project.projectManagerId if project else None,
        "is_project_manager": is_project_manager(user_id, project_id) if project else False,
        "project_manager_email": project.projectManager.emailAddress if project and project.projectManager else None
    }

    return jsonify(debug_info), 200

@projects_bp.get("/<int:project_id>/supplies")
@jwt_required()
def get_project_supplies(project_id):
    """Get all supplies for a project (pending + approved)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    project = Project.query.get(project_id)

    if not user or not project:
        return jsonify({"error": "User or project not found"}), 404

    supplies = Supply.query.filter_by(projectId=project_id).order_by(Supply.createdAt.desc()).all()
    return jsonify({"supplies": [s.to_dict() for s in supplies]}), 200



@projects_bp.post("/<int:project_id>/supplies")
@jwt_required()
def add_project_supply(project_id):
    """Create a new supply request or auto-approved supply."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    project = Project.query.get(project_id)

    if not user or not project:
        return jsonify({"error": "User or project not found"}), 404

    payload = request.get_json(silent=True) or {}
    required_fields = ["name", "vendor", "budget"]
    missing = [f for f in required_fields if not payload.get(f)]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        budget = float(payload["budget"])
        if budget < 0:
            return jsonify({"error": "Budget must be positive"}), 400
    except ValueError:
        return jsonify({"error": "Invalid budget format"}), 400

    # Determine role-based flow
    if user.role == UserRole.PROJECT_MANAGER:
        status = SupplyStatus.APPROVED
        approved_by = user.id
        requested_by = user.id
    elif user.role == UserRole.WORKER:
        status = SupplyStatus.PENDING
        approved_by = None
        requested_by = user.id
    else:
        return jsonify({"error": "Only project managers or workers can request supplies"}), 403

    supply = Supply(
        name=payload["name"].strip(),
        vendor=payload["vendor"].strip(),
        budget=budget,
        projectId=project_id,
        status=status,
        requestedById=requested_by,
        approvedById=approved_by,
    )

    db.session.add(supply)
    db.session.commit()
    return jsonify({"supply": supply.to_dict()}), 201

@projects_bp.patch("/<int:project_id>/supplies/<int:supply_id>/status")
@jwt_required()
def update_supply_status(project_id, supply_id):
    """Approve or reject a supply request (Project Manager only)."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    supply = Supply.query.filter_by(id=supply_id, projectId=project_id).first()

    if not user or not supply:
        return jsonify({"error": "User or supply not found"}), 404
    if user.role not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        return jsonify({"error": "Only project managers or admins can approve/reject supplies"}), 403

    payload = request.get_json(silent=True) or {}
    new_status = payload.get("status", "").lower()
    if new_status not in ["approved", "rejected"]:
        return jsonify({"error": "Invalid status. Must be 'approved' or 'rejected'"}), 400

    supply.status = SupplyStatus.APPROVED if new_status == "approved" else SupplyStatus.REJECTED
    supply.approvedById = user.id
    db.session.commit()

    return jsonify({"supply": supply.to_dict()}), 200


@projects_bp.delete("/<int:project_id>/supplies/<int:supply_id>")
@jwt_required()
def delete_project_supply(project_id, supply_id):
    """Delete a specific supply from a project."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    project = Project.query.get(project_id)

    if not user or not project:
        return jsonify({"error": "User or project not found"}), 404

    if user.role not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        return jsonify({"error": "Only project managers or admins can delete supplies"}), 403
    if user.role == UserRole.PROJECT_MANAGER and not is_project_manager(user.id, project_id):
        return jsonify({"error": "You can only delete supplies from your own projects"}), 403

    supply = Supply.query.filter_by(id=supply_id, projectId=project_id).first()
    if not supply:
        return jsonify({"error": "Supply not found"}), 404

    db.session.delete(supply)
    db.session.commit()
    return jsonify({"message": "Supply deleted successfully"}), 200


@projects_bp.get("/<int:project_id>/metrics/schedule")
@jwt_required()
def get_schedule_metrics(project_id: int):
    """Get schedule variance and forecasted completion metrics"""
    try:
        project = Project.query.filter_by(id=project_id, isActive=True).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        metrics = compute_schedule_variance(project)
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.get("/<int:project_id>/metrics/cost")
@jwt_required()
def get_cost_metrics(project_id: int):
    """Get cost variance, EAC, and TCPI metrics"""
    try:
        project = Project.query.filter_by(id=project_id, isActive=True).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        metrics = compute_cost_variance(project, project_id)
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.get("/<int:project_id>/metrics/workforce")
@jwt_required()
def get_workforce_metrics(project_id: int):
    """Get workforce and resource efficiency metrics"""
    try:
        project = Project.query.filter_by(id=project_id, isActive=True).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        metrics = compute_workforce_metrics(project_id)
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.get("/<int:project_id>/metrics/quality")
@jwt_required()
def get_quality_metrics(project_id: int):
    """Get quality and risk indicators"""
    try:
        project = Project.query.filter_by(id=project_id, isActive=True).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        metrics = compute_quality_metrics(project_id)
        return jsonify(metrics), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.get("/<int:project_id>/metrics/health")
@jwt_required()
def get_health_score(project_id: int):
    """Get overall project health score (0-100)"""
    try:
        project = Project.query.filter_by(id=project_id, isActive=True).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        health = compute_project_health_score(project_id)
        return jsonify(health), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@projects_bp.get("/<int:project_id>/metrics/all")
@jwt_required()
def get_all_metrics(project_id: int):
    """Get all metrics for a project"""
    try:
        project = Project.query.filter_by(id=project_id, isActive=True).first()
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        # Try to get base progress first
        progress = compute_project_progress(project_id)
        
        # Safely get SPI value with fallback
        spi_value = progress.get("SPI", 0) if isinstance(progress, dict) else 0
        
        all_metrics = {
            "progress": progress,
            "schedule": compute_schedule_variance(project, spi=spi_value),
            "cost": compute_cost_variance(project, project_id),
            "workforce": compute_workforce_metrics(project_id),
            "quality": compute_quality_metrics(project_id),
            "health": compute_project_health_score(project_id, progress=progress)
        }
        
        return jsonify(all_metrics), 200
    except Exception as e:
        import traceback
        print(f"Error in get_all_metrics: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e), "traceback": traceback.format_exc()}), 500