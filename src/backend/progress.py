from __future__ import annotations
from datetime import date, timedelta
from decimal import Decimal, getcontext
from typing import Dict, Any, Optional, List

from .models import db, Project, WorkOrder, WorkOrderStatus, ProjectStatus, ProjectMember, BuildingSupply, ElectricalSupply, WorkOrderBuildingSupply, WorkOrderElectricalSupply, SupplyStatus

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
    supply_cost_total = Decimal("0")

    # Get all work order IDs
    work_order_ids = [wo.id for wo in work_orders] if work_orders else []
    
    # Calculate total supply costs for all work orders (only approved supplies)
    if work_order_ids:
        # Get all approved building supplies linked to these work orders
        building_supply_links = WorkOrderBuildingSupply.query.filter(
            WorkOrderBuildingSupply.workOrderId.in_(work_order_ids),
            WorkOrderBuildingSupply.isActive == True
        ).all()
        
        for link in building_supply_links:
            supply = BuildingSupply.query.get(link.buildingSupplyId)
            if supply and supply.status == SupplyStatus.APPROVED:
                supply_cost_total += to_decimal(supply.budget)
        
        # Get all approved electrical supplies linked to these work orders
        electrical_supply_links = WorkOrderElectricalSupply.query.filter(
            WorkOrderElectricalSupply.workOrderId.in_(work_order_ids),
            WorkOrderElectricalSupply.isActive == True
        ).all()
        
        for link in electrical_supply_links:
            supply = ElectricalSupply.query.get(link.electricalSupplyId)
            if supply and supply.status == SupplyStatus.APPROVED:
                supply_cost_total += to_decimal(supply.budget)

    for wo in work_orders:
        total += 1
        est_budget = to_decimal(wo.estimatedBudget)
        actual_cost = to_decimal(wo.actualCost)
        actual_cost_total += actual_cost

        if wo.status == WorkOrderStatus.COMPLETED:
            completed += 1
            est_completed += est_budget
            est_total += est_budget  # Include completed in total budget
        elif wo.status == WorkOrderStatus.IN_PROGRESS:
            in_progress += 1
            est_in_progress_raw += est_budget
            est_total += est_budget  # Include in-progress in total budget
        elif wo.status == WorkOrderStatus.ON_HOLD:
            on_hold += 1
            est_total += est_budget  # Include on-hold in total budget
        elif wo.status == WorkOrderStatus.PENDING:
            pending += 1
            est_total += est_budget  # Include pending in total budget
        elif wo.status == WorkOrderStatus.CANCELLED:
            cancelled += 1
            # Exclude cancelled work orders from est_total for SPI/CPI calculations

    # Add supply costs to actual cost total
    actual_cost_total += supply_cost_total

    # completion ratio with partial credit for in-progress
    # Exclude cancelled work orders from the total for completion calculation
    active_total = total - cancelled
    if active_total > 0:
        completed_equiv = Decimal(completed) + IN_PROGRESS_CREDIT * Decimal(in_progress)
        completion_ratio = clamp(safe_div(completed_equiv, Decimal(active_total)))
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
            "supply_cost_total": supply_cost_total,
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
    # AC should be only work order actual costs, not including supplies
    # Use project.actualCost which is the sum of work order actual costs only
    ac = to_decimal(project.actualCost) if project.actualCost is not None else Decimal("0")
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


# --- Advanced Metrics Functions ---

def compute_schedule_variance(project: Project, today: Optional[date] = None, spi: Optional[float] = None) -> Dict[str, Any]:
    """Calculate schedule variance and forecasted completion"""
    today = today or date.today()
    
    # Schedule variance
    planned_duration = (project.endDate - project.startDate).days
    actual_duration = None
    schedule_variance = None
    
    if project.actualStartDate:
        if project.actualEndDate:
            actual_duration = (project.actualEndDate - project.actualStartDate).days
            schedule_variance = planned_duration - actual_duration
        else:
            actual_duration = (today - project.actualStartDate).days
            schedule_variance = planned_duration - actual_duration  # negative means behind
    
    # Get SPI for forecast if not provided
    if spi is None:
        progress = compute_project_progress(project.id)
        spi = progress.get("SPI", 0)
    else:
        spi = float(spi)
    
    # Forecasted end date (EAC-Schedule)
    forecast_end_date = None
    try:
        if spi and spi > 0 and planned_duration > 0:
            forecast_duration = planned_duration / float(spi)
            forecast_end_date = (project.startDate + timedelta(days=int(forecast_duration))).isoformat()
    except (ZeroDivisionError, ValueError, TypeError):
        forecast_end_date = None
    
    return {
        "plannedDuration": planned_duration,
        "actualDuration": actual_duration,
        "scheduleVariance": schedule_variance,
        "forecastEndDate": forecast_end_date,
        "SPI": float(spi)
    }


