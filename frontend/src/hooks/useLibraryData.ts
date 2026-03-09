import { useCallback, useEffect, useState } from "react";

import { fetchConfig, fetchEditions, fetchLookups, fetchSources, triggerScan, type EditionItem, type SourceDirectoryItem } from "../api";

export type Lookups = {
  authors: string[];
  tags: string[];
  genres: string[];
};

export function useLibraryData() {
  const [sources, setSources] = useState<SourceDirectoryItem[]>([]);
  const [editions, setEditions] = useState<EditionItem[]>([]);
  const [config, setConfig] = useState<Record<string, string | number>>({});
  const [lookups, setLookups] = useState<Lookups>({ authors: [], tags: [], genres: [] });
  const [isLoading, setIsLoading] = useState(true);

  const reload = useCallback(async () => {
    const [nextSources, nextEditions, nextConfig, authors, tags, genres] = await Promise.all([
      fetchSources(),
      fetchEditions(),
      fetchConfig(),
      fetchLookups("authors"),
      fetchLookups("tags"),
      fetchLookups("genres")
    ]);

    setSources(nextSources);
    setEditions(nextEditions);
    setConfig(nextConfig);
    setLookups({ authors, tags, genres });
  }, []);

  const rescan = useCallback(
    async (target: "sources" | "editions") => {
      await triggerScan(target);
      await reload();
    },
    [reload]
  );

  useEffect(() => {
    void (async () => {
      try {
        await reload();
      } finally {
        setIsLoading(false);
      }
    })();

    const timer = window.setInterval(() => {
      void reload();
    }, 30000);

    return () => window.clearInterval(timer);
  }, [reload]);

  return { config, editions, isLoading, lookups, reload, rescan, sources };
}
