from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Set, Tuple
from flask import current_app
from flask_mail import Mail, Message

from .models import db, Project, User, ProjectManager, AuditEntityType, NotificationPreference


def should_notify_for_change(entity_type: AuditEntityType, field: str, old_value: Optional[str], new_value: Optional[str]) -> bool:
    """
    Determine if a change is worth notifying project managers about.
    
    Returns True for important changes that managers should be aware of.
    """
    # Always notify for work order creation
    if field == "work_order_created":
        return True
    
    # Always notify for status changes
    if field == "status":
        return True
    
    # Always notify for priority changes (especially important for high/critical)
    if field == "priority":
        return True
    
    # Notify for significant budget/cost changes (>10% change)
    if field in ["estimatedBudget", "actualCost"]:
        try:
            old_val = float(old_value) if old_value and old_value != "None" else 0
            new_val = float(new_value) if new_value and new_value != "None" else 0
            if old_val > 0:
                percent_change = abs((new_val - old_val) / old_val) * 100
                return percent_change >= 10  # Notify if change is >= 10%
            elif new_val > 0:
                return True  # Notify if budget/cost is newly set
        except (ValueError, TypeError):
            pass
    
    # Notify for date changes (especially delays)
    if field in ["startDate", "endDate", "actualStartDate", "actualEndDate"]:
        return True
    
    # Notify for team member changes
    if field == "teamMembers":
        return True
    
    # Don't notify for minor changes like description, location, name
    # (unless they're critical, but we'll keep it simple for now)
    return False


def get_project_managers(project_id: int, exclude_user_id: Optional[int] = None) -> List[User]:
    """
    Get all active project managers for a project, excluding a specific user if provided.
    
    Returns a list of User objects who are managers of the project.
    """
    managers: Set[int] = set()
    
    # Get managers from ProjectManager table
    project_managers = ProjectManager.query.filter_by(
        projectId=project_id,
        isActive=True
    ).all()
    
    for pm in project_managers:
        if pm.userId != exclude_user_id:
            managers.add(pm.userId)
    
    # Also check legacy projectManagerId field
    project = Project.query.filter_by(id=project_id, isActive=True).first()
    if project and project.projectManagerId:
        if project.projectManagerId != exclude_user_id:
            managers.add(project.projectManagerId)
    
    # Get all manager users
    if not managers:
        return []
    
    manager_users = User.query.filter(
        User.id.in_(list(managers)),
        User.isActive == True
    ).all()
    
    return manager_users


def format_change_description(field: str, old_value: Optional[str], new_value: Optional[str], entity_name: Optional[str] = None) -> str:
    """Format a change description in a human-readable way."""
    # Special handling for work order creation
    if field == "work_order_created":
        if entity_name:
            return f"New work order created: {entity_name}"
        else:
            return f"New work order created: {new_value}"
    
    field_display = field.replace("_", " ").title()
    
    # Format values for display
    old_display = old_value if old_value and old_value != "None" else "Not set"
    new_display = new_value if new_value and new_value != "None" else "Not set"
    
    # Special formatting for certain fields
    if field == "status":
        old_display = old_value.replace("_", " ").title() if old_value else "Not set"
        new_display = new_value.replace("_", " ").title() if new_value else "Not set"
    elif field in ["estimatedBudget", "actualCost"]:
        try:
            old_val = float(old_value) if old_value and old_value != "None" else 0
            new_val = float(new_value) if new_value and new_value != "None" else 0
            old_display = f"${old_val:,.2f}" if old_val > 0 else "Not set"
            new_display = f"${new_val:,.2f}" if new_val > 0 else "Not set"
        except (ValueError, TypeError):
            pass
    
    if entity_name:
        return f"{field_display} for {entity_name}: {old_display} → {new_display}"
    else:
        return f"{field_display}: {old_display} → {new_display}"


