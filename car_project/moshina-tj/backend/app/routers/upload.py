import shutil
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.staticfiles import StaticFiles

from app.auth import get_current_user
from app.models import User
from app.schemas import ApiResponse

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


@router.post("/image", response_model=ApiResponse[dict])
async def upload_image(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
):
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: JPEG, PNG, WebP",
        )

    contents = await file.read()
    if len(contents) > _MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds maximum allowed size of 10 MB",
        )

    ext = _EXTENSIONS[file.content_type]
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename

    with open(dest, "wb") as f:
        f.write(contents)

    return ApiResponse(
        success=True,
        data={
            "url": f"/uploads/{filename}",
            "cloudinary_id": filename,
        },
        message="Image uploaded successfully",
    )
