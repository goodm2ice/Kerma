import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  HStack,
  Image,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text
} from "@chakra-ui/react";
import { type ChangeEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  buildEdition,
  createSourceChapter,
  deleteSource,
  deleteSourceFile,
  renameSource,
  renameSourceFile,
  sourceFileUrl,
  uploadSourceChapterFiles,
  uploadSourceDirectory,
  type SourceDirectoryItem
} from "../api";
import { MetadataEditor } from "../components/MetadataEditor";
import { SectionCard } from "../components/SectionCard";
import type { Lookups } from "../hooks/useLibraryData";
import { createEmptyMetadataDraft, draftToMetadata, type MetadataDraft } from "../lib/metadata";

type NotifyFn = (status: "success" | "error" | "info", title: string, description?: string) => void;

export function SourcesPage({
  lookups,
  sources,
  onChanged,
  onNotify
}: {
  lookups: Lookups;
  sources: SourceDirectoryItem[];
  onChanged: () => Promise<void>;
  onNotify: NotifyFn;
}) {
  const [selectedSourcePath, setSelectedSourcePath] = useState("");
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceFiles, setNewSourceFiles] = useState<File[]>([]);
  const [newChapterName, setNewChapterName] = useState("");
  const [chapterUploadPath, setChapterUploadPath] = useState("");
  const [chapterFiles, setChapterFiles] = useState<File[]>([]);
  const [editionName, setEditionName] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [buildDraft, setBuildDraft] = useState<MetadataDraft>(createEmptyMetadataDraft());
  const sourceDirectoryInputRef = useRef<HTMLInputElement | null>(null);
  const chapterDirectoryInputRef = useRef<HTMLInputElement | null>(null);

  const currentSource = useMemo(
    () => sources.find((source) => source.relative_path === selectedSourcePath) ?? null,
    [selectedSourcePath, sources]
  );

  useEffect(() => {
    if (sources.length === 0) {
      setSelectedSourcePath("");
      return;
    }

    if (!selectedSourcePath || !sources.some((source) => source.relative_path === selectedSourcePath)) {
      setSelectedSourcePath(sources[0].relative_path);
    }
  }, [selectedSourcePath, sources]);

  useEffect(() => {
    if (!sourceDirectoryInputRef.current || !chapterDirectoryInputRef.current) {
      return;
    }

    sourceDirectoryInputRef.current.setAttribute("webkitdirectory", "");
    sourceDirectoryInputRef.current.setAttribute("directory", "");
    chapterDirectoryInputRef.current.setAttribute("webkitdirectory", "");
    chapterDirectoryInputRef.current.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    if (currentSource && !editionName) {
      setEditionName(currentSource.name);
    }
  }, [currentSource, editionName]);

  async function handleCreateSource() {
    if (!newSourceName.trim() || newSourceFiles.length === 0) {
      onNotify("info", "Укажи имя директории и выбери файлы");
      return;
    }

    try {
      await uploadSourceDirectory(newSourceName.trim(), newSourceFiles);
      setNewSourceName("");
      setNewSourceFiles([]);
      if (sourceDirectoryInputRef.current) {
        sourceDirectoryInputRef.current.value = "";
      }
      await onChanged();
      onNotify("success", "Директория загружена");
    } catch (error) {
      onNotify("error", "Ошибка загрузки исходников", getErrorMessage(error));
    }
  }

  async function handleDeleteSource() {
    if (!currentSource) {
      return;
    }

    try {
      await deleteSource(currentSource.relative_path);
      await onChanged();
      onNotify("success", "Директория удалена");
    } catch (error) {
      onNotify("error", "Ошибка удаления директории", getErrorMessage(error));
    }
  }

  async function handleRenameSource(event: KeyboardEvent<HTMLInputElement>) {
    if (!currentSource || event.key !== "Enter") {
      return;
    }

    const nextName = event.currentTarget.value.trim();
    if (!nextName) {
      return;
    }

    try {
      const renamed = await renameSource(currentSource.relative_path, nextName);
      setSelectedSourcePath(renamed.relative_path);
      event.currentTarget.value = "";
      await onChanged();
      onNotify("success", "Директория переименована");
    } catch (error) {
      onNotify("error", "Ошибка переименования директории", getErrorMessage(error));
    }
  }

  async function handleCreateChapter() {
    if (!currentSource) {
      return;
    }

    if (!newChapterName.trim()) {
      onNotify("info", "Укажи имя новой главы");
      return;
    }

    try {
      await createSourceChapter(currentSource.relative_path, newChapterName.trim());
      setNewChapterName("");
      await onChanged();
      onNotify("success", "Глава создана");
    } catch (error) {
      onNotify("error", "Ошибка создания главы", getErrorMessage(error));
    }
  }

  async function handleUploadToChapter() {
    if (!currentSource) {
      return;
    }

    if (!chapterUploadPath) {
      onNotify("info", "Выбери главу");
      return;
    }

    if (chapterFiles.length === 0) {
      onNotify("info", "Выбери файлы для загрузки");
      return;
    }

    try {
      await uploadSourceChapterFiles(currentSource.relative_path, chapterUploadPath, chapterFiles);
      setChapterFiles([]);
      if (chapterDirectoryInputRef.current) {
        chapterDirectoryInputRef.current.value = "";
      }
      await onChanged();
      onNotify("success", "Файлы загружены в главу");
    } catch (error) {
      onNotify("error", "Ошибка загрузки в главу", getErrorMessage(error));
    }
  }

  async function handleRenameFile(filePath: string, currentName: string) {
    if (!currentSource) {
      return;
    }

    const nextName = window.prompt("Новое имя файла", currentName)?.trim();
    if (!nextName) {
      return;
    }

    try {
      await renameSourceFile(currentSource.relative_path, filePath, nextName);
      await onChanged();
      onNotify("success", "Файл переименован");
    } catch (error) {
      onNotify("error", "Ошибка переименования файла", getErrorMessage(error));
    }
  }

  async function handleDeleteFile(filePath: string) {
    if (!currentSource) {
      return;
    }

    try {
      await deleteSourceFile(currentSource.relative_path, filePath);
      await onChanged();
      onNotify("success", "Файл удален");
    } catch (error) {
      onNotify("error", "Ошибка удаления файла", getErrorMessage(error));
    }
  }

  async function handleBuildEdition() {
    if (!currentSource) {
      onNotify("info", "Выбери директорию источника");
      return;
    }

    if (!editionName.trim()) {
      onNotify("info", "Укажи имя издания");
      return;
    }

    try {
      await buildEdition({
        source_path: currentSource.relative_path,
        edition_name: editionName.trim(),
        metadata: draftToMetadata(buildDraft),
        overwrite
      });
      await onChanged();
      onNotify("success", "Издание собрано");
    } catch (error) {
      onNotify("error", "Ошибка сборки издания", getErrorMessage(error));
    }
  }

  return (
    <Grid templateColumns={{ base: "1fr", xl: "380px minmax(0, 1fr)" }} gap="6">
      <Stack spacing="6">
        <SectionCard title="Источники" description="Каталоги изображений, доступные для упаковки в издания.">
          <Stack spacing="3">
            {sources.map((source) => (
              <Box
                key={source.relative_path}
                p="4"
                bg={currentSource?.relative_path === source.relative_path ? "selectedBg" : "subtleBg"}
                borderWidth="1px"
                borderColor={currentSource?.relative_path === source.relative_path ? "selectedBorder" : "subtleBorder"}
                borderRadius="2xl"
                cursor="pointer"
                onClick={() => setSelectedSourcePath(source.relative_path)}
              >
                <Text fontWeight="semibold">{source.name}</Text>
                <Text fontSize="sm" color="mutedText">
                  {source.relative_path}
                </Text>
                <Text mt="1" fontSize="sm" color="secondaryText">
                  {source.image_count} изображений • {source.chapter_count} секций
                </Text>
              </Box>
            ))}
          </Stack>
        </SectionCard>

        <SectionCard title="Новый источник" description="Загрузи директорию исходников целиком.">
          <Stack spacing="4">
            <FormControl>
              <FormLabel>Имя директории</FormLabel>
              <Input value={newSourceName} onChange={(event) => setNewSourceName(event.target.value)} />
            </FormControl>

            <FormControl>
              <FormLabel>Файлы директории</FormLabel>
              <Input
                ref={sourceDirectoryInputRef}
                type="file"
                multiple
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const files = Array.from(event.target.files ?? []);
                  setNewSourceFiles(files);
                  if (!newSourceName && files.length > 0) {
                    const path = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || files[0].name;
                    setNewSourceName(path.split("/").filter(Boolean)[0] || "");
                  }
                }}
              />
              <FormHelperText>Можно выбрать папку с вложенными главами.</FormHelperText>
            </FormControl>

            <Button colorScheme="blue" onClick={() => void handleCreateSource()}>
              Загрузить исходники
            </Button>
          </Stack>
        </SectionCard>
      </Stack>

      <Stack spacing="6">
        <SectionCard
          title="Управление источником"
          description={
            currentSource?.has_nested_directories
              ? "Подпапки интерпретируются как главы, изображения в корне как спешалы."
              : "Если подпапок нет, изображения попадут в корень архива."
          }
        >
          {currentSource ? (
            <Stack spacing="5">
              <HStack align="start">
                <FormControl>
                  <FormLabel>Переименование директории</FormLabel>
                  <Input placeholder="Введи имя и нажми Enter" onKeyDown={(event) => void handleRenameSource(event)} />
                </FormControl>
                <Button mt="8" colorScheme="red" variant="outline" onClick={() => void handleDeleteSource()}>
                  Удалить
                </Button>
              </HStack>

              <HStack align="start">
                <FormControl>
                  <FormLabel>Новая глава</FormLabel>
                  <Input value={newChapterName} onChange={(event) => setNewChapterName(event.target.value)} />
                </FormControl>
                <Button mt="8" colorScheme="orange" onClick={() => void handleCreateChapter()}>
                  Создать
                </Button>
              </HStack>

              <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap="4">
                <FormControl>
                  <FormLabel>Выбор главы</FormLabel>
                  <Select value={chapterUploadPath} onChange={(event) => setChapterUploadPath(event.target.value)}>
                    <option value="">Выбери главу</option>
                    {currentSource.chapters
                      .filter((chapter) => chapter.relative_path !== ".")
                      .map((chapter) => (
                        <option key={chapter.relative_path} value={chapter.relative_path}>
                          {chapter.name}
                        </option>
                      ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Файлы главы</FormLabel>
                  <Input
                    ref={chapterDirectoryInputRef}
                    type="file"
                    multiple
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setChapterFiles(Array.from(event.target.files ?? []))}
                  />
                </FormControl>
              </Grid>

              <Button alignSelf="start" colorScheme="blue" variant="outline" onClick={() => void handleUploadToChapter()}>
                Загрузить в главу
              </Button>

              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="4">
                {currentSource.chapters.map((chapter) => (
                  <Box key={`${chapter.kind}-${chapter.relative_path}`} p="4" bg="subtleBg" borderWidth="1px" borderColor="subtleBorder" borderRadius="2xl">
                    <Text fontWeight="semibold">{chapter.name}</Text>
                    <Text fontSize="sm" color="mutedText">
                      {chapter.kind === "special" ? "Спешалы" : "Глава"}
                    </Text>
                    <Text mt="1" fontSize="sm" color="secondaryText">
                      {chapter.image_count} изображений
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="4">
                {currentSource.files.map((file) => (
                  <Box key={file.relative_path} bg="subtleBg" borderWidth="1px" borderColor="subtleBorder" borderRadius="2xl" overflow="hidden">
                    {file.is_image ? (
                      <Image src={sourceFileUrl(currentSource.relative_path, file.relative_path)} alt={file.name} h="220px" w="full" objectFit="cover" bg="imageBg" />
                    ) : null}
                    <Box p="4">
                      <Text fontWeight="medium" noOfLines={1}>
                        {file.name}
                      </Text>
                      <Text mt="1" fontSize="sm" color="mutedText" noOfLines={2}>
                        {file.relative_path}
                      </Text>
                      <HStack mt="3">
                        <Button size="sm" colorScheme="orange" variant="outline" onClick={() => void handleRenameFile(file.relative_path, file.name)}>
                          Переименовать
                        </Button>
                        <Button size="sm" colorScheme="red" variant="outline" onClick={() => void handleDeleteFile(file.relative_path)}>
                          Удалить
                        </Button>
                      </HStack>
                    </Box>
                  </Box>
                ))}
              </SimpleGrid>
            </Stack>
          ) : (
            <Text color="mutedText">Выбери источник слева.</Text>
          )}
        </SectionCard>

        <SectionCard title="Сборка издания" description="Собери новый CBZ архив из выбранного источника с метаданными ComicInfo.xml.">
          <Stack spacing="6">
            <FormControl>
              <FormLabel>Имя издания</FormLabel>
              <Input value={editionName} onChange={(event) => setEditionName(event.target.value)} placeholder="Например: My Manga Vol 01" />
            </FormControl>

            <Checkbox isChecked={overwrite} onChange={(event) => setOverwrite(event.target.checked)}>
              Перезаписать существующий архив
            </Checkbox>

            <MetadataEditor draft={buildDraft} lookups={lookups} onChange={setBuildDraft} />

            <Button alignSelf="start" colorScheme="blue" onClick={() => void handleBuildEdition()}>
              Собрать CBZ
            </Button>
          </Stack>
        </SectionCard>
      </Stack>
    </Grid>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}
