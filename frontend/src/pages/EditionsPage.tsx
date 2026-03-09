import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Image,
  Input,
  SimpleGrid,
  Stack,
  Text
} from "@chakra-ui/react";
import { useEffect, useState } from "react";

import {
  deleteEdition,
  editionPreviewUrl,
  fetchEditionContent,
  updateEditionMetadata,
  uploadEdition,
  type EditionContent,
  type EditionItem
} from "../api";
import { MetadataEditor } from "../components/MetadataEditor";
import { SectionCard } from "../components/SectionCard";
import type { Lookups } from "../hooks/useLibraryData";
import { createEmptyMetadataDraft, draftToMetadata, metadataToDraft, type MetadataDraft } from "../lib/metadata";

type NotifyFn = (status: "success" | "error" | "info", title: string, description?: string) => void;

export function EditionsPage({
  editions,
  lookups,
  onChanged,
  onNotify
}: {
  editions: EditionItem[];
  lookups: Lookups;
  onChanged: () => Promise<void>;
  onNotify: NotifyFn;
}) {
  const [selectedPath, setSelectedPath] = useState("");
  const [content, setContent] = useState<EditionContent | null>(null);
  const [draft, setDraft] = useState<MetadataDraft>(createEmptyMetadataDraft());
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    if (editions.length === 0) {
      setSelectedPath("");
      setContent(null);
      setDraft(createEmptyMetadataDraft());
      return;
    }

    if (!selectedPath || !editions.some((edition) => edition.relative_path === selectedPath)) {
      setSelectedPath(editions[0].relative_path);
    }
  }, [editions, selectedPath]);

  useEffect(() => {
    if (!selectedPath) {
      return;
    }

    void (async () => {
      try {
        const nextContent = await fetchEditionContent(selectedPath);
        setContent(nextContent);
        setDraft(metadataToDraft(nextContent.edition.metadata));
      } catch (error) {
        onNotify("error", "Не удалось открыть издание", getErrorMessage(error));
      }
    })();
  }, [onNotify, selectedPath]);

  async function handleUploadEdition() {
    if (!uploadFile) {
      onNotify("info", "Выбери CBZ файл");
      return;
    }

    try {
      await uploadEdition(uploadFile);
      setUploadFile(null);
      await onChanged();
      onNotify("success", "Издание загружено");
    } catch (error) {
      onNotify("error", "Ошибка загрузки издания", getErrorMessage(error));
    }
  }

  async function handleDeleteEdition(path: string) {
    try {
      await deleteEdition(path);
      await onChanged();
      onNotify("success", "Издание удалено");
    } catch (error) {
      onNotify("error", "Ошибка удаления издания", getErrorMessage(error));
    }
  }

  async function handleSaveMetadata() {
    if (!content) {
      return;
    }

    try {
      await updateEditionMetadata(content.edition.relative_path, draftToMetadata(draft));
      const nextContent = await fetchEditionContent(content.edition.relative_path);
      setContent(nextContent);
      setDraft(metadataToDraft(nextContent.edition.metadata));
      await onChanged();
      onNotify("success", "Метаданные обновлены");
    } catch (error) {
      onNotify("error", "Ошибка сохранения метаданных", getErrorMessage(error));
    }
  }

  return (
    <Grid templateColumns={{ base: "1fr", xl: "420px minmax(0, 1fr)" }} gap="6">
      <SectionCard title="Издания" description="Список CBZ архивов, доступных для просмотра, удаления и редактирования.">
        <Stack spacing="4">
          <FormControl>
            <FormLabel>Загрузка нового издания</FormLabel>
            <HStack align="start">
              <Input type="file" accept=".cbz" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />
              <Button colorScheme="blue" onClick={() => void handleUploadEdition()}>
                Загрузить
              </Button>
            </HStack>
          </FormControl>

          <Stack spacing="3">
            {editions.map((edition) => (
              <HStack
                key={edition.relative_path}
                align="stretch"
                spacing="4"
                p="3"
                bg={selectedPath === edition.relative_path ? "selectedBg" : "subtleBg"}
                borderWidth="1px"
                borderColor={selectedPath === edition.relative_path ? "selectedBorder" : "subtleBorder"}
                borderRadius="2xl"
              >
                <Image
                  src={editionPreviewUrl(edition.relative_path)}
                  alt={edition.metadata.title || edition.name}
                  boxSize="72px"
                  objectFit="cover"
                  borderRadius="xl"
                  bg="imageBg"
                />
                <Box flex="1">
                  <Text fontWeight="semibold">{edition.metadata.title || edition.name}</Text>
                  <Text fontSize="sm" color="mutedText">
                    {edition.relative_path}
                  </Text>
                  <Text mt="1" fontSize="sm" color="secondaryText">
                    {edition.image_count} страниц
                  </Text>
                  <HStack mt="3">
                    <Button size="sm" colorScheme="orange" onClick={() => setSelectedPath(edition.relative_path)}>
                      Редактировать
                    </Button>
                    <Button size="sm" colorScheme="red" variant="outline" onClick={() => void handleDeleteEdition(edition.relative_path)}>
                      Удалить
                    </Button>
                  </HStack>
                </Box>
              </HStack>
            ))}
          </Stack>
        </Stack>
      </SectionCard>

      <SectionCard title="Содержимое издания" description="Редактирование метаданных и просмотр страниц выбранного архива.">
        {content ? (
          <Stack spacing="6">
            <MetadataEditor draft={draft} lookups={lookups} onChange={setDraft} />
            <Button alignSelf="start" colorScheme="blue" onClick={() => void handleSaveMetadata()}>
              Сохранить метаданные
            </Button>

            <SimpleGrid columns={{ base: 2, md: 3, xl: 4 }} spacing="4">
              {content.images.map((image) => (
                <Box key={image} bg="subtleBg" borderWidth="1px" borderColor="subtleBorder" borderRadius="2xl" overflow="hidden">
                  <Image
                    src={`/api/editions/${encodePath(content.edition.relative_path)}/images/${encodePath(image)}`}
                    alt={image}
                    w="full"
                    h="220px"
                    objectFit="cover"
                    bg="imageBg"
                  />
                  <Text px="3" py="2" fontSize="sm" noOfLines={2}>
                    {image}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Stack>
        ) : (
          <Text color="mutedText">Выбери издание слева.</Text>
        )}
      </SectionCard>
    </Grid>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}

function encodePath(value: string): string {
  return value
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}
