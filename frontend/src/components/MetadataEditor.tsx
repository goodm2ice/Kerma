import {
  Box,
  FormControl,
  FormLabel,
  Grid,
  GridItem,
  Input,
  SimpleGrid,
  Tag,
  TagLabel,
  Textarea,
  Wrap,
  WrapItem
} from "@chakra-ui/react";

import type { MetadataDraft } from "../lib/metadata";

const fields: Array<{ field: keyof MetadataDraft; label: string; multiline?: boolean }> = [
  { field: "title", label: "Название" },
  { field: "series", label: "Серия" },
  { field: "number", label: "Номер" },
  { field: "summary", label: "Описание", multiline: true },
  { field: "writer", label: "Сценарист" },
  { field: "penciller", label: "Художник" },
  { field: "inker", label: "Инкер" },
  { field: "colorist", label: "Колорист" },
  { field: "letterer", label: "Леттерер" },
  { field: "cover_artist", label: "Художник обложки" },
  { field: "editor", label: "Редактор" },
  { field: "publisher", label: "Издатель" },
  { field: "language_iso", label: "Язык ISO" },
  { field: "web", label: "Ссылка" },
  { field: "manga", label: "Флаг Manga" }
];

export function MetadataEditor({
  draft,
  lookups,
  onChange
}: {
  draft: MetadataDraft;
  lookups: { authors: string[]; genres: string[]; tags: string[] };
  onChange: (value: MetadataDraft | ((current: MetadataDraft) => MetadataDraft)) => void;
}) {
  return (
    <Grid templateColumns={{ base: "1fr", xl: "2fr 1fr" }} gap="6">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing="4">
        {fields.map((item) => (
          <GridItem key={item.field} colSpan={item.multiline ? { base: 1, md: 2 } : 1}>
            <FormControl>
              <FormLabel>{item.label}</FormLabel>
              {item.multiline ? (
                <Textarea
                  value={draft[item.field]}
                  onChange={(event) => onChange((current) => ({ ...current, [item.field]: event.target.value }))}
                  minH="140px"
                />
              ) : (
                <Input
                  value={draft[item.field]}
                  onChange={(event) => onChange((current) => ({ ...current, [item.field]: event.target.value }))}
                />
              )}
            </FormControl>
          </GridItem>
        ))}

        <GridItem colSpan={{ base: 1, md: 2 }}>
          <FormControl>
            <FormLabel>Жанры</FormLabel>
            <Input value={draft.genre} onChange={(event) => onChange((current) => ({ ...current, genre: event.target.value }))} placeholder="Через запятую" />
          </FormControl>
        </GridItem>

        <GridItem colSpan={{ base: 1, md: 2 }}>
          <FormControl>
            <FormLabel>Теги</FormLabel>
            <Input value={draft.tags} onChange={(event) => onChange((current) => ({ ...current, tags: event.target.value }))} placeholder="Через запятую" />
          </FormControl>
        </GridItem>

        <FormControl>
          <FormLabel>Год</FormLabel>
          <Input value={draft.year} onChange={(event) => onChange((current) => ({ ...current, year: event.target.value }))} />
        </FormControl>

        <FormControl>
          <FormLabel>Месяц</FormLabel>
          <Input value={draft.month} onChange={(event) => onChange((current) => ({ ...current, month: event.target.value }))} />
        </FormControl>

        <FormControl>
          <FormLabel>День</FormLabel>
          <Input value={draft.day} onChange={(event) => onChange((current) => ({ ...current, day: event.target.value }))} />
        </FormControl>
      </SimpleGrid>

      <Box bg="subtleBg" borderWidth="1px" borderColor="subtleBorder" borderRadius="2xl" p="4">
        <LookupBlock title="Авторы" values={lookups.authors} onPick={(value) => onChange((current) => ({ ...current, writer: current.writer || value }))} />
        <LookupBlock title="Жанры" values={lookups.genres} onPick={(value) => onChange((current) => ({ ...current, genre: appendCsv(current.genre, value) }))} />
        <LookupBlock title="Теги" values={lookups.tags} onPick={(value) => onChange((current) => ({ ...current, tags: appendCsv(current.tags, value) }))} />
      </Box>
    </Grid>
  );
}

function LookupBlock({
  onPick,
  title,
  values
}: {
  title: string;
  values: string[];
  onPick: (value: string) => void;
}) {
  return (
    <Box mt="4" _first={{ mt: 0 }}>
      <Box as="p" mb="2" fontSize="sm" fontWeight="medium" color="bodyText">
        {title}
      </Box>
      {values.length === 0 ? <Box as="p" fontSize="sm" color="secondaryText">Пока нет данных</Box> : null}
      <Wrap>
        {values.map((value) => (
          <WrapItem key={`${title}-${value}`}>
            <Tag colorScheme="orange" variant="subtle" cursor="pointer" onClick={() => onPick(value)}>
              <TagLabel>{value}</TagLabel>
            </Tag>
          </WrapItem>
        ))}
      </Wrap>
    </Box>
  );
}

function appendCsv(current: string, value: string): string {
  const parts = current
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.includes(value)) {
    return current;
  }

  return [...parts, value].join(", ");
}
