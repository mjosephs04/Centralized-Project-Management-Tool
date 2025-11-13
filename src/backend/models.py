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

class SupplyStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


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
    workerType = db.Column(db.Enum(WorkerType), nullable=True)

    profileImageUrl = db.Column(db.String(500), nullable=False, default="https://storage.googleapis.com/profile_pics_capstone/defaults/profile-default.png")

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
            "profileImageUrl": self.profileImageUrl,
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
    crewMembers = db.Column(db.Text, nullable=True)
    
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
            # New multi-manager fields (backwards compatible)
            "projectManagerIds": [m.userId for m in getattr(self, 'managers', [])],
            "projectManagers": [m.user.to_dict() for m in getattr(self, 'managers', [])],
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

    def get_assigned_workers(self) -> list:
        """Get assigned workers as a list of user IDs from WorkOrderWorker relationships"""
        try:
            return [worker.userId for worker in self.workers if worker.isActive]
        except Exception:
            return []

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
            "assignedWorkers": self.get_assigned_workers(),
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
            "isActive": self.isActive,
        }


class WorkOrderWorker(db.Model):
    __tablename__ = "work_order_workers"

    id = db.Column(db.Integer, primary_key=True)
    workOrderId = db.Column(db.Integer, db.ForeignKey('work_orders.id'), nullable=False)
    userId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Metadata
    assignedAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    isActive = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    workOrder = db.relationship('WorkOrder', backref=db.backref('workers', lazy=True))
    user = db.relationship('User', backref=db.backref('work_order_assignments', lazy=True))

    # Ensure unique user-workorder combinations
    __table_args__ = (db.UniqueConstraint('workOrderId', 'userId', name='unique_workorder_user'),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workOrderId": self.workOrderId,
            "userId": self.userId,
            "user": self.user.to_dict() if self.user else None,
            "assignedAt": self.assignedAt.isoformat() if self.assignedAt else None,
            "isActive": self.isActive,
        }


class WorkOrderBuildingSupply(db.Model):
    __tablename__ = "work_order_building_supplies"

    id = db.Column(db.Integer, primary_key=True)
    workOrderId = db.Column(db.Integer, db.ForeignKey('work_orders.id'), nullable=False)
    buildingSupplyId = db.Column(db.Integer, db.ForeignKey('building_supplies.id'), nullable=False)

    # Metadata
    assignedAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    isActive = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    workOrder = db.relationship('WorkOrder', backref=db.backref('building_supply_assignments', lazy=True))
    buildingSupply = db.relationship('BuildingSupply', backref=db.backref('work_order_assignments', lazy=True))

    # Ensure unique workorder-supply combinations
    __table_args__ = (db.UniqueConstraint('workOrderId', 'buildingSupplyId', name='unique_workorder_buildingsupply'),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workOrderId": self.workOrderId,
            "buildingSupplyId": self.buildingSupplyId,
            "workOrder": self.workOrder.to_dict() if self.workOrder else None,
            "buildingSupply": self.buildingSupply.to_dict() if self.buildingSupply else None,
            "assignedAt": self.assignedAt.isoformat() if self.assignedAt else None,
            "isActive": self.isActive,
        }


class WorkOrderElectricalSupply(db.Model):
    __tablename__ = "work_order_electrical_supplies"

    id = db.Column(db.Integer, primary_key=True)
    workOrderId = db.Column(db.Integer, db.ForeignKey('work_orders.id'), nullable=False)
    electricalSupplyId = db.Column(db.Integer, db.ForeignKey('electrical_supplies.id'), nullable=False)

    # Metadata
    assignedAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    isActive = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    workOrder = db.relationship('WorkOrder', backref=db.backref('electrical_supply_assignments', lazy=True))
    electricalSupply = db.relationship('ElectricalSupply', backref=db.backref('work_order_assignments', lazy=True))

    # Ensure unique workorder-supply combinations
    __table_args__ = (db.UniqueConstraint('workOrderId', 'electricalSupplyId', name='unique_workorder_electricalsupply'),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "workOrderId": self.workOrderId,
            "electricalSupplyId": self.electricalSupplyId,
            "workOrder": self.workOrder.to_dict() if self.workOrder else None,
            "electricalSupply": self.electricalSupply.to_dict() if self.electricalSupply else None,
            "assignedAt": self.assignedAt.isoformat() if self.assignedAt else None,
            "isActive": self.isActive,
        }


