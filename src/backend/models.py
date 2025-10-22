from __future__ import annotations

import enum
import json
from datetime import datetime

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import DECIMAL


db = SQLAlchemy()


class UserRole(enum.Enum):
    ADMIN = "admin"
    WORKER = "worker"
    PROJECT_MANAGER = "project_manager"


class WorkerType(enum.Enum):
    CONTRACTOR = "contractor"
    CREW_MEMBER = "crew_member"


class ProjectStatus(enum.Enum):
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class WorkOrderStatus(enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AuditEntityType(enum.Enum):
    PROJECT = "project"
    WORK_ORDER = "work_order"


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    firstName = db.Column(db.String(100), nullable=False)
    lastName = db.Column(db.String(100), nullable=False)
    phoneNumber = db.Column(db.String(30), nullable=True)
    emailAddress = db.Column(db.String(255), unique=True, nullable=False, index=True)
    passwordHash = db.Column(db.String(255), nullable=False)

    role = db.Column(db.Enum(UserRole), nullable=False)

    # Only applicable when role == WORKER
    workerType = db.Column(db.Enum(WorkerType), nullable=True)

    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    isActive = db.Column(db.Boolean, default=True, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "firstName": self.firstName,
            "lastName": self.lastName,
            "phoneNumber": self.phoneNumber,
            "emailAddress": self.emailAddress,
            "role": self.role.value if self.role else None,
            "workerType": self.workerType.value if self.workerType else None,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
            "isActive": self.isActive,
        }


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(300), nullable=True)
    
    # Project timeline
    startDate = db.Column(db.Date, nullable=False)
    endDate = db.Column(db.Date, nullable=False)
    actualStartDate = db.Column(db.Date, nullable=True)
    actualEndDate = db.Column(db.Date, nullable=True)
    
    # Project status and priority
    status = db.Column(db.Enum(ProjectStatus), default=ProjectStatus.PLANNING, nullable=False)
    priority = db.Column(db.String(20), default="medium", nullable=False)  # low, medium, high, critical
    
    # Budget and cost tracking
    estimatedBudget = db.Column(DECIMAL(15, 2), nullable=True)
    actualCost = db.Column(DECIMAL(15, 2), nullable=True)
    
    # Team members are handled through the ProjectMember relationship model
    
    # Relationships
    projectManagerId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    projectManager = db.relationship('User', backref=db.backref('managed_projects', lazy=True))
    
    # Metadata
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    isActive = db.Column(db.Boolean, default=True, nullable=False)

    def get_crew_members(self) -> list:
        """Get crew members as a list of user IDs from ProjectMember relationships"""
        try:
            return [member.userId for member in self.members if member.isActive]
        except Exception:
            # If members relationship is not loaded, return empty list
            return []

    def set_crew_members(self, member_ids: list):
        """Set crew members from a list of user IDs using ProjectMember relationships"""
        try:
            # Remove existing members
            for member in self.members:
                if member.userId not in member_ids:
                    member.isActive = False

            # Add new members
            for user_id in member_ids:
                existing_member = next((m for m in self.members if m.userId == user_id), None)
                if existing_member:
                    existing_member.isActive = True
                else:
                    new_member = ProjectMember(projectId=self.id, userId=user_id)
                    db.session.add(new_member)
        except Exception:
            # If members relationship is not loaded, just add new members
            for user_id in member_ids:
                new_member = ProjectMember(projectId=self.id, userId=user_id)
                db.session.add(new_member)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "location": self.location,
            "startDate": self.startDate.isoformat() if self.startDate else None,
            "endDate": self.endDate.isoformat() if self.endDate else None,
            "actualStartDate": self.actualStartDate.isoformat() if self.actualStartDate else None,
            "actualEndDate": self.actualEndDate.isoformat() if self.actualEndDate else None,
            "status": self.status.value if self.status else None,
            "priority": self.priority,
            "estimatedBudget": float(self.estimatedBudget) if self.estimatedBudget else None,
            "actualCost": float(self.actualCost) if self.actualCost else None,
            "projectManagerId": self.projectManagerId,
            "projectManager": self.projectManager.to_dict() if self.projectManager else None,
            "crewMembers": self.get_crew_members(),
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
            "isActive": self.isActive,
        }


