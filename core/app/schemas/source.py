from datetime import datetime

from pydantic import BaseModel


class SourceFileItem(BaseModel):
    name: str
    relative_path: str
    size: int
    modified_at: datetime
    is_image: bool


class SourceChapterItem(BaseModel):
    name: str
    relative_path: str
    image_count: int
    modified_at: datetime
    files: list[SourceFileItem]
    kind: str


class SourceDirectoryItem(BaseModel):
    relative_path: str
    name: str
    file_count: int
    image_count: int
    chapter_count: int
    has_nested_directories: bool
    modified_at: datetime
    files: list[SourceFileItem]
    chapters: list[SourceChapterItem]
