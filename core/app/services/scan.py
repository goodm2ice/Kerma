from __future__ import annotations

import zipfile
from pathlib import Path

from ..comicinfo import metadata_from_xml
from ..config import Settings
from ..schemas import EditionItem, MetadataPayload, SourceChapterItem, SourceDirectoryItem, SourceFileItem
from .common import IMAGE_EXTENSIONS, is_image, utc_timestamp


def scan_sources(settings: Settings) -> list[SourceDirectoryItem]:
    items: list[SourceDirectoryItem] = []
    root = settings.sources_dir

    for directory in sorted((path for path in root.iterdir() if path.is_dir()), key=lambda p: p.relative_to(root).as_posix()):
        files = [file for file in sorted(directory.rglob("*")) if file.is_file()]
        if not files:
            continue
        image_files = [file for file in files if is_image(file)]
        if not image_files:
            continue

        relative_directory = directory.relative_to(root).as_posix()
        file_items = [
            SourceFileItem(
                name=file.name,
                relative_path=file.relative_to(directory).as_posix(),
                size=file.stat().st_size,
                modified_at=utc_timestamp(file),
                is_image=is_image(file),
            )
            for file in files
        ]
        chapters = build_source_chapters(directory)

        items.append(
            SourceDirectoryItem(
                relative_path=relative_directory,
                name=directory.name,
                file_count=len(files),
                image_count=len(image_files),
                chapter_count=len(chapters),
                has_nested_directories=any(path.is_dir() for path in directory.iterdir()),
                modified_at=max(utc_timestamp(file) for file in files),
                files=file_items,
                chapters=chapters,
            )
        )

    return items


def build_source_chapters(directory: Path) -> list[SourceChapterItem]:
    top_level_directories = sorted((path for path in directory.iterdir() if path.is_dir()), key=lambda p: p.name.lower())
    chapters: list[SourceChapterItem] = []

    if top_level_directories:
        root_specials = [
            file for file in sorted(directory.iterdir(), key=lambda p: p.name.lower()) if file.is_file() and is_image(file)
        ]
        if root_specials:
            chapters.append(
                SourceChapterItem(
                    name="Specials",
                    relative_path=".",
                    image_count=len(root_specials),
                    modified_at=max(utc_timestamp(file) for file in root_specials),
                    kind="special",
                    files=[
                        SourceFileItem(
                            name=file.name,
                            relative_path=file.relative_to(directory).as_posix(),
                            size=file.stat().st_size,
                            modified_at=utc_timestamp(file),
                            is_image=True,
                        )
                        for file in root_specials
                    ],
                )
            )

        for chapter_dir in top_level_directories:
            chapter_images = [
                file for file in sorted(chapter_dir.rglob("*"), key=lambda p: p.as_posix()) if file.is_file() and is_image(file)
            ]
            if not chapter_images:
                continue
            chapters.append(
                SourceChapterItem(
                    name=chapter_dir.name,
                    relative_path=chapter_dir.relative_to(directory).as_posix(),
                    image_count=len(chapter_images),
                    modified_at=max(utc_timestamp(file) for file in chapter_images),
                    kind="chapter",
                    files=[
                        SourceFileItem(
                            name=file.name,
                            relative_path=file.relative_to(directory).as_posix(),
                            size=file.stat().st_size,
                            modified_at=utc_timestamp(file),
                            is_image=True,
                        )
                        for file in chapter_images
                    ],
                )
            )
        return chapters

    single_chapter_images = [
        file for file in sorted(directory.rglob("*"), key=lambda p: p.as_posix()) if file.is_file() and is_image(file)
    ]
    if single_chapter_images:
        chapters.append(
            SourceChapterItem(
                name="Chapter 1",
                relative_path=".",
                image_count=len(single_chapter_images),
                modified_at=max(utc_timestamp(file) for file in single_chapter_images),
                kind="chapter",
                files=[
                    SourceFileItem(
                        name=file.name,
                        relative_path=file.relative_to(directory).as_posix(),
                        size=file.stat().st_size,
                        modified_at=utc_timestamp(file),
                        is_image=True,
                    )
                    for file in single_chapter_images
                ],
            )
        )
    return chapters


def scan_editions(settings: Settings) -> list[EditionItem]:
    items: list[EditionItem] = []
    root = settings.editions_dir

    for archive in sorted(root.rglob("*.cbz"), key=lambda p: p.relative_to(root).as_posix()):
        metadata = MetadataPayload()
        image_count = 0

        try:
            with zipfile.ZipFile(archive, "r") as zf:
                names = zf.namelist()
                image_count = sum(1 for name in names if Path(name).suffix.lower() in IMAGE_EXTENSIONS)
                if "ComicInfo.xml" in names:
                    metadata = metadata_from_xml(zf.read("ComicInfo.xml"))
        except zipfile.BadZipFile:
            continue

        items.append(
            EditionItem(
                relative_path=archive.relative_to(root).as_posix(),
                name=archive.stem,
                size=archive.stat().st_size,
                modified_at=utc_timestamp(archive),
                image_count=image_count,
                metadata=metadata,
            )
        )

    return items
