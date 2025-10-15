from __future__ import annotations

import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

from flask import current_app
from flask_mail import Mail, Message

from .models import db, ProjectInvitation, Project, User


def generate_invitation_token() -> str:
    """Generate a secure random token for project invitations"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))


def create_project_invitation(email: str, project_id: int, invited_by: int, expires_in_days: int = 7) -> ProjectInvitation:
    """Create a new project invitation with a secure token"""
    # Check if there's already a pending invitation for this email and project
    existing_invitation = ProjectInvitation.query.filter_by(
        email=email,
        projectId=project_id,
        status="pending",
        isActive=True
    ).first()
    
    if existing_invitation:
        # Update the existing invitation with a new token and expiration
        existing_invitation.token = generate_invitation_token()
        existing_invitation.expiresAt = datetime.utcnow() + timedelta(days=expires_in_days)
        existing_invitation.createdAt = datetime.utcnow()
        return existing_invitation
    
    # Create new invitation
    invitation = ProjectInvitation(
        email=email,
        projectId=project_id,
        invitedBy=invited_by,
        token=generate_invitation_token(),
        status="pending",
        expiresAt=datetime.utcnow() + timedelta(days=expires_in_days)
    )
    
    db.session.add(invitation)
    db.session.commit()
    return invitation


def send_invitation_email(invitation: ProjectInvitation) -> bool:
    """Send an invitation email to the user"""
    try:
        project = Project.query.filter_by(id=invitation.projectId, isActive=True).first()
        inviter = User.query.filter_by(id=invitation.invitedBy, isActive=True).first()
        
        if not project or not inviter:
            return False
        
        # Create invitation link
        invitation_url = f"{current_app.config['APP_URL']}/register?token={invitation.token}"
        
        # Email content
        subject = f"You're invited to join the project: {project.name}"
        
        html_body = f"""
        <html>
        <body>
            <h2>Project Invitation</h2>
            <p>Hello,</p>
            <p>You have been invited by <strong>{inviter.firstName} {inviter.lastName}</strong> to join the project:</p>
            <h3>{project.name}</h3>
            <p><strong>Description:</strong> {project.description or 'No description provided'}</p>
            <p><strong>Location:</strong> {project.location or 'Not specified'}</p>
            <p><strong>Project Manager:</strong> {inviter.firstName} {inviter.lastName}</p>
            
            <p>To accept this invitation and create your account, click the link below:</p>
            <p><a href="{invitation_url}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Accept Invitation</a></p>
            
            <p>This invitation will expire on {invitation.expiresAt.strftime('%B %d, %Y at %I:%M %p')}.</p>
            
            <p>If you did not expect this invitation, you can safely ignore this email.</p>
            
            <hr>
            <p><small>This is an automated message from the Project Management System.</small></p>
        </body>
        </html>
        """
        
        text_body = f"""
        Project Invitation
        
        Hello,
        
        You have been invited by {inviter.firstName} {inviter.lastName} to join the project: {project.name}
        
        Description: {project.description or 'No description provided'}
        Location: {project.location or 'Not specified'}
        Project Manager: {inviter.firstName} {inviter.lastName}
        
        To accept this invitation and create your account, visit:
        {invitation_url}
        
        This invitation will expire on {invitation.expiresAt.strftime('%B %d, %Y at %I:%M %p')}.
        
        If you did not expect this invitation, you can safely ignore this email.
        """
        
        # Send email
        mail = Mail(current_app)
        msg = Message(
            subject=subject,
            recipients=[invitation.email],
            html=html_body,
            body=text_body
        )
        
        mail.send(msg)
        return True
        
    except Exception as e:
        current_app.logger.error(f"Failed to send invitation email: {str(e)}")
        return False


def validate_invitation_token(token: str) -> Optional[ProjectInvitation]:
    """Validate an invitation token and return the invitation if valid"""
    invitation = ProjectInvitation.query.filter_by(token=token, status="pending", isActive=True).first()
    
    if not invitation:
        return None
    
    # Check if invitation has expired
    if datetime.utcnow() > invitation.expiresAt:
        invitation.status = "expired"
        db.session.commit()
        return None
    
    return invitation


def accept_invitation(invitation: ProjectInvitation, user_id: int) -> bool:
    """Mark an invitation as accepted and add user to project"""
    try:
        # Mark invitation as accepted
        invitation.status = "accepted"
        invitation.acceptedAt = datetime.utcnow()
        
        # Add user to project (this will be handled by the project member endpoint)
        db.session.commit()
        return True
        
    except Exception as e:
        current_app.logger.error(f"Failed to accept invitation: {str(e)}")
        db.session.rollback()
        return False


def cleanup_expired_invitations():
    """Clean up expired invitations (can be run as a scheduled task)"""
    expired_invitations = ProjectInvitation.query.filter(
        ProjectInvitation.status == "pending",
        ProjectInvitation.expiresAt < datetime.utcnow()
    ).all()
    
    for invitation in expired_invitations:
        invitation.status = "expired"
    
    db.session.commit()
    return len(expired_invitations)
