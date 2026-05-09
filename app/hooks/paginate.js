import { useCallback, useState } from 'react';

export default function usePagination(length) {
  const [page, setPage] = useState({ start: 0, size: 10 });
  const nextPage = useCallback(
    () => setPage((current) => ({ ...current, start: current.start + current.size })),
    []
  );
  const prevPage = useCallback(
    () =>
      setPage((current) => ({
        ...current,
        start: Math.max(0, current.start - current.size)
      })),
    []
  );
  const setPageSize = useCallback(
    (size) => setPage((current) => ({ ...current, size })),
    []
  );
  const hasNext = page.start + page.size < length;
  const hasPrev = page.start > 0;
  return [page.start, page.start + page.size, nextPage, prevPage, hasNext, hasPrev, setPageSize];
}
