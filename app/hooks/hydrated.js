import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Returns false while rendering on the server and during hydration, true afterwards.
 *
 * Anything that depends on the client environment (clock, locale, timezone) must only be rendered
 * once this returns true. Otherwise the hydration render differs from the server HTML, React drops the
 * server DOM and re-renders the whole document, which discards user input and replaces form controls.
 */
export default function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
