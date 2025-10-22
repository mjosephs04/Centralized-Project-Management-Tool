## Backend API Developer Docs

- **Base URL**: `http://localhost:8080`
- **Auth**: JWT required for most endpoints. Set header `Authorization: Bearer <token>`
- **Content-Type**: `application/json`

### Health
- GET `/api/health`
  - Auth: none
  - 200: `{ "status": "ok" }`

### Auth
- POST `/api/auth/register`
  - Auth: none
  - Body required: `firstName`, `lastName`, `emailAddress`, `password`, `role` (admin|worker|project_manager)
  - Body conditional: when `role=worker`, `workerType` (contractor|crew_member)
  - Body optional: `phoneNumber`
  - 201: `{ user }`
  - 400/409 on validation

- POST `/api/auth/login`
  - Auth: none
  - Body: `emailAddress`, `password`
  - 200: `{ accessToken, user }`
  - 401 invalid credentials

- GET `/api/auth/me`
  - Auth: required
  - 200: `{ user }`

### Projects
- GET `/api/projects/test`
  - Auth: none
  - 200: `{ "message": "Projects endpoint is working" }`

- POST `/api/projects/`
  - Auth: required; role: project_manager
  - Body required: `name`, `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD)
  - Body optional: `description`, `location`, `status` (planning|in_progress|on_hold|completed|cancelled), `priority` (low|medium|high|critical), `estimatedBudget`
  - 201: `{ project }`
  - 400 on validation errors

- DELETE `/api/projects/{project_id}`
  - Auth: required; role: project_manager; must manage the project
  - 200: `{ "message": "Project deleted successfully" }`
  - 404 not found; 403 not manager

- GET `/api/projects/`
  - Auth: required
  - 200: `{ projects: [...] }`

- GET `/api/projects/{project_id}`
  - Auth: required
  - 200: `{ project }` or 404

- GET `/api/projects/my-projects`
  - Auth: required
  - 200: `{ projects: [...] }` (project managers: only theirs; others: all for now)

- GET `/api/projects/{project_id}/members`
  - Auth: required; must be a member of the project
  - 200: `{ members: [...] }` (includes project manager + assigned members)
  - 403 if not a project member; 404 if project not found

- POST `/api/projects/{project_id}/members`
  - Auth: required; role: project_manager; must manage the project
  - Body: `{ "userId": 123 }`
  - 201: `{ "message": "Member added successfully", "member": {...} }`
  - 400 if user already a member; 404 if user/project not found

- DELETE `/api/projects/{project_id}/members/{member_id}`
  - Auth: required; role: project_manager; must manage the project
  - 200: `{ "message": "Member removed successfully" }`
  - 404 if member not found

### Project Progress & Dashboard
- GET `/api/projects/dashboard`
  - Auth: required
  - Query (optional):
    - `status` = planning|in_progress|on_hold|completed|cancelled
    - `managerOnly` = true|false
    - `date` = YYYY-MM-DD
    - `w_work_orders`, `w_schedule`, `w_earned_value` (weights)
    - `sort` = e.g. `overallProgress,-priority`
    - `page` = 1, `pageSize` = 25
  - 200: `{ count, page, pageSize, results: [...] }`

- GET `/api/projects/{project_id}/progress/detail`
  - Auth: required
  - Query (optional): `date` = YYYY-MM-DD
  - 200: Detailed progress payload or 404

### Work Orders
- GET `/api/workorders/test`
  - Auth: none
  - 200: `{ "message": "Work orders endpoint is working" }`

- POST `/api/workorders/`
  - Auth: required; role: project_manager
  - Body required: `name`, `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD), `priority` (1-5), `projectId`
  - Body optional: `description`, `location`, `suppliesList`, `status` (pending|in_progress|on_hold|completed|cancelled), `estimatedBudget`
  - 201: `{ workorder }`
  - 400/404 on validation

- GET `/api/workorders/`
  - Auth: required
  - 200: `{ workorders: [...] }`

- GET `/api/workorders/{workorder_id}`
  - Auth: required
  - 200: `{ workorder }` or 404

- GET `/api/workorders/project/{project_id}`
  - Auth: required
  - 200: `{ workorders: [...] }` or 404 if project not found

- PUT `/api/workorders/{workorder_id}`
  - Auth: required; role: project_manager
  - Body (any subset): `name`, `description`, `location`, `suppliesList`, `startDate`, `endDate`, `actualStartDate`, `actualEndDate`, `status`, `priority` (1-5), `estimatedBudget`, `actualCost`
  - 200: `{ workorder }` or 400/404

- DELETE `/api/workorders/{workorder_id}`
  - Auth: required; role: project_manager
  - 200: `{ "message": "Work order deleted successfully" }` or 404

### Example Payloads

#### Create Project
```json
{
  "name": "Office Renovation",
  "description": "Renovate 3rd floor open space",
  "location": "HQ - Floor 3",
  "startDate": "2025-10-01",
  "endDate": "2025-12-15",
  "priority": "high",
  "status": "planning",
  "estimatedBudget": 150000
}
```

#### Create Work Order
```json
{
  "name": "Install Electrical Wiring",
  "description": "Outlets, switches, lighting fixtures",
  "location": "Building A - Floor 1",
  "suppliesList": "Wire 12AWG, Outlets 20, Switches 15",
  "startDate": "2025-10-05",
  "endDate": "2025-10-20",
  "priority": 3,
  "projectId": 1,
  "status": "pending",
  "estimatedBudget": 2500
}
```

#### Update Work Order (partial)
```json
{
  "status": "in_progress",
  "actualStartDate": "2025-10-07",
  "actualCost": 500
}
```

### Common Errors
- 400: validation errors (date format, priority range, invalid enums)
- 401: missing/invalid JWT
- 403: role restrictions (project manager only)
- 404: resource not found

### Notes
- Tables are created automatically on app startup via `db.create_all()` inside `create_app()` in `src/backend/app.py`.
- Database URL is configured via `DATABASE_URL` env var (see `docker-compose.yml`).


