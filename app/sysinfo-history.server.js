import si from 'systeminformation';

const MAX_SAMPLES = 20;
const INTERVAL_MS = 5000;

function getEmptyPayload() {
  return {
    fsSize: [],
    fsStats: null,
    currentLoad: {
      currentLoad: 0,
      currentLoadUser: 0,
      currentLoadSystem: 0,
      currentLoadNice: 0,
      currentLoadIdle: 100,
      currentLoadIrq: 0,
      cpus: []
    },
    processLoad: [{ cpu: 0, mem: 0 }],
    mem: { total: 0, free: 0, used: 0, swaptotal: 0, swapused: 0 },
    networkStats: []
  };
}

function getLoad({ load, loadUser, loadSystem, loadNice, loadIdle, loadIrq }) {
  return { load, loadUser, loadSystem, loadNice, loadIdle, loadIrq };
}

function getCurrentLoad({ currentLoad, currentLoadUser, currentLoadSystem, currentLoadNice, currentLoadIdle, currentLoadIrq }) {
  return { load: currentLoad, loadUser: currentLoadUser, loadSystem: currentLoadSystem, loadNice: currentLoadNice, loadIdle: currentLoadIdle, loadIrq: currentLoadIrq };
}

function getMem({ total, free, used }) {
  return { total, free, used };
}

function getNetworkSnapshot(networkStats) {
  if (!(networkStats instanceof Array) || networkStats.length === 0) {
    return { rxSec: 0, txSec: 0, interfaces: {} };
  }

  return networkStats.reduce(
    (snapshot, stats) => {
      const interfaceName = stats.iface || 'unknown';
      const rxSec = stats.rx_sec || 0;
      const txSec = stats.tx_sec || 0;

      snapshot.interfaces[interfaceName] = { rxSec, txSec, operstate: stats.operstate || 'unknown' };

      return { ...snapshot, rxSec: snapshot.rxSec + rxSec, txSec: snapshot.txSec + txSec };
    },
    { rxSec: 0, txSec: 0, interfaces: {} }
  );
}

function appendSample(buffer, value) {
  buffer.push(value);
  if (buffer.length > MAX_SAMPLES) {
    buffer.shift();
  }
}

globalThis.__sysinfoHistory ??= null;

function getOrCreateHistory() {
  if (globalThis.__sysinfoHistory) {
    return globalThis.__sysinfoHistory;
  }

  const state = {
    cpu: [],
    cpus: null,
    mem: [],
    network: [],
    latest: getEmptyPayload(),
    initialized: null,
    timer: null
  };

  async function collect() {
    try {
      const [currentLoad, mem, networkStats, fsSize, fsStats, processLoad] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.networkStats(),
        si.fsSize(),
        si.fsStats(),
        si.processLoad('node')
      ]);

      appendSample(state.cpu, getCurrentLoad(currentLoad));

      if (state.cpus === null) {
        state.cpus = currentLoad.cpus.map((cpuStats) => [getLoad(cpuStats)]);
      } else {
        state.cpus.forEach((cpuHistory, index) => {
          appendSample(cpuHistory, getLoad(currentLoad.cpus[index]));
        });
      }

      appendSample(state.mem, getMem(mem));
      appendSample(state.network, getNetworkSnapshot(networkStats));

      state.latest = { fsSize, fsStats, currentLoad, processLoad, mem, networkStats };
    } catch (error) {
      console.error('sysinfo history collection failed:', error.message);
    }
  }

  state.initialized = collect();
  state.timer = setInterval(collect, INTERVAL_MS);
  if (state.timer.unref) {
    state.timer.unref();
  }

  globalThis.__sysinfoHistory = state;
  return state;
}

export async function getSysinfoWithHistory() {
  const state = getOrCreateHistory();
  await state.initialized;

  return {
    ...state.latest,
    history: {
      cpu: [...state.cpu],
      cpus: state.cpus ? state.cpus.map((s) => [...s]) : [],
      mem: [...state.mem],
      network: [...state.network]
    }
  };
}

