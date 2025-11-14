from __future__ import annotations

from flask import Blueprint, jsonify, request, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from .models import db, User, UserRole, WorkerType, ProjectInvitation, ProjectMember, ProjectManager, PasswordReset
from .email_service import validate_invitation_token, accept_invitation, create_password_reset_token, send_password_reset_email, validate_password_reset_token
from google.cloud import storage
import uuid


auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/register")
def register_user():
    # Support JSON and form-data
    payload = request.get_json(silent=True) or request.form.to_dict() or {}

    required_fields = [
        "firstName",
        "lastName",
        "emailAddress",
        "password",
        "role",
    ]
    missing = [f for f in required_fields if not payload.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    role_str = str(payload.get("role")).lower()
    try:
        role = UserRole(role_str)
    except ValueError:
        return jsonify({"error": "Invalid role. Must be admin, worker, or project_manager."}), 400

    worker_type_value = payload.get("workerType")
    worker_type = None
    if role == UserRole.WORKER:
        if not worker_type_value:
            return jsonify({"error": "workerType is required when role is worker."}), 400
        try:
            worker_type = WorkerType(str(worker_type_value).lower())
        except ValueError:
            return jsonify({"error": "Invalid workerType. Must be contractor or crew_member."}), 400

    if User.query.filter_by(emailAddress=payload["emailAddress"], isActive=True).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        firstName=payload["firstName"],
        lastName=payload["lastName"],
        phoneNumber=payload.get("phoneNumber"),
        emailAddress=payload["emailAddress"],
        passwordHash=generate_password_hash(payload["password"]),
        role=role,
        workerType=worker_type,
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"user": user.to_dict()}), 201


@auth_bp.post("/login")
def login_user():
    # Support JSON and form-data
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    email = payload.get("emailAddress")
    password = payload.get("password")
    if not email or not password:
        return jsonify({"error": "emailAddress and password are required"}), 400

    user = User.query.filter_by(emailAddress=email, isActive=True).first()
    if not user or not check_password_hash(user.passwordHash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=user.id)
    return jsonify({"accessToken": access_token, "user": user.to_dict()}), 200


@auth_bp.get("/me")
@jwt_required()
def who_am_i():
    user_id = get_jwt_identity()
    user = User.query.filter_by(id=user_id, isActive=True).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200


@auth_bp.post("/register-with-invitation")
def register_with_invitation():
    """Register a new user using an invitation token"""
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    # Required fields
    required_fields = [
        "firstName",
        "lastName",
        "password",
        "invitationToken",
    ]
    missing = [f for f in required_fields if not payload.get(f)]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    
    invitation_token = payload["invitationToken"]
    
    # Validate invitation token
    invitation = validate_invitation_token(invitation_token)
    if not invitation:
        return jsonify({"error": "Invalid or expired invitation token"}), 400
    
    # Check if user already exists with this email
    existing_user = User.query.filter_by(emailAddress=invitation.email, isActive=True).first()
    if existing_user:
        return jsonify({"error": "A user with this email already exists. Please log in instead."}), 409
    
    # Create new user using role and workerType from invitation
    role = invitation.role
    worker_type = invitation.workerType
    
    try:
        user = User(
            firstName=payload["firstName"],
            lastName=payload["lastName"],
            phoneNumber=payload.get("phoneNumber"),
            emailAddress=invitation.email,  # Use email from invitation
            passwordHash=generate_password_hash(payload["password"]),
            role=role,
            workerType=worker_type,
        )
        
        db.session.add(user)
        db.session.flush()  # Get the user ID
        
        # Accept the invitation and add user to project
        if accept_invitation(invitation, user.id):
            # Add user to project based on role
            if role == UserRole.PROJECT_MANAGER:
                db.session.add(ProjectManager(projectId=invitation.projectId, userId=user.id))
            elif role == UserRole.WORKER:
                db.session.add(ProjectMember(projectId=invitation.projectId, userId=user.id))
            db.session.commit()
            
            # Create access token
            access_token = create_access_token(identity=user.id)
            
            return jsonify({
                "message": "Account created successfully and added to project",
                "accessToken": access_token,
                "user": user.to_dict()
            }), 201
        else:
            db.session.rollback()
            return jsonify({"error": "Failed to accept invitation"}), 500
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to create account: {str(e)}"}), 500


