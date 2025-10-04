from fastapi import APIRouter

from app.api.endpoints.chat import router as chat_router
from app.api.endpoints.conversation import router as conversation_router
from app.api.endpoints.meeting import router as meeting_router

api_router = APIRouter()

api_router.include_router(conversation_router)
api_router.include_router(chat_router)
api_router.include_router(meeting_router)
