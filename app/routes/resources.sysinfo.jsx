import { json } from '@remix-run/node';
import si from 'systeminformation';

export async function loader() {
  const [fsSize, fsStats, currentLoad, processLoad, mem, networkStats] =
    await Promise.all([
      si.fsSize(),
      si.fsStats(),
      si.currentLoad(),
      si.processLoad('node'),
      si.mem(),
      si.networkStats()
    ]);

  return json({
    fsSize,
    fsStats,
    currentLoad,
    processLoad,
    mem,
    networkStats
  });
}
