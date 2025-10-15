from __future__ import annotations

from flask import Blueprint, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
# from google.cloud import storage
# from datetime import datetime
# import os

from .models import db, User, UserRole, WorkerType


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

    if User.query.filter_by(emailAddress=payload["emailAddress"]).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(
        firstName=payload["firstName"],
        lastName=payload["lastName"],
        phoneNumber=payload.get("phoneNumber"),
        emailAddress=payload["emailAddress"],
        passwordHash=generate_password_hash(payload["password"]),
        role=role,
        workerType=worker_type,
        profilePicture="https://cdn-icons-png.flaticon.com/512/1946/1946429.png",
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

    user = User.query.filter_by(emailAddress=email).first()
    if not user or not check_password_hash(user.passwordHash, password):
        return jsonify({"error": "Invalid credentials"}), 401

    access_token = create_access_token(identity=user.id)
    return jsonify({"accessToken": access_token, "user": user.to_dict()}), 200


@auth_bp.get("/me")
@jwt_required()
def who_am_i():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_dict()}), 200

# @auth_bp.post("/upload-picture")
# @jwt_required()
# def upload_profile_picture():
#     user_id = get_jwt_identity()
#     user = User.query.get(user_id)
#     if not user:
#         return jsonify({"error": "User not found"}), 404
#
#     if "picture" not in request.files:
#         return jsonify({"error": "Missing file 'picture' in form data"}), 400
#
#     picture = request.files["picture"]
#
#     # Check if GCS bucket is configured
#     bucket_name = "profile_pics_capstone"
#
#     # Initialize Google Cloud Storage client
#     try:
#         storage_client = storage.Client()
#         bucket = storage_client.bucket(bucket_name)
#
#         # Create unique file name
#         filename = f"profile_pictures/{user_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_{picture.filename}"
#         blob = bucket.blob(filename)
#
#         # Upload to GCS
#         blob.upload_from_file(picture, content_type=picture.content_type)
#         blob.make_public()  # Make URL accessible
#
#         # Update user record
#         user.profilePicture = blob.public_url
#         db.session.commit()
#
#         return jsonify({"message": "Profile picture uploaded successfully", "url": blob.public_url}), 200
#
#     except Exception as e:
#         print("Upload error:", e)
#         return jsonify({"error": f"Upload failed: {str(e)}"}), 500
