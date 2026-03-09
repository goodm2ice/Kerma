export type MetadataPayload = {
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
  genre: string[];
  tags: string[];
  language_iso: string;
  web: string;
  manga: string;
  year: number | null;
  month: number | null;
  day: number | null;
};

export type SourceFileItem = {
  name: string;
  relative_path: string;
  size: number;
  modified_at: string;
  is_image: boolean;
};

export type SourceChapterItem = {
  name: string;
  relative_path: string;
  image_count: number;
  modified_at: string;
  files: SourceFileItem[];
  kind: string;
};

export type SourceDirectoryItem = {
  relative_path: string;
  name: string;
  file_count: number;
  image_count: number;
  chapter_count: number;
  has_nested_directories: boolean;
  modified_at: string;
  files: SourceFileItem[];
  chapters: SourceChapterItem[];
};

export type EditionItem = {
  relative_path: string;
  name: string;
  size: number;
  modified_at: string;
  image_count: number;
  metadata: MetadataPayload;
};

export type EditionContent = {
  edition: EditionItem;
  images: string[];
};

export type AuthUser = {
  login: string;
  role: string;
  source: string;
};

export type AuthProviders = {
  password_enabled: boolean;
  sso_enabled: boolean;
  sso_login_url: string;
  sso_label: string;
};

export type LogoutResult = {
  logged_out: boolean;
  redirect_url: string | null;
};

const jsonHeaders = {
  "Content-Type": "application/json"
};

export const emptyMetadata = (): MetadataPayload => ({
  title: "",
  series: "",
  number: "",
  summary: "",
  writer: "",
  penciller: "",
  inker: "",
  colorist: "",
  letterer: "",
  cover_artist: "",
  editor: "",
  publisher: "",
  genre: [],
  tags: [],
  language_iso: "",
  web: "",
  manga: "",
  year: null,
  month: null,
  day: null
});

const encodePath = (value: string) =>
  value
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const body = await response.text();
    let message = body || `HTTP ${response.status}`;
    try {
      const parsed = JSON.parse(body) as { detail?: string };
      if (parsed.detail) {
        message = parsed.detail;
      }
    } catch {
      // Keep the raw body when response is not JSON.
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export async function fetchAuthProviders() {
  return request<AuthProviders>("/api/auth/providers");
}

export async function fetchCurrentUser() {
  return request<AuthUser>("/api/auth/me");
}

export async function login(loginValue: string, password: string) {
  return request<AuthUser>("/api/auth/login", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ login: loginValue, password })
  });
}

export async function logout() {
  return request<LogoutResult>("/api/auth/logout", { method: "POST" });
}

export async function fetchSources() {
  return request<SourceDirectoryItem[]>("/api/sources");
}

export async function fetchEditions() {
  return request<EditionItem[]>("/api/editions");
}

export async function fetchEditionContent(relativePath: string) {
  return request<EditionContent>(`/api/editions/${encodePath(relativePath)}`);
}

export async function fetchLookups(kind: "authors" | "tags" | "genres") {
  return request<string[]>(`/api/lookups/${kind}`);
}

export async function fetchConfig() {
  return request<Record<string, string | number>>("/api/config");
}

export async function triggerScan(target: "sources" | "editions") {
  return request(`/api/scan/${target}`, { method: "POST" });
}

export async function uploadSourceDirectory(directoryName: string, files: File[]) {
  const form = new FormData();
  form.append("directory_name", directoryName);
  files.forEach((file) => {
    const rawPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const segments = rawPath.split("/").filter(Boolean);
    const relativeName = segments.length > 1 ? segments.slice(1).join("/") : file.name;
    form.append("files", file, relativeName);
  });
  return request("/api/sources/upload", { method: "POST", body: form });
}

export async function createSourceChapter(sourcePath: string, name: string) {
  return request<SourceDirectoryItem>(`/api/sources/${encodePath(sourcePath)}/chapters`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ name })
  });
}

export async function uploadSourceChapterFiles(sourcePath: string, chapterPath: string, files: File[]) {
  const form = new FormData();
  form.append("chapter_path", chapterPath);
  files.forEach((file) => {
    const rawPath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const segments = rawPath.split("/").filter(Boolean);
    const relativeName = segments.length > 1 ? segments.slice(1).join("/") : file.name;
    form.append("files", file, relativeName);
  });
  return request(`/api/sources/${encodePath(sourcePath)}/chapters/upload`, { method: "POST", body: form });
}

export async function uploadEdition(file: File) {
  const form = new FormData();
  form.append("file", file, file.name);
  return request<EditionItem>("/api/editions/upload", { method: "POST", body: form });
}

export async function buildEdition(payload: {
  source_path: string;
  edition_name: string;
  metadata: MetadataPayload;
  overwrite: boolean;
}) {
  return request<EditionItem>("/api/editions/build", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify(payload)
  });
}

export async function updateEditionMetadata(relativePath: string, metadata: MetadataPayload) {
  return request<EditionItem>(`/api/editions/${encodePath(relativePath)}/metadata`, {
    method: "PUT",
    headers: jsonHeaders,
    body: JSON.stringify(metadata)
  });
}

export async function deleteEdition(relativePath: string) {
  return request(`/api/editions/${encodePath(relativePath)}`, { method: "DELETE" });
}

export async function deleteSource(relativePath: string) {
  return request(`/api/sources/${encodePath(relativePath)}`, { method: "DELETE" });
}

export async function deleteSourceFile(sourcePath: string, filePath: string) {
  return request(`/api/sources/${encodePath(sourcePath)}/files/${encodePath(filePath)}`, {
    method: "DELETE"
  });
}

export async function renameSource(sourcePath: string, newName: string) {
  return request<SourceDirectoryItem>(`/api/sources/${encodePath(sourcePath)}/rename`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ new_name: newName })
  });
}

export async function renameSourceFile(sourcePath: string, filePath: string, newName: string) {
  return request<SourceDirectoryItem>(`/api/sources/${encodePath(sourcePath)}/files/rename`, {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ source_path: filePath, new_name: newName })
  });
}

export function sourceFileUrl(sourcePath: string, filePath: string) {
  return `/api/sources/${encodePath(sourcePath)}/files/${encodePath(filePath)}`;
}

export function editionImageUrl(editionPath: string, imagePath: string) {
  return `/api/editions/${encodePath(editionPath)}/images/${encodePath(imagePath)}`;
}

export function editionPreviewUrl(editionPath: string) {
  return `/api/editions/${encodePath(editionPath)}/preview`;
}
