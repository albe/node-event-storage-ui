import useHydrated from '../hooks/hydrated';

const formatter = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

/**
 * Renders a date in the locale and timezone of the browser.
 * The server and the hydration render show the ISO date, because the server does not know either of them.
 */
export default function DateFormat({ value }) {
  const hydrated = useHydrated();
  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    console.error(`Can not format '${value}' as a date`);
    return value;
  }

  return <time dateTime={date.toISOString()}>{hydrated ? formatter.format(date) : date.toISOString()}</time>;
}
