from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.auth import get_current_user
from app.models import User
from app.schemas import ApiResponse
from app.services import image_service

router = APIRouter(prefix="/upload", tags=["upload"])

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

# Voice messages — MediaRecorder yields webm/opus (Chrome/Firefox) or mp4 (Safari)
_ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg"}
_MAX_AUDIO_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB ≈ several minutes of opus


def _detect_content_type(data: bytes) -> str | None:
    """Return the detected MIME type from magic bytes, or None if unrecognised."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _detect_audio_type(data: bytes) -> str | None:
    """Detect the audio container from magic bytes."""
    if data[:4] == b"\x1aE\xdf\xa3":  # EBML header — webm/matroska
        return "audio/webm"
    if data[:4] == b"OggS":
        return "audio/ogg"
    if data[4:8] == b"ftyp":  # ISO BMFF — mp4/m4a
        return "audio/mp4"
    if data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio/mpeg"
    return None


@router.post("/image", response_model=ApiResponse[dict])
async def upload_image(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
):
    # Validate declared content-type before reading the full file
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: JPEG, PNG, WebP",
        )

    # Read only up to max_size + 1 byte — avoids buffering huge files into RAM before rejection
    contents = await file.read(_MAX_FILE_SIZE_BYTES + 1)
    if len(contents) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds maximum allowed size of 10 MB",
        )

    # Validate actual file content via magic bytes — prevents content-type spoofing
    detected = _detect_content_type(contents)
    if detected is None or detected not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File content does not match a supported image type (JPEG, PNG, WebP)",
        )

    try:
        result = image_service.upload_image(contents, detected)
    except RuntimeError as exc:
        # Raised when production Cloudinary keys are missing
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    return ApiResponse(
        success=True,
        data=result.as_dict(),
        message="Image uploaded successfully",
    )


@router.post("/audio", response_model=ApiResponse[dict])
async def upload_audio(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
):
    """Upload a voice-message clip (webm/ogg/m4a/mp3, max 5 MB)."""
    if file.content_type not in _ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported audio type '{file.content_type}'. Allowed: WebM, Ogg, M4A, MP3",
        )

    contents = await file.read(_MAX_AUDIO_SIZE_BYTES + 1)
    if len(contents) > _MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio exceeds maximum allowed size of 5 MB",
        )

    detected = _detect_audio_type(contents)
    if detected is None or detected not in _ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="File content does not match a supported audio type (WebM, Ogg, M4A, MP3)",
        )

    try:
        result = image_service.upload_audio(contents, detected)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        # Storage backend rejected the file (e.g. Cloudinary "unsupported format")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Audio file could not be processed",
        ) from exc

    return ApiResponse(
        success=True,
        data=result.as_dict(),
        message="Audio uploaded successfully",
    )