# DEPRECATED: WorkOrderSupply removed - use WorkOrderBuildingSupply or WorkOrderElectricalSupply instead
# This model has been removed. If you need to drop the table, run:
# DROP TABLE IF EXISTS work_order_supplies;


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


class ProjectManager(db.Model):
    __tablename__ = "project_managers"

    id = db.Column(db.Integer, primary_key=True)
    projectId = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    userId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Metadata
    addedAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    isActive = db.Column(db.Boolean, default=True, nullable=False)

    # Relationships
    project = db.relationship('Project', backref=db.backref('managers', lazy=True))
    user = db.relationship('User', backref=db.backref('project_managements', lazy=True))

    # Ensure unique user-project combinations
    __table_args__ = (db.UniqueConstraint('projectId', 'userId', name='unique_project_manager_user'),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "projectId": self.projectId,
            "userId": self.userId,
            "user": self.user.to_dict() if self.user else None,
            "addedAt": self.addedAt.isoformat() if self.addedAt else None,
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
        result = {
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
        # Include work order name if this is a work order audit log
        if self.entityType == AuditEntityType.WORK_ORDER:
            work_order = WorkOrder.query.filter_by(id=self.entityId, isActive=True).first()
            if work_order:
                result["workOrderName"] = work_order.name
        return result

class BuildingSupply(db.Model):
    __tablename__ = "building_supplies"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    vendor = db.Column(db.String(200), nullable=True)
    
    # Excel file columns
    referenceCode = db.Column(db.String(100), nullable=True)
    supplyCategory = db.Column(db.String(200), nullable=True)
    supplyType = db.Column(db.String(200), nullable=True)
    supplySubtype = db.Column(db.String(200), nullable=True)
    unitOfMeasure = db.Column(db.String(50), nullable=True)
    
    budget = db.Column(DECIMAL(15, 2), nullable=False, default=0.00)

    # Workflow fields
    status = db.Column(db.Enum(SupplyStatus), default=SupplyStatus.PENDING, nullable=False)
    requestedById = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approvedById = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    projectId = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True)  # Nullable for master catalog
    workOrderId = db.Column(db.Integer, db.ForeignKey("work_orders.id"), nullable=True)  # Deprecated: use WorkOrderSupply instead

    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    requestedBy = db.relationship("User", foreign_keys=[requestedById], backref="building_supply_requests")
    approvedBy = db.relationship("User", foreign_keys=[approvedById], backref="approved_building_supplies")
    project = db.relationship("Project", backref=db.backref("building_supplies", lazy=True))
    workOrder = db.relationship("WorkOrder", foreign_keys=[workOrderId], backref=db.backref("legacy_building_supplies", lazy=True))

    def get_work_orders(self) -> list:
        """Get work orders as a list of work order IDs from WorkOrderSupply relationships"""
        try:
            return [assignment.workOrderId for assignment in self.work_order_assignments if assignment.isActive]
        except Exception:
            return []

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "vendor": self.vendor,
            "referenceCode": self.referenceCode,
            "supplyCategory": self.supplyCategory,
            "supplyType": self.supplyType,
            "supplySubtype": self.supplySubtype,
            "unitOfMeasure": self.unitOfMeasure,
            "budget": float(self.budget) if self.budget else 0.0,
            "status": self.status.value,
            "projectId": self.projectId,
            "workOrderId": self.workOrderId,
            "workOrderIds": self.get_work_orders(),
            "requestedBy": self.requestedBy.to_dict() if self.requestedBy else None,
            "approvedBy": self.approvedBy.to_dict() if self.approvedBy else None,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
        }


