import {useCallback, useState} from "react";

export default function usePagination(length) {
	const [page, setPage] = useState({ start: 0, size: 10 });
	const nextPage = useCallback(() => setPage(page => ({ ...page, start: page.start + page.size })), [setPage]);
	const prevPage = useCallback(() => setPage(page => ({ ...page, start: Math.max(0, page.start - page.size) })), [setPage]);
	const setPageSize = useCallback(size => setPage(page => ({ ...page, size })), [setPage]);
	const hasNext = page.start + page.size < length;
	const hasPrev = page.start > 0;
	return [page.start, page.start + page.size, nextPage, prevPage, hasNext, hasPrev, setPageSize];
}
