from __future__ import annotations

from collections import defaultdict
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select

from .models import db, User, Project, ProjectStatus, UserRole, WorkerType, WorkOrder, WorkOrderStatus, ProjectMember, ProjectInvitation
from .progress import compute_work_order_rollup, compute_schedule_stats, compute_earned_value, to_decimal, normalize_weights
from .email_service import create_project_invitation, send_invitation_email, validate_invitation_token, accept_invitation

projects_bp = Blueprint("projects", __name__, url_prefix="/api/projects")


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
    db.session.commit()
    
    print(f"[DEBUG] Project created with ID {project.id}, projectManagerId: {project.projectManagerId}")
    
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
    
    # Check if the current user is the project manager of this project
    user_id = int(get_jwt_identity())
    if project.projectManagerId != user_id:
        return jsonify({"error": "You can only delete projects you manage"}), 403
    
    # Soft delete: set isActive to False
    project.isActive = False
    db.session.commit()
    
    return jsonify({"message": "Project deleted successfully"}), 200


@projects_bp.get("/")
@jwt_required()
def get_projects():
    """Get projects based on user role and assignments"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    if user.role == UserRole.ADMIN:
        # Admins can see all projects
        projects = Project.query.all()
        print(f"[DEBUG] Admin {user_id} can see {len(projects)} projects")
    elif user.role == UserRole.PROJECT_MANAGER:
        # Project managers can see projects they manage
        projects = Project.query.filter_by(projectManagerId=user_id).all()
        print(f"[DEBUG] Project Manager {user_id} can see {len(projects)} projects they manage")
    elif user.role == UserRole.WORKER:
        # Workers can only see projects they are assigned to
        projects = Project.query.filter(
            Project.crewMembers.contains(f'{user_id}')
        ).all()
        print(f"[DEBUG] Worker {user_id} can see {len(projects)} projects they are assigned to")
    else:
        return jsonify({"error": "Invalid user role"}), 400
    
    return jsonify({"projects": [project.to_dict() for project in projects]}), 200


@projects_bp.get("/<int:project_id>")
@jwt_required()
def get_project(project_id):
    """Get a specific project by ID"""
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if not project:
        print(f"[DEBUG] Project {project_id} not found")
        return jsonify({"error": "Project not found"}), 404
    
    print(f"[DEBUG] User {user_id} (role: {user.role}) trying to access project {project_id} (projectManagerId: {project.projectManagerId})")
    
    # Check if user has access to this project
    has_access = False
    if user.role == UserRole.ADMIN:
        has_access = True
        print(f"[DEBUG] Admin access granted")
    elif user.role == UserRole.PROJECT_MANAGER and project.projectManagerId == int(user_id):
        has_access = True
        print(f"[DEBUG] Project manager access granted (user {user_id} manages project {project_id})")
    elif user.role == UserRole.WORKER:
        crew_members = project.get_crew_members()
        print(f"[DEBUG] Worker {user_id} checking crew members: {crew_members}")
        print(f"[DEBUG] Crew members type: {type(crew_members)}")
        print(f"[DEBUG] Looking for user_id '{user_id}' in crew members")
        if int(user_id) in crew_members:
            has_access = True
            print(f"[DEBUG] Worker access granted (user {user_id} is assigned to project {project_id})")
        else:
            print(f"[DEBUG] Worker {user_id} not found in crew members {crew_members}")
    
    if not has_access:
        print(f"[DEBUG] Access denied for user {user_id} to project {project_id}")
        return jsonify({"error": "Access denied"}), 403
    
    return jsonify({"project": project.to_dict()}), 200


@projects_bp.get("/my-projects")
@jwt_required()
def get_my_projects():
    """Get projects managed by the current user (for project managers)"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if user.role == UserRole.PROJECT_MANAGER:
        projects = Project.query.filter_by(projectManagerId=user_id, isActive=True).all()
    else:
        # For now, other roles see all projects
        # In the future, this could be filtered based on assignments
        projects = Project.query.filter_by(isActive=True).all()
    
    return jsonify({"projects": [project.to_dict() for project in projects]}), 200