class ElectricalSupply(db.Model):
    __tablename__ = "electrical_supplies"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    vendor = db.Column(db.String(200), nullable=True)
    
    # Excel file columns
    referenceCode = db.Column(db.String(100), nullable=True)
    supplyCategory = db.Column(db.String(200), nullable=True)
    supplyType = db.Column(db.String(200), nullable=True)
    supplySubtype = db.Column(db.String(200), nullable=True)
    unitOfMeasure = db.Column(db.String(50), nullable=True)
    
    budget = db.Column(DECIMAL(15, 2), nullable=False, default=0.00)

    # Workflow fields
    status = db.Column(db.Enum(SupplyStatus), default=SupplyStatus.PENDING, nullable=False)
    requestedById = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    approvedById = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    projectId = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=True)  # Nullable for master catalog
    workOrderId = db.Column(db.Integer, db.ForeignKey("work_orders.id"), nullable=True)  # Deprecated: use WorkOrderSupply instead

    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    requestedBy = db.relationship("User", foreign_keys=[requestedById], backref="electrical_supply_requests")
    approvedBy = db.relationship("User", foreign_keys=[approvedById], backref="approved_electrical_supplies")
    project = db.relationship("Project", backref=db.backref("electrical_supplies", lazy=True))
    workOrder = db.relationship("WorkOrder", foreign_keys=[workOrderId], backref=db.backref("legacy_electrical_supplies", lazy=True))

    def get_work_orders(self) -> list:
        """Get work orders as a list of work order IDs from WorkOrderSupply relationships"""
        try:
            return [assignment.workOrderId for assignment in self.work_order_assignments if assignment.isActive]
        except Exception:
            return []

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "vendor": self.vendor,
            "referenceCode": self.referenceCode,
            "supplyCategory": self.supplyCategory,
            "supplyType": self.supplyType,
            "supplySubtype": self.supplySubtype,
            "unitOfMeasure": self.unitOfMeasure,
            "budget": float(self.budget) if self.budget else 0.0,
            "status": self.status.value,
            "projectId": self.projectId,
            "workOrderId": self.workOrderId,
            "workOrderIds": self.get_work_orders(),
            "requestedBy": self.requestedBy.to_dict() if self.requestedBy else None,
            "approvedBy": self.approvedBy.to_dict() if self.approvedBy else None,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
        }


class PasswordReset(db.Model):
    __tablename__ = "password_resets"

    id = db.Column(db.Integer, primary_key=True)
    userId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False, index=True)
    expiresAt = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', backref=db.backref('password_resets', lazy=True))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "userId": self.userId,
            "token": self.token,
            "expiresAt": self.expiresAt.isoformat() if self.expiresAt else None,
            "used": self.used,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
        }


class NotificationPreference(db.Model):
    __tablename__ = "notification_preferences"

    id = db.Column(db.Integer, primary_key=True)
    userId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True, index=True)
    
    # Project notifications
    projectStatusChange = db.Column(db.Boolean, default=True, nullable=False)
    projectStatusChangeEmail = db.Column(db.Boolean, default=True, nullable=False)
    projectPriorityChange = db.Column(db.Boolean, default=True, nullable=False)
    projectPriorityChangeEmail = db.Column(db.Boolean, default=True, nullable=False)
    projectBudgetChange = db.Column(db.Boolean, default=True, nullable=False)
    projectBudgetChangeEmail = db.Column(db.Boolean, default=True, nullable=False)
    projectDateChange = db.Column(db.Boolean, default=True, nullable=False)
    projectDateChangeEmail = db.Column(db.Boolean, default=True, nullable=False)
    projectTeamChange = db.Column(db.Boolean, default=True, nullable=False)
    projectTeamChangeEmail = db.Column(db.Boolean, default=True, nullable=False)
    
    # Work order notifications
    workOrderCreated = db.Column(db.Boolean, default=True, nullable=False)
    workOrderCreatedEmail = db.Column(db.Boolean, default=True, nullable=False)
    workOrderStatusChange = db.Column(db.Boolean, default=True, nullable=False)
    workOrderStatusChangeEmail = db.Column(db.Boolean, default=True, nullable=False)
    workOrderCompleted = db.Column(db.Boolean, default=True, nullable=False)
    workOrderCompletedEmail = db.Column(db.Boolean, default=True, nullable=False)
    workOrderPriorityChange = db.Column(db.Boolean, default=True, nullable=False)
    workOrderPriorityChangeEmail = db.Column(db.Boolean, default=True, nullable=False)
    workOrderBudgetChange = db.Column(db.Boolean, default=True, nullable=False)
    workOrderBudgetChangeEmail = db.Column(db.Boolean, default=True, nullable=False)
    workOrderDateChange = db.Column(db.Boolean, default=True, nullable=False)
    workOrderDateChangeEmail = db.Column(db.Boolean, default=True, nullable=False)
    
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', backref=db.backref('notification_preferences', lazy=True))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "userId": self.userId,
            "projectStatusChange": self.projectStatusChange,
            "projectStatusChangeEmail": self.projectStatusChangeEmail,
            "projectPriorityChange": self.projectPriorityChange,
            "projectPriorityChangeEmail": self.projectPriorityChangeEmail,
            "projectBudgetChange": self.projectBudgetChange,
            "projectBudgetChangeEmail": self.projectBudgetChangeEmail,
            "projectDateChange": self.projectDateChange,
            "projectDateChangeEmail": self.projectDateChangeEmail,
            "projectTeamChange": self.projectTeamChange,
            "projectTeamChangeEmail": self.projectTeamChangeEmail,
            "workOrderCreated": self.workOrderCreated,
            "workOrderCreatedEmail": self.workOrderCreatedEmail,
            "workOrderStatusChange": self.workOrderStatusChange,
            "workOrderStatusChangeEmail": self.workOrderStatusChangeEmail,
            "workOrderCompleted": self.workOrderCompleted,
            "workOrderCompletedEmail": self.workOrderCompletedEmail,
            "workOrderPriorityChange": self.workOrderPriorityChange,
            "workOrderPriorityChangeEmail": self.workOrderPriorityChangeEmail,
            "workOrderBudgetChange": self.workOrderBudgetChange,
            "workOrderBudgetChangeEmail": self.workOrderBudgetChangeEmail,
            "workOrderDateChange": self.workOrderDateChange,
            "workOrderDateChangeEmail": self.workOrderDateChangeEmail,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
        }