def send_project_notification(
    project_id: int,
    change_description: str,
    changed_by_user: User,
    entity_type: AuditEntityType,
    entity_name: Optional[str] = None,
    exclude_user_id: Optional[int] = None,
    specific_manager_id: Optional[int] = None
) -> bool:
    """
    Send email notifications to project managers about a change.
    
    Args:
        project_id: ID of the project
        change_description: Human-readable description of the change
        changed_by_user: User who made the change
        entity_type: Type of entity that changed (PROJECT or WORK_ORDER)
        entity_name: Optional name of the entity (e.g., work order name)
        exclude_user_id: User ID to exclude from notifications (usually the one who made the change)
        specific_manager_id: If provided, only send to this specific manager
    
    Returns:
        True if at least one email was sent successfully, False otherwise
    """
    try:
        project = Project.query.filter_by(id=project_id, isActive=True).first()
        if not project:
            return False
        
        # Get managers to notify
        if specific_manager_id:
            # Send to specific manager only
            manager = User.query.filter_by(id=specific_manager_id, isActive=True).first()
            managers = [manager] if manager else []
        else:
            # Get all project managers (excluding the one who made the change)
            managers = get_project_managers(project_id, exclude_user_id=exclude_user_id)
        
        if not managers:
            # No managers to notify
            return False
        
        # Prepare email content
        entity_type_display = "Work Order" if entity_type == AuditEntityType.WORK_ORDER else "Project"
        subject = f"Project Update: {project.name}"
        
        # Build change summary
        change_summary = change_description
        if entity_name and entity_type == AuditEntityType.WORK_ORDER:
            change_summary = f"{entity_type_display} '{entity_name}': {change_description}"
        
        # Create project URL (assuming frontend URL structure)
        app_url = current_app.config.get('APP_URL', 'http://localhost:3000')
        project_url = f"{app_url}/projects/{project_id}"
        
        # Send email to each manager
        mail = Mail(current_app)
        success_count = 0
        
        for manager in managers:
            try:
                html_body = f"""
                <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2c3e50;">Project Update Notification</h2>
                        <p>Hello {manager.firstName},</p>
                        <p>A change has been made to a project you manage:</p>
                        
                        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
                            <p style="margin: 0;"><strong>Project:</strong> {project.name}</p>
                            <p style="margin: 5px 0;"><strong>Change:</strong> {change_summary}</p>
                            <p style="margin: 5px 0;"><strong>Changed by:</strong> {changed_by_user.firstName} {changed_by_user.lastName}</p>
                            <p style="margin: 5px 0;"><strong>Time:</strong> {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}</p>
                        </div>
                        
                        <p>To view the project and see all changes, click the link below:</p>
                        <p><a href="{project_url}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Project</a></p>
                        
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="color: #666; font-size: 12px;">This is an automated notification from the Project Management System.</p>
                    </div>
                </body>
                </html>
                """
                
                text_body = f"""
                Project Update Notification
                
                Hello {manager.firstName},
                
                A change has been made to a project you manage:
                
                Project: {project.name}
                Change: {change_summary}
                Changed by: {changed_by_user.firstName} {changed_by_user.lastName}
                Time: {datetime.utcnow().strftime('%B %d, %Y at %I:%M %p UTC')}
                
                To view the project, visit: {project_url}
                
                This is an automated notification from the Project Management System.
                """
                
                msg = Message(
                    subject=subject,
                    recipients=[manager.emailAddress],
                    html=html_body,
                    body=text_body
                )
                
                mail.send(msg)
                success_count += 1
                
            except Exception as e:
                current_app.logger.error(f"Failed to send notification email to {manager.emailAddress}: {str(e)}")
                continue
        
        return success_count > 0
        
    except Exception as e:
        current_app.logger.error(f"Failed to send project notifications: {str(e)}")
        return False


