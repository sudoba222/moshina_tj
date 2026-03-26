"""Centralised image storage service.

Handles both Cloudinary (production) and local disk (development).  Every
place in the codebase that needs to store or destroy images should go through
this module — never directly through cloudinary.uploader or open().
"""
import io
import logging
import uuid
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
_EXTENSIONS = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _cloudinary_configured() -> bool:
    return bool(
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    )


def _get_cloudinary():
    """Import and configure the cloudinary library, raising clearly if not installed."""
    try:
        import cloudinary  # type: ignore[import]
        import cloudinary.uploader  # type: ignore[import]
    except ImportError as exc:
        raise RuntimeError(
            "cloudinary package is not installed. "
            "Add 'cloudinary' to requirements.txt and rebuild."
        ) from exc

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )
    return cloudinary


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

class ImageUploadResult:
    """Returned by upload_image so callers never need to know the backend."""

    __slots__ = ("url", "public_id")

    def __init__(self, url: str, public_id: str) -> None:
        self.url = url
        self.public_id = public_id

    def as_dict(self) -> dict:
        return {"url": self.url, "cloudinary_id": self.public_id}


def upload_image(contents: bytes, content_type: str) -> ImageUploadResult:
    """Upload *contents* and return a result with url + public_id.

    In production (ENVIRONMENT=production) Cloudinary is required.
    In development, falls back to local disk.

    Raises RuntimeError if production Cloudinary keys are missing.
    """
    if settings.environment == "production":
        if not _cloudinary_configured():
            raise RuntimeError(
                "Cloudinary is not configured but ENVIRONMENT=production. "
                "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and "
                "CLOUDINARY_API_SECRET before uploading images."
            )
        return _upload_to_cloudinary(contents, content_type)

    # Development — use Cloudinary when available, otherwise local disk
    if _cloudinary_configured():
        return _upload_to_cloudinary(contents, content_type)

    return _upload_to_local(contents, content_type)


def delete_image(public_id: str) -> None:
    """Delete an image by its public_id / local filename.

    Failures are logged but never re-raised — a deletion failure must never
    prevent the listing/edit operation from completing.
    """
    if not public_id:
        return

    if settings.environment == "production" or _cloudinary_configured():
        _delete_from_cloudinary(public_id)
    else:
        _delete_from_local(public_id)


# ---------------------------------------------------------------------------
# Storage backends
# ---------------------------------------------------------------------------

def _upload_to_cloudinary(contents: bytes, content_type: str) -> ImageUploadResult:
    cl = _get_cloudinary()
    result = cl.uploader.upload(
        io.BytesIO(contents),
        folder="moshina",
        resource_type="image",
        quality="auto",
        fetch_format="auto",
    )
    return ImageUploadResult(
        url=result["secure_url"],
        public_id=result["public_id"],
    )


def _upload_to_local(contents: bytes, content_type: str) -> ImageUploadResult:
    UPLOADS_DIR.mkdir(exist_ok=True)
    ext = _EXTENSIONS[content_type]
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename
    dest.write_bytes(contents)
    return ImageUploadResult(
        url=f"/uploads/{filename}",
        public_id=filename,
    )


def _delete_from_cloudinary(public_id: str) -> None:
    try:
        cl = _get_cloudinary()
        result = cl.uploader.destroy(public_id, resource_type="image")
        if result.get("result") not in ("ok", "not found"):
            logger.warning("Unexpected Cloudinary destroy result for %s: %s", public_id, result)
    except Exception:
        logger.exception("Failed to delete Cloudinary image: %s", public_id)


def _delete_from_local(public_id: str) -> None:
    # public_id for local files is just the filename (e.g. "abc123.jpg")
    target = UPLOADS_DIR / public_id
    try:
        if target.exists():
            target.unlink()
    except Exception:
        logger.exception("Failed to delete local image: %s", target)
