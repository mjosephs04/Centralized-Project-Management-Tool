from __future__ import annotations

from collections import defaultdict
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select

from .models import db, User, Project, ProjectStatus, UserRole, WorkOrder, WorkOrderStatus
from .progress import compute_work_order_rollup, compute_schedule_stats, compute_earned_value, to_decimal, normalize_weights

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
    user = User.query.get(user_id)
    
    print(f"[DEBUG] Creating project '{payload['name']}' with project manager {user_id} (role: {user.role if user else 'unknown'})")
    
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
    
    project = Project.query.get(project_id)
    if not project:
        return jsonify({"error": "Project not found"}), 404
    
    # Check if the current user is the project manager of this project
    user_id = get_jwt_identity()
    if project.projectManagerId != int(user_id):
        return jsonify({"error": "You can only delete projects you manage"}), 403
    
    db.session.delete(project)
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
    """Get a specific project by ID (with access control)"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    project = Project.query.get(project_id)
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
    """Get projects accessible by the current user"""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    if user.role == UserRole.ADMIN:
        # Admins can see all projects
        projects = Project.query.all()
    elif user.role == UserRole.PROJECT_MANAGER:
        # Project managers can see projects they manage
        projects = Project.query.filter_by(projectManagerId=user_id).all()
    elif user.role == UserRole.WORKER:
        # Workers can see projects they are assigned to
        projects = Project.query.filter(
            Project.crewMembers.contains(f'{user_id}')
        ).all()
    else:
        return jsonify({"error": "Invalid user role"}), 400
    
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

        project = Project.query.get(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404
        
        # Check if user has access to this project
        has_access = False
        if user.role == UserRole.ADMIN:
            has_access = True
        elif user.role == UserRole.PROJECT_MANAGER and project.projectManagerId == int(user_id):
            has_access = True
        elif user.role == UserRole.WORKER and str(user_id) in project.get_crew_members():
            has_access = True
        
        if not has_access:
            return jsonify({"error": "Access denied"}), 403

        wos = WorkOrder.query.filter_by(projectId=project_id).all()
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