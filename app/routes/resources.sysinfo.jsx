import si from 'systeminformation';

// Stored on globalThis so Vite HMR module re-evaluation does not reset the cache.
globalThis.__sysinfoCache ??= {
  fsSize: { value: null, expiresAt: 0, pending: null },
  fsStats: { value: null, expiresAt: 0, pending: null },
  currentLoad: { value: null, expiresAt: 0, pending: null },
  processLoad: { value: null, expiresAt: 0, pending: null },
  mem: { value: null, expiresAt: 0, pending: null },
  networkStats: { value: null, expiresAt: 0, pending: null }
};
const cacheEntries = globalThis.__sysinfoCache;

const ttlByMetricMs = {
  fsSize: 60000,
  fsStats: 30000,
  currentLoad: 5000,
  processLoad: 5000,
  mem: 5000,
  networkStats: 5000
};

function readMetricWithCache(metric, fetchMetric) {
  const entry = cacheEntries[metric];
  const now = Date.now();

  if (entry.value !== null && now < entry.expiresAt) {
    return Promise.resolve(entry.value);
  }

  if (entry.pending) {
    return entry.pending;
  }

  entry.pending = fetchMetric()
    .then((value) => {
      entry.value = value;
      entry.expiresAt = Date.now() + ttlByMetricMs[metric];
      return value;
    })
    .catch((error) => {
      if (entry.value !== null) {
        return entry.value;
      }
      throw error;
    })
    .finally(() => {
      entry.pending = null;
    });

  return entry.pending;
}

export async function loader() {
  const [fsSize, fsStats, currentLoad, processLoad, mem, networkStats] = await Promise.all([
    readMetricWithCache('fsSize', () => si.fsSize()),
    readMetricWithCache('fsStats', () => si.fsStats()),
    readMetricWithCache('currentLoad', () => si.currentLoad()),
    readMetricWithCache('processLoad', () => si.processLoad('node')),
    readMetricWithCache('mem', () => si.mem()),
    readMetricWithCache('networkStats', () => si.networkStats())
  ]);

  return Response.json(
    { fsSize, fsStats, currentLoad, processLoad, mem, networkStats },
    { headers: { 'Cache-Control': 'public, max-age=4, stale-while-revalidate=1' } }
  );
}
