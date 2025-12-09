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

- PUT `/api/auth/me`
  - Auth: required
  - Body (any subset): `firstName`, `lastName`, `emailAddress`, `phoneNumber`
  - 200: `{ user }`
  - 409 if email already in use

- POST `/api/auth/register-with-invitation`
  - Auth: none
  - Body required: `firstName`, `lastName`, `password`, `invitationToken`
  - Body optional: `phoneNumber`
  - 201: `{ message, accessToken, user }`
  - 400 if invalid/expired token; 409 if user already exists

- POST `/api/auth/accept-invitation`
  - Auth: required
  - Body: `{ "invitationToken": "..." }`
  - 200: `{ message, project }`
  - 400 if invalid token or already a member

- GET `/api/auth/workers`
  - Auth: required
  - 200: `{ users: [...] }` (all active workers)

- GET `/api/auth/allUsers`
  - Auth: required
  - 200: `{ users: [...] }` (all users, including inactive)

- POST `/api/auth/forgot-password`
  - Auth: none
  - Body: `{ "emailAddress": "..." }`
  - 200: `{ message }` (always returns success for security)

- POST `/api/auth/reset-password`
  - Auth: none
  - Body: `{ "token": "...", "password": "..." }`
  - 200: `{ message }`
  - 400 if invalid/expired token or password too short

- GET `/api/auth/reset-password/validate/<token>`
  - Auth: none
  - 200: `{ valid: true/false, email: "..." }`

- POST `/api/auth/upload-profile`
  - Auth: required
  - Content-Type: multipart/form-data
  - Body: `file` (PNG, JPG, JPEG)
  - 200: `{ message, profileImageUrl }`

- POST `/api/auth/deleteUser/<user_id>`
  - Auth: required; role: admin
  - Soft deletes user (sets isActive = False)
  - 200: `{ message, user }`
  - 403 if not admin; 404 if user not found

- POST `/api/auth/activateUser/<user_id>`
  - Auth: required; role: admin
  - Reactivates user (sets isActive = True)
  - 200: `{ message, user }`
  - 403 if not admin; 404 if user not found

- POST `/api/auth/updateUserRole/<user_id>`
  - Auth: required; role: admin
  - Body: `{ "role": "admin" | "worker" | "project_manager" }`
  - 200: `{ message, user }`
  - 403 if not admin; 400 if invalid role

- GET `/api/auth/ip`
  - Auth: none
  - 200: IP address as text

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

- PUT `/api/projects/{project_id}`
  - Auth: required; role: project_manager; must manage the project
  - Body (any subset): `name`, `description`, `location`, `startDate`, `endDate`, `status`, `priority`, `estimatedBudget`
  - 200: `{ project }`
  - 400/403/404 on errors

- PATCH `/api/projects/{project_id}/worker-update`
  - Auth: required; role: worker
  - Body (any subset): `status`, `actualCost`
  - 200: `{ project }`
  - Limited update endpoint for workers

- DELETE `/api/projects/{project_id}/managers/{manager_id}`
  - Auth: required; role: project_manager; must manage the project
  - 200: `{ "message": "Project manager removed successfully" }`
  - 404 if manager not found

- POST `/api/projects/{project_id}/invite`
  - Auth: required; role: project_manager; must manage the project
  - Body required: `email`, `role` (admin|worker|project_manager)
  - Body conditional: when `role=worker`, `workerType` (contractor|crew_member)
  - Body optional: `contractorExpirationDate` (YYYY-MM-DD, for contractors)
  - 201: `{ message, invitation }`
  - Sends invitation email; adds existing users immediately if found

- GET `/api/projects/{project_id}/invitations`
  - Auth: required; role: project_manager; must manage the project
  - 200: `{ invitations: [...] }`

- DELETE `/api/projects/{project_id}/invitations/{invitation_id}`
  - Auth: required; role: project_manager; must manage the project
  - 200: `{ "message": "Invitation cancelled successfully" }`
  - 404 if invitation not found

