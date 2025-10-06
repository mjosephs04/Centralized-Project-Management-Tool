from __future__ import annotations
from datetime import date
from decimal import Decimal, getcontext
from typing import Dict, Any, Optional

from .models import db, Project, WorkOrder, WorkOrderStatus, ProjectStatus

# precision for Decimal math
getcontext().prec = 28

# how much "credit" an in-progress work order gets
IN_PROGRESS_CREDIT = Decimal("0.50")

# default weights for combining progress components
DEFAULT_WEIGHTS = {
    "work_orders": Decimal("0.50"),
    "schedule": Decimal("0.20"),
    "earned_value": Decimal("0.30"),
}

# --- helper functions ---

def to_decimal(value) -> Decimal:
    """Convert values safely to Decimal"""
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def safe_div(n: Decimal, d: Decimal) -> Decimal:
    """Divide safely (0 if denominator is 0)"""
    if d != 0:
        return n / d
    else:
        return Decimal("0")


def clamp(x: Decimal) -> Decimal:
    """Clamp values to [0, 1]"""
    return max(Decimal("0"), min(Decimal("1"), x))


def normalize_weights(weights: Dict[str, Decimal]) -> Dict[str, Decimal]:
    """Normalize weights so they add up to 1"""
    w1 = to_decimal(weights.get("work_orders", DEFAULT_WEIGHTS["work_orders"]))
    w2 = to_decimal(weights.get("schedule", DEFAULT_WEIGHTS["schedule"]))
    w3 = to_decimal(weights.get("earned_value", DEFAULT_WEIGHTS["earned_value"]))
    total = w1 + w2 + w3
    if total == 0:
        return DEFAULT_WEIGHTS.copy()
    return {"work_orders": w1 / total, "schedule": w2 / total, "earned_value": w3 / total}


# --- data fetch functions ---

def fetch_project(project_id: int) -> Project:
    """Load a project by id"""
    project = db.session.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project {project_id} not found.")
    return project


def fetch_work_orders(project_id: int) -> list[WorkOrder]:
    """Load all work orders for a projdect"""
    return db.session.query(WorkOrder).filter(WorkOrder.projectId == project_id).all()



# --- calculations ---

def compute_work_order_rollup(work_orders: list[WorkOrder]) -> Dict[str, Any]:
    """Summarize work orders into counts and budget totals"""
    total = completed = in_progress = on_hold = pending = cancelled = 0
    est_total = est_completed = est_in_progress_raw = actual_cost_total = Decimal("0")

    for wo in work_orders:
        total += 1
        est_budget = to_decimal(wo.estimatedBudget)
        actual_cost = to_decimal(wo.actualCost)
        est_total += est_budget
        actual_cost_total += actual_cost

        if wo.status == WorkOrderStatus.COMPLETED:
            completed += 1
            est_completed += est_budget
        elif wo.status == WorkOrderStatus.IN_PROGRESS:
            in_progress += 1
            est_in_progress_raw += est_budget
        elif wo.status == WorkOrderStatus.ON_HOLD:
            on_hold += 1
        elif wo.status == WorkOrderStatus.PENDING:
            pending += 1
        elif wo.status == WorkOrderStatus.CANCELLED:
            cancelled += 1

    # completion ratio with partial credit for in-progress
    if total > 0:
        completed_equiv = Decimal(completed) + IN_PROGRESS_CREDIT * Decimal(in_progress)
        completion_ratio = clamp(safe_div(completed_equiv, Decimal(total)))
    else:
        completion_ratio = Decimal("0")

    return {
        "counts": {
            "total": total,
            "completed": completed,
            "in_progress": in_progress,
            "on_hold": on_hold,
            "pending": pending,
            "cancelled": cancelled,
        },
        "budget": {
            "est_total": est_total,
            "est_completed": est_completed,
            "est_in_progress_credit": est_in_progress_raw * IN_PROGRESS_CREDIT,
            "actual_cost_total": actual_cost_total,
        },
        "completion_ratio": completion_ratio,
    }


def compute_schedule_stats(project: Project, today: Optional[date] = None) -> Dict[str, Any]:
    """Calculate planned vs actual time progress"""
    today = today or date.today()
    planned_start, planned_end = project.startDate, project.endDate
    days_planned = max((planned_end - planned_start).days, 1)

    capped_today = min(max(today, planned_start), planned_end)
    days_elapsed = (capped_today - planned_start).days
    planned_pct = clamp(safe_div(Decimal(days_elapsed), Decimal(days_planned)))

    if project.actualStartDate:
        actual_start = project.actualStartDate
        actual_end = project.actualEndDate or today
        days_actual = max((actual_end - actual_start).days, 1)
        capped_today_actual = min(max(today, actual_start), actual_end)
        elapsed_actual = (capped_today_actual - actual_start).days
        actual_pct = clamp(safe_div(Decimal(elapsed_actual), Decimal(days_actual)))
    else:
        actual_pct = Decimal("0")

    return {
        "planned_pct_time_elapsed": planned_pct,
        "actual_pct_time_elapsed": actual_pct,
        "days_planned": days_planned,
        "days_elapsed_planned": days_elapsed,
    }


def compute_earned_value(rollup: Dict[str, Any], project: Project, schedule: Dict[str, Any]) -> Dict[str, Any]:
    """Compute PV, EV, AC, SPI, CPI"""
    est_total = to_decimal(rollup["budget"]["est_total"])
    ev = to_decimal(rollup["budget"]["est_completed"]) + to_decimal(rollup["budget"]["est_in_progress_credit"])
    pv = schedule["planned_pct_time_elapsed"] * est_total
    ac = to_decimal(project.actualCost) + to_decimal(rollup["budget"]["actual_cost_total"])
    spi = safe_div(ev, pv) if pv > 0 else Decimal("0")
    cpi = safe_div(ev, ac) if ac > 0 else Decimal("0")
    return {"pv": pv, "ev": ev, "ac": ac, "spi": spi, "cpi": cpi}


def compute_project_progress(project_id: int, weights: Optional[Dict[str, Decimal]] = None, today: Optional[date] = None) -> Dict[str, Any]:
    """Main function to compute all project progress metrics"""
    project = fetch_project(project_id)
    work_orders = fetch_work_orders(project_id)
    rollup = compute_work_order_rollup(work_orders)
    schedule = compute_schedule_stats(project, today=today)
    ev = compute_earned_value(rollup, project, schedule)

    # scores from each component
    wo_completion = rollup["completion_ratio"]
    schedule_progress = schedule["planned_pct_time_elapsed"]
    est_total = to_decimal(rollup["budget"]["est_total"])
    ev_progress = clamp(safe_div(ev["ev"], est_total)) if est_total > 0 else Decimal("0")

    # blend with weights
    W = normalize_weights(weights or DEFAULT_WEIGHTS)
    overall = clamp(W["work_orders"] * wo_completion + W["schedule"] * schedule_progress + W["earned_value"] * ev_progress)

    return {
        "projectId": project.id,
        "status": project.status.value if project.status else ProjectStatus.PLANNING.value,
        "workOrderCompletion": float(wo_completion),
        "scheduleProgress": float(schedule_progress),
        "earnedValueProgress": float(ev_progress),
        "SPI": float(ev["spi"]),
        "CPI": float(ev["cpi"]),
        "overallProgress": float(overall),
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
            },
        },
    }
