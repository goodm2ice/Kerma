from __future__ import annotations

import zipfile
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from ..comicinfo import metadata_from_xml, metadata_to_xml
from ..schemas import BuildEditionRequest, EditionContent, EditionItem, MetadataPayload
from .common import IMAGE_EXTENSIONS, extension_to_media_type, is_image, sanitize_relative_path, utc_timestamp


def resolve_edition(service, relative_path: str) -> Path:
    candidate = service.settings.editions_dir / sanitize_relative_path(relative_path)
    if not candidate.exists() or not candidate.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edition not found.")
    return candidate


async def upload_edition(service, file: UploadFile) -> EditionItem:
    if not file.filename or not file.filename.lower().endswith(".cbz"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A CBZ file is required.")

    relative = sanitize_relative_path(file.filename)
    destination = service.settings.editions_dir / relative
    destination.parent.mkdir(parents=True, exist_ok=True)

    with destination.open("wb") as stream:
        while chunk := await file.read(1024 * 1024):
            stream.write(chunk)

    await file.close()
    await service.scan("editions")
    return get_edition_content(service, relative.as_posix()).edition


async def build_edition(service, request: BuildEditionRequest) -> EditionItem:
    from .sources import resolve_source_dir

    source_dir = resolve_source_dir(service, request.source_path)
    edition_file = service.settings.editions_dir / f"{sanitize_relative_path(request.edition_name).as_posix()}.cbz"
    edition_file.parent.mkdir(parents=True, exist_ok=True)

    if edition_file.exists() and not request.overwrite:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Edition already exists.")

    image_files = [path for path in sorted(source_dir.rglob("*")) if path.is_file() and is_image(path)]
    if not image_files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Source directory has no images.")
    archive_entries = build_archive_entries(source_dir)

    buffer = BytesIO()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for image, arcname in archive_entries:
            zf.write(image, arcname=arcname)
        zf.writestr("ComicInfo.xml", metadata_to_xml(request.metadata, page_count=len(image_files)))

    edition_file.write_bytes(buffer.getvalue())
    await service.scan("editions")
    return get_edition_content(service, edition_file.relative_to(service.settings.editions_dir).as_posix()).edition


def build_archive_entries(source_dir: Path) -> list[tuple[Path, str]]:
    chapter_directories = sorted((path for path in source_dir.iterdir() if path.is_dir()), key=lambda p: p.name.lower())
    entries: list[tuple[Path, str]] = []

    if chapter_directories:
        root_specials = [
            file for file in sorted(source_dir.iterdir(), key=lambda p: p.name.lower()) if file.is_file() and is_image(file)
        ]
        entries.extend(numbered_archive_entries("Specials", root_specials))

        for chapter_dir in chapter_directories:
            chapter_images = [
                file for file in sorted(chapter_dir.rglob("*"), key=lambda p: p.as_posix()) if file.is_file() and is_image(file)
            ]
            entries.extend(numbered_archive_entries(chapter_dir.relative_to(source_dir).as_posix(), chapter_images))

        return entries

    single_chapter_images = [
        file for file in sorted(source_dir.rglob("*"), key=lambda p: p.as_posix()) if file.is_file() and is_image(file)
    ]
    return numbered_archive_entries(None, single_chapter_images)


def numbered_archive_entries(section_name: str | None, images: list[Path]) -> list[tuple[Path, str]]:
    if not images:
        return []

    width = len(str(len(images)))
    entries: list[tuple[Path, str]] = []
    for index, image in enumerate(images, start=1):
        extension = image.suffix.lower()
        filename = f"{index:0{width}d}{extension}"
        arcname = Path(section_name).joinpath(filename).as_posix() if section_name else filename
        entries.append((image, arcname))
    return entries


async def delete_edition(service, relative_path: str) -> None:
    archive = resolve_edition(service, relative_path)
    archive.unlink()
    await service.scan("editions")


async def update_edition_metadata(service, relative_path: str, metadata: MetadataPayload) -> EditionItem:
    archive = resolve_edition(service, relative_path)
    images: list[tuple[str, bytes]] = []

    try:
        with zipfile.ZipFile(archive, "r") as source:
            for name in source.namelist():
                if name == "ComicInfo.xml" or name.endswith("/"):
                    continue
                images.append((name, source.read(name)))
    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid CBZ archive.") from exc

    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as target:
        for name, content in images:
            target.writestr(name, content)
        image_count = sum(1 for name, _ in images if Path(name).suffix.lower() in IMAGE_EXTENSIONS)
        target.writestr("ComicInfo.xml", metadata_to_xml(metadata, page_count=image_count))

    await service.scan("editions")
    item = next((entry for entry in service._catalog.editions if entry.relative_path == relative_path), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Edition was not indexed.")
    return item


def get_edition_content(service, relative_path: str) -> EditionContent:
    archive = resolve_edition(service, relative_path)
    images: list[str] = []
    metadata = MetadataPayload()

    try:
        with zipfile.ZipFile(archive, "r") as zf:
            for name in zf.namelist():
                if name == "ComicInfo.xml":
                    metadata = metadata_from_xml(zf.read(name))
                elif Path(name).suffix.lower() in IMAGE_EXTENSIONS:
                    images.append(name)
    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid CBZ archive.") from exc

    edition = EditionItem(
        relative_path=archive.relative_to(service.settings.editions_dir).as_posix(),
        name=archive.stem,
        size=archive.stat().st_size,
        modified_at=utc_timestamp(archive),
        image_count=len(images),
        metadata=metadata,
    )
    return EditionContent(edition=edition, images=images)


def get_edition_image(service, relative_path: str, image_path: str) -> tuple[bytes, str]:
    archive = resolve_edition(service, relative_path)
    normalized = sanitize_relative_path(image_path).as_posix()

    with zipfile.ZipFile(archive, "r") as zf:
        if normalized not in zf.namelist():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found.")
        content = zf.read(normalized)
        media_type = extension_to_media_type(Path(normalized).suffix.lower())
        return content, media_type


def get_edition_preview(service, relative_path: str) -> tuple[bytes, str]:
    archive = resolve_edition(service, relative_path)

    try:
        with zipfile.ZipFile(archive, "r") as zf:
            image_names = sorted(
                (name for name in zf.namelist() if not name.endswith("/") and Path(name).suffix.lower() in IMAGE_EXTENSIONS),
                key=str.lower,
            )
            if not image_names:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Preview image not found.")

            preview_name = image_names[0]
            content = zf.read(preview_name)
            media_type = extension_to_media_type(Path(preview_name).suffix.lower())
            return content, media_type
    except zipfile.BadZipFile as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid CBZ archive.") from exc


def get_lookup_values(service, field: str) -> list[str]:
    values: set[str] = set()
    for edition in service._catalog.editions:
        if field == "authors":
            for value in (
                edition.metadata.writer,
                edition.metadata.penciller,
                edition.metadata.inker,
                edition.metadata.colorist,
                edition.metadata.letterer,
                edition.metadata.cover_artist,
                edition.metadata.editor,
            ):
                if value:
                    values.add(value)
        elif field == "tags":
            values.update(edition.metadata.tags)
        elif field == "genres":
            values.update(edition.metadata.genre)
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lookup not found.")

    return sorted(values, key=str.lower)
