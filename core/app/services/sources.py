from __future__ import annotations

from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from ..schemas import SourceDirectoryItem, UploadDirectoryResponse
from .common import extension_to_media_type, sanitize_relative_path


def resolve_source_dir(service, relative_path: str) -> Path:
    candidate = service.settings.sources_dir / sanitize_relative_path(relative_path)
    if not candidate.exists() or not candidate.is_dir():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source directory not found.")
    return candidate


async def upload_source_directory(service, directory_name: str, files: list[UploadFile]) -> UploadDirectoryResponse:
    relative_dir = sanitize_relative_path(directory_name)
    target_dir = service.settings.sources_dir / relative_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    stored_count = 0
    for upload in files:
        if not upload.filename:
            continue
        relative_file = sanitize_relative_path(upload.filename)
        destination = target_dir / relative_file
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("wb") as stream:
            while chunk := await upload.read(1024 * 1024):
                stream.write(chunk)
        await upload.close()
        stored_count += 1

    await service.scan("sources")
    return UploadDirectoryResponse(relative_path=relative_dir.as_posix(), file_count=stored_count)


async def create_source_chapter(service, source_path: str, chapter_name: str) -> SourceDirectoryItem:
    source_dir = resolve_source_dir(service, source_path)
    chapter_dir = source_dir / sanitize_relative_path(chapter_name).name
    if chapter_dir.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Chapter directory already exists.")
    chapter_dir.mkdir(parents=True, exist_ok=False)
    await service.scan("sources")
    item = next((entry for entry in service._catalog.sources if entry.relative_path == source_path), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source directory was not indexed.")
    return item


async def upload_source_chapter_files(service, source_path: str, chapter_path: str, files: list[UploadFile]) -> UploadDirectoryResponse:
    source_dir = resolve_source_dir(service, source_path)
    chapter_dir = source_dir / sanitize_relative_path(chapter_path)
    if not chapter_dir.exists() or not chapter_dir.is_dir():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter directory not found.")

    stored_count = 0
    for upload in files:
        if not upload.filename:
            continue
        relative_file = sanitize_relative_path(upload.filename)
        destination = chapter_dir / relative_file
        destination.parent.mkdir(parents=True, exist_ok=True)
        with destination.open("wb") as stream:
            while chunk := await upload.read(1024 * 1024):
                stream.write(chunk)
        await upload.close()
        stored_count += 1

    await service.scan("sources")
    return UploadDirectoryResponse(
        relative_path=chapter_dir.relative_to(service.settings.sources_dir).as_posix(),
        file_count=stored_count,
    )


async def delete_source_directory(service, relative_path: str) -> None:
    target = resolve_source_dir(service, relative_path)
    import shutil
    shutil.rmtree(target)
    await service.scan("sources")


async def delete_source_file(service, source_path: str, file_path: str) -> None:
    source_dir = resolve_source_dir(service, source_path)
    target = source_dir / sanitize_relative_path(file_path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    target.unlink()
    await service.scan("sources")


async def rename_source_directory(service, source_path: str, new_name: str) -> SourceDirectoryItem:
    source_dir = resolve_source_dir(service, source_path)
    destination = source_dir.parent / sanitize_relative_path(new_name).name
    if destination.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Directory already exists.")
    source_dir.rename(destination)
    await service.scan("sources")
    renamed = destination.relative_to(service.settings.sources_dir).as_posix()
    item = next((entry for entry in service._catalog.sources if entry.relative_path == renamed), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Renamed directory was not indexed.")
    return item


async def rename_source_file(service, source_path: str, file_path: str, new_name: str) -> SourceDirectoryItem:
    source_dir = resolve_source_dir(service, source_path)
    target = source_dir / sanitize_relative_path(file_path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    destination = target.with_name(sanitize_relative_path(new_name).name)
    if destination.exists():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="File already exists.")

    target.rename(destination)
    await service.scan("sources")
    item = next((entry for entry in service._catalog.sources if entry.relative_path == source_path), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source directory was not indexed.")
    return item


def get_source_file(service, source_path: str, file_path: str) -> tuple[Path, str]:
    source_dir = resolve_source_dir(service, source_path)
    target = source_dir / sanitize_relative_path(file_path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")
    return target, extension_to_media_type(target.suffix.lower())