class NotificationDismissal(db.Model):
    __tablename__ = "notification_dismissals"

    id = db.Column(db.Integer, primary_key=True)
    userId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    auditLogId = db.Column(db.Integer, db.ForeignKey('audit_logs.id'), nullable=False, index=True)
    dismissedAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = db.relationship('User', backref=db.backref('notification_dismissals', lazy=True))
    auditLog = db.relationship('Audit', backref=db.backref('dismissals', lazy=True))

    # Ensure unique user-audit log combinations
    __table_args__ = (db.UniqueConstraint('userId', 'auditLogId', name='unique_user_audit_dismissal'),)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "userId": self.userId,
            "auditLogId": self.auditLogId,
            "dismissedAt": self.dismissedAt.isoformat() if self.dismissedAt else None,
        }


class Conversation(db.Model):
    __tablename__ = "conversations"

    id = db.Column(db.Integer, primary_key=True)
    participant1Id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    participant2Id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    lastMessageAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updatedAt = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    participant1 = db.relationship('User', foreign_keys=[participant1Id], backref=db.backref('conversations_as_participant1', lazy=True))
    participant2 = db.relationship('User', foreign_keys=[participant2Id], backref=db.backref('conversations_as_participant2', lazy=True))
    messages = db.relationship('Message', backref='conversation', lazy=True, order_by='Message.createdAt')

    # Ensure unique conversation between two users
    __table_args__ = (db.UniqueConstraint('participant1Id', 'participant2Id', name='unique_conversation_pair'),)

    def to_dict(self, current_user_id: int = None) -> dict:
        # Determine the other participant
        other_participant = self.participant2 if current_user_id == self.participant1Id else self.participant1
        other_participant_dict = other_participant.to_dict() if other_participant else None
        
        # Get unread count for current user
        unread_count = 0
        if current_user_id:
            unread_count = Message.query.filter_by(
                conversationId=self.id,
                recipientId=current_user_id,
                isRead=False
            ).count()
        
        return {
            "id": self.id,
            "participant1Id": self.participant1Id,
            "participant2Id": self.participant2Id,
            "otherParticipant": other_participant_dict,
            "lastMessageAt": self.lastMessageAt.isoformat() if self.lastMessageAt else None,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
            "updatedAt": self.updatedAt.isoformat() if self.updatedAt else None,
            "unreadCount": unread_count,
        }


class Message(db.Model):
    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    conversationId = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False, index=True)
    senderId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    recipientId = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    isRead = db.Column(db.Boolean, default=False, nullable=False)
    readAt = db.Column(db.DateTime, nullable=True)
    createdAt = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    sender = db.relationship('User', foreign_keys=[senderId], backref=db.backref('sent_messages', lazy=True))
    recipient = db.relationship('User', foreign_keys=[recipientId], backref=db.backref('received_messages', lazy=True))

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "conversationId": self.conversationId,
            "senderId": self.senderId,
            "recipientId": self.recipientId,
            "sender": self.sender.to_dict() if self.sender else None,
            "recipient": self.recipient.to_dict() if self.recipient else None,
            "content": self.content,
            "isRead": self.isRead,
            "readAt": self.readAt.isoformat() if self.readAt else None,
            "createdAt": self.createdAt.isoformat() if self.createdAt else None,
        }