import os
import shutil
import tempfile
import warnings
from typing import Set

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.jobs.tasks import transcribe_audio_task
from app.utils.redis import create_task, get_task_status

# Suppress specific deprecation warnings from pyannote.audio/torchaudio
warnings.filterwarnings("ignore", message="torchaudio._backend.list_audio_backends has been deprecated", category=UserWarning)
warnings.filterwarnings("ignore", message=".*list_audio_backends.*deprecated.*", category=UserWarning)
warnings.filterwarnings("ignore", message="torchaudio._backend.utils.info has been deprecated", category=UserWarning)
warnings.filterwarnings("ignore", message="torchaudio._backend.common.AudioMetaData has been deprecated", category=UserWarning)
warnings.filterwarnings("ignore", message="In 2.9, this function's implementation will be changed", category=UserWarning)
warnings.filterwarnings("ignore", message="std\\(\\)\\: degrees of freedom is <= 0", category=UserWarning)
warnings.filterwarnings("ignore", message=".*torchaudio\\.info.*deprecated.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*AudioMetaData.*deprecated.*", category=UserWarning)
warnings.filterwarnings("ignore", message=".*torchcodec.*", category=UserWarning)

# Alternative approach using environment variable (uncomment if needed)
# import os
# os.environ['TORCHAUDIO_SHOW_DEPRECATED_WARNING'] = '0'

router = APIRouter(prefix=settings.API_V1_STR, tags=["Audio"])

# Configuration paths
CONFIG_PATH = "app/core/configs/EfficientConformerCTCSmall.json"
CHECKPOINT_PATH = "checkpoints_56_90h.ckpt"


@router.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), callback_url: str = Form(None)):
    """
    Upload an audio file and get transcription with speaker diarization.

    Args:
        file: Audio file to transcribe (supports WAV, MP3, M4A, FLAC, etc.)
        callback_url: Optional callback URL for completion notification

    Returns:
        JSON response with task ID and status information
    """
    print(f"\033[94m[API] Starting background transcription for file: {file.filename}\033[0m")

    # Validate file type
    allowed_extensions: Set[str] = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"}
    file_extension = os.path.splitext(file.filename or "")[1].lower()

    if file_extension not in allowed_extensions:
        print(f"\033[91m[API] ERROR: Unsupported file format: {file_extension}\033[0m")
        raise HTTPException(status_code=400, detail=f"Unsupported file format. Allowed formats: {', '.join(allowed_extensions)}")

    print(f"\033[92m[API] File format validated: {file_extension}\033[0m")

    # Generate unique task ID
    import uuid

    task_id = str(uuid.uuid4())

    try:
        print(f"\033[94m[API] Creating temporary file for task_id={task_id}\033[0m")

        # Create temporary file that will persist until task completes
        # File will be accessible by both API and Celery worker containers via shared volume
        temp_audio_path = f"/tmp/transcribe_{task_id}{file_extension}"

        # Save uploaded file to temp location
        print(f"\033[94m[API] Saving file to: {temp_audio_path}\033[0m")
        with open(temp_audio_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print("\033[92m[API] File saved successfully\033[0m")

        # Create task metadata in Redis
        print(f"\033[94m[API] Creating task metadata for task_id={task_id}\033[0m")
        if not create_task(task_id, file.filename, callback_url):
            print(f"\033[91m[API] ERROR: Failed to create task metadata for task_id={task_id}\033[0m")
            # Clean up temp file on error
            if os.path.exists(temp_audio_path):
                os.unlink(temp_audio_path)
            raise HTTPException(status_code=500, detail="Failed to create task")

        # Enqueue background task
        print(f"\033[94m[API] Enqueuing background task for task_id={task_id}\033[0m")
        transcribe_audio_task.delay(task_id=task_id, audio_path=temp_audio_path, config_path=CONFIG_PATH, checkpoint_path=CHECKPOINT_PATH, hf_token=settings.HF_TOKEN, callback_url=callback_url)

        print(f"\033[92m[API] Background task enqueued successfully for task_id={task_id}\033[0m")

        # Prepare response
        response_data = {"success": True, "message": "Audio transcription task enqueued successfully", "data": {"task_id": task_id, "filename": file.filename, "status": "pending", "progress": 0, "callback_url": callback_url, "polling_url": f"/api/v1/transcribe/task/{task_id}"}}

        print(f"\033[92m[API] Returning task information for task_id={task_id}\033[0m")
        return JSONResponse(content=response_data)

    except Exception as e:
        print(f"\033[91m[API] ERROR: {str(e)}\033[0m")
        raise HTTPException(status_code=500, detail=f"Error enqueuing transcription task: {str(e)}")


@router.get("/transcribe/task/{task_id}")
async def get_task_status_endpoint(task_id: str):
    """
    Get the status and results of a transcription task.

    Args:
        task_id: Unique task identifier

    Returns:
        JSON response with task status, progress, and results if completed
    """
    print(f"\033[94m[API] Checking task status for task_id={task_id}\033[0m")

    # Get task status from Redis
    task_data = get_task_status(task_id)

    if not task_data:
        print(f"\033[91m[API] ERROR: Task not found: {task_id}\033[0m")
        raise HTTPException(status_code=404, detail="Task not found")

    print(f"\033[92m[API] Task status retrieved: {task_data.get('status', 'unknown')}\033[0m")

    # Prepare response
    response_data = {"success": True, "message": "Task status retrieved successfully", "data": {"task_id": task_data.get("task_id"), "status": task_data.get("status"), "progress": task_data.get("progress", 0), "filename": task_data.get("filename"), "created_at": task_data.get("created_at"), "completed_at": task_data.get("completed_at"), "error": task_data.get("error") if task_data.get("error") else None, "results": task_data.get("results")}}

    print(f"\033[92m[API] Returning task status for task_id={task_id}\033[0m")
    return JSONResponse(content=response_data)


@router.get("/transcribe/status")
async def get_transcription_status():
    """
    Get status information about the transcription service.

    Returns:
        JSON response with service status and configuration
    """
    return {"success": True, "message": "Transcription service is available", "data": {"supported_formats": [".wav", ".mp3", ".m4a", ".flac", ".ogg", ".aac"], "model_config": CONFIG_PATH, "checkpoint": CHECKPOINT_PATH, "device": "cpu", "diarization_model": "pyannote/speaker-diarization-3.1"}}