def get_user_preference_key(entity_type: AuditEntityType, field: str, new_value: Optional[str] = None) -> Optional[str]:
    """
    Map a change to the corresponding preference key.
    Returns the preference key name, or None if no preference exists for this change type.
    """
    # Project preferences
    if entity_type == AuditEntityType.PROJECT:
        if field == "status":
            return "projectStatusChange"
        elif field == "priority":
            return "projectPriorityChange"
        elif field in ["estimatedBudget", "actualCost"]:
            return "projectBudgetChange"
        elif field in ["startDate", "endDate", "actualStartDate", "actualEndDate"]:
            return "projectDateChange"
        elif field == "teamMembers":
            return "projectTeamChange"
    
    # Work order preferences
    elif entity_type == AuditEntityType.WORK_ORDER:
        if field == "work_order_created":
            return "workOrderCreated"
        elif field == "status":
            # Check if it's a completion
            if new_value and "completed" in new_value.lower():
                return "workOrderCompleted"
            else:
                return "workOrderStatusChange"
        elif field == "priority":
            return "workOrderPriorityChange"
        elif field in ["estimatedBudget", "actualCost"]:
            return "workOrderBudgetChange"
        elif field in ["startDate", "endDate", "actualStartDate", "actualEndDate"]:
            return "workOrderDateChange"
    
    return None


def should_send_notification(user_id: int, preference_key: Optional[str]) -> Tuple[bool, bool]:
    """
    Check if a user wants to receive a notification (in-app and/or email).
    
    Returns:
        Tuple of (should_send_in_app, should_send_email)
        If preference_key is None, defaults to True for both (backward compatibility)
    """
    if not preference_key:
        # No preference key means we should notify (backward compatibility)
        return (True, True)
    
    preferences = NotificationPreference.query.filter_by(userId=user_id).first()
    if not preferences:
        # No preferences means default to enabled
        return (True, True)
    
    # Get the in-app preference
    in_app_key = preference_key
    email_key = f"{preference_key}Email"
    
    in_app_enabled = getattr(preferences, in_app_key, True)
    email_enabled = getattr(preferences, email_key, True)
    
    return (in_app_enabled, email_enabled)


def notify_project_managers_of_change(
    entity_type: AuditEntityType,
    entity_id: int,
    project_id: int,
    user_id: int,
    field: str,
    old_value: Optional[str],
    new_value: Optional[str],
    entity_name: Optional[str] = None
) -> bool:
    """
    Main function to notify project managers of a change.
    This is called after an audit log is created.
    
    Args:
        entity_type: Type of entity (PROJECT or WORK_ORDER)
        entity_id: ID of the entity that changed
        project_id: ID of the project
        user_id: ID of the user who made the change
        field: Field that changed
        old_value: Old value
        new_value: New value
        entity_name: Optional name of the entity (for work orders)
    
    Returns:
        True if notifications were sent, False otherwise
    """
    # Check if this change is worth notifying about
    if not should_notify_for_change(entity_type, field, old_value, new_value):
        return False
    
    # Get the user who made the change
    changed_by_user = User.query.filter_by(id=user_id, isActive=True).first()
    if not changed_by_user:
        return False
    
    # Format the change description
    change_description = format_change_description(field, old_value, new_value, entity_name)
    
    # Get preference key for this change type
    preference_key = get_user_preference_key(entity_type, field, new_value)
    
    # Get all project managers (excluding the one who made the change)
    managers = get_project_managers(project_id, exclude_user_id=user_id)
    
    if not managers:
        return False
    
    # Send notifications to each manager based on their preferences
    # In-app notifications are always created (via audit logs), but we check preferences
    # when displaying them in the notifications endpoint
    # For emails, we need to send individually based on preferences
    
    # Collect managers who want email notifications
    email_recipients = []
    for manager in managers:
        should_in_app, should_email = should_send_notification(manager.id, preference_key)
        if should_email:
            email_recipients.append(manager)
    
    # Send email notifications to managers who want them
    if email_recipients:
        for manager in email_recipients:
            try:
                send_project_notification(
                    project_id=project_id,
                    change_description=change_description,
                    changed_by_user=changed_by_user,
                    entity_type=entity_type,
                    entity_name=entity_name,
                    exclude_user_id=None,
                    specific_manager_id=manager.id
                )
            except Exception as e:
                current_app.logger.error(f"Failed to send email to manager {manager.id}: {str(e)}")
    
    # Return True if we have managers (in-app notifications will be filtered by preferences in the endpoint)
    return len(managers) > 0

