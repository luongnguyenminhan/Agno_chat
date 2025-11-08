import uuid
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.chat import ChatMessage, Conversation
from app.schemas.chat import ChatMessageResponse
from app.services.qdrant_service import query_documents_by_meeting_id


def create_chat_message(db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID, content: str, message_type: str, mentions: Optional[List] = None) -> Optional[ChatMessage]:
    """Create a chat message"""
    # Verify conversation exists and user has access
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == user_id, Conversation.is_active == True).first()

    if not conversation:
        return None

    # Ensure mentions are serializable dictionaries
    serializable_mentions = None
    if mentions:
        serializable_mentions = []
        for mention in mentions:
            if hasattr(mention, "dict"):
                # Convert Pydantic model to dict
                serializable_mentions.append(mention.dict())
            elif isinstance(mention, dict):
                # Already a dict
                serializable_mentions.append(mention)
            else:
                # Convert to dict if it's a simple object
                serializable_mentions.append(dict(mention))

    db_message = ChatMessage(conversation_id=conversation_id, message_type=message_type, content=content, mentions=serializable_mentions)
    db.add(db_message)

    # Update conversation's updated_at timestamp
    conversation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_message)
    return db_message


def get_conversations_for_user(db: Session, user_id: uuid.UUID, page: int = 1, limit: int = 20) -> Tuple[List[Conversation], int]:
    """Get conversations for a user"""
    query = db.query(Conversation).filter(Conversation.user_id == user_id, Conversation.is_active == True).order_by(Conversation.updated_at.desc())

    total = query.count()
    conversations = query.offset((page - 1) * limit).limit(limit).all()

    return conversations, total


def get_conversation(db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Conversation]:
    """Get a specific conversation"""
    return db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == user_id, Conversation.is_active == True).first()


def get_conversation_with_messages(db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID, limit: int = 50) -> Optional[dict]:
    """Get a conversation with its messages"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == user_id, Conversation.is_active == True).first()

    if not conversation:
        return None

    # Load messages
    messages = db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.created_at.asc()).limit(limit).all()

    # Convert ChatMessage objects to ChatMessageResponse objects
    formatted_messages = [ChatMessageResponse(id=msg.id, conversation_id=msg.conversation_id, message_type=msg.message_type, content=msg.content, created_at=msg.created_at, mentions=msg.mentions) for msg in messages]

    # Return a dictionary that matches the ConversationWithMessagesResponse schema
    return {"id": conversation.id, "user_id": conversation.user_id, "title": conversation.title, "created_at": conversation.created_at, "updated_at": conversation.updated_at, "is_active": conversation.is_active, "messages": formatted_messages}


def update_conversation(db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID, update_data: dict) -> Optional[Conversation]:
    """Update a conversation"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == user_id, Conversation.is_active == True).first()

    if not conversation:
        return None

    # Update fields
    if update_data.get("title") is not None:
        conversation.title = update_data["title"]
    if update_data.get("is_active") is not None:
        conversation.is_active = update_data["is_active"]

    conversation.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(conversation)
    return conversation


def delete_conversation(db: Session, conversation_id: uuid.UUID, user_id: uuid.UUID) -> bool:
    """Soft delete a conversation"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id, Conversation.user_id == user_id).first()

    if not conversation:
        return False

    conversation.is_active = False
    conversation.updated_at = datetime.utcnow()
    db.commit()
    return True


def get_recent_messages(db: Session, conversation_id: uuid.UUID, limit: int = 5) -> List[ChatMessage]:
    """Get recent messages from a conversation for context"""
    return db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.created_at.desc()).limit(limit).all()


async def query_documents_for_mentions(mentions: List[dict]) -> List[dict]:
    """Query documents based on mentions and return results."""
    if not mentions:
        return []

    results = []

    for mention in mentions:
        entity_type = mention.entity_type
        entity_id = mention.entity_id

        if entity_type == "meeting":
            meeting_docs = await query_documents_by_meeting_id(entity_id, top_k=5)
            results.extend(meeting_docs)

    return results