- GET `/api/projects/invitations/validate/<token>`
  - Auth: none
  - 200: `{ valid: true/false, invitation: {...} }`

- GET `/api/projects/{project_id}/audit-logs`
  - Auth: required; must be a member of the project
  - Query (optional): `limit`, `offset`, `entityType`, `field`
  - 200: `{ auditLogs: [...] }`

- GET `/api/projects/notifications`
  - Auth: required; role: project_manager
  - Query (optional): `limit` (default: 50), `unreadOnly` (default: false)
  - 200: `{ notifications: [...], unreadCount: N }`

- GET `/api/projects/notification-preferences`
  - Auth: required; role: project_manager
  - 200: `{ preferences: {...} }`

- PUT `/api/projects/notification-preferences`
  - Auth: required; role: project_manager
  - Body: `{ workOrderUpdates: true/false, ... }`
  - 200: `{ preferences: {...} }`

- POST `/api/projects/notifications/{notification_id}/dismiss`
  - Auth: required; role: project_manager
  - 200: `{ message }`

- POST `/api/projects/notifications/dismiss-all`
  - Auth: required; role: project_manager
  - 200: `{ message }`

- GET `/api/projects/supplies/catalog`
  - Auth: required
  - 200: `{ catalog: [...] }` (supply catalog items)

- GET `/api/projects/{project_id}/supplies`
  - Auth: required; must be a member of the project
  - Query (optional): `status`, `workOrderId`
  - 200: `{ supplies: [...] }`

- POST `/api/projects/{project_id}/supplies`
  - Auth: required; role: project_manager; must manage the project
  - Body required: `name`, `quantity`, `unit`, `catalogItemId` (optional)
  - Body optional: `description`, `status`, `workOrderId`, `requestedBy`
  - 201: `{ supply }`

- PATCH `/api/projects/{project_id}/supplies/{supply_id}/status`
  - Auth: required; role: project_manager; must manage the project
  - Body: `{ "status": "pending" | "approved" | "ordered" | "received" | "cancelled" }`
  - 200: `{ supply }`

- PUT `/api/projects/{project_id}/supplies/{supply_id}`
  - Auth: required; role: project_manager; must manage the project
  - Body (any subset): `name`, `description`, `quantity`, `unit`, `status`, `workOrderId`
  - 200: `{ supply }`

- DELETE `/api/projects/{project_id}/supplies/{supply_id}`
  - Auth: required; role: project_manager; must manage the project
  - 200: `{ "message": "Supply request deleted successfully" }`

- GET `/api/projects/{project_id}/workorders/{workorder_id}/supplies`
  - Auth: required; must be a member of the project
  - 200: `{ supplies: [...] }`

- POST `/api/projects/{project_id}/workorders/{workorder_id}/supplies/{supply_id}`
  - Auth: required; role: project_manager; must manage the project
  - Links supply to work order
  - 200: `{ message, supply }`

- DELETE `/api/projects/{project_id}/workorders/{workorder_id}/supplies/{supply_id}`
  - Auth: required; role: project_manager; must manage the project
  - Unlinks supply from work order
  - 200: `{ message }`

- GET `/api/projects/{project_id}/metrics/schedule`
  - Auth: required; must be a member of the project
  - 200: `{ metrics: {...} }` (schedule-related metrics)

- GET `/api/projects/{project_id}/metrics/cost`
  - Auth: required; must be a member of the project
  - 200: `{ metrics: {...} }` (cost-related metrics)

- GET `/api/projects/{project_id}/metrics/workforce`
  - Auth: required; must be a member of the project
  - 200: `{ metrics: {...} }` (workforce-related metrics)

- GET `/api/projects/{project_id}/metrics/quality`
  - Auth: required; must be a member of the project
  - 200: `{ metrics: {...} }` (quality-related metrics)

