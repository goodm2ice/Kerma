from datetime import datetime

from pydantic import BaseModel

from .metadata import MetadataPayload


class EditionItem(BaseModel):
    relative_path: str
    name: str
    size: int
    modified_at: datetime
    image_count: int
    metadata: MetadataPayload


class EditionContent(BaseModel):
    edition: EditionItem
    images: list[str]
