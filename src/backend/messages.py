from __future__ import annotations

from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from .models import db, User, Conversation, Message, UserRole


messages_bp = Blueprint("messages", __name__, url_prefix="/api/messages")


@messages_bp.get("/conversations")
@jwt_required()
def get_conversations():
    """Get all conversations for the current user"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get all conversations where user is participant1 or participant2
    conversations = Conversation.query.filter(
        (Conversation.participant1Id == user_id) | (Conversation.participant2Id == user_id)
    ).order_by(Conversation.lastMessageAt.desc()).all()
    
    return jsonify({
        "conversations": [conv.to_dict(user_id) for conv in conversations]
    }), 200


@messages_bp.get("/conversations/<int:conversation_id>")
@jwt_required()
def get_conversation(conversation_id):
    """Get a specific conversation"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    conversation = Conversation.query.filter_by(id=conversation_id).first()
    
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
    
    # Verify user is a participant
    if conversation.participant1Id != user_id and conversation.participant2Id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    return jsonify({"conversation": conversation.to_dict(user_id)}), 200


@messages_bp.post("/conversations")
@jwt_required()
def create_conversation():
    """Create a new conversation or get existing one"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    payload = request.get_json(silent=True) or {}
    other_user_id = payload.get("otherUserId")
    
    if not other_user_id:
        return jsonify({"error": "otherUserId is required"}), 400
    
    if other_user_id == user_id:
        return jsonify({"error": "Cannot create conversation with yourself"}), 400
    
    # Verify other user exists and is active
    other_user = User.query.filter_by(id=other_user_id, isActive=True).first()
    if not other_user:
        return jsonify({"error": "Other user not found"}), 404
    
    # Verify both users are workers or project managers
    if user.role not in [UserRole.WORKER, UserRole.PROJECT_MANAGER]:
        return jsonify({"error": "Only workers and project managers can message"}), 403
    
    if other_user.role not in [UserRole.WORKER, UserRole.PROJECT_MANAGER]:
        return jsonify({"error": "Can only message workers and project managers"}), 403
    
    # Check if conversation already exists (in either direction)
    existing_conv = Conversation.query.filter(
        ((Conversation.participant1Id == user_id) & (Conversation.participant2Id == other_user_id)) |
        ((Conversation.participant1Id == other_user_id) & (Conversation.participant2Id == user_id))
    ).first()
    
    if existing_conv:
        return jsonify({"conversation": existing_conv.to_dict(user_id)}), 200
    
    # Create new conversation (always put smaller ID first for consistency)
    participant1_id = min(user_id, other_user_id)
    participant2_id = max(user_id, other_user_id)
    
    conversation = Conversation(
        participant1Id=participant1_id,
        participant2Id=participant2_id
    )
    db.session.add(conversation)
    db.session.commit()
    
    return jsonify({"conversation": conversation.to_dict(user_id)}), 201


@messages_bp.get("/conversations/<int:conversation_id>/messages")
@jwt_required()
def get_messages(conversation_id):
    """Get all messages in a conversation"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    conversation = Conversation.query.filter_by(id=conversation_id).first()
    
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
    
    # Verify user is a participant
    if conversation.participant1Id != user_id and conversation.participant2Id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Get messages
    limit = request.args.get("limit", 50, type=int)
    offset = request.args.get("offset", 0, type=int)
    
    messages = Message.query.filter_by(conversationId=conversation_id)\
        .order_by(Message.createdAt.desc())\
        .limit(limit)\
        .offset(offset)\
        .all()
    
    # Reverse to get chronological order
    messages.reverse()
    
    return jsonify({
        "messages": [msg.to_dict() for msg in messages],
        "total": Message.query.filter_by(conversationId=conversation_id).count()
    }), 200


@messages_bp.post("/conversations/<int:conversation_id>/messages")
@jwt_required()
def send_message(conversation_id):
    """Send a message in a conversation"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    conversation = Conversation.query.filter_by(id=conversation_id).first()
    
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
    
    # Verify user is a participant
    if conversation.participant1Id != user_id and conversation.participant2Id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    payload = request.get_json(silent=True) or {}
    content = payload.get("content", "").strip()
    
    if not content:
        return jsonify({"error": "Message content is required"}), 400
    
    # Determine recipient
    recipient_id = conversation.participant2Id if conversation.participant1Id == user_id else conversation.participant1Id
    
    # Create message
    message = Message(
        conversationId=conversation_id,
        senderId=user_id,
        recipientId=recipient_id,
        content=content
    )
    db.session.add(message)
    
    # Update conversation last message time
    conversation.lastMessageAt = datetime.utcnow()
    db.session.commit()
    
    return jsonify({"message": message.to_dict()}), 201


@messages_bp.put("/messages/<int:message_id>/read")
@jwt_required()
def mark_message_read(message_id):
    """Mark a message as read"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    message = Message.query.filter_by(id=message_id).first()
    
    if not message:
        return jsonify({"error": "Message not found"}), 404
    
    # Verify user is the recipient
    if message.recipientId != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Mark as read if not already read
    if not message.isRead:
        message.isRead = True
        message.readAt = datetime.utcnow()
        db.session.commit()
    
    return jsonify({"message": message.to_dict()}), 200


@messages_bp.put("/conversations/<int:conversation_id>/read")
@jwt_required()
def mark_conversation_read(conversation_id):
    """Mark all messages in a conversation as read"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    conversation = Conversation.query.filter_by(id=conversation_id).first()
    
    if not conversation:
        return jsonify({"error": "Conversation not found"}), 404
    
    # Verify user is a participant
    if conversation.participant1Id != user_id and conversation.participant2Id != user_id:
        return jsonify({"error": "Unauthorized"}), 403
    
    # Mark all unread messages as read
    unread_messages = Message.query.filter_by(
        conversationId=conversation_id,
        recipientId=user_id,
        isRead=False
    ).all()
    
    for msg in unread_messages:
        msg.isRead = True
        msg.readAt = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({"message": f"Marked {len(unread_messages)} messages as read"}), 200


@messages_bp.get("/unread-count")
@jwt_required()
def get_unread_count():
    """Get total unread message count for current user"""
    user_id = int(get_jwt_identity())
    user = User.query.filter_by(id=user_id, isActive=True).first()
    
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    unread_count = Message.query.filter_by(
        recipientId=user_id,
        isRead=False
    ).count()
    
    return jsonify({"unreadCount": unread_count}), 200