@projects_bp.put("/<int:project_id>")
@jwt_required()
def update_project(project_id):
    """Update a project (with access control)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # Check if user has permission to update this project
    if user.role == UserRole.ADMIN:
        # Admins can update any project
        pass
    elif user.role == UserRole.PROJECT_MANAGER and project.projectManagerId == int(user_id):
        # Project managers can update their own projects
        pass
    else:
        return jsonify({"error": "Access denied"}), 403
    
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    # Update basic fields
    if "name" in payload:
        project.name = payload["name"]
    if "description" in payload:
        project.description = payload["description"]
    if "location" in payload:
        project.location = payload["location"]
    if "priority" in payload:
        if payload["priority"] not in ["low", "medium", "high", "critical"]:
            return jsonify({"error": "Invalid priority. Must be low, medium, high, or critical"}), 400
        project.priority = payload["priority"]
    if "status" in payload:
        try:
            project.status = ProjectStatus(payload["status"].lower())
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
                project.set_crew_members(member_ids)
                print(f"[DEBUG] Set crew members to: {member_ids}")
                print(f"[DEBUG] Stored crew members JSON: {project.crewMembers}")
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
            project.estimatedBudget = budget
        except ValueError:
            return jsonify({"error": "Invalid estimated budget format"}), 400
    
    if "actualCost" in payload:
        try:
            cost = float(payload["actualCost"]) if payload["actualCost"] else None
            if cost is not None and cost < 0:
                return jsonify({"error": "Actual cost must be positive"}), 400
            project.actualCost = cost
        except ValueError:
            return jsonify({"error": "Invalid actual cost format"}), 400
    
    # Update dates if provided
    if "startDate" in payload:
        try:
            project.startDate = datetime.strptime(payload["startDate"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid start date format. Use YYYY-MM-DD"}), 400
    
    if "endDate" in payload:
        try:
            project.endDate = datetime.strptime(payload["endDate"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid end date format. Use YYYY-MM-DD"}), 400
    
    if "actualStartDate" in payload:
        try:
            project.actualStartDate = datetime.strptime(payload["actualStartDate"], "%Y-%m-%d").date() if payload["actualStartDate"] else None
        except ValueError:
            return jsonify({"error": "Invalid actual start date format. Use YYYY-MM-DD"}), 400
    
    if "actualEndDate" in payload:
        try:
            project.actualEndDate = datetime.strptime(payload["actualEndDate"], "%Y-%m-%d").date() if payload["actualEndDate"] else None
        except ValueError:
            return jsonify({"error": "Invalid actual end date format. Use YYYY-MM-DD"}), 400
    
    # Validate date consistency
    if project.startDate and project.endDate and project.startDate >= project.endDate:
        return jsonify({"error": "End date must be after start date"}), 400
    
    db.session.commit()
    
    return jsonify({"project": project.to_dict()}), 200

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

        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        stmt = select(Project)
        
        # Apply role-based filtering
        if user.role == UserRole.ADMIN:
            # Admins can see all projects
            pass
        elif user.role == UserRole.PROJECT_MANAGER:
            # Project managers can see projects they manage
            stmt = stmt.where(Project.projectManagerId == user_id)
        elif user.role == UserRole.WORKER:
            # Workers can only see projects they are assigned to
            stmt = stmt.where(Project.crewMembers.contains(f'{user_id}'))
        else:
            return jsonify({"error": "Invalid user role"}), 400
        
        if status_str:
            try:
                status = ProjectStatus(status_str)
            except ValueError:
                return jsonify({"error": "Invalid status value"}), 400
            stmt = stmt.where(Project.status == status)

        if manager_only:
            user_id = int(get_jwt_identity())
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
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({"error": "User not found"}), 404
        
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
    # Check if user is the project manager
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if project and project.projectManagerId == user_id:
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
    
    # Get project manager
    project_manager = project.projectManager
    members = []
    
    if project_manager:
        manager_data = project_manager.to_dict()
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
    
    # Check if current user is the project manager of this project
    user_id = int(get_jwt_identity())
    if project.projectManagerId != user_id:
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
        if project.projectManagerId == member_user_id:
            return jsonify({"error": "User is already the project manager"}), 400
        
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
            if project.projectManagerId == member_user_id:
                return jsonify({"error": "User is already the project manager"}), 400
            
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
    
    # Check if current user is the project manager of this project
    user_id = int(get_jwt_identity())
    if project.projectManagerId != user_id:
        return jsonify({"error": "You can only remove members from projects you manage"}), 403
    
    # Find the membership
    project_member = ProjectMember.query.filter_by(projectId=project_id, userId=member_id, isActive=True).first()
    if not project_member:
        return jsonify({"error": "User is not a member of this project"}), 404
    
    # Soft delete: set isActive to False
    project_member.isActive = False
    db.session.commit()
    
    return jsonify({"message": "Member removed successfully"}), 200


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
    
    # Check if current user is the project manager of this project
    user_id = int(get_jwt_identity())
    if project.projectManagerId != user_id:
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
    
    # Check if user already exists and is already a member
    existing_user = User.query.filter_by(emailAddress=email).first()
    if existing_user:
        # Check if user is already the project manager
        if project.projectManagerId == existing_user.id:
            return jsonify({"error": "User is already the project manager of this project"}), 400
        
        # Check if user is already a member
        existing_member = ProjectMember.query.filter_by(projectId=project_id, userId=existing_user.id).first()
        if existing_member:
            return jsonify({"error": "User is already a member of this project"}), 400
    
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
    
    # Check if current user is the project manager of this project
    user_id = int(get_jwt_identity())
    if project.projectManagerId != user_id:
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
    
    # Check if current user is the project manager of this project
    user_id = int(get_jwt_identity())
    if project.projectManagerId != user_id:
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
        "is_project_manager": project.projectManagerId == user_id if project else False,
        "project_manager_email": project.projectManager.emailAddress if project and project.projectManager else None
    }
    
    return jsonify(debug_info), 200