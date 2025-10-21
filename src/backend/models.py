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
    
    # Team members (stored as JSON array of user IDs)
    crewMembers = db.Column(db.Text, nullable=True)  # JSON string of user IDs
    
    # Relationships
    projectManagerId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    projectManager = db.relationship('User', backref=db.backref('managed_projects', lazy=True))
    
    # Metadata
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def get_crew_members(self) -> list:
        """Get crew members as a list of user IDs"""
        if not self.crewMembers:
            return []
        try:
            return json.loads(self.crewMembers)
        except (json.JSONDecodeError, TypeError):
            return []

    def set_crew_members(self, member_ids: list):
        """Set crew members from a list of user IDs"""
        self.crewMembers = json.dumps(member_ids) if member_ids else None

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
