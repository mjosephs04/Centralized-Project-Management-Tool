# projects_progress_endpoints.py (or append to your existing projects blueprint file)

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, List, Optional, Tuple

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import select, func

from .models import db, User, Project, ProjectStatus, UserRole, WorkOrder, WorkOrderStatus
# Import your progress helpers (adjust import path if needed)
from .progress import (
    compute_work_order_rollup,
    compute_schedule_stats,
    compute_earned_value,
    to_decimal,
    normalize_weights,
)
from .projects import projects_bp


# ---------- helpers ----------

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
    # Mirror your compute_project_progress “headline” fields, but trim for the dashboard
    wo_completion = float(rollup["completion_ratio"])
    schedule_progress = float(schedule["planned_pct_time_elapsed"])
    est_total = to_decimal(rollup["budget"]["est_total"])
    ev_progress = float((ev["ev"] / est_total) if est_total > 0 else Decimal("0"))

    # Quick health signals useful for badges/indicators
    spi = float(ev["spi"])
    cpi = float(ev["cpi"])
    schedule_health = "ahead" if spi > 1.02 else "behind" if spi < 0.98 else "on_track"
    cost_health = "under" if cpi > 1.02 else "over" if cpi < 0.98 else "on_budget"

    # A single “overall” you can compute on the client if you want, but we include a simple blend here
    # (If you want server-authoritative overall, pass weights and compute here similarly to your main function.)
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
        "badges": {
            "schedule": schedule_health,
            "cost": cost_health,
        },
        # Optional small extras for list chips
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
            out.append((val if val is not None else -1e9, desc))  # handle missing as very small
        return tuple((-v if d else v) if isinstance(v, (int, float)) else v for v, d in out)
    # Python can't sort mixed ascending/descending per field with a single key easily,
    # but we encoded “desc” by flipping sign for numeric values above.
    return sorted(items, key=lambda it: sort_key(it))

def _paginate(items: List[dict], page: int, page_size: int) -> Tuple[List[dict], int]:
    total = len(items)
    start = max((page - 1), 0) * page_size
    end = start + page_size
    return items[start:end], total

def _enforce_role_or_manager_only(manager_only: bool) -> Optional[Tuple[int, int]]:
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return None
    if manager_only and user.role != UserRole.PROJECT_MANAGER:
        # Non-managers can still see dashboard, but managerOnly=true restricts to their projects
        return None
    return (user_id, user.role == UserRole.PROJECT_MANAGER)


# ---------- ROUTES ----------

@projects_bp.get("/dashboard")
@jwt_required()
def get_dashboard_progress():
    """
    Bulk, lightweight summaries for dashboard.
    Query:
      status=planning|in_progress|on_hold|completed|cancelled (optional)
      managerOnly=true|false (optional; default false) -> when true, only projects managed by the caller
      date=YYYY-MM-DD (optional 'today' for schedule)
      w_work_orders, w_schedule, w_earned_value (optional; blend used only if you decide to compute server-side overall)
      sort=overallProgress,-priority (comma list; prefix '-' for desc)
      page=1  pageSize=25
    """
    try:
        status_str = request.args.get("status")
        manager_only = request.args.get("managerOnly", "false").lower() == "true"
        today = _parse_iso_date(request.args.get("date"))  # used inside schedule stats
        weights = _parse_weights_from_query(request.args)  # if you want server-side overall with your weights
        sort_str = request.args.get("sort")
        page = int(request.args.get("page", 1))
        page_size = int(request.args.get("pageSize", 25))

        # Base project query
        stmt = select(Project)
        if status_str:
            try:
                status = ProjectStatus(status_str)
            except ValueError:
                return jsonify({"error": "Invalid status value"}), 400
            stmt = stmt.where(Project.status == status)

        # If managerOnly, restrict to caller's managed projects
        if manager_only:
            user_id = get_jwt_identity()
            stmt = stmt.where(Project.projectManagerId == user_id)

        projects: List[Project] = db.session.execute(stmt).scalars().all()
        if not projects:
            return jsonify({"count": 0, "results": []}), 200

        # Preload all work orders for these projects in one query (avoid N+1)
        proj_ids = [p.id for p in projects]
        wos = db.session.execute(select(WorkOrder).where(WorkOrder.projectId.in_(proj_ids))).scalars().all()
        by_project: Dict[int, List[WorkOrder]] = defaultdict(list)
        for w in wos:
            by_project[w.projectId].append(w)

        # Build summaries
        results: List[dict] = []
        for p in projects:
            rollup = compute_work_order_rollup(by_project.get(p.id, []))
            schedule = compute_schedule_stats(p, today=today)
            ev = compute_earned_value(rollup, p, schedule)
            item = _summary_shape(p, rollup, schedule, ev)

            # If you want server-authoritative overall with custom weights:
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

        # Sorting & pagination (client can also handle this; doing it here to keep responses small)
        results = _apply_sort(results, sort_str)
        page_items, total = _paginate(results, page, page_size)

        return jsonify({
            "count": total,
            "page": page,
            "pageSize": page_size,
            "results": page_items
        }), 200

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500


@projects_bp.get("/<int:project_id>/progress/detail")
@jwt_required()
def get_project_progress_detail(project_id: int):
    """
    Full detail for a single project you’d show on the drill-down page.
    Query:
      date=YYYY-MM-DD (optional 'today')
    """
    try:
        today = _parse_iso_date(request.args.get("date"))

        project = Project.query.get(project_id)
        if not project:
            return jsonify({"error": "Project not found"}), 404

        wos = WorkOrder.query.filter_by(projectId=project_id).all()
        rollup = compute_work_order_rollup(wos)
        schedule = compute_schedule_stats(project, today=today)
        ev = compute_earned_value(rollup, project, schedule)

        # Shape it close to your existing compute_project_progress output, but include all details
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
                # If you want, include a very small list preview of WOs; or fetch on a separate tab
                # "workOrders": [wo.to_dict() for wo in wos]  # optional
            },
        }
        return jsonify(payload), 200

    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {e}"}), 500
