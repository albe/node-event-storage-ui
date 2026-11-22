import useHydrated from '../hooks/hydrated';
import DateFormat from './date';
import { formatTimeAgo } from '../../helpers/format';

/**
 * Renders how long ago the given timestamp was, relative to the browser clock.
 * The server and the hydration render show the absolute date instead, because the elapsed time differs between them.
 */
export default function TimeAgo({ value }) {
  const hydrated = useHydrated();

  if (!value) {
    return formatTimeAgo(-1);
  }
  if (!hydrated) {
    return <DateFormat value={value} />;
  }
  return <time dateTime={new Date(value).toISOString()}>{formatTimeAgo((Date.now() - value) / 1000)}</time>;
}
