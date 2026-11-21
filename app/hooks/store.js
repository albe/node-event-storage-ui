import { useSearchParams } from 'react-router';

/**
 * Returns the query string that keeps the currently selected store (`?store=<name>`) when navigating,
 * or an empty string if no store is selected.
 */
export default function useStoreSearch() {
  const [searchParams] = useSearchParams();
  const storeName = searchParams.get('store');
  return storeName ? `?store=${encodeURIComponent(storeName)}` : '';
}
