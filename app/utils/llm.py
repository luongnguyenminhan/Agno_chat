import textwrap
from typing import List

from agno.agent import Agent
from agno.db.postgres import PostgresDb
from agno.models.google import Gemini
from agno.models.message import Message

from app.core.config import settings
from app.db import SessionLocal
from app.models.chat import ChatMessage, ChatMessageType


async def fetch_conversation_history(conversation_id: str, limit: int = 10) -> List[Message]:
    """Fetch and format recent conversation history for Agno."""
    db = SessionLocal()
    try:
        messages = db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation_id).order_by(ChatMessage.created_at.desc()).limit(limit).all()
        history = []
        for msg in reversed(messages):  # Chronological order
            role = "user" if msg.message_type == ChatMessageType.user else "assistant"
            history.append(Message(role=role, content=msg.content))
        return history
    finally:
        db.close()

def _get_model() -> Gemini:
    return Gemini(
        id="gemini-2.5-flash-lite",
        api_key=settings.GOOGLE_API_KEY,
    )

def get_agno_postgres_db() -> PostgresDb:
    """Get agno PostgresDb instance for session management"""
    return PostgresDb(db_url=str(settings.SQLALCHEMY_DATABASE_URI), session_table="conversations", memory_table="chat_messages")


def create_general_chat_agent(agno_db: PostgresDb, session_id: str, user_id: str) -> Agent:
    """Create a general chat agent with Agno for conversation history and responses."""
    return Agent(
        name="General Chat Assistant",
        model=_get_model(),
        db=agno_db,
        session_id=session_id,
        user_id=user_id,
        enable_user_memories=True,
        enable_session_summaries=True,
        add_history_to_context=True,
        num_history_runs=10,  # Increased for general chat
        markdown=True,
        description=textwrap.dedent("""\
            You are a helpful AI assistant for general conversations.
            YOUR NAME IS TUTU.
            YOU ALWAYS RESPOND IN TUTU'S VOICE.
            YOU ALWAYS RESPONSE IN VIETNAMESE WITH JAPANESE GREETINGS.

            Guidelines:
            - Provide accurate and helpful responses based on conversation history.
            - Be conversational and engaging.
            - [Mock: Mention feature would filter vector IDs here for context.]
            - Use available history to maintain context.
        """),
    )
