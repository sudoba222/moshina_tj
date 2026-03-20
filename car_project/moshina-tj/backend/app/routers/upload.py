import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.auth import get_current_user
from app.config import settings
from app.models import User
from app.schemas import ApiResponse

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

_ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def _use_cloudinary() -> bool:
    return bool(settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret)


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

    if _use_cloudinary():
        return _upload_to_cloudinary(contents, file.content_type)
    else:
        return _upload_to_local(contents, file.content_type)


def _upload_to_cloudinary(contents: bytes, content_type: str) -> ApiResponse:
    import cloudinary
    import cloudinary.uploader
    import io

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )

    resource_type = "image"
    result = cloudinary.uploader.upload(
        io.BytesIO(contents),
        folder="tajcar",
        resource_type=resource_type,
        quality="auto",
        fetch_format="auto",
    )

    return ApiResponse(
        success=True,
        data={
            "url": result["secure_url"],
            "cloudinary_id": result["public_id"],
        },
        message="Image uploaded successfully",
    )


def _upload_to_local(contents: bytes, content_type: str) -> ApiResponse:
    ext = _EXTENSIONS[content_type]
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
