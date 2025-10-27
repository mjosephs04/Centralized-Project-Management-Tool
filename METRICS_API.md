# Project Metrics API Endpoints

New metrics endpoints have been added to provide comprehensive project analytics.

## Endpoints

### 1. Schedule Metrics
**GET** `/api/projects/<project_id>/metrics/schedule`

Returns:
- `plannedDuration`: Planned project duration in days
- `actualDuration`: Actual duration if project has started/ended
- `scheduleVariance`: Difference between planned and actual duration
- `forecastEndDate`: Predicted completion date based on SPI
- `SPI`: Schedule Performance Index

### 2. Cost Metrics
**GET** `/api/projects/<project_id>/metrics/cost`

Returns:
- `costVariance`: CV = EV - AC
- `earnedValue`: Earned Value (EV)
- `actualCost`: Actual Cost (AC)
- `CPI`: Cost Performance Index
- `estimateAtCompletion`: EAC = BAC / CPI
- `toCompletePerformanceIndex`: TCPI = (BAC - EV) / (BAC - AC)
- `remainingBudget`: Estimated budget minus actual cost
- `budgetAtCompletion`: BAC

### 3. Workforce Metrics
**GET** `/api/projects/<project_id>/metrics/workforce`

Returns:
- `teamSize`: Number of active team members
- `activeWorkOrdersPerWorker`: Average work orders per worker
- `averageWorkOrderDurationDays`: Average days to complete a work order
- `statusDistribution`: Count of work orders by status
  - `pending`
  - `in_progress`
  - `completed`
  - `on_hold`
  - `cancelled`
- `totalWorkOrders`: Total work orders in project
- `activeWorkOrders`: Currently active work orders

### 4. Quality & Risk Metrics
**GET** `/api/projects/<project_id>/metrics/quality`

Returns:
- `reworkRate`: Percentage of reworked items (future: requires audit logs)
- `overdueOrders`: Count of work orders past their end date
- `costOverruns`: Number of work orders over budget
- `riskIndex`: Composite risk score (0-100)
- `totalCompleted`: Total completed work orders

### 5. Project Health Score
**GET** `/api/projects/<project_id>/metrics/health`

Returns:
- `healthScore`: Overall project health (0-100)
- `components`: Breakdown of health components
  - `scheduleHealth`: Schedule performance (0-100)
  - `costHealth`: Cost performance (0-100)
  - `completionHealth`: Work completion (0-100)
  - `riskScore`: Risk indicator (0-100)
- `metrics`: Key performance indicators
  - `SPI`: Schedule Performance Index
  - `CPI`: Cost Performance Index
  - `scheduleVariance`: Days variance
  - `forecastEndDate`: Predicted completion

### 6. All Metrics
**GET** `/api/projects/<project_id>/metrics/all`

Returns comprehensive metrics including:
- `progress`: Overall progress metrics (SPI, CPI, completion ratios)
- `schedule`: Schedule variance and forecasting
- `cost`: Cost variance and EAC
- `workforce`: Workforce efficiency metrics
- `quality`: Quality and risk indicators
- `health`: Overall health score

## Usage Examples

```bash
# Get all metrics for a project
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/projects/1/metrics/all

# Get specific metrics
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/projects/1/metrics/schedule

# Get cost analysis
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/api/projects/1/metrics/cost
```

## Metrics Calculated

### Schedule & Time
- **Schedule Variance**: `plannedDuration - actualDuration` (negative = behind schedule)
- **Forecasted End Date**: Based on current SPI performance
- **Milestone Completion Rate**: From work order status distribution

### Cost & Budget
- **Cost Variance (CV)**: `EV - AC` (positive = under budget)
- **Estimate at Completion (EAC)**: `BAC / CPI` (predicts final cost)
- **To-Complete Performance Index (TCPI)**: `(BAC - EV) / (BAC - AC)`
- **Remaining Budget**: `estimatedBudget - actualCost`

### Workforce Efficiency
- **Active Work Orders per Worker**: Average concurrent tasks
- **Average Work Order Duration**: Mean time from start to completion
- **Status Distribution**: Breakout by work order status

### Quality & Risk
- **Overdue Orders**: Work orders past their end date
- **Cost Overruns**: Work orders exceeding estimated budget
- **Risk Index**: Composite score (0-100) combining overdue and overbudget ratios

### Overall Health
Weighted composite score considering:
- Schedule Performance (35%)
- Cost Performance (35%)
- Completion Progress (20%)
- Risk Penalty (10%)