- GET `/api/projects/{project_id}/metrics/health`
  - Auth: required; must be a member of the project
  - 200: `{ metrics: {...} }` (overall project health)

- GET `/api/projects/{project_id}/metrics/all`
  - Auth: required; must be a member of the project
  - 200: `{ metrics: {...} }` (all metrics combined)

- GET `/api/projects/{project_id}/report-data`
  - Auth: required; must be a member of the project
  - 200: `{ reportData: {...} }` (comprehensive report data)

- POST `/api/projects/recalculate-costs`
  - Auth: required; role: admin
  - Recalculates actual costs for all projects
  - 200: `{ message }`

- GET `/api/projects/debug/{project_id}`
  - Auth: required; role: admin
  - 200: `{ debug: {...} }` (debug information)

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

- POST `/api/workorders/{workorder_id}/complete`
  - Auth: required
  - Sets status to completed and actualEndDate to today
  - 200: `{ workorder }`

- POST `/api/workorders/{workorder_id}/start`
  - Auth: required
  - Sets actualStartDate to today and status to in_progress
  - 200: `{ workorder }`

- PATCH `/api/workorders/{workorder_id}/worker-update`
  - Auth: required; role: worker
  - Body (any subset): `status`, `actualCost`
  - 200: `{ workorder }`
  - Limited update endpoint for workers

- POST `/api/workorders/{workorder_id}/assign-worker`
  - Auth: required; role: project_manager
  - Body: `{ "userId": 123 }`
  - 200: `{ workorder, message }`
  - Worker must be a member of the project

- POST `/api/workorders/{workorder_id}/remove-worker`
  - Auth: required; role: project_manager
  - Body: `{ "userId": 123 }`
  - 200: `{ workorder, message }`

- PUT `/api/workorders/{workorder_id}/assign-workers`
  - Auth: required; role: project_manager
  - Body: `{ "workerIds": [1, 2, 3] }`
  - 200: `{ workorder, message }`
  - Replaces all assigned workers with the provided list

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

### Messages
- GET `/api/messages/conversations`
  - Auth: required
  - 200: `{ conversations: [...] }` (all conversations for current user)

- GET `/api/messages/conversations/{conversation_id}`
  - Auth: required; must be a participant
  - 200: `{ conversation: {...} }`

- POST `/api/messages/conversations`
  - Auth: required; role: worker or project_manager
  - Body: `{ "otherUserId": 123 }`
  - 200/201: `{ conversation: {...} }` (returns existing or creates new)

- GET `/api/messages/conversations/{conversation_id}/messages`
  - Auth: required; must be a participant
  - Query (optional): `limit` (default: 50), `offset` (default: 0)
  - 200: `{ messages: [...], total: N }`

- POST `/api/messages/conversations/{conversation_id}/messages`
  - Auth: required; must be a participant
  - Body: `{ "content": "..." }`
  - 201: `{ message: {...} }`

- PUT `/api/messages/messages/{message_id}/read`
  - Auth: required; must be the recipient
  - 200: `{ message: {...} }`

- PUT `/api/messages/conversations/{conversation_id}/read`
  - Auth: required; must be a participant
  - Marks all unread messages in conversation as read
  - 200: `{ message: "..." }`

- GET `/api/messages/unread-count`
  - Auth: required
  - 200: `{ unreadCount: N }`

### Common Errors
- 400: validation errors (date format, priority range, invalid enums)
- 401: missing/invalid JWT
- 403: role restrictions (project manager only, admin only, etc.)
- 404: resource not found
- 409: conflict (email already exists, user already a member, etc.)
- 500: internal server error

### Notes
- Tables are created automatically on app startup via `db.create_all()` inside `create_app()` in `src/backend/app.py`.
- Database URL is configured via `DATABASE_URL` env var (see `docker-compose.yml`).
- Most endpoints support both JSON and form-data content types.
- Project invitations expire after 7 days by default.
- Password reset tokens expire after 1 hour.
- Profile pictures are stored in Google Cloud Storage.


