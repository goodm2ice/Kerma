from __future__ import annotations

import asyncio

from ..config import Settings
from ..schemas import BuildEditionRequest, EditionContent, EditionItem, MetadataPayload, SourceDirectoryItem, UploadDirectoryResponse
from .common import Catalog
from .editions import (
    delete_edition,
    get_edition_content,
    get_edition_image,
    get_edition_preview,
    get_lookup_values,
    update_edition_metadata,
    upload_edition,
    build_edition,
)
from .scan import scan_editions, scan_sources
from .sources import (
    create_source_chapter,
    delete_source_directory,
    delete_source_file,
    get_source_file,
    rename_source_directory,
    rename_source_file,
    upload_source_chapter_files,
    upload_source_directory,
)


class CatalogService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = asyncio.Lock()
        self._catalog = Catalog(sources=[], editions=[])

    async def scan(self, target: str | None = None) -> None:
        async with self._lock:
            if target in (None, "sources"):
                sources = scan_sources(self.settings)
            else:
                sources = self._catalog.sources

            if target in (None, "editions"):
                editions = scan_editions(self.settings)
            else:
                editions = self._catalog.editions

            self._catalog = Catalog(sources=sources, editions=editions)

    async def periodic_scan(self, stop_event: asyncio.Event) -> None:
        while not stop_event.is_set():
            await self.scan()
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=self.settings.scan_interval_seconds)
            except TimeoutError:
                continue

    def get_sources(self) -> list[SourceDirectoryItem]:
        return self._catalog.sources

    def get_editions(self) -> list[EditionItem]:
        return self._catalog.editions

    async def upload_source_directory(self, directory_name: str, files) -> UploadDirectoryResponse:
        return await upload_source_directory(self, directory_name, files)

    async def create_source_chapter(self, source_path: str, chapter_name: str) -> SourceDirectoryItem:
        return await create_source_chapter(self, source_path, chapter_name)

    async def upload_source_chapter_files(self, source_path: str, chapter_path: str, files) -> UploadDirectoryResponse:
        return await upload_source_chapter_files(self, source_path, chapter_path, files)

    async def delete_source_directory(self, relative_path: str) -> None:
        await delete_source_directory(self, relative_path)

    async def delete_source_file(self, source_path: str, file_path: str) -> None:
        await delete_source_file(self, source_path, file_path)

    async def rename_source_directory(self, source_path: str, new_name: str) -> SourceDirectoryItem:
        return await rename_source_directory(self, source_path, new_name)

    async def rename_source_file(self, source_path: str, file_path: str, new_name: str) -> SourceDirectoryItem:
        return await rename_source_file(self, source_path, file_path, new_name)

    def get_source_file(self, source_path: str, file_path: str):
        return get_source_file(self, source_path, file_path)

    async def upload_edition(self, file) -> EditionItem:
        return await upload_edition(self, file)

    async def build_edition(self, request: BuildEditionRequest) -> EditionItem:
        return await build_edition(self, request)

    async def delete_edition(self, relative_path: str) -> None:
        await delete_edition(self, relative_path)

    async def update_edition_metadata(self, relative_path: str, metadata: MetadataPayload) -> EditionItem:
        return await update_edition_metadata(self, relative_path, metadata)

    def get_edition_content(self, relative_path: str) -> EditionContent:
        return get_edition_content(self, relative_path)

    def get_edition_image(self, relative_path: str, image_path: str):
        return get_edition_image(self, relative_path, image_path)

    def get_edition_preview(self, relative_path: str):
        return get_edition_preview(self, relative_path)

    def get_lookup_values(self, field: str) -> list[str]:
        return get_lookup_values(self, field)
