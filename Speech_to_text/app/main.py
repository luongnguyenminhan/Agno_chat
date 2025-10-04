import os
import warnings
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import FileResponse
from fastapi.routing import APIRoute
from fastapi.staticfiles import StaticFiles

from app.api import api_router
from app.core.config import settings

# Suppress specific deprecation warnings from torchaudio/pyannote.audio
warnings.filterwarnings("ignore", message="torchaudio._backend.list_audio_backends has been deprecated", category=UserWarning)
warnings.filterwarnings("ignore", message=".*list_audio_backends.*deprecated.*", category=UserWarning)
warnings.filterwarnings("ignore", message="torchaudio._backend.utils.info has been deprecated", category=UserWarning)
warnings.filterwarnings("ignore", message="torchaudio._backend.common.AudioMetaData has been deprecated", category=UserWarning)
warnings.filterwarnings("ignore", message="In 2.9, this function's implementation will be changed", category=UserWarning)
warnings.filterwarnings("ignore", message="std\\(\\)\\: degrees of freedom is <= 0", category=UserWarning)
warnings.filterwarnings("ignore", message=".*torchaudio\\.info.*deprecated.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*AudioMetaData.*deprecated.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*torchcodec.*", category=UserWarning)


def custom_generate_unique_id(route: APIRoute) -> str:
    """
    Custom function to generate unique operation IDs for OpenAPI schema.
    This creates cleaner method names for generated client code.
    """
    if route.tags:
        # Use first tag + operation name for better organization
        return f"{route.tags[0]}_{route.name}"
    return route.name


def custom_openapi():
    """
    Custom OpenAPI schema generator with additional metadata and extensions.
    """
    if app.openapi_schema:
        return app.openapi_schema

    # Generate base OpenAPI schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Add custom extensions
    openapi_schema["info"]["x-logo"] = {
        "url": "https://fastapi.tiangolo.com/img/logo-margin/logo-teal.png",
        "altText": "SecureScribe API Logo",
    }

    # Add custom servers for different environments
    openapi_schema["servers"] = [
        {"url": "http://localhost:9998", "description": "Development server"},
        {"url": "https://api.securescribe.com", "description": "Production server"},
    ]

    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "JWT Authorization header using the Bearer scheme.",
        }
    }

    # Apply security globally
    openapi_schema["security"] = [{"BearerAuth": []}]

    # Cache the schema
    app.openapi_schema = openapi_schema
    return openapi_schema


app = FastAPI(
    title="SecureScribeBE",
    version="1.0.0",
    contact={
        "name": "SecureScribe Team",
        "email": "support@securescribe.com",
    },
    license_info={
        "name": "MIT",
    },
    # Custom operation ID generation for better client code
    generate_unique_id_function=custom_generate_unique_id,
)


# Add middleware to log all requests
@app.middleware("http")
async def log_requests(request, call_next):
    print(f"[REQUEST] {request.method} {request.url}")
    response = await call_next(request)
    print(f"[RESPONSE] {response}")
    return response


# Override the default OpenAPI schema generator
app.openapi = custom_openapi

# Configure CORS for cross-origin requests with Authorization headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=(["*"]),
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS",
    ],  # Explicitly allow methods
    allow_headers=["*"],  # Allow all headers including Authorization
    expose_headers=["*"],  # Expose all headers for EventSource
)

# Mount API router FIRST (important for routing precedence)
app.include_router(api_router)

# Mount static files AFTER API router to avoid conflicts
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Serve chat application files directly for easier access
@app.get("/chat/css", response_class=FileResponse)
def serve_chat_css():
    """Serve chat_bubble.css file directly"""
    file_path = os.path.join("app", "static", "chat_bubble.css")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="text/css")
    else:
        raise HTTPException(status_code=404, detail="chat_bubble.css not found")

@app.get("/chat/js", response_class=FileResponse)
def serve_chat_js():
    """Serve chat_bubble.js file directly"""
    file_path = os.path.join("app", "static", "chat_bubble.js")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="application/javascript")
    else:
        raise HTTPException(status_code=404, detail="chat_bubble.js not found")

# Combined chat application endpoint
@app.get("/chat")
def serve_chat_app():
    """Serve the complete chat application"""
    file_path = os.path.join("app", "static", "chat_bubble.html")
    if os.path.exists(file_path):
        return FileResponse(file_path, media_type="text/html")
    else:
        raise HTTPException(status_code=404, detail="chat_bubble.html not found")





@app.get("/health/redis")
def health_redis() -> Dict[str, Any]:
    """
    Redis health check endpoint
    """
    try:
        from app.utils.redis import get_redis_client

        redis_client = get_redis_client()

        # Test connection
        redis_client.ping()

        # Get Redis info
        info = redis_client.info()
        memory_info = redis_client.info("memory")

        return {
            "status": "connected",
            "host": settings.REDIS_HOST,
            "port": settings.REDIS_PORT,
            "db": settings.REDIS_DB,
            "version": info.get("redis_version", "unknown"),
            "uptime_seconds": info.get("uptime_in_seconds", 0),
            "connected_clients": info.get("connected_clients", 0),
            "memory_used": memory_info.get("used_memory_human", "unknown"),
            "memory_peak": memory_info.get("used_memory_peak_human", "unknown"),
        }
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "disconnected",
                "error": str(e),
                "host": settings.REDIS_HOST,
                "port": settings.REDIS_PORT,
            },
        )
