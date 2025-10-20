# Project Access Management System

This document describes the access management system that allows project managers to invite users to their projects via email invitations.

## Overview

The access management system provides two main workflows:

1. **New User Invitation**: Project managers can invite users who don't have accounts yet
2. **Existing User Addition**: Project managers can add existing users to their projects

## Features

- **Email Invitations**: Secure token-based invitations sent via email
- **Automatic Account Creation**: New users can register using invitation tokens
- **Existing User Integration**: Existing users can accept invitations to join projects
- **Token Expiration**: Invitations expire after 7 days for security
- **Invitation Management**: Project managers can view and cancel pending invitations

## API Endpoints

### Project Manager Endpoints

#### Send Invitation to New User
```
POST /api/projects/{project_id}/invite
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "Invitation sent successfully",
  "invitation": {
    "id": 1,
    "email": "user@example.com",
    "projectId": 1,
    "token": "abc123...",
    "status": "pending",
    "expiresAt": "2024-01-15T10:00:00Z"
  }
}
```

#### Add Existing User to Project
```
POST /api/projects/{project_id}/members
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "email": "existing@example.com"
}
```

**Response:**
```json
{
  "message": "Member added successfully",
  "member": {
    "id": 1,
    "projectId": 1,
    "userId": 2,
    "joinedAt": "2024-01-08T10:00:00Z"
  }
}
```

#### View Project Invitations
```
GET /api/projects/{project_id}/invitations
Authorization: Bearer {jwt_token}
```

**Response:**
```json
{
  "invitations": [
    {
      "id": 1,
      "email": "user@example.com",
      "projectId": 1,
      "status": "pending",
      "createdAt": "2024-01-08T10:00:00Z",
      "expiresAt": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### Cancel Invitation
```
DELETE /api/projects/{project_id}/invitations/{invitation_id}
Authorization: Bearer {jwt_token}
```

### Public Endpoints

#### Validate Invitation Token
```
GET /api/projects/invitations/validate/{token}
```

**Response:**
```json
{
  "valid": true,
  "invitation": {
    "id": 1,
    "email": "user@example.com",
    "projectId": 1,
    "project": {
      "name": "Sample Project",
      "description": "A sample project"
    }
  }
}
```

### Authentication Endpoints

#### Register with Invitation Token
```
POST /api/auth/register-with-invitation
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "password": "securepassword",
  "invitationToken": "abc123...",
  "role": "worker",
  "workerType": "contractor",
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "message": "Account created successfully and added to project",
  "accessToken": "jwt_token_here",
  "user": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "emailAddress": "user@example.com",
    "role": "worker"
  }
}
```

#### Accept Invitation (Existing User)
```
POST /api/auth/accept-invitation
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "invitationToken": "abc123..."
}
```

**Response:**
```json
{
  "message": "Successfully joined the project",
  "project": {
    "id": 1,
    "name": "Sample Project"
  }
}
```

## Email Configuration

To enable email functionality, set the following environment variables:

```bash
# Email server configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_DEFAULT_SENDER=noreply@yourcompany.com

# Application URL for invitation links
APP_URL=http://localhost:3000
```

### Gmail Setup

For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use the app password in `MAIL_PASSWORD`

## Database Schema

### ProjectInvitation Table

```sql
CREATE TABLE project_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    projectId INT NOT NULL,
    invitedBy INT NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    createdAt DATETIME NOT NULL,
    expiresAt DATETIME NOT NULL,
    acceptedAt DATETIME NULL,
    FOREIGN KEY (projectId) REFERENCES projects(id),
    FOREIGN KEY (invitedBy) REFERENCES users(id),
    UNIQUE KEY unique_pending_invitation (email, projectId, status)
);
```

## Workflow Examples

### Scenario 1: Inviting a New User

1. **Project Manager sends invitation:**
   ```bash
   curl -X POST http://localhost:8080/api/projects/1/invite \
     -H "Authorization: Bearer {jwt_token}" \
     -H "Content-Type: application/json" \
     -d '{"email": "newuser@example.com"}'
   ```

2. **User receives email with invitation link:**
   - Email contains project details and invitation link
   - Link format: `http://localhost:3000/register?token=abc123...`

3. **User clicks link and registers:**
   ```bash
   curl -X POST http://localhost:8080/api/auth/register-with-invitation \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "Jane",
       "lastName": "Smith",
       "password": "securepassword",
       "invitationToken": "abc123...",
       "role": "worker",
       "workerType": "crew_member"
     }'
   ```

4. **User is automatically added to project and logged in**

### Scenario 2: Adding an Existing User

1. **Project Manager adds existing user:**
   ```bash
   curl -X POST http://localhost:8080/api/projects/1/members \
     -H "Authorization: Bearer {jwt_token}" \
     -H "Content-Type: application/json" \
     -d '{"email": "existing@example.com"}'
   ```

2. **User is immediately added to project (no invitation needed)**

### Scenario 3: Existing User Accepts Invitation

1. **Project Manager sends invitation to existing user's email**
2. **User receives email with invitation link**
3. **User logs in and accepts invitation:**
   ```bash
   curl -X POST http://localhost:8080/api/auth/accept-invitation \
     -H "Authorization: Bearer {jwt_token}" \
     -H "Content-Type: application/json" \
     -d '{"invitationToken": "abc123..."}'
   ```

## Security Features

- **Secure Tokens**: 32-character random tokens for invitations
- **Token Expiration**: Invitations expire after 7 days
- **Email Validation**: Invitation tokens are tied to specific email addresses
- **Authorization**: Only project managers can send invitations
- **Duplicate Prevention**: Users can't be added to the same project twice

## Error Handling

Common error responses:

- `400 Bad Request`: Invalid email format, missing required fields
- `401 Unauthorized`: Invalid or missing JWT token
- `403 Forbidden`: User not authorized to perform action
- `404 Not Found`: Project, user, or invitation not found
- `409 Conflict`: User already exists or is already a member
- `500 Internal Server Error`: Email delivery failure or database error

## Maintenance

### Cleanup Expired Invitations

The system includes a utility function to clean up expired invitations:

```python
from src.backend.email_service import cleanup_expired_invitations

# Run this periodically (e.g., daily cron job)
expired_count = cleanup_expired_invitations()
print(f"Cleaned up {expired_count} expired invitations")
```

## Testing

To test the email functionality without sending actual emails, you can:

1. Set up a test SMTP server
2. Use environment variables to configure email settings
3. Check the application logs for email sending status

## Troubleshooting

### Common Issues

1. **Email not sending**: Check SMTP configuration and credentials
2. **Token validation failing**: Ensure tokens haven't expired
3. **User already exists**: Use the existing user acceptance flow
4. **Permission denied**: Ensure user is a project manager for the project

### Debug Mode

Enable debug logging to see detailed email sending information:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```
