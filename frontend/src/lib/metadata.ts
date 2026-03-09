import { emptyMetadata, type MetadataPayload } from "../api";

export type MetadataDraft = {
  title: string;
  series: string;
  number: string;
  summary: string;
  writer: string;
  penciller: string;
  inker: string;
  colorist: string;
  letterer: string;
  cover_artist: string;
  editor: string;
  publisher: string;
  language_iso: string;
  web: string;
  manga: string;
  genre: string;
  tags: string;
  year: string;
  month: string;
  day: string;
};

export function createEmptyMetadataDraft(): MetadataDraft {
  return metadataToDraft(emptyMetadata());
}

export function metadataToDraft(metadata: MetadataPayload): MetadataDraft {
  return {
    title: metadata.title,
    series: metadata.series,
    number: metadata.number,
    summary: metadata.summary,
    writer: metadata.writer,
    penciller: metadata.penciller,
    inker: metadata.inker,
    colorist: metadata.colorist,
    letterer: metadata.letterer,
    cover_artist: metadata.cover_artist,
    editor: metadata.editor,
    publisher: metadata.publisher,
    language_iso: metadata.language_iso,
    web: metadata.web,
    manga: metadata.manga,
    genre: metadata.genre.join(", "),
    tags: metadata.tags.join(", "),
    year: metadata.year?.toString() ?? "",
    month: metadata.month?.toString() ?? "",
    day: metadata.day?.toString() ?? ""
  };
}

export function draftToMetadata(draft: MetadataDraft): MetadataPayload {
  return {
    ...emptyMetadata(),
    title: draft.title.trim(),
    series: draft.series.trim(),
    number: draft.number.trim(),
    summary: draft.summary.trim(),
    writer: draft.writer.trim(),
    penciller: draft.penciller.trim(),
    inker: draft.inker.trim(),
    colorist: draft.colorist.trim(),
    letterer: draft.letterer.trim(),
    cover_artist: draft.cover_artist.trim(),
    editor: draft.editor.trim(),
    publisher: draft.publisher.trim(),
    language_iso: draft.language_iso.trim(),
    web: draft.web.trim(),
    manga: draft.manga.trim(),
    genre: splitCsv(draft.genre),
    tags: splitCsv(draft.tags),
    year: parseNumber(draft.year),
    month: parseNumber(draft.month),
    day: parseNumber(draft.day)
  };
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseNumber(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