@auth_bp.post("/accept-invitation")
@jwt_required()
def accept_invitation_existing_user():
    """Accept an invitation for an existing user"""
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    invitation_token = payload.get("invitationToken")
    if not invitation_token:
        return jsonify({"error": "invitationToken is required"}), 400
    
    # Validate invitation token
    invitation = validate_invitation_token(invitation_token)
    if not invitation:
        return jsonify({"error": "Invalid or expired invitation token"}), 400
    
    # Get current user
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Check if the invitation email matches the current user's email
    if user.emailAddress != invitation.email:
        return jsonify({"error": "This invitation is not for your email address"}), 403
    
    # Check if user is already a member of this project
    existing_member = ProjectMember.query.filter_by(projectId=invitation.projectId, userId=user_id, isActive=True).first()
    if existing_member and invitation.role != UserRole.PROJECT_MANAGER:
        return jsonify({"error": "You are already a member of this project"}), 400
    
    try:
        # Accept the invitation and add user to project
        if accept_invitation(invitation, user_id):
            # Add user to project based on role
            if invitation.role == UserRole.PROJECT_MANAGER:
                db.session.add(ProjectManager(projectId=invitation.projectId, userId=user_id))
            elif invitation.role == UserRole.WORKER:
                db.session.add(ProjectMember(projectId=invitation.projectId, userId=user_id))
            db.session.commit()
            
            return jsonify({
                "message": "Successfully joined the project",
                "project": invitation.project.to_dict() if invitation.project else None
            }), 200
        else:
            return jsonify({"error": "Failed to accept invitation"}), 500
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to accept invitation: {str(e)}"}), 500


@auth_bp.get("/workers")
@jwt_required()
def get_all_workers():
    """
    Return all users with role=worker.
    Example request: GET /api/auth/workers
    Requires Authorization header with Bearer token.
    """
    try:
        # Query all users who are workers
        workers = User.query.filter_by(role=UserRole.WORKER).all()

        # Serialize users (exclude password hash in to_dict)
        worker_data = [w.to_dict() for w in workers]
        return jsonify({"users": worker_data}), 200
    
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve workers: {str(e)}"}), 500

