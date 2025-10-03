import asyncio
import json
import logging
from typing import Any, Dict, List

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.jobs.celery_worker import celery_app
from app.models.chat import ChatMessage, ChatMessageType
from app.utils.llm import create_general_chat_agent, get_agno_postgres_db
import redis
from agno.models.message import Message

# Setup logging
logger = logging.getLogger(__name__)

engine = create_engine(str(settings.SQLALCHEMY_DATABASE_URI))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Sync Redis client for Celery tasks
sync_redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=int(settings.REDIS_PORT),
    db=int(settings.REDIS_DB),
    decode_responses=True
)


def fetch_conversation_history_sync(conversation_id: str, limit: int = 10) -> List[Message]:
    """Synchronous version of fetch_conversation_history for use in Celery tasks."""
    from app.db import SessionLocal
    from app.models.chat import ChatMessage

    db = SessionLocal()
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.conversation_id == conversation_id
        ).order_by(ChatMessage.created_at.desc()).limit(limit).all()

        history = []
        for msg in reversed(messages):  # Chronological order
            role = "user" if msg.message_type == ChatMessageType.user else "assistant"
            history.append(Message(role=role, content=msg.content))
        return history
    finally:
        db.close()


@celery_app.task(bind=True)
def process_chat_message(self, conversation_id: str, user_message_id: str, content: str, user_id: str) -> Dict[str, Any]:
    """
    Process chat message in background and broadcast response via SSE.

    This task handles AI processing and broadcasts the response via Redis for SSE clients.
    """
    logger.info(f"Starting background AI processing for conversation_id={conversation_id}, user_id={user_id}")

    # Create database session for this task
    db = SessionLocal()

    try:
        # Get Agno DB for agent
        agno_db = get_agno_postgres_db()
        logger.info(f"Obtained Agno DB for conversation_id={conversation_id}")

        # Create chat agent
        agent = create_general_chat_agent(agno_db, conversation_id, user_id)
        logger.info(f"Created chat agent for conversation_id={conversation_id}, user_id={user_id}")

        # Fetch conversation history (using sync version for Celery task)
        history = fetch_conversation_history_sync(conversation_id)
        logger.info(f"Fetched conversation history for conversation_id={conversation_id}, history_length={len(history) if history else 0}")

        # Process message with AI agent
        response = agent.run(content, history=history)
        logger.info(f"Agent generated response for conversation_id={conversation_id}")

        ai_response_content = response.content
        logger.info(f"AI response content length: {len(ai_response_content)}")

        # Create AI message in database
        ai_message = ChatMessage(
            conversation_id=conversation_id,
            message_type=ChatMessageType.agent,
            content=ai_response_content,
            user_id=user_id
        )
        db.add(ai_message)
        db.commit()
        db.refresh(ai_message)
        logger.info(f"Created AI message with id={ai_message.id} for conversation_id={conversation_id}")

        # Broadcast message via Redis to SSE channel
        try:
            channel = f"conversation:{conversation_id}:messages"
            message_data = {
                "type": "chat_message",
                "conversation_id": conversation_id,
                "message": {
                    "id": str(ai_message.id),
                    "content": ai_response_content,
                    "message_type": "agent",
                    "created_at": ai_message.created_at.isoformat()
                }
            }

            # Use sync Redis client for broadcasting in Celery task
            result = sync_redis_client.publish(channel, json.dumps(message_data))
            logger.info(f"Successfully broadcasted message to Redis channel {channel} (subscribers: {result})")

        except Exception as broadcast_error:
            logger.error(f"Failed to broadcast message: {broadcast_error}")

        return {
            "status": "success",
            "conversation_id": conversation_id,
            "user_message_id": user_message_id,
            "ai_message_id": str(ai_message.id),
            "message": "AI response processed and broadcasted successfully",
        }

    except Exception as e:
        logger.error(f"Background AI processing failed for conversation_id={conversation_id}: {e}")

        # Create error message in database
        try:
            error_message = ChatMessage(
                conversation_id=conversation_id,
                message_type=ChatMessageType.agent,
                content="I apologize, but I encountered an error processing your message. Please try again.",
                user_id=user_id
            )
            db.add(error_message)
            db.commit()

            # Try to broadcast error message
            try:
                channel = f"conversation:{conversation_id}:messages"
                error_data = {
                    "type": "chat_message",
                    "conversation_id": conversation_id,
                    "message": {
                        "id": str(error_message.id),
                        "content": error_message.content,
                        "message_type": "agent",
                        "created_at": error_message.created_at.isoformat(),
                        "error": True
                    }
                }

                # Use sync Redis client for error broadcasting
                result = sync_redis_client.publish(channel, json.dumps(error_data))
                logger.info(f"Successfully broadcasted error message to Redis channel {channel} (subscribers: {result})")

            except Exception as broadcast_error:
                logger.error(f"Failed to broadcast error message: {broadcast_error}")

        except Exception as db_error:
            logger.error(f"Failed to save error message to database: {db_error}")

        return {
            "status": "error",
            "conversation_id": conversation_id,
            "user_message_id": user_message_id,
            "error": str(e),
            "message": "AI processing failed",
        }

    finally:
        # Cleanup database session
        db.close()
        logger.info(f"Background task completed for conversation_id={conversation_id}")


