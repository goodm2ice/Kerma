from pydantic import BaseModel, Field


class MetadataPayload(BaseModel):
    title: str = ""
    series: str = ""
    number: str = ""
    summary: str = ""
    writer: str = ""
    penciller: str = ""
    inker: str = ""
    colorist: str = ""
    letterer: str = ""
    cover_artist: str = ""
    editor: str = ""
    publisher: str = ""
    genre: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    language_iso: str = ""
    web: str = ""
    manga: str = ""
    year: int | None = None
    month: int | None = None
    day: int | None = None
