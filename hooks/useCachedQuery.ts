import { useCallback, useEffect, useRef, useState } from 'react';
import { peekApiCache, writeApiCache, DEFAULT_API_CACHE_TTL_MS } from '../services/apiCache';

type UseCachedQueryOptions = {
  enabled?: boolean;
  ttlMs?: number;
  cacheKey: string;
  url?: string;
};

export function useCachedQuery<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
  options: UseCachedQueryOptions,
) {
  const { cacheKey, enabled = true, ttlMs = DEFAULT_API_CACHE_TTL_MS, url } = options;
  const initialCached = url ? peekApiCache<T>(url) : undefined;
  const [data, setData] = useState<T | undefined>(initialCached);
  const [loading, setLoading] = useState(enabled && initialCached === undefined);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(
    async (force = false) => {
      if (!enabled) return;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      const cached = !force && url ? peekApiCache<T>(url) : undefined;
      if (cached !== undefined) {
        setData(cached);
        setLoading(false);
        setError(null);
      } else {
        setLoading(true);
      }

      try {
        const result = await fetcher();
        if (requestId !== requestIdRef.current) return;
        if (url) writeApiCache(url, result, undefined, ttlMs);
        setData(result);
        setError(null);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return;
        if (cached === undefined) setData(undefined);
        setError(err instanceof Error ? err.message : 'Request failed');
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [cacheKey, enabled, fetcher, ttlMs, url],
  );

  useEffect(() => {
    void reload(false);
  }, [reload, ...deps]);

  return { data, loading, error, reload, setData };
}
