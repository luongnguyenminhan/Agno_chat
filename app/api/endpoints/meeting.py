import os
import tempfile
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import get_db
from app.schemas.conversation import MeetingIndexResponse
from app.services.qdrant_service import process_file

router = APIRouter(prefix=settings.API_V1_STR, tags=["Meeting"])


@router.post("/meetings/index", response_model=MeetingIndexResponse)
async def index_meeting(
    meeting_id: str = Form(...),
    transcript: Optional[str] = Form(None),
    meeting_note_file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user_id: str = Form(...),
):
    """
    Index a meeting transcript and/or meeting note PDF file to Qdrant for vector search.

    Args:
        meeting_id: Unique identifier for the meeting
        transcript: Meeting transcript text (optional)
        meeting_note_file: PDF file containing meeting notes (optional)
        current_user_id: ID of the user performing the indexing

    Returns:
        MeetingIndexResponse with success status and processing details
    """
    if not meeting_id:
        raise HTTPException(status_code=400, detail="meeting_id is required")

    if not transcript and not meeting_note_file:
        raise HTTPException(status_code=400, detail="Either transcript or meeting_note_file must be provided")

    try:
        processed_items = []
        total_chunks = 0

        # Process transcript text if provided
        if transcript and transcript.strip():
            # Create a temporary text file for the transcript
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
                temp_file.write(transcript)
                temp_file_path = temp_file.name

            try:
                # Process the transcript file using existing qdrant_service
                success = await process_file(
                    file_path=temp_file_path,
                    collection_name=settings.QDRANT_COLLECTION_NAME,
                    file_id=f"{meeting_id}_transcript",
                    meeting_id=meeting_id,
                    owner_user_id=current_user_id,
                    file_type="transcript"
                )

                if success:
                    processed_items.append("transcript")
                    # Count chunks (approximate based on typical chunking)
                    estimated_chunks = len(transcript.split()) // 200  # Rough estimate
                    total_chunks += estimated_chunks
                else:
                    print(f"Failed to process transcript for meeting {meeting_id}")

            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)

        # Process PDF file if provided
        if meeting_note_file and meeting_note_file.filename:
            # Validate file type
            if not meeting_note_file.filename.lower().endswith('.pdf'):
                raise HTTPException(status_code=400, detail="Only PDF files are supported for meeting notes")

            # Create temporary file for the uploaded PDF
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as temp_file:
                temp_file_path = temp_file.name

                # Write uploaded file content to temporary file
                content = await meeting_note_file.read()
                with open(temp_file_path, 'wb') as f:
                    f.write(content)

            try:
                # Process the PDF file using existing qdrant_service
                success = await process_file(
                    file_path=temp_file_path,
                    collection_name=settings.QDRANT_COLLECTION_NAME,
                    file_id=f"{meeting_id}_notes",
                    meeting_id=meeting_id,
                    owner_user_id=current_user_id,
                    file_type="meeting_notes"
                )

                if success:
                    processed_items.append("meeting_notes")
                    # Note: Actual chunk count would be determined by qdrant_service
                    total_chunks += 1  # At least one chunk for the file
                else:
                    print(f"Failed to process meeting notes PDF for meeting {meeting_id}")

            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)

        if not processed_items:
            raise HTTPException(status_code=500, detail="Failed to process any meeting content")

        return MeetingIndexResponse(
            success=True,
            message=f"Successfully indexed meeting {meeting_id} content",
            data={
                "meeting_id": meeting_id,
                "processed_items": processed_items,
                "estimated_chunks": total_chunks,
                "user_id": current_user_id
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error indexing meeting {meeting_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to index meeting: {str(e)}")