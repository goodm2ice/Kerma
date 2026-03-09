from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

from fastapi import HTTPException, status

from ..schemas import EditionItem, SourceDirectoryItem

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".avif"}


@dataclass(slots=True)
class Catalog:
    sources: list[SourceDirectoryItem]
    editions: list[EditionItem]


def utc_timestamp(path: Path) -> datetime:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)


def sanitize_relative_path(raw_path: str) -> PurePosixPath:
    normalized = PurePosixPath(raw_path.replace("\\", "/"))
    if normalized.is_absolute() or ".." in normalized.parts:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid path.")
    return normalized


def is_image(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_EXTENSIONS


def extension_to_media_type(extension: str) -> str:
    return {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".avif": "image/avif",
    }.get(extension, "application/octet-stream")
