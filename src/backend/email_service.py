from __future__ import annotations

import secrets
import string
from datetime import datetime, timedelta
from typing import Optional

from flask import current_app
from flask_mail import Mail, Message

from .models import db, ProjectInvitation, Project, User, PasswordReset


def generate_invitation_token() -> str:
    """Generate a secure random token for project invitations"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(32))


def create_project_invitation(email: str, project_id: int, invited_by: int, role, worker_type=None, contractor_expiration_date=None, expires_in_days: int = 7) -> ProjectInvitation:
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
        existing_invitation.role = role
        existing_invitation.workerType = worker_type
        existing_invitation.contractorExpirationDate = contractor_expiration_date
        return existing_invitation
    
    # Create new invitation
    invitation = ProjectInvitation(
        email=email,
        projectId=project_id,
        invitedBy=invited_by,
        token=generate_invitation_token(),
        role=role,
        workerType=worker_type,
        contractorExpirationDate=contractor_expiration_date,
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
        role_display = invitation.role.value.replace('_', ' ').title()
        worker_type_display = invitation.workerType.value.replace('_', ' ').title() if invitation.workerType else None
        
        subject = f"You're invited to join the project: {project.name} as {role_display}"
        
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
            <p><strong>Role:</strong> {role_display}</p>
            {f'<p><strong>Worker Type:</strong> {worker_type_display}</p>' if worker_type_display else ''}
            {f'<p><strong>Contractor Expiration Date:</strong> {invitation.contractorExpirationDate.strftime("%B %d, %Y")}</p>' if invitation.contractorExpirationDate else ''}
            
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
        Role: {role_display}
        {f'Worker Type: {worker_type_display}' if worker_type_display else ''}
        {f'Contractor Expiration Date: {invitation.contractorExpirationDate.strftime("%B %d, %Y")}' if invitation.contractorExpirationDate else ''}
        
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


def create_password_reset_token(user_id: int, expires_in_hours: int = 1) -> PasswordReset:
    """Create a password reset token for a user"""
    # Invalidate any existing unused tokens for this user
    existing_resets = PasswordReset.query.filter_by(userId=user_id, used=False).all()
    for reset in existing_resets:
        reset.used = True
    
    # Generate secure token
    token = generate_invitation_token()
    
    # Create new password reset record
    password_reset = PasswordReset(
        userId=user_id,
        token=token,
        expiresAt=datetime.utcnow() + timedelta(hours=expires_in_hours),
        used=False
    )
    
    db.session.add(password_reset)
    db.session.commit()
    return password_reset


def send_password_reset_email(password_reset: PasswordReset) -> bool:
    """Send a password reset email to the user"""
    try:
        user = User.query.filter_by(id=password_reset.userId, isActive=True).first()
        
        if not user:
            return False
        
        # Create reset link
        reset_url = f"{current_app.config['APP_URL']}/reset-password?token={password_reset.token}"
        
        subject = "Password Reset Request"
        
        html_body = f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Hello {user.firstName},</p>
            <p>You have requested to reset your password for your Project Management System account.</p>
            <p>To reset your password, click the link below:</p>
            <p><a href="{reset_url}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
            <p>This link will expire on {password_reset.expiresAt.strftime('%B %d, %Y at %I:%M %p')}.</p>
            <p>If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
            <hr>
            <p><small>This is an automated message from the Project Management System.</small></p>
        </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Request
        
        Hello {user.firstName},
        
        You have requested to reset your password for your Project Management System account.
        
        To reset your password, visit:
        {reset_url}
        
        This link will expire on {password_reset.expiresAt.strftime('%B %d, %Y at %I:%M %p')}.
        
        If you did not request this password reset, please ignore this email. Your password will remain unchanged.
        """
        
        # Send email
        mail = Mail(current_app)
        msg = Message(
            subject=subject,
            recipients=[user.emailAddress],
            html=html_body,
            body=text_body
        )
        
        mail.send(msg)
        return True
        
    except Exception as e:
        current_app.logger.error(f"Failed to send password reset email: {str(e)}")
        return False


def validate_password_reset_token(token: str) -> Optional[PasswordReset]:
    """Validate a password reset token and return the reset record if valid"""
    password_reset = PasswordReset.query.filter_by(token=token, used=False).first()
    
    if not password_reset:
        return None
    
    # Check if token has expired
    if datetime.utcnow() > password_reset.expiresAt:
        password_reset.used = True
        db.session.commit()
        return None
    
    return password_reset
