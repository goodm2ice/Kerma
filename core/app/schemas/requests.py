from pydantic import BaseModel, Field

from .metadata import MetadataPayload


class RenameDirectoryRequest(BaseModel):
    new_name: str = Field(min_length=1)


class CreateChapterRequest(BaseModel):
    name: str = Field(min_length=1)


class RenameFileRequest(BaseModel):
    source_path: str
    new_name: str = Field(min_length=1)


class BuildEditionRequest(BaseModel):
    source_path: str
    edition_name: str = Field(min_length=1)
    metadata: MetadataPayload
    overwrite: bool = False