class WorkOrder(db.Model):
    __tablename__ = "work_orders"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    location = db.Column(db.String(300), nullable=True)
    suppliesList = db.Column(db.Text, nullable=True)  # JSON string or comma-separated list
    
    # Work order timeline
    startDate = db.Column(db.Date, nullable=False)
    endDate = db.Column(db.Date, nullable=False)
    actualStartDate = db.Column(db.Date, nullable=True)
    actualEndDate = db.Column(db.Date, nullable=True)
    
    # Work order status and priority
    status = db.Column(db.Enum(WorkOrderStatus), default=WorkOrderStatus.PENDING, nullable=False)
    priority = db.Column(db.Integer, nullable=False)  # 1-5 scale
    
    # Budget and cost tracking
    estimatedBudget = db.Column(DECIMAL(15, 2), nullable=True)
    actualCost = db.Column(DECIMAL(15, 2), nullable=True)
    
    # Relationships
    projectId = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    project = db.relationship('Project', backref=db.backref('work_orders', lazy=True))
    
    # Metadata
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    isActive = db.Column(db.Boolean, default=True, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "location": self.location,
            "suppliesList": self.suppliesList,
            "startDate": self.startDate.isoformat() if self.startDate else None,
            "endDate": self.endDate.isoformat() if self.endDate else None,
            "actualStartDate": self.actualStartDate.isoformat() if self.actualStartDate else None,
            "actualEndDate": self.actualEndDate.isoformat() if self.actualEndDate else None,
            "status": self.status.value if self.status else None,
            "priority": self.priority,
            "estimatedBudget": float(self.estimatedBudget) if self.estimatedBudget else None,
            "actualCost": float(self.actualCost) if self.actualCost else None,
            "projectId": self.projectId,
            "project": self.project.to_dict() if self.project else None,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
            "isActive": self.isActive,
        }


class ProjectMember(db.Model):
    __tablename__ = "project_members"

    id = db.Column(db.Integer, primary_key=True)
    projectId = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    userId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Metadata
    joinedAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    isActive = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    project = db.relationship('Project', backref=db.backref('members', lazy=True))
    user = db.relationship('User', backref=db.backref('project_memberships', lazy=True))

    # Ensure unique user-project combinations
    __table_args__ = (db.UniqueConstraint('projectId', 'userId', name='unique_project_user'),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "projectId": self.projectId,
            "userId": self.userId,
            "user": self.user.to_dict() if self.user else None,
            "joinedAt": self.joinedAt.isoformat() if self.joinedAt else None,
            "isActive": self.isActive,
        }


class ProjectInvitation(db.Model):
    __tablename__ = "project_invitations"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), nullable=False, index=True)
    projectId = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    invitedBy = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Invitation token for secure registration
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)

    # Role and worker type for the invited user
    role = db.Column(db.Enum(UserRole), nullable=False)
    workerType = db.Column(db.Enum(WorkerType), nullable=True)

    # Contractor expiration date (only applicable for contractor invitations)
    contractorExpirationDate = db.Column(db.Date, nullable=True)

    # Invitation status
    status = db.Column(db.String(20), default="pending", nullable=False)  # pending, accepted, expired, cancelled

    # Timestamps
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expiresAt = db.Column(db.DateTime, nullable=False)
    acceptedAt = db.Column(db.DateTime, nullable=True)
    isActive = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    project = db.relationship('Project', backref=db.backref('invitations', lazy=True))
    inviter = db.relationship('User', backref=db.backref('sent_invitations', lazy=True))

    # Ensure unique email-project combinations for pending invitations
    __table_args__ = (db.UniqueConstraint('email', 'projectId', 'status', name='unique_pending_invitation'),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "email": self.email,
            "projectId": self.projectId,
            "project": self.project.to_dict() if self.project else None,
            "invitedBy": self.invitedBy,
            "inviter": self.inviter.to_dict() if self.inviter else None,
            "token": self.token,
            "role": self.role.value if self.role else None,
            "workerType": self.workerType.value if self.workerType else None,
            "contractorExpirationDate": self.contractorExpirationDate.isoformat() if self.contractorExpirationDate else None,
            "status": self.status,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "expiresAt": self.expiresAt.isoformat() if self.expiresAt else None,
            "acceptedAt": self.acceptedAt.isoformat() if self.acceptedAt else None,
            "isActive": self.isActive,
        }


class Audit(db.Model):
    __tablename__ = "audit_logs"

    id = db.Column(db.Integer, primary_key=True)
    entityType = db.Column(db.Enum(AuditEntityType), nullable=False)
    entityId = db.Column(db.Integer, nullable=False, index=True)
    userId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    field = db.Column(db.String(100), nullable=False)
    oldValue = db.Column(db.Text, nullable=True)
    newValue = db.Column(db.Text, nullable=True)
    sessionId = db.Column(db.String(36), nullable=True, index=True)  # UUID for grouping changes
    projectId = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=True, index=True)  # Track project for work orders
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    user = db.relationship('User', backref=db.backref('audit_logs', lazy=True))
    project = db.relationship('Project', backref=db.backref('audit_logs', lazy=True))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "entityType": self.entityType.value if self.entityType else None,
            "entityId": self.entityId,
            "userId": self.userId,
            "user": self.user.to_dict() if self.user else None,
            "field": self.field,
            "oldValue": self.oldValue,
            "newValue": self.newValue,
            "sessionId": self.sessionId,
            "projectId": self.projectId,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
        }

class Supply(db.Model):
    __tablename__ = "supplies"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    vendor = db.Column(db.String(200), nullable=False)
    budget = db.Column(DECIMAL(15, 2), nullable=False, default=0.00)

    # Foreign Key Relationship
    projectId = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    project = db.relationship("Project", backref=db.backref("supplies", lazy=True, cascade="all, delete-orphan"))

    # Metadata
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "vendor": self.vendor,
            "budget": float(self.budget) if self.budget is not None else 0.0,
            "projectId": self.projectId,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
        }
