from __future__ import annotations

import xml.etree.ElementTree as et
from pathlib import Path

from .schemas import MetadataPayload


FIELD_MAP = {
    "Title": "title",
    "Series": "series",
    "Number": "number",
    "Summary": "summary",
    "Writer": "writer",
    "Penciller": "penciller",
    "Inker": "inker",
    "Colorist": "colorist",
    "Letterer": "letterer",
    "CoverArtist": "cover_artist",
    "Editor": "editor",
    "Publisher": "publisher",
    "LanguageISO": "language_iso",
    "Web": "web",
    "Manga": "manga",
}


def _text(parent: et.Element, tag: str, value: str) -> None:
    element = et.SubElement(parent, tag)
    element.text = value


def metadata_to_xml(metadata: MetadataPayload, page_count: int) -> bytes:
    root = et.Element("ComicInfo")

    for tag, field_name in FIELD_MAP.items():
        value = getattr(metadata, field_name)
        if value:
            _text(root, tag, str(value))

    if metadata.genre:
        _text(root, "Genre", ", ".join(metadata.genre))
    if metadata.tags:
        _text(root, "Tags", ", ".join(metadata.tags))
    if metadata.year is not None:
        _text(root, "Year", str(metadata.year))
    if metadata.month is not None:
        _text(root, "Month", str(metadata.month))
    if metadata.day is not None:
        _text(root, "Day", str(metadata.day))

    _text(root, "PageCount", str(page_count))
    return et.tostring(root, encoding="utf-8", xml_declaration=True)


def metadata_from_xml(raw_xml: bytes) -> MetadataPayload:
    root = et.fromstring(raw_xml)
    payload: dict[str, object] = {"genre": [], "tags": []}

    for tag, field_name in FIELD_MAP.items():
        value = root.findtext(tag, default="").strip()
        payload[field_name] = value

    genre = root.findtext("Genre", default="")
    tags = root.findtext("Tags", default="")
    payload["genre"] = [part.strip() for part in genre.split(",") if part.strip()]
    payload["tags"] = [part.strip() for part in tags.split(",") if part.strip()]

    for tag, field_name in (("Year", "year"), ("Month", "month"), ("Day", "day")):
        text = root.findtext(tag, default="").strip()
        payload[field_name] = int(text) if text.isdigit() else None

    return MetadataPayload.model_validate(payload)


def metadata_from_sidecar(path: Path) -> MetadataPayload | None:
    if not path.exists():
        return None
    return metadata_from_xml(path.read_bytes())