@auth_bp.get("/allUsers")
@jwt_required()
def get_all_users():
    """
    Return all users
    Example request: GET /api/auth/allUsers
    Requires Authorization header with Bearer token.
    """
    try:
        # Query all users who are workers
        workers = User.query.all()

        # Serialize users (exclude password hash in to_dict)
        worker_data = [w.to_dict() for w in workers]
        return jsonify({"users": worker_data}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to retrieve workers: {str(e)}"}), 500

@auth_bp.post("/forgot-password")
def forgot_password():
    """Request a password reset - sends email with reset link"""
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    email = payload.get("emailAddress")
    if not email:
        return jsonify({"error": "emailAddress is required"}), 400
    
    # Find user by email
    user = User.query.filter_by(emailAddress=email, isActive=True).first()
    
    # Always return success message (security best practice - don't reveal if email exists)
    if user:
        try:
            # Create password reset token
            password_reset = create_password_reset_token(user.id, expires_in_hours=1)
            
            # Send reset email
            email_sent = send_password_reset_email(password_reset)
            
            if not email_sent:
                current_app.logger.error(f"Failed to send password reset email to {email}")
        except Exception as e:
            current_app.logger.error(f"Failed to create password reset: {str(e)}")
    
    # Always return success message (for security)
    return jsonify({
        "message": "If an account exists for that email, a password reset link has been sent."
    }), 200


@auth_bp.post("/reset-password")
def reset_password():
    """Reset password using a reset token"""
    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    token = payload.get("token")
    new_password = payload.get("password")
    
    if not token:
        return jsonify({"error": "token is required"}), 400
    
    if not new_password:
        return jsonify({"error": "password is required"}), 400
    
    # Validate password length
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters long"}), 400
    
    # Validate token
    password_reset = validate_password_reset_token(token)
    if not password_reset:
        return jsonify({"error": "Invalid or expired reset token"}), 400
    
    try:
        # Get user and update password
        user = User.query.filter_by(id=password_reset.userId, isActive=True).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Update password
        user.passwordHash = generate_password_hash(new_password)
        
        # Mark token as used
        password_reset.used = True
        
        db.session.commit()
        
        return jsonify({"message": "Password reset successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Failed to reset password: {str(e)}")
        return jsonify({"error": f"Failed to reset password: {str(e)}"}), 500


@auth_bp.get("/reset-password/validate/<token>")
def validate_reset_token(token: str):
    """Validate a password reset token (public endpoint)"""
    password_reset = validate_password_reset_token(token)
    
    if not password_reset:
        return jsonify({"valid": False, "error": "Invalid or expired token"}), 200
    
    return jsonify({
        "valid": True,
        "email": password_reset.user.emailAddress if password_reset.user else None
    }), 200


@auth_bp.post("/upload-profile")
@jwt_required()
def upload_profile_picture():
    """Upload or update a user's profile picture."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    # Restrict file types
    allowed_ext = {"png", "jpg", "jpeg"}
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in allowed_ext:
        return jsonify({"error": "Only PNG, JPG, JPEG files allowed"}), 400

    try:
        # Initialize Google Cloud Storage client
        client = storage.Client()
        bucket_name = "profile_pics_capstone"
        bucket = client.bucket(bucket_name)

        # Unique filename
        blob_name = f"profile_pictures/{user_id}_{uuid.uuid4()}.{ext}"
        blob = bucket.blob(blob_name)

        # Upload to GCS
        blob.upload_from_file(file, content_type=file.content_type)

        # Update user profile
        user.profileImageUrl = blob.public_url
        db.session.commit()

        return jsonify({
            "message": "Profile picture uploaded successfully",
            "profileImageUrl": user.profileImageUrl
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Upload failed: {str(e)}"}), 500


@auth_bp.put("/me")
@jwt_required()
def update_profile():
    """Update the current user's profile information."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    payload = request.get_json(silent=True) or request.form.to_dict() or {}
    
    # Update firstName if provided
    if "firstName" in payload:
        user.firstName = payload["firstName"]
    
    # Update lastName if provided
    if "lastName" in payload:
        user.lastName = payload["lastName"]
    
    # Update emailAddress if provided (check for uniqueness only if changed)
    if "emailAddress" in payload:
        email = payload["emailAddress"]
        # Only check for uniqueness if the email is actually changing
        if email != user.emailAddress:
            existing_user = User.query.filter_by(emailAddress=email, isActive=True).first()
            if existing_user:
                return jsonify({"error": "Email already in use"}), 409
        user.emailAddress = email
    
    # Update phoneNumber if provided
    if "phoneNumber" in payload:
        user.phoneNumber = payload["phoneNumber"] if payload["phoneNumber"] else None
    
    try:
        db.session.commit()
        return jsonify({"user": user.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update profile: {str(e)}"}), 500

@auth_bp.post("/deleteUser/<int:user_id>")
@jwt_required()
def delete_user(user_id):
    """
    Soft delete a user by marking isActive = False.
    Endpoint: POST /api/auth/deleteUser/<user_id>
    """
    # Only admins should be allowed to delete users
    requesting_user_id = get_jwt_identity()
    requesting_user = User.query.filter_by(id=requesting_user_id, isActive=True).first()

    if not requesting_user:
        return jsonify({"error": "Unauthorized"}), 403

    if requesting_user.role != UserRole.ADMIN:
        return jsonify({"error": "Only admins can deactivate users"}), 403

    # Fetch target user
    user = User.query.filter_by(id=user_id, isActive=True).first()
    if not user:
        return jsonify({"error": "User not found or already inactive"}), 404

    try:
        user.isActive = False
        db.session.commit()

        return jsonify({
            "message": "User successfully deactivated",
            "user": user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to deactivate user: {str(e)}"}), 500

@auth_bp.post("/activateUser/<int:user_id>")
@jwt_required()
def activate_user(user_id):
    """
    Reactivate a user by setting isActive = True.
    Endpoint: POST /api/auth/activateUser/<user_id>
    """
    # Only admins should be allowed to activate users
    requesting_user_id = get_jwt_identity()
    requesting_user = User.query.filter_by(id=requesting_user_id, isActive=True).first()

    if not requesting_user:
        return jsonify({"error": "Unauthorized"}), 403

    if requesting_user.role != UserRole.ADMIN:
        return jsonify({"error": "Only admins can activate users"}), 403

    # Fetch the target user (including inactive ones)
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # If already active, just return success
    if user.isActive:
        return jsonify({
            "message": "User is already active",
            "user": user.to_dict()
        }), 200

    try:
        user.isActive = True
        db.session.commit()

        return jsonify({
            "message": "User successfully activated",
            "user": user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to activate user: {str(e)}"}), 500

@auth_bp.post("/updateUserRole/<int:user_id>")
@jwt_required()
def update_user_role(user_id):
    """
    Update a user's role (admin-only).
    Endpoint: PUT /api/auth/updateUserRole/<user_id>
    Body: { "role": "admin" | "worker" | "project_manager" }
    """
    # Verify requesting user is an admin
    requesting_user_id = get_jwt_identity()
    requesting_user = User.query.filter_by(id=requesting_user_id, isActive=True).first()
    print(requesting_user)

    if not requesting_user:
        return jsonify({"error": "Unauthorized"}), 403

    if requesting_user.role != UserRole.ADMIN:
        return jsonify({"error": "Only admins can update user roles"}), 403

    # Parse role from body
    payload = request.get_json(silent=True) or {}
    new_role_raw = payload.get("role")

    if not new_role_raw:
        return jsonify({"error": "Field 'role' is required"}), 400

    # Validate role
    try:
        new_role = UserRole(new_role_raw.lower())
    except ValueError:
        return jsonify({"error": "Invalid role. Must be admin, worker, or project_manager."}), 400

    # Fetch user to update
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Update DB
    try:
        user.role = new_role
        db.session.commit()

        return jsonify({
            "message": "User role updated successfully",
            "user": user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to update user role: {str(e)}"}), 500