def compute_cost_variance(project: Project, project_id: int) -> Dict[str, Any]:
    """Calculate cost variance, EAC, and TCPI"""
    work_orders = fetch_work_orders(project_id)
    rollup = compute_work_order_rollup(work_orders)
    
    est_total = to_decimal(rollup["budget"]["est_total"])
    ev = to_decimal(rollup["budget"]["est_completed"]) + to_decimal(rollup["budget"]["est_in_progress_credit"])
    # AC should be only work order actual costs, not including supplies
    # Use project.actualCost which is the sum of work order actual costs only
    ac = to_decimal(project.actualCost) if project.actualCost is not None else Decimal("0")
    
    # Cost Variance
    cv = ev - ac
    
    # CPI
    cpi = safe_div(ev, ac) if ac > 0 else Decimal("0")
    
    # Estimate at Completion (EAC)
    eac = None
    if cpi > 0:
        try:
            eac = float(safe_div(est_total, cpi))
        except (ZeroDivisionError, Exception):
            eac = None
    
    # To-Complete Performance Index (TCPI)
    bac = est_total  # Budget at Completion
    tcpi = None
    if bac - ac > 0:
        try:
            tcpi = float(safe_div(bac - ev, bac - ac))
        except (ZeroDivisionError, Exception):
            tcpi = None
    
    # Remaining Budget
    remaining_budget = max(0, float(est_total - ac)) if est_total > ac else 0
    
    return {
        "costVariance": float(cv),
        "earnedValue": float(ev),
        "actualCost": float(ac),
        "CPI": float(cpi) if cpi is not None else 0,
        "estimateAtCompletion": eac,
        "toCompletePerformanceIndex": tcpi,
        "remainingBudget": remaining_budget,
        "budgetAtCompletion": float(bac) if bac is not None else 0
    }


def compute_workforce_metrics(project_id: int) -> Dict[str, Any]:
    """Calculate workforce and resource efficiency metrics"""
    try:
        project = fetch_project(project_id)
        work_orders = fetch_work_orders(project_id)
        
        # Get active team members - handle case where ProjectMember might not exist
        try:
            active_members = ProjectMember.query.filter_by(projectId=project_id, isActive=True).all()
            team_size = len(active_members)
        except Exception:
            team_size = 0
        
        # Active work orders per worker
        active_work_orders = [wo for wo in work_orders if wo.status in [WorkOrderStatus.PENDING, WorkOrderStatus.IN_PROGRESS]]
        active_wo_per_worker = len(active_work_orders) / team_size if team_size > 0 else 0
        
        # Average work order duration
        completed_orders = [wo for wo in work_orders if wo.status == WorkOrderStatus.COMPLETED and wo.actualStartDate and wo.actualEndDate]
        avg_duration = None
        if completed_orders:
            durations = [(wo.actualEndDate - wo.actualStartDate).days for wo in completed_orders]
            avg_duration = sum(durations) / len(durations)
        
        # Distribution by status
        status_distribution = {
            "pending": len([wo for wo in work_orders if wo.status == WorkOrderStatus.PENDING]),
            "in_progress": len([wo for wo in work_orders if wo.status == WorkOrderStatus.IN_PROGRESS]),
            "completed": len([wo for wo in work_orders if wo.status == WorkOrderStatus.COMPLETED]),
            "on_hold": len([wo for wo in work_orders if wo.status == WorkOrderStatus.ON_HOLD]),
            "cancelled": len([wo for wo in work_orders if wo.status == WorkOrderStatus.CANCELLED])
        }
        
        return {
            "teamSize": team_size,
            "activeWorkOrdersPerWorker": float(active_wo_per_worker),
            "averageWorkOrderDurationDays": avg_duration,
            "statusDistribution": status_distribution,
            "totalWorkOrders": len(work_orders),
            "activeWorkOrders": len(active_work_orders)
        }
    except Exception:
        # Return default values if calculation fails
        return {
            "teamSize": 0,
            "activeWorkOrdersPerWorker": 0.0,
            "averageWorkOrderDurationDays": None,
            "statusDistribution": {
                "pending": 0,
                "in_progress": 0,
                "completed": 0,
                "on_hold": 0,
                "cancelled": 0
            },
            "totalWorkOrders": 0,
            "activeWorkOrders": 0
        }


def compute_quality_metrics(project_id: int) -> Dict[str, Any]:
    """Calculate quality and risk indicators"""
    work_orders = fetch_work_orders(project_id)
    
    # Rework rate - orders marked completed then changed back
    # This is approximated by checking orders that went from completed to another status
    completed_orders = [wo for wo in work_orders if wo.status == WorkOrderStatus.COMPLETED]
    total_completed = len(completed_orders)
    
    # Note: Full rework tracking would require audit logs
    # For now, we'll return current status distribution
    rework_rate = 0  # Would need audit logs to calculate properly
    
    # Risk indicators
    overdue_orders = 0
    for wo in work_orders:
        if wo.status != WorkOrderStatus.COMPLETED and wo.endDate < date.today():
            overdue_orders += 1
    
    # Cost overruns (work orders over budget)
    cost_overruns = 0
    for wo in work_orders:
        if wo.actualCost and wo.estimatedBudget:
            if to_decimal(wo.actualCost) > to_decimal(wo.estimatedBudget):
                cost_overruns += 1
    
    # Risk index (simplified score)
    total_active = len([wo for wo in work_orders if wo.status != WorkOrderStatus.COMPLETED and wo.status != WorkOrderStatus.CANCELLED])
    overdue_ratio = overdue_orders / total_active if total_active > 0 else 0
    cost_overrun_ratio = cost_overruns / len(work_orders) if len(work_orders) > 0 else 0
    risk_score = float(overdue_ratio * 0.5 + cost_overrun_ratio * 0.5) * 100
    
    return {
        "reworkRate": rework_rate,
        "overdueOrders": overdue_orders,
        "costOverruns": cost_overruns,
        "riskIndex": risk_score,
        "totalCompleted": total_completed
    }


def compute_project_health_score(project_id: int, progress: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Compute overall project health score (0-100)"""
    try:
        project = fetch_project(project_id)
        
        # Get base progress metrics if not provided
        if progress is None:
            progress = compute_project_progress(project_id)
        
        # Ensure we have valid progress data
        if not progress or "SPI" not in progress or "CPI" not in progress:
            # Fallback values
            spi = cpi = work_order_completion = 0.0
        else:
            spi = float(progress.get("SPI", 0))
            cpi = float(progress.get("CPI", 0))
            work_order_completion = float(progress.get("workOrderCompletion", 0))
        
        # Get metrics
        schedule_var = compute_schedule_variance(project, spi=spi)
        cost_var = compute_cost_variance(project, project_id)
        quality = compute_quality_metrics(project_id)
        
        # Calculate health components (0-1 scale)
        schedule_health = min(max(spi, 0), 2) / 2.0  # Normalize SPI to 0-1
        cost_health = min(max(cpi, 0), 2) / 2.0  # Normalize CPI to 0-1
        completion_health = max(0, min(1, work_order_completion))  # Clamp to 0-1
        
        # Risk penalty
        risk_index = float(quality.get("riskIndex", 0))
        risk_penalty = max(0, 1 - (risk_index / 100))
        
        # Weighted health score
        overall_health = (
            schedule_health * 0.35 +
            cost_health * 0.35 +
            completion_health * 0.20 +
            risk_penalty * 0.10
        ) * 100
        
        return {
            "healthScore": float(overall_health),
            "components": {
                "scheduleHealth": float(schedule_health * 100),
                "costHealth": float(cost_health * 100),
                "completionHealth": float(completion_health * 100),
                "riskScore": float(risk_index)
            },
            "metrics": {
                "SPI": spi,
                "CPI": cpi,
                "scheduleVariance": schedule_var.get("scheduleVariance"),
                "forecastEndDate": schedule_var.get("forecastEndDate")
            }
        }
    except Exception as e:
        # Return default health score if calculation fails
        return {
            "healthScore": 0.0,
            "components": {
                "scheduleHealth": 0.0,
                "costHealth": 0.0,
                "completionHealth": 0.0,
                "riskScore": 100.0
            },
            "metrics": {
                "SPI": 0.0,
                "CPI": 0.0,
                "scheduleVariance": None,
                "forecastEndDate": None
            }
        }
