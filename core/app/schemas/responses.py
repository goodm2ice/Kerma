from pydantic import BaseModel


class UploadDirectoryResponse(BaseModel):
    relative_path: str
    file_count: int


class DeleteResult(BaseModel):
    deleted: bool
    target: str